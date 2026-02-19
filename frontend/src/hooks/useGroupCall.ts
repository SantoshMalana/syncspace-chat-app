// frontend/src/hooks/useGroupCall.ts
// Added: startScreenShare(), stopScreenShare(), isScreenSharing state
// Same replaceTrack() pattern as 1-on-1 useCall.ts

import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import type {
    GroupCallState, GroupCallParticipant, IncomingGroupCall,
    GroupCallContextType, CallType,
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
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'turn:openrelay.metered.ca:80',                  username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turn:openrelay.metered.ca:443',                 username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turn:openrelay.metered.ca:443?transport=tcp',   username: 'openrelayproject', credential: 'openrelayproject' },
    ],
};

export const useGroupCall = ({
    socket, currentUserId, currentUserName, currentUserAvatar,
}: UseGroupCallProps): GroupCallContextType => {
    const [groupCall, setGroupCall]               = useState<GroupCallState | null>(null);
    const [incomingGroupCall, setIncomingGroupCall] = useState<IncomingGroupCall | null>(null);
    const [localStream, setLocalStream]           = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted]                   = useState(false);
    const [isVideoEnabled, setIsVideoEnabled]     = useState(true);
    const [isScreenSharing, setIsScreenSharing]   = useState(false);  // ✅ NEW

    const peersRef              = useRef<Map<string, RTCPeerConnection>>(new Map());
    const remoteStreamsRef      = useRef<Map<string, MediaStream>>(new Map());
    const localStreamRef        = useRef<MediaStream | null>(null);
    const screenStreamRef       = useRef<MediaStream | null>(null);   // ✅ NEW
    const cameraTrackRef        = useRef<MediaStreamTrack | null>(null); // ✅ NEW
    const iceCandidateQueues    = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
    const groupCallRef          = useRef<GroupCallState | null>(null);
    const callTypeRef           = useRef<CallType>('voice');           // ✅ NEW

    useEffect(() => { groupCallRef.current = groupCall; }, [groupCall]);

    // ─── Cleanup ─────────────────────────────────────────────────────────────
    const cleanupCall = useCallback(() => {
        peersRef.current.forEach(pc => pc.close());
        peersRef.current.clear();
        remoteStreamsRef.current.clear();
        iceCandidateQueues.current.clear();

        screenStreamRef.current?.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
        cameraTrackRef.current = null;

        localStreamRef.current?.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
        setLocalStream(null);
        setIsMuted(false);
        setIsVideoEnabled(true);
        setIsScreenSharing(false);
        setGroupCall(null);
    }, []);

    // ─── Media ───────────────────────────────────────────────────────────────
    const getMediaStream = async (callType: CallType): Promise<MediaStream> => {
        callTypeRef.current = callType;
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: callType === 'video'
                ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
                : false,
        });
        // Save camera track for restoration after screen share
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) cameraTrackRef.current = videoTrack;
        localStreamRef.current = stream;
        setLocalStream(stream);
        return stream;
    };

    // ─── Peer connection ─────────────────────────────────────────────────────
    const createPeerConnection = useCallback((
        peerId: string, channelId: string, callId: string,
    ): RTCPeerConnection => {
        if (peersRef.current.has(peerId)) return peersRef.current.get(peerId)!;

        const pc = new RTCPeerConnection(ICE_SERVERS);
        peersRef.current.set(peerId, pc);
        iceCandidateQueues.current.set(peerId, []);

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current!);
            });
        }

        pc.onicecandidate = (e) => {
            if (e.candidate) {
                socket?.emit('group-call:ice', { targetUserId: peerId, candidate: e.candidate, callId, channelId });
            }
        };

        pc.ontrack = (e) => {
            const stream = e.streams[0] || new MediaStream([e.track]);
            remoteStreamsRef.current.set(peerId, stream);
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
            console.log(`🔌 Peer ${peerId}: ${pc.connectionState}`);
        };

        return pc;
    }, [socket]);

    const drainIceQueue = async (pc: RTCPeerConnection, peerId: string) => {
        const queue = iceCandidateQueues.current.get(peerId) || [];
        for (const c of queue) {
            try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
        }
        iceCandidateQueues.current.set(peerId, []);
    };

    // ─── Screen Share ─────────────────────────────────────────────────────────

    const startScreenShare = useCallback(async () => {
        if (isScreenSharing || !localStreamRef.current) return;

        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: { frameRate: { ideal: 30 } },
                audio: false,
            });
            const screenTrack = screenStream.getVideoTracks()[0];
            if (!screenTrack) throw new Error('No screen track');

            screenStreamRef.current = screenStream;

            // Replace video track in ALL peer connections
            for (const [, pc] of peersRef.current) {
                const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
                if (videoSender) {
                    await videoSender.replaceTrack(screenTrack);
                } else {
                    // Voice call — add video track
                    pc.addTrack(screenTrack, localStreamRef.current!);
                }
            }

            // Update local stream preview
            const localStream = localStreamRef.current;
            localStream.getVideoTracks().forEach(t => localStream.removeTrack(t));
            localStream.addTrack(screenTrack);
            setLocalStream(new MediaStream(localStream.getTracks()));

            setIsScreenSharing(true);
            setIsVideoEnabled(true);

            // Notify peers via socket
            const call = groupCallRef.current;
            if (call) {
                socket?.emit('group-call:screen-share-started', {
                    channelId: call.channelId,
                    callId: call.callId,
                });
            }

            // Auto-stop when user clicks browser's native "Stop sharing"
            screenTrack.onended = () => stopScreenShare();

            console.log('🖥️ Group call screen share started');
        } catch (err: any) {
            if (err.name !== 'NotAllowedError') {
                console.error('Screen share error:', err);
            }
        }
    }, [isScreenSharing, socket]);

    const stopScreenShare = useCallback(async () => {
        if (!screenStreamRef.current) return;

        screenStreamRef.current.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;

        const localStream = localStreamRef.current;

        if (callTypeRef.current === 'video' && cameraTrackRef.current) {
            let cameraTrack = cameraTrackRef.current;
            if (cameraTrack.readyState === 'ended') {
                const newStream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
                });
                cameraTrack = newStream.getVideoTracks()[0];
                cameraTrackRef.current = cameraTrack;
            }

            // Restore camera in all peer connections
            for (const [, pc] of peersRef.current) {
                const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
                if (videoSender) await videoSender.replaceTrack(cameraTrack);
            }

            // Update local stream preview
            if (localStream) {
                localStream.getVideoTracks().forEach(t => localStream.removeTrack(t));
                localStream.addTrack(cameraTrack);
                setLocalStream(new MediaStream(localStream.getTracks()));
            }
        } else {
            // Voice call — remove screen track entirely from all PCs
            for (const [, pc] of peersRef.current) {
                pc.getSenders()
                    .filter(s => s.track?.kind === 'video')
                    .forEach(s => pc.removeTrack(s));
            }
            if (localStream) {
                localStream.getVideoTracks().forEach(t => { t.stop(); localStream.removeTrack(t); });
                setLocalStream(new MediaStream(localStream.getTracks()));
            }
        }

        setIsScreenSharing(false);

        const call = groupCallRef.current;
        if (call) {
            socket?.emit('group-call:screen-share-stopped', {
                channelId: call.channelId,
                callId: call.callId,
            });
        }

        console.log('🖥️ Group call screen share stopped');
    }, [socket]);

    // ─── Socket events ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!socket) return;

        const onIncoming = (data: IncomingGroupCall) => {
            if (groupCallRef.current) return;
            setIncomingGroupCall(data);
        };

        const onStarted = (data: { channelId: string; callId: string; callType: CallType; participants: GroupCallParticipant[] }) => {
            setGroupCall({
                channelId: data.channelId, callId: data.callId, callType: data.callType,
                participants: [
                    { userId: currentUserId, name: currentUserName, avatar: currentUserAvatar, stream: localStreamRef.current },
                    ...data.participants.filter(p => p.userId !== currentUserId),
                ],
                status: 'active',
            });
        };

        const onJoined = (data: { channelId: string; callId: string; callType: CallType; participants: GroupCallParticipant[] }) => {
            setGroupCall({
                channelId: data.channelId, callId: data.callId, callType: data.callType,
                participants: [
                    { userId: currentUserId, name: currentUserName, avatar: currentUserAvatar, stream: localStreamRef.current },
                    ...data.participants,
                ],
                status: 'active',
            });
        };

        const onPeerJoined = async (data: { channelId: string; callId: string; newPeer: GroupCallParticipant }) => {
            const { newPeer, channelId, callId } = data;
            setGroupCall(prev => {
                if (!prev) return prev;
                if (prev.participants.some(p => p.userId === newPeer.userId)) return prev;
                return { ...prev, participants: [...prev.participants, newPeer] };
            });
            const pc = createPeerConnection(newPeer.userId, channelId, callId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('group-call:offer', { targetUserId: newPeer.userId, offer, callId, channelId });
        };

        const onOffer = async (data: { offer: RTCSessionDescriptionInit; callId: string; channelId: string; senderId: string; senderName: string; senderAvatar?: string }) => {
            const call = groupCallRef.current;
            if (!call || call.callId !== data.callId) return;
            const pc = createPeerConnection(data.senderId, data.channelId, data.callId);
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            await drainIceQueue(pc, data.senderId);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('group-call:answer', { targetUserId: data.senderId, answer, callId: data.callId, channelId: data.channelId });
        };

        const onAnswer = async (data: { answer: RTCSessionDescriptionInit; callId: string; senderId: string }) => {
            const pc = peersRef.current.get(data.senderId);
            if (!pc) return;
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            await drainIceQueue(pc, data.senderId);
        };

        const onIce = async (data: { candidate: RTCIceCandidateInit; senderId: string; callId: string }) => {
            const pc = peersRef.current.get(data.senderId);
            if (!pc) {
                const q = iceCandidateQueues.current.get(data.senderId) || [];
                q.push(data.candidate);
                iceCandidateQueues.current.set(data.senderId, q);
                return;
            }
            if (pc.remoteDescription) {
                try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch {}
            } else {
                const q = iceCandidateQueues.current.get(data.senderId) || [];
                q.push(data.candidate);
                iceCandidateQueues.current.set(data.senderId, q);
            }
        };

        const onPeerLeft = (data: { userId: string }) => {
            const pc = peersRef.current.get(data.userId);
            if (pc) { pc.close(); peersRef.current.delete(data.userId); }
            remoteStreamsRef.current.delete(data.userId);
            setGroupCall(prev => prev
                ? { ...prev, participants: prev.participants.filter(p => p.userId !== data.userId) }
                : prev
            );
        };

        const onCallEnded = () => { cleanupCall(); setIncomingGroupCall(null); };
        const onAlreadyActive = (data: IncomingGroupCall) => setIncomingGroupCall(data);

        // Screen share notifications (UI label only — track swap is automatic via WebRTC ontrack)
        const onScreenShareStarted = (data: { userId: string }) => {
            console.log('🖥️ Peer started screen share:', data.userId);
        };
        const onScreenShareStopped = (data: { userId: string }) => {
            console.log('🖥️ Peer stopped screen share:', data.userId);
        };

        socket.on('group-call:incoming',              onIncoming);
        socket.on('group-call:started',               onStarted);
        socket.on('group-call:joined',                onJoined);
        socket.on('group-call:peer-joined',           onPeerJoined);
        socket.on('group-call:offer',                 onOffer);
        socket.on('group-call:answer',                onAnswer);
        socket.on('group-call:ice',                   onIce);
        socket.on('group-call:peer-left',             onPeerLeft);
        socket.on('group-call:ended',                 onCallEnded);
        socket.on('group-call:already-active',        onAlreadyActive);
        socket.on('group-call:screen-share-started',  onScreenShareStarted);
        socket.on('group-call:screen-share-stopped',  onScreenShareStopped);

        return () => {
            socket.off('group-call:incoming',             onIncoming);
            socket.off('group-call:started',              onStarted);
            socket.off('group-call:joined',               onJoined);
            socket.off('group-call:peer-joined',          onPeerJoined);
            socket.off('group-call:offer',                onOffer);
            socket.off('group-call:answer',               onAnswer);
            socket.off('group-call:ice',                  onIce);
            socket.off('group-call:peer-left',            onPeerLeft);
            socket.off('group-call:ended',                onCallEnded);
            socket.off('group-call:already-active',       onAlreadyActive);
            socket.off('group-call:screen-share-started', onScreenShareStarted);
            socket.off('group-call:screen-share-stopped', onScreenShareStopped);
        };
    }, [socket, currentUserId, currentUserName, currentUserAvatar, createPeerConnection, cleanupCall]);

    // ─── Actions ─────────────────────────────────────────────────────────────
    const startGroupCall = async (channelId: string, callType: CallType) => {
        if (groupCall) return;
        try {
            await getMediaStream(callType);
            socket?.emit('group-call:start', { channelId, callType });
        } catch (err) { console.error('Failed to start group call:', err); cleanupCall(); throw err; }
    };

    const joinGroupCall = async (channelId: string, callId: string, callType: CallType) => {
        try {
            await getMediaStream(callType);
            socket?.emit('group-call:join', { channelId, callId });
            setIncomingGroupCall(null);
        } catch (err) { console.error('Failed to join group call:', err); cleanupCall(); throw err; }
    };

    const leaveGroupCall = () => {
        const call = groupCallRef.current;
        if (call) socket?.emit('group-call:leave', { channelId: call.channelId, callId: call.callId });
        cleanupCall();
        setIncomingGroupCall(null);
    };

    const declineGroupCall = () => setIncomingGroupCall(null);

    const toggleMute = () => {
        localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
        setIsMuted(p => !p);
    };

    const toggleVideo = () => {
        localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
        setIsVideoEnabled(p => !p);
    };

    return {
        groupCall, incomingGroupCall, localStream,
        isMuted, isVideoEnabled, isScreenSharing,
        startGroupCall, joinGroupCall, leaveGroupCall, declineGroupCall,
        toggleMute, toggleVideo, startScreenShare, stopScreenShare,
    };
};