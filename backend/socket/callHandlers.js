const Call = require('../models/Call');
const CallNotification = require('../models/CallNotification');
const { v4: uuidv4 } = require('uuid');

module.exports = (io, socket) => {

  // User initiates a call
  socket.on('call:initiate', async (data) => {
    try {
      const { receiverId, callType, workspaceId } = data;

      // ✅ FIX: Use fullName (User model field), not name
      console.log(`📞 Call initiated: ${socket.user.fullName || socket.user.name} (${socket.user.id}) → ${receiverId}`);

      // 🔍 DEBUG: Check how many sockets are in the receiver's room
      const receiverRoom = io.sockets.adapter.rooms.get(receiverId);
      const receiverSocketCount = receiverRoom ? receiverRoom.size : 0;
      console.log(`🔍 Receiver room '${receiverId}' has ${receiverSocketCount} socket(s)`);
      if (receiverRoom) {
        console.log(`🔍 Receiver socket IDs:`, [...receiverRoom]);
      } else {
        console.log(`❌ Receiver room NOT FOUND — receiver may not be connected or room name mismatch!`);
      }

      // Create the Call DB record so we have a real callId
      const call = await Call.create({
        caller: socket.user.id,
        receiver: receiverId,
        callType: callType || 'voice',
        status: 'ringing',
        // Only set workspace if a valid ID was provided (DM calls won't have one)
        ...(workspaceId && workspaceId.trim() ? { workspace: workspaceId } : {}),
      });

      const callId = call._id.toString();
      console.log(`📋 Call created with ID: ${callId}`);

      // Acknowledge the caller with the real callId so they can track it
      socket.emit('call:initiated', { callId, receiverId, callType });

      // Notify the receiver
      const callerInfo = {
        id: socket.user.id,
        name: socket.user.fullName || socket.user.name || 'Unknown',  // ✅ FIX: fullName
        avatar: socket.user.avatar,
      };
      console.log(`📡 Emitting call:incoming to room '${receiverId}' with caller:`, callerInfo);
      io.to(receiverId).emit('call:incoming', { callId, caller: callerInfo, callType });
      console.log(`✅ call:incoming emitted`);

    } catch (error) {
      console.error('Call initiate error:', error);
      socket.emit('call:error', { message: 'Failed to initiate call' });
    }
  });

  // Receiver accepts the call
  socket.on('call:accept', async (data) => {
    try {
      const { callId } = data;

      // ✅ FIX: Look up the Call to find the callerId — frontend doesn't need to send it
      const call = await Call.findByIdAndUpdate(
        callId,
        { status: 'ongoing', startTime: new Date() },
        { new: true }
      );

      if (!call) {
        return socket.emit('call:error', { message: 'Call not found' });
      }

      const callerId = call.caller.toString();

      console.log(`✅ Call accepted: ${socket.user.name} accepted call ${callId} from ${callerId}`);

      // ✅ FIX: Send full call object that matches what frontend expects
      const callObj = {
        _id: callId,
        caller: { id: callerId, name: '', email: '' }, // caller name resolved on frontend from incomingCall state
        receiver: {
          id: socket.user.id,
          name: socket.user.name,
          avatar: socket.user.avatar,
        },
        callType: call.callType,
        status: 'ongoing',
        startTime: call.startTime,
      };

      // Notify caller that call was accepted
      io.to(callerId).emit('call:accepted', { call: callObj });

    } catch (error) {
      console.error('Call accept error:', error);
      socket.emit('call:error', { message: 'Failed to accept call' });
    }
  });

  // ✅ FIX: Listen for 'call:decline' (was mismatched — frontend sends 'call:reject', now unified to 'call:decline')
  // Frontend useCall.ts must emit 'call:decline' (not 'call:reject')
  socket.on('call:decline', async (data) => {
    try {
      const { callId } = data;

      const call = await Call.findByIdAndUpdate(
        callId,
        { status: 'declined', endTime: new Date() },
        { new: true }
      );

      if (!call) return;

      const callerId = call.caller.toString();

      console.log(`❌ Call declined: ${socket.user.name} declined call ${callId}`);

      // Notify caller that call was declined
      io.to(callerId).emit('call:declined', { callId });

    } catch (error) {
      console.error('Call decline error:', error);
      socket.emit('call:error', { message: 'Failed to decline call' });
    }
  });

  // Caller cancels the call before it's answered
  socket.on('call:cancel', async (data) => {
    try {
      const { callId } = data;

      const call = await Call.findByIdAndUpdate(
        callId,
        { status: 'missed', endTime: new Date() },
        { new: true }
      );

      if (!call) return;

      const receiverId = call.receiver.toString();

      console.log(`🚫 Call cancelled: ${socket.user.name} cancelled call ${callId}`);

      io.to(receiverId).emit('call:cancelled', { callId });

    } catch (error) {
      console.error('Call cancel error:', error);
      socket.emit('call:error', { message: 'Failed to cancel call' });
    }
  });

  // Either party ends the call
  socket.on('call:end', async (data) => {
    try {
      const { callId, duration } = data;

      const call = await Call.findByIdAndUpdate(
        callId,
        { status: 'ended', endTime: new Date(), duration: duration || 0 },
        { new: true }
      );

      if (!call) return;

      const callerId = call.caller.toString();
      const receiverId = call.receiver.toString();

      // Notify the OTHER party
      const otherUserId = socket.user.id === callerId ? receiverId : callerId;

      console.log(`📵 Call ended: ${socket.user.name} ended call ${callId}`);

      io.to(otherUserId).emit('call:ended', { callId, duration: call.duration });

      // Confirm to the person who ended it
      socket.emit('call:ended', { callId, duration: call.duration });

    } catch (error) {
      console.error('Call end error:', error);
      socket.emit('call:error', { message: 'Failed to end call' });
    }
  });

  // Handle busy (user already in a call)
  socket.on('call:busy', async (data) => {
    try {
      const { callId, callerId } = data;

      await Call.findByIdAndUpdate(callId, { status: 'missed', endTime: new Date() });

      io.to(callerId).emit('call:busy', { callId });

    } catch (error) {
      console.error('Call busy error:', error);
    }
  });

  // Handle call missed (timeout on caller side)
  socket.on('call:missed', async (data) => {
    try {
      const { callId } = data;

      await Call.findByIdAndUpdate(callId, { status: 'missed', endTime: new Date() });

      console.log(`📵 Call missed: ${callId}`);

    } catch (error) {
      console.error('Call missed error:', error);
    }
  });

  // WebRTC Signaling - Offer
  socket.on('webrtc:offer', (data) => {
    const { targetUserId, offer, callId } = data;
    console.log(`📡 WebRTC offer: ${socket.user.name} → ${targetUserId}`);
    io.to(targetUserId).emit('webrtc:offer', {
      offer,
      callId,
      senderId: socket.user.id,
    });
  });

  // WebRTC Signaling - Answer
  socket.on('webrtc:answer', (data) => {
    const { targetUserId, answer, callId } = data;
    console.log(`📡 WebRTC answer: ${socket.user.name} → ${targetUserId}`);
    io.to(targetUserId).emit('webrtc:answer', {
      answer,
      callId,
      senderId: socket.user.id,
    });
  });

  // WebRTC Signaling - ICE Candidate
  socket.on('webrtc:ice-candidate', (data) => {
    const { targetUserId, candidate, callId } = data;
    io.to(targetUserId).emit('webrtc:ice-candidate', {
      candidate,
      callId,
      senderId: socket.user.id,
    });
  });

};