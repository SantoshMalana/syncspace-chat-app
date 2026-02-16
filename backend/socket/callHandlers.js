const Call = require('../models/Call');
const CallNotification = require('../models/CallNotification');

module.exports = (io, socket) => {
  
  // User initiates a call
  socket.on('call:initiate', async (data) => {
    try {
      const { callId, receiverId, callType } = data;
      
      console.log(`Call initiated: ${socket.user.id} calling ${receiverId}`);
      
      // Emit to receiver
      io.to(receiverId).emit('call:incoming', {
        callId,
        caller: {
          id: socket.user.id,
          name: socket.user.name,
          avatar: socket.user.avatar
        },
        callType
      });
      
    } catch (error) {
      console.error('Call initiate error:', error);
      socket.emit('call:error', { message: 'Failed to initiate call' });
    }
  });

  // Receiver accepts the call
  socket.on('call:accept', async (data) => {
    try {
      const { callId, callerId } = data;
      
      console.log(`Call accepted: ${socket.user.id} accepted call from ${callerId}`);
      
      // Update call status to ongoing
      await Call.findByIdAndUpdate(callId, {
        status: 'ongoing',
        startTime: new Date()
      });
      
      // Notify caller that call was accepted
      io.to(callerId).emit('call:accepted', {
        callId,
        receiver: {
          id: socket.user.id,
          name: socket.user.name,
          avatar: socket.user.avatar
        }
      });
      
    } catch (error) {
      console.error('Call accept error:', error);
      socket.emit('call:error', { message: 'Failed to accept call' });
    }
  });

  // Receiver declines the call
  socket.on('call:decline', async (data) => {
    try {
      const { callId, callerId } = data;
      
      console.log(`Call declined: ${socket.user.id} declined call from ${callerId}`);
      
      // Update call status to declined
      await Call.findByIdAndUpdate(callId, {
        status: 'declined',
        endTime: new Date()
      });
      
      // Notify caller that call was declined
      io.to(callerId).emit('call:declined', {
        callId
      });
      
    } catch (error) {
      console.error('Call decline error:', error);
      socket.emit('call:error', { message: 'Failed to decline call' });
    }
  });

  // Caller cancels the call before it's answered
  socket.on('call:cancel', async (data) => {
    try {
      const { callId, receiverId } = data;
      
      console.log(`Call cancelled: ${socket.user.id} cancelled call to ${receiverId}`);
      
      // Update call status to missed
      await Call.findByIdAndUpdate(callId, {
        status: 'missed',
        endTime: new Date()
      });
      
      // Notify receiver that call was cancelled
      io.to(receiverId).emit('call:cancelled', {
        callId
      });
      
    } catch (error) {
      console.error('Call cancel error:', error);
      socket.emit('call:error', { message: 'Failed to cancel call' });
    }
  });

  // Either party ends the call
  socket.on('call:end', async (data) => {
    try {
      const { callId, otherUserId, duration } = data;
      
      console.log(`Call ended: ${socket.user.id} ended call`);
      
      // Update call status to ended
      const call = await Call.findByIdAndUpdate(callId, {
        status: 'ended',
        endTime: new Date(),
        duration: duration || 0
      }, { new: true });
      
      // Notify other user that call ended
      io.to(otherUserId).emit('call:ended', {
        callId,
        duration: call.duration
      });
      
      // Also confirm to the person who ended it
      socket.emit('call:ended', {
        callId,
        duration: call.duration
      });
      
    } catch (error) {
      console.error('Call end error:', error);
      socket.emit('call:error', { message: 'Failed to end call' });
    }
  });

  // WebRTC Signaling - Offer
  socket.on('webrtc:offer', (data) => {
    const { targetUserId, offer, callId } = data;
    
    console.log(`WebRTC offer sent from ${socket.user.id} to ${targetUserId}`);
    
    io.to(targetUserId).emit('webrtc:offer', {
      offer,
      callId,
      fromUserId: socket.user.id
    });
  });

  // WebRTC Signaling - Answer
  socket.on('webrtc:answer', (data) => {
    const { targetUserId, answer, callId } = data;
    
    console.log(`WebRTC answer sent from ${socket.user.id} to ${targetUserId}`);
    
    io.to(targetUserId).emit('webrtc:answer', {
      answer,
      callId,
      fromUserId: socket.user.id
    });
  });

  // WebRTC Signaling - ICE Candidate
  socket.on('webrtc:ice-candidate', (data) => {
    const { targetUserId, candidate, callId } = data;
    
    io.to(targetUserId).emit('webrtc:ice-candidate', {
      candidate,
      callId,
      fromUserId: socket.user.id
    });
  });

  // Handle call missed (no answer after timeout)
  socket.on('call:missed', async (data) => {
    try {
      const { callId } = data;
      
      console.log(`Call missed: ${callId}`);
      
      // Update call status to missed
      await Call.findByIdAndUpdate(callId, {
        status: 'missed',
        endTime: new Date()
      });
      
    } catch (error) {
      console.error('Call missed error:', error);
    }
  });

};