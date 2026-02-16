const Meeting = require('../models/Meeting');
const CallNotification = require('../models/CallNotification');

module.exports = (io, socket) => {
  
  // Admin/Creator starts a meeting
  socket.on('meeting:start', async (data) => {
    try {
      const { meetingId } = data;
      
      const meeting = await Meeting.findById(meetingId)
        .populate('participants.user', 'name email avatar');
      
      if (!meeting) {
        return socket.emit('meeting:error', { message: 'Meeting not found' });
      }
      
      // Check if user is creator
      if (meeting.creator.toString() !== socket.user.id) {
        return socket.emit('meeting:error', { message: 'Only creator can start the meeting' });
      }
      
      // Update meeting status
      meeting.status = 'ongoing';
      await meeting.save();
      
      console.log(`Meeting started: ${meetingId} by ${socket.user.name}`);
      
      // Notify all participants that meeting has started
      meeting.participants.forEach(participant => {
        io.to(participant.user._id.toString()).emit('meeting:started', {
          meetingId,
          meetingLink: meeting.meetingLink,
          title: meeting.title
        });
      });
      
    } catch (error) {
      console.error('Meeting start error:', error);
      socket.emit('meeting:error', { message: 'Failed to start meeting' });
    }
  });

  // User joins a meeting room
  socket.on('meeting:join', async (data) => {
    try {
      const { meetingId, meetingLink } = data;
      
      const meeting = await Meeting.findOne({ 
        $or: [{ _id: meetingId }, { meetingLink }] 
      }).populate('participants.user', 'name email avatar');
      
      if (!meeting) {
        return socket.emit('meeting:error', { message: 'Meeting not found' });
      }
      
      // Check if user is a participant
      const isParticipant = meeting.participants.some(
        p => p.user._id.toString() === socket.user.id
      ) || meeting.creator.toString() === socket.user.id;
      
      if (!isParticipant) {
        return socket.emit('meeting:error', { message: 'You are not invited to this meeting' });
      }
      
      // Check participant limit
      const activeParticipants = meeting.participants.filter(p => p.status === 'joined').length;
      if (activeParticipants >= meeting.maxParticipants) {
        return socket.emit('meeting:error', { message: 'Meeting is full' });
      }
      
      // Join the meeting room
      const roomName = `meeting-${meeting._id}`;
      socket.join(roomName);
      
      // Update participant status
      const participant = meeting.participants.find(
        p => p.user._id.toString() === socket.user.id
      );
      
      if (participant) {
        participant.status = 'joined';
        participant.joinedAt = new Date();
      }
      
      await meeting.save();
      
      console.log(`User ${socket.user.name} joined meeting: ${meeting._id}`);
      
      // Get list of current participants in the room
      const socketsInRoom = await io.in(roomName).fetchSockets();
      const currentParticipants = socketsInRoom
        .filter(s => s.user.id !== socket.user.id)
        .map(s => ({
          userId: s.user.id,
          name: s.user.name,
          avatar: s.user.avatar,
          socketId: s.id
        }));
      
      // Send current participants to the new joiner
      socket.emit('meeting:participants', {
        participants: currentParticipants
      });
      
      // Notify others in the room about new participant
      socket.to(roomName).emit('meeting:participant-joined', {
        userId: socket.user.id,
        name: socket.user.name,
        avatar: socket.user.avatar,
        socketId: socket.id
      });
      
    } catch (error) {
      console.error('Meeting join error:', error);
      socket.emit('meeting:error', { message: 'Failed to join meeting' });
    }
  });

  // User leaves a meeting
  socket.on('meeting:leave', async (data) => {
    try {
      const { meetingId } = data;
      
      const meeting = await Meeting.findById(meetingId);
      
      if (!meeting) {
        return socket.emit('meeting:error', { message: 'Meeting not found' });
      }
      
      const roomName = `meeting-${meeting._id}`;
      
      // Update participant status
      const participant = meeting.participants.find(
        p => p.user._id.toString() === socket.user.id
      );
      
      if (participant) {
        participant.status = 'left';
        participant.leftAt = new Date();
      }
      
      await meeting.save();
      
      console.log(`User ${socket.user.name} left meeting: ${meeting._id}`);
      
      // Leave the room
      socket.leave(roomName);
      
      // Notify others in the room
      socket.to(roomName).emit('meeting:participant-left', {
        userId: socket.user.id,
        name: socket.user.name
      });
      
      socket.emit('meeting:left', { meetingId });
      
    } catch (error) {
      console.error('Meeting leave error:', error);
      socket.emit('meeting:error', { message: 'Failed to leave meeting' });
    }
  });

  // Admin ends the meeting
  socket.on('meeting:end', async (data) => {
    try {
      const { meetingId } = data;
      
      const meeting = await Meeting.findById(meetingId);
      
      if (!meeting) {
        return socket.emit('meeting:error', { message: 'Meeting not found' });
      }
      
      // Check if user is creator
      if (meeting.creator.toString() !== socket.user.id) {
        return socket.emit('meeting:error', { message: 'Only creator can end the meeting' });
      }
      
      // Update meeting status
      meeting.status = 'completed';
      await meeting.save();
      
      const roomName = `meeting-${meeting._id}`;
      
      console.log(`Meeting ended: ${meetingId} by ${socket.user.name}`);
      
      // Notify all participants that meeting has ended
      io.to(roomName).emit('meeting:ended', {
        meetingId,
        endedBy: socket.user.name
      });
      
      // Remove all sockets from the room
      const socketsInRoom = await io.in(roomName).fetchSockets();
      socketsInRoom.forEach(s => s.leave(roomName));
      
    } catch (error) {
      console.error('Meeting end error:', error);
      socket.emit('meeting:error', { message: 'Failed to end meeting' });
    }
  });

  // Participant toggles audio
  socket.on('meeting:toggle-audio', async (data) => {
    try {
      const { meetingId, audioEnabled } = data;
      
      const roomName = `meeting-${meetingId}`;
      
      console.log(`User ${socket.user.name} ${audioEnabled ? 'unmuted' : 'muted'} in meeting: ${meetingId}`);
      
      // Notify others in the room
      socket.to(roomName).emit('meeting:participant-audio-toggled', {
        userId: socket.user.id,
        audioEnabled
      });
      
    } catch (error) {
      console.error('Toggle audio error:', error);
    }
  });

  // Participant toggles video
  socket.on('meeting:toggle-video', async (data) => {
    try {
      const { meetingId, videoEnabled } = data;
      
      const roomName = `meeting-${meetingId}`;
      
      console.log(`User ${socket.user.name} ${videoEnabled ? 'enabled' : 'disabled'} video in meeting: ${meetingId}`);
      
      // Notify others in the room
      socket.to(roomName).emit('meeting:participant-video-toggled', {
        userId: socket.user.id,
        videoEnabled
      });
      
    } catch (error) {
      console.error('Toggle video error:', error);
    }
  });

  // WebRTC Signaling for meetings - Offer
  socket.on('meeting:webrtc:offer', (data) => {
    const { targetSocketId, offer, meetingId } = data;
    
    console.log(`Meeting WebRTC offer from ${socket.user.id} to socket ${targetSocketId}`);
    
    io.to(targetSocketId).emit('meeting:webrtc:offer', {
      offer,
      meetingId,
      fromUserId: socket.user.id,
      fromSocketId: socket.id,
      fromName: socket.user.name,
      fromAvatar: socket.user.avatar
    });
  });

  // WebRTC Signaling for meetings - Answer
  socket.on('meeting:webrtc:answer', (data) => {
    const { targetSocketId, answer, meetingId } = data;
    
    console.log(`Meeting WebRTC answer from ${socket.user.id} to socket ${targetSocketId}`);
    
    io.to(targetSocketId).emit('meeting:webrtc:answer', {
      answer,
      meetingId,
      fromUserId: socket.user.id,
      fromSocketId: socket.id
    });
  });

  // WebRTC Signaling for meetings - ICE Candidate
  socket.on('meeting:webrtc:ice-candidate', (data) => {
    const { targetSocketId, candidate, meetingId } = data;
    
    io.to(targetSocketId).emit('meeting:webrtc:ice-candidate', {
      candidate,
      meetingId,
      fromUserId: socket.user.id,
      fromSocketId: socket.id
    });
  });

  // Handle disconnection from meeting
  socket.on('disconnect', async () => {
    try {
      // Find any meetings the user was in and update their status
      const meetings = await Meeting.find({
        'participants.user': socket.user.id,
        'participants.status': 'joined',
        status: 'ongoing'
      });
      
      for (const meeting of meetings) {
        const participant = meeting.participants.find(
          p => p.user.toString() === socket.user.id && p.status === 'joined'
        );
        
        if (participant) {
          participant.status = 'left';
          participant.leftAt = new Date();
          await meeting.save();
          
          const roomName = `meeting-${meeting._id}`;
          
          // Notify others in the room
          socket.to(roomName).emit('meeting:participant-left', {
            userId: socket.user.id,
            name: socket.user.name
          });
        }
      }
    } catch (error) {
      console.error('Disconnect cleanup error:', error);
    }
  });

};