// frontend/src/hooks/useGroupCall.ts
// Mesh WebRTC group call hook — one RTCPeerConnection per remote participant

import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import type {
    GroupCallState,
    GroupCallParticipant,
    IncomingGroupCall,
    GroupCallContextType,
    CallType,
} from '../types/call.types';

interface UseGroupCallProps {
    socket: Socket | null;
    currentUserId: string;
    currentUserName: string;
    currentUserAvatar?: string;
}

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

export const useGroupCall = ({
    socket,
    currentUserId,
    currentUserName,
    currentUserAvatar,
}: UseGroupCallProps): GroupCallContextType => {
    const [groupCall, setGroupCall] = useState<GroupCallState | null>(null);
    const [incomingGroupCall, setIncomingGroupCall] = useState<IncomingGroupCall | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);

    // Map of userId → RTCPeerConnection
    const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    // Map of userId → MediaStream (remote streams)
    const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
    const localStreamRef = useRef<MediaStream | null>(null);
    // ICE candidate queues per peer (before remote desc is set)
    const iceCandidateQueues = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

    // Current call refs (stable across re-renders)
    const groupCallRef = useRef<GroupCallState | null>(null);

    // Keep groupCallRef in sync
    useEffect(() => {
        groupCallRef.current = groupCall;
    }, [groupCall]);

    // ─── Cleanup ────────────────────────────────────────────────────────────────
    const cleanupCall = useCallback(() => {
        // Close all peer connections
        peersRef.current.forEach(pc => pc.close());
        peersRef.current.clear();
        remoteStreamsRef.current.clear();
        iceCandidateQueues.current.clear();

        // Stop local stream
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
        setLocalStream(null);
        setIsMuted(false);
        setIsVideoEnabled(true);
        setGroupCall(null);
    }, []);

    // ─── Get media stream ────────────────────────────────────────────────────────
    const getMediaStream = async (callType: CallType): Promise<MediaStream> => {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: callType === 'video'
                ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
                : false,
        });
        localStreamRef.current = stream;
        setLocalStream(stream);
        return stream;
    };

    // ─── Create a peer connection for a specific remote user ────────────────────
    const createPeerConnection = useCallback((
        peerId: string,
        channelId: string,
        callId: string,
    ): RTCPeerConnection => {
        // Reuse if already exists
        if (peersRef.current.has(peerId)) {
            return peersRef.current.get(peerId)!;
        }

        const pc = new RTCPeerConnection(ICE_SERVERS);
        peersRef.current.set(peerId, pc);
        iceCandidateQueues.current.set(peerId, []);

        // Add local tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current!);
            });
        }

        // ICE candidates
        pc.onicecandidate = (e) => {
            if (e.candidate) {
                socket?.emit('group-call:ice', {
                    targetUserId: peerId,
                    candidate: e.candidate,
                    callId,
                    channelId,
                });
            }
        };

        // Remote track received
        pc.ontrack = (e) => {
            console.log(`🎥 Remote track from ${peerId}`);
            const stream = e.streams[0] || new MediaStream([e.track]);
            remoteStreamsRef.current.set(peerId, stream);

            // Update participant stream in state
            setGroupCall(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    participants: prev.participants.map(p =>
                        p.userId === peerId ? { ...p, stream } : p
                    ),
                };
            });
        };

        pc.onconnectionstatechange = () => {
            console.log(`🔌 Peer ${peerId} connection: ${pc.connectionState}`);
        };

        return pc;
    }, [socket]);

    // ─── Drain ICE queue ─────────────────────────────────────────────────────────
    const drainIceQueue = async (pc: RTCPeerConnection, peerId: string) => {
        const queue = iceCandidateQueues.current.get(peerId) || [];
        for (const candidate of queue) {
            try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { /* ignore */ }
        }
        iceCandidateQueues.current.set(peerId, []);
    };

    // ─── Socket event listeners ──────────────────────────────────────────────────
    useEffect(() => {
        if (!socket) return;

        // Someone else started a call in a channel we're in
        const onIncoming = (data: IncomingGroupCall) => {
            console.log('📞 Incoming group call from', data.startedBy.name, 'in channel', data.channelId);
            if (groupCallRef.current) {
                // Already in a call — ignore
                return;
            }
            setIncomingGroupCall(data);
        };

        // Server confirmed our call was started
        const onStarted = (data: { channelId: string; callId: string; callType: CallType; participants: GroupCallParticipant[] }) => {
            console.log('✅ Group call started:', data.callId);
            setGroupCall({
                channelId: data.channelId,
                callId: data.callId,
                callType: data.callType,
                participants: [
                    {
                        userId: currentUserId,
                        name: currentUserName,
                        avatar: currentUserAvatar,
                        stream: localStreamRef.current,
                    },
                    ...data.participants.filter(p => p.userId !== currentUserId),
                ],
                status: 'active',
            });
        };

        // Server confirmed we joined — gives us existing participants
        const onJoined = async (data: {
            channelId: string;
            callId: string;
            callType: CallType;
            participants: GroupCallParticipant[];
        }) => {
            console.log('✅ Joined group call:', data.callId, 'with', data.participants.length, 'existing peers');

            setGroupCall({
                channelId: data.channelId,
                callId: data.callId,
                callType: data.callType,
                participants: [
                    {
                        userId: currentUserId,
                        name: currentUserName,
                        avatar: currentUserAvatar,
                        stream: localStreamRef.current,
                    },
                    ...data.participants,
                ],
                status: 'active',
            });
            // Existing participants will send us offers — we just wait
        };

        // An existing participant is told to send an offer to the new joiner (us or someone else)
        const onPeerJoined = async (data: {
            channelId: string;
            callId: string;
            newPeer: GroupCallParticipant;
        }) => {
            const { newPeer, channelId, callId } = data;
            console.log('👋 New peer joined:', newPeer.name);

            // Add to participants list
            setGroupCall(prev => {
                if (!prev) return prev;
                const exists = prev.participants.some(p => p.userId === newPeer.userId);
                if (exists) return prev;
                return { ...prev, participants: [...prev.participants, newPeer] };
            });

            // We (existing participant) create offer to the new peer
            const pc = createPeerConnection(newPeer.userId, channelId, callId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            socket.emit('group-call:offer', {
                targetUserId: newPeer.userId,
                offer,
                callId,
                channelId,
            });
            console.log('📤 Offer sent to new peer:', newPeer.name);
        };

        // We received an offer from an existing participant
        const onOffer = async (data: {
            offer: RTCSessionDescriptionInit;
            callId: string;
            channelId: string;
            senderId: string;
            senderName: string;
            senderAvatar?: string;
        }) => {
            console.log('📥 Received offer from', data.senderName);
            const call = groupCallRef.current;
            if (!call || call.callId !== data.callId) return;

            const pc = createPeerConnection(data.senderId, data.channelId, data.callId);
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            await drainIceQueue(pc, data.senderId);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit('group-call:answer', {
                targetUserId: data.senderId,
                answer,
                callId: data.callId,
                channelId: data.channelId,
            });
            console.log('📤 Answer sent to', data.senderName);
        };

        // We received an answer to our offer
        const onAnswer = async (data: {
            answer: RTCSessionDescriptionInit;
            callId: string;
            senderId: string;
        }) => {
            console.log('📥 Received answer from', data.senderId);
            const pc = peersRef.current.get(data.senderId);
            if (!pc) return;
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            await drainIceQueue(pc, data.senderId);
        };

        // ICE candidate from a peer
        const onIce = async (data: {
            candidate: RTCIceCandidateInit;
            senderId: string;
            callId: string;
        }) => {
            const pc = peersRef.current.get(data.senderId);
            if (!pc) {
                // Queue it
                const queue = iceCandidateQueues.current.get(data.senderId) || [];
                queue.push(data.candidate);
                iceCandidateQueues.current.set(data.senderId, queue);
                return;
            }
            if (pc.remoteDescription) {
                try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch (e) { /* ignore */ }
            } else {
                const queue = iceCandidateQueues.current.get(data.senderId) || [];
                queue.push(data.candidate);
                iceCandidateQueues.current.set(data.senderId, queue);
            }
        };

        // A peer left the call
        const onPeerLeft = (data: { userId: string; channelId: string; callId: string }) => {
            console.log('👋 Peer left:', data.userId);
            // Close and remove their PC
            const pc = peersRef.current.get(data.userId);
            if (pc) { pc.close(); peersRef.current.delete(data.userId); }
            remoteStreamsRef.current.delete(data.userId);

            setGroupCall(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    participants: prev.participants.filter(p => p.userId !== data.userId),
                };
            });
        };

        // The call ended entirely (no participants left)
        const onCallEnded = (data: { channelId: string; callId: string }) => {
            console.log('📵 Group call ended:', data.callId);
            cleanupCall();
            setIncomingGroupCall(null);
        };

        // Someone already started a call in this channel
        const onAlreadyActive = (data: IncomingGroupCall) => {
            setIncomingGroupCall(data);
        };

        socket.on('group-call:incoming', onIncoming);
        socket.on('group-call:started', onStarted);
        socket.on('group-call:joined', onJoined);
        socket.on('group-call:peer-joined', onPeerJoined);
        socket.on('group-call:offer', onOffer);
        socket.on('group-call:answer', onAnswer);
        socket.on('group-call:ice', onIce);
        socket.on('group-call:peer-left', onPeerLeft);
        socket.on('group-call:ended', onCallEnded);
        socket.on('group-call:already-active', onAlreadyActive);

        return () => {
            socket.off('group-call:incoming', onIncoming);
            socket.off('group-call:started', onStarted);
            socket.off('group-call:joined', onJoined);
            socket.off('group-call:peer-joined', onPeerJoined);
            socket.off('group-call:offer', onOffer);
            socket.off('group-call:answer', onAnswer);
            socket.off('group-call:ice', onIce);
            socket.off('group-call:peer-left', onPeerLeft);
            socket.off('group-call:ended', onCallEnded);
            socket.off('group-call:already-active', onAlreadyActive);
        };
    }, [socket, currentUserId, currentUserName, currentUserAvatar, createPeerConnection, cleanupCall]);

    // ─── Actions ─────────────────────────────────────────────────────────────────

    const startGroupCall = async (channelId: string, callType: CallType) => {
        if (groupCall) return; // Already in a call
        try {
            await getMediaStream(callType);
            socket?.emit('group-call:start', { channelId, callType });
        } catch (err) {
            console.error('Failed to start group call:', err);
            cleanupCall();
            throw err;
        }
    };

    const joinGroupCall = async (channelId: string, callId: string, callType: CallType) => {
        try {
            await getMediaStream(callType);
            socket?.emit('group-call:join', { channelId, callId });
            setIncomingGroupCall(null);
        } catch (err) {
            console.error('Failed to join group call:', err);
            cleanupCall();
            throw err;
        }
    };

    const leaveGroupCall = () => {
        const call = groupCallRef.current;
        if (call) {
            socket?.emit('group-call:leave', { channelId: call.channelId, callId: call.callId });
        }
        cleanupCall();
        setIncomingGroupCall(null);
    };

    const declineGroupCall = () => {
        setIncomingGroupCall(null);
    };

    const toggleMute = () => {
        localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
        setIsMuted(p => !p);
    };

    const toggleVideo = () => {
        localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
        setIsVideoEnabled(p => !p);
    };

    return {
        groupCall,
        incomingGroupCall,
        localStream,
        isMuted,
        isVideoEnabled,
        startGroupCall,
        joinGroupCall,
        leaveGroupCall,
        declineGroupCall,
        toggleMute,
        toggleVideo,
    };
};
