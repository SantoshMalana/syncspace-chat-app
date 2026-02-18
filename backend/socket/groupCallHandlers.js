// backend/socket/groupCallHandlers.js
// Group call signaling using mesh WebRTC (one RTCPeerConnection per pair of participants)
// Supports voice and video calls in channels with up to ~6 participants

// In-memory room store: channelId → { callId, callType, participants: [{userId, socketId, name, avatar}] }
const groupCallRooms = new Map();

module.exports = (io, socket) => {

    // ─── Start a group call in a channel ────────────────────────────────────────
    socket.on('group-call:start', ({ channelId, callType }) => {
        try {
            if (!channelId || !callType) return;

            // If a call is already active in this channel, just notify the caller
            if (groupCallRooms.has(channelId)) {
                const room = groupCallRooms.get(channelId);
                socket.emit('group-call:already-active', {
                    channelId,
                    callId: room.callId,
                    callType: room.callType,
                    participants: room.participants,
                });
                return;
            }

            const callId = `gc_${channelId}_${Date.now()}`;
            const caller = {
                userId: socket.user.id,
                socketId: socket.id,
                name: socket.user.fullName || socket.user.name || 'Unknown',
                avatar: socket.user.avatar || null,
            };

            groupCallRooms.set(channelId, {
                callId,
                callType,
                participants: [caller],
            });

            console.log(`📞 Group call started: ${callId} in channel ${channelId} by ${caller.name}`);

            // Notify all others in the channel room about the incoming call
            socket.to(`channel:${channelId}`).emit('group-call:incoming', {
                channelId,
                callId,
                callType,
                startedBy: {
                    userId: caller.userId,
                    name: caller.name,
                    avatar: caller.avatar,
                },
            });

            // Confirm to the caller
            socket.emit('group-call:started', {
                channelId,
                callId,
                callType,
                participants: [caller],
            });

        } catch (err) {
            console.error('group-call:start error:', err);
            socket.emit('group-call:error', { message: 'Failed to start group call' });
        }
    });

    // ─── Join an existing group call ────────────────────────────────────────────
    socket.on('group-call:join', ({ channelId, callId }) => {
        try {
            const room = groupCallRooms.get(channelId);
            if (!room || room.callId !== callId) {
                socket.emit('group-call:error', { message: 'Call not found or already ended' });
                return;
            }

            // Check if already in the room
            const alreadyIn = room.participants.some(p => p.userId === socket.user.id);
            if (alreadyIn) return;

            const newParticipant = {
                userId: socket.user.id,
                socketId: socket.id,
                name: socket.user.fullName || socket.user.name || 'Unknown',
                avatar: socket.user.avatar || null,
            };

            // Get existing participants BEFORE adding the new one (they need to send offers)
            const existingParticipants = [...room.participants];

            room.participants.push(newParticipant);

            console.log(`✅ ${newParticipant.name} joined group call ${callId}`);

            // Tell existing participants to initiate WebRTC offers to the new joiner
            existingParticipants.forEach(p => {
                io.to(p.socketId).emit('group-call:peer-joined', {
                    channelId,
                    callId,
                    newPeer: {
                        userId: newParticipant.userId,
                        socketId: newParticipant.socketId,
                        name: newParticipant.name,
                        avatar: newParticipant.avatar,
                    },
                });
            });

            // Tell the new joiner who is already in the call (so they can set up their PC map)
            socket.emit('group-call:joined', {
                channelId,
                callId,
                callType: room.callType,
                participants: existingParticipants,
            });

        } catch (err) {
            console.error('group-call:join error:', err);
            socket.emit('group-call:error', { message: 'Failed to join group call' });
        }
    });

    // ─── Leave a group call ──────────────────────────────────────────────────────
    socket.on('group-call:leave', ({ channelId, callId }) => {
        try {
            const room = groupCallRooms.get(channelId);
            if (!room || room.callId !== callId) return;

            const leavingUserId = socket.user.id;
            room.participants = room.participants.filter(p => p.userId !== leavingUserId);

            console.log(`👋 ${socket.user.name} left group call ${callId}. Remaining: ${room.participants.length}`);

            // Notify remaining participants
            room.participants.forEach(p => {
                io.to(p.socketId).emit('group-call:peer-left', {
                    channelId,
                    callId,
                    userId: leavingUserId,
                });
            });

            // If no one left, clean up the room
            if (room.participants.length === 0) {
                groupCallRooms.delete(channelId);
                console.log(`🗑️ Group call ${callId} ended — no participants remaining`);
                // Notify channel that call ended
                io.to(`channel:${channelId}`).emit('group-call:ended', { channelId, callId });
            }

        } catch (err) {
            console.error('group-call:leave error:', err);
        }
    });

    // ─── WebRTC Signaling: Offer ─────────────────────────────────────────────────
    // Existing participant → new joiner
    socket.on('group-call:offer', ({ targetUserId, offer, callId, channelId }) => {
        try {
            const room = groupCallRooms.get(channelId);
            if (!room) return;

            const target = room.participants.find(p => p.userId === targetUserId);
            if (!target) return;

            io.to(target.socketId).emit('group-call:offer', {
                offer,
                callId,
                channelId,
                senderId: socket.user.id,
                senderName: socket.user.fullName || socket.user.name,
                senderAvatar: socket.user.avatar,
            });
        } catch (err) {
            console.error('group-call:offer error:', err);
        }
    });

    // ─── WebRTC Signaling: Answer ────────────────────────────────────────────────
    socket.on('group-call:answer', ({ targetUserId, answer, callId, channelId }) => {
        try {
            const room = groupCallRooms.get(channelId);
            if (!room) return;

            const target = room.participants.find(p => p.userId === targetUserId);
            if (!target) return;

            io.to(target.socketId).emit('group-call:answer', {
                answer,
                callId,
                channelId,
                senderId: socket.user.id,
            });
        } catch (err) {
            console.error('group-call:answer error:', err);
        }
    });

    // ─── WebRTC Signaling: ICE Candidate ────────────────────────────────────────
    socket.on('group-call:ice', ({ targetUserId, candidate, callId, channelId }) => {
        try {
            const room = groupCallRooms.get(channelId);
            if (!room) return;

            const target = room.participants.find(p => p.userId === targetUserId);
            if (!target) return;

            io.to(target.socketId).emit('group-call:ice', {
                candidate,
                callId,
                channelId,
                senderId: socket.user.id,
            });
        } catch (err) {
            console.error('group-call:ice error:', err);
        }
    });

    // ─── Handle disconnect: auto-leave any active group call ────────────────────
    socket.on('disconnect', () => {
        groupCallRooms.forEach((room, channelId) => {
            const wasInCall = room.participants.some(p => p.socketId === socket.id);
            if (!wasInCall) return;

            room.participants = room.participants.filter(p => p.socketId !== socket.id);

            // Notify remaining participants
            room.participants.forEach(p => {
                io.to(p.socketId).emit('group-call:peer-left', {
                    channelId,
                    callId: room.callId,
                    userId: socket.user?.id,
                });
            });

            if (room.participants.length === 0) {
                groupCallRooms.delete(channelId);
                io.to(`channel:${channelId}`).emit('group-call:ended', { channelId, callId: room.callId });
            }
        });
    });
};
