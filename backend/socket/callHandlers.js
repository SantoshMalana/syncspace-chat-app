// backend/socket/callHandlers.js
// Added: call:screen-share-started and call:screen-share-stopped relay events

const Call = require('../models/Call');

module.exports = (io, socket) => {

  socket.on('call:initiate', async (data) => {
    try {
      const { receiverId, callType, workspaceId } = data;
      console.log(`📞 Call initiated: ${socket.user.fullName || socket.user.name} → ${receiverId}`);

      const receiverRoom = io.sockets.adapter.rooms.get(receiverId);
      console.log(`🔍 Receiver room '${receiverId}' has ${receiverRoom?.size ?? 0} socket(s)`);
      if (!receiverRoom) console.log(`❌ Receiver NOT connected — room not found!`);

      const call = await Call.create({
        caller: socket.user.id,
        receiver: receiverId,
        callType: callType || 'voice',
        status: 'ringing',
        ...(workspaceId && workspaceId.trim() ? { workspace: workspaceId } : {}),
      });

      const callId = call._id.toString();
      socket.emit('call:initiated', { callId, receiverId, callType });

      const callerInfo = {
        id: socket.user.id,
        name: socket.user.fullName || socket.user.name || 'Unknown',
        avatar: socket.user.avatar,
      };
      io.to(receiverId).emit('call:incoming', { callId, caller: callerInfo, callType });
      console.log(`✅ call:incoming emitted to ${receiverId}`);

    } catch (error) {
      console.error('Call initiate error:', error);
      socket.emit('call:error', { message: 'Failed to initiate call' });
    }
  });

  socket.on('call:accept', async (data) => {
    try {
      const { callId } = data;
      const call = await Call.findByIdAndUpdate(
        callId, { status: 'ongoing', startTime: new Date() }, { new: true }
      );
      if (!call) return socket.emit('call:error', { message: 'Call not found' });

      const callerId = call.caller.toString();
      console.log(`✅ Call accepted: ${socket.user.name} accepted ${callId}`);

      io.to(callerId).emit('call:accepted', {
        call: {
          _id: callId,
          caller: { id: callerId, name: '', email: '' },
          receiver: { id: socket.user.id, name: socket.user.name, avatar: socket.user.avatar },
          callType: call.callType,
          status: 'ongoing',
          startTime: call.startTime,
        },
      });
    } catch (error) {
      console.error('Call accept error:', error);
      socket.emit('call:error', { message: 'Failed to accept call' });
    }
  });

  socket.on('call:decline', async (data) => {
    try {
      const { callId } = data;
      const call = await Call.findByIdAndUpdate(
        callId, { status: 'declined', endTime: new Date() }, { new: true }
      );
      if (!call) return;
      console.log(`❌ Call declined by ${socket.user.name}`);
      io.to(call.caller.toString()).emit('call:declined', { callId });
    } catch (error) {
      console.error('Call decline error:', error);
    }
  });

  socket.on('call:cancel', async (data) => {
    try {
      const { callId } = data;
      const call = await Call.findByIdAndUpdate(
        callId, { status: 'missed', endTime: new Date() }, { new: true }
      );
      if (!call) return;
      console.log(`🚫 Call cancelled by ${socket.user.name}`);
      io.to(call.receiver.toString()).emit('call:cancelled', { callId });
    } catch (error) {
      console.error('Call cancel error:', error);
    }
  });

  socket.on('call:end', async (data) => {
    try {
      const { callId, duration } = data;
      const call = await Call.findByIdAndUpdate(
        callId, { status: 'ended', endTime: new Date(), duration: duration || 0 }, { new: true }
      );
      if (!call) return;

      const otherUserId = socket.user.id === call.caller.toString()
        ? call.receiver.toString()
        : call.caller.toString();

      console.log(`📵 Call ended by ${socket.user.name}`);
      io.to(otherUserId).emit('call:ended', { callId, duration: call.duration });
      socket.emit('call:ended', { callId, duration: call.duration });
    } catch (error) {
      console.error('Call end error:', error);
    }
  });

  socket.on('call:busy', async (data) => {
    try {
      const { callId, callerId } = data;
      await Call.findByIdAndUpdate(callId, { status: 'missed', endTime: new Date() });
      io.to(callerId).emit('call:busy', { callId });
    } catch (error) {
      console.error('Call busy error:', error);
    }
  });

  socket.on('call:missed', async (data) => {
    try {
      const { callId } = data;
      await Call.findByIdAndUpdate(callId, { status: 'missed', endTime: new Date() });
    } catch (error) {
      console.error('Call missed error:', error);
    }
  });

  // ✅ NEW: Relay screen share notifications to the other peer (UI label only)
  socket.on('call:screen-share-started', (data) => {
    const { targetUserId, callId } = data;
    console.log(`🖥️ Screen share started: ${socket.user.name} → ${targetUserId}`);
    io.to(targetUserId).emit('call:screen-share-started', { callId, userId: socket.user.id });
  });

  socket.on('call:screen-share-stopped', (data) => {
    const { targetUserId, callId } = data;
    console.log(`🖥️ Screen share stopped: ${socket.user.name} → ${targetUserId}`);
    io.to(targetUserId).emit('call:screen-share-stopped', { callId, userId: socket.user.id });
  });

  // WebRTC Signaling
  socket.on('webrtc:offer', (data) => {
    const { targetUserId, offer, callId } = data;
    console.log(`📡 WebRTC offer: ${socket.user.name} → ${targetUserId}`);
    io.to(targetUserId).emit('webrtc:offer', { offer, callId, senderId: socket.user.id });
  });

  socket.on('webrtc:answer', (data) => {
    const { targetUserId, answer, callId } = data;
    console.log(`📡 WebRTC answer: ${socket.user.name} → ${targetUserId}`);
    io.to(targetUserId).emit('webrtc:answer', { answer, callId, senderId: socket.user.id });
  });

  socket.on('webrtc:ice-candidate', (data) => {
    const { targetUserId, candidate, callId } = data;
    io.to(targetUserId).emit('webrtc:ice-candidate', { candidate, callId, senderId: socket.user.id });
  });
};