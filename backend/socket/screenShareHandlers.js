// backend/socket/screenShareHandlers.js
// Handles screen share rooms — create, join, leave, relay WebRTC signals

const { v4: uuidv4 } = require('uuid');

// In-memory room store: roomId → { roomId, hostId, hostName, channelId, workspaceId, peers: Set<socketId> }
const rooms = new Map();

module.exports = (io, socket) => {

  // Host starts a screen share room
  socket.on('screenshare:start', ({ channelId, workspaceId }) => {
    const roomId = uuidv4();
    const room = {
      roomId,
      hostId: socket.user.id,
      hostSocketId: socket.id,
      hostName: socket.user.fullName || socket.user.name,
      channelId,
      workspaceId,
      peers: new Set([socket.id]),
      viewerSockets: new Map(), // userId -> socketId
    };
    rooms.set(roomId, room);
    socket.join(`screenshare:${roomId}`);

    // Confirm to host
    socket.emit('screenshare:started', { roomId, channelId });

    // Notify workspace members a session is available
    io.to(`workspace:${workspaceId}`).emit('screenshare:available', {
      roomId,
      hostId: socket.user.id,
      hostName: room.hostName,
      channelId,
      workspaceId,
    });

    console.log(`🖥️ Screen share room created: ${roomId} by ${room.hostName}`);
  });

  // Viewer joins a room
  socket.on('screenshare:join', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return socket.emit('screenshare:error', { message: 'Room not found' });

    room.viewerSockets.set(socket.user.id, socket.id);
    room.peers.add(socket.id);
    socket.join(`screenshare:${roomId}`);

    // Tell the host to send an offer to this new viewer
    io.to(room.hostSocketId).emit('screenshare:viewer-joined', {
      viewerId: socket.user.id,
      viewerName: socket.user.fullName || socket.user.name,
      roomId,
    });

    // Tell the viewer who the host is (include channelId + workspaceId so the
    // frontend can build a complete ScreenShareRoom object)
    socket.emit('screenshare:joined', {
      roomId,
      hostId: room.hostId,
      hostName: room.hostName,
      channelId: room.channelId,
      workspaceId: room.workspaceId,
      viewerCount: room.peers.size - 1,
    });

    // Update viewer count for everyone in room
    io.to(`screenshare:${roomId}`).emit('screenshare:viewer-count', {
      count: room.peers.size - 1,
    });

    console.log(`👁️ ${socket.user.name} joined screen share room ${roomId}`);
  });

  // WebRTC offer from host → viewer
  socket.on('screenshare:offer', ({ targetUserId, offer, roomId }) => {
    const room = rooms.get(roomId);
    const targetSocketId = room?.viewerSockets?.get(targetUserId);
    if (!targetSocketId) return;
    io.to(targetSocketId).emit('screenshare:offer', {
      offer, roomId, hostId: socket.user.id,
    });
  });

  // WebRTC answer from viewer → host
  socket.on('screenshare:answer', ({ targetUserId, answer, roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    io.to(room.hostSocketId).emit('screenshare:answer', {
      answer, roomId, viewerId: socket.user.id,
    });
  });

  // ICE candidates
  socket.on('screenshare:ice', ({ targetUserId, candidate, roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const targetSocketId = targetUserId === room.hostId
      ? room.hostSocketId
      : room.viewerSockets?.get(targetUserId);
    if (!targetSocketId) return;
    io.to(targetSocketId).emit('screenshare:ice', {
      candidate, roomId, senderId: socket.user.id,
    });
  });

  // Host ends the room
  socket.on('screenshare:end', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || room.hostId !== socket.user.id) return;

    io.to(`screenshare:${roomId}`).emit('screenshare:ended', { roomId });
    rooms.delete(roomId);

    // Notify workspace
    io.to(`workspace:${room.workspaceId}`).emit('screenshare:unavailable', { roomId });

    console.log(`🛑 Screen share room ended: ${roomId}`);
  });

  // Viewer leaves
  socket.on('screenshare:leave', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    room.viewerSockets.delete(socket.user.id);
    room.peers.delete(socket.id);
    socket.leave(`screenshare:${roomId}`);

    io.to(room.hostSocketId).emit('screenshare:viewer-left', {
      viewerId: socket.user.id, roomId,
    });

    io.to(`screenshare:${roomId}`).emit('screenshare:viewer-count', {
      count: room.peers.size - 1,
    });

    console.log(`👋 ${socket.user.name} left screen share room ${roomId}`);
  });

  // Clean up on disconnect
  socket.on('disconnect', () => {
    // If host disconnects, end all their rooms
    for (const [roomId, room] of rooms.entries()) {
      if (room.hostId === socket.user.id) {
        io.to(`screenshare:${roomId}`).emit('screenshare:ended', { roomId });
        io.to(`workspace:${room.workspaceId}`).emit('screenshare:unavailable', { roomId });
        rooms.delete(roomId);
      } else if (room.peers.has(socket.id)) {
        room.viewerSockets.delete(socket.user.id);
        room.peers.delete(socket.id);
        io.to(`screenshare:${roomId}`).emit('screenshare:viewer-count', {
          count: room.peers.size - 1,
        });
      }
    }
  });

  // Get active rooms for a workspace
  socket.on('screenshare:list', ({ workspaceId }) => {
    const active = [];
    for (const room of rooms.values()) {
      if (room.workspaceId === workspaceId) {
        active.push({
          roomId: room.roomId,
          hostId: room.hostId,
          hostName: room.hostName,
          channelId: room.channelId,
          viewerCount: room.peers.size - 1,
        });
      }
    }
    socket.emit('screenshare:list', { rooms: active });
  });
};