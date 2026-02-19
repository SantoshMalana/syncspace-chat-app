// frontend/src/hooks/useCall.ts
// Fixed: Proper TURN server via env var, keep-alive ICE restart on disconnect

import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import type { Call, CallContextType, CallType, IncomingCall } from '../types/call.types';

interface UseCallProps {
  socket: Socket | null;
  currentUserId: string;
  workspaceId: string;
}

// ── ICE config ────────────────────────────────────────────────────────────────
// Uses Metered.ca free tier. Set VITE_METERED_API_KEY in your .env
// Get key at: https://dashboard.metered.ca → Apps → Your App → TURN credentials
const getIceServers = () => {
  const key = import.meta.env.VITE_METERED_API_KEY;
  if (key) {
    return {
      iceServers: [
        { urls: 'stun:stun.relay.metered.ca:80' },
        {
          urls: 'turn:standard.relay.metered.ca:80',
          username: key,
          credential: key,
        },
        {
          urls: 'turn:standard.relay.metered.ca:80?transport=tcp',
          username: key,
          credential: key,
        },
        {
          urls: 'turn:standard.relay.metered.ca:443',
          username: key,
          credential: key,
        },
        {
          urls: 'turn:standard.relay.metered.ca:443?transport=tcp',
          username: key,
          credential: key,
        },
      ],
      iceCandidatePoolSize: 10,
    };
  }
  return {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };
};

export const useCall = ({ socket, currentUserId, workspaceId }: UseCallProps): CallContextType => {
  const [activeCall, setActiveCall]           = useState<Call | null>(null);
  const [incomingCall, setIncomingCall]       = useState<IncomingCall | null>(null);
  const [isMuted, setIsMuted]                 = useState(false);
  const [isVideoEnabled, setIsVideoEnabled]   = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [localStream, setLocalStream]         = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream]       = useState<MediaStream | null>(null);
  const [callDuration, setCallDuration]       = useState(0);
  const [connectionState, setConnectionState] = useState<string>('disconnected');
  const [mediaError, setMediaError]           = useState<string | null>(null);

  const pcRef             = useRef<RTCPeerConnection | null>(null);
  const localStreamRef    = useRef<MediaStream | null>(null);
  const screenStreamRef   = useRef<MediaStream | null>(null);
  const cameraTrackRef    = useRef<MediaStreamTrack | null>(null);
  const activeCallIdRef   = useRef<string | null>(null);
  const timerRef          = useRef<ReturnType<typeof setInterval> | null>(null);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const isInitiatorRef    = useRef<boolean>(false);
  const targetUserIdRef   = useRef<string | null>(null);
  const isVideoEnabledRef = useRef<boolean>(true);
  const callTypeRef       = useRef<CallType>('voice');

  const isCallActive = !!activeCall;
  const isRinging    = !!incomingCall;
  const isConnected  = connectionState === 'connected' || !!remoteStream;

  // ── Cleanup ──────────────────────────────────────────────────────────────
  const cleanupCall = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    cameraTrackRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    pcRef.current?.close();
    pcRef.current = null;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    iceCandidateQueue.current = [];
    activeCallIdRef.current   = null;
    isInitiatorRef.current    = false;
    targetUserIdRef.current   = null;
    isVideoEnabledRef.current = true;
    setCallDuration(0);
    setConnectionState('disconnected');
    setIsMuted(false);
    setIsVideoEnabled(true);
    setIsScreenSharing(false);
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const start = Date.now();
    timerRef.current = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - start) / 1000));
    }, 1000);
  }, []);

  const getOrCreatePC = useCallback((targetUserId: string, callId: string): RTCPeerConnection => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection(getIceServers());
    pcRef.current = pc;
    targetUserIdRef.current = targetUserId;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket?.emit('webrtc:ice-candidate', { targetUserId, candidate: e.candidate, callId });
      }
    };

    pc.ontrack = (e) => {
      console.log('🎥 Remote track received:', e.track.kind);
      if (e.streams?.[0]) {
        setRemoteStream(e.streams[0]);
      } else {
        const s = new MediaStream();
        s.addTrack(e.track);
        setRemoteStream(s);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('🔌 Connection state:', pc.connectionState);
      setConnectionState(pc.connectionState);
      // Auto-restart ICE on failure
      if (pc.connectionState === 'failed') {
        console.log('🔄 ICE failed — attempting restart...');
        pc.restartIce();
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('🧊 ICE state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        pc.restartIce();
      }
    };

    return pc;
  }, [socket]);

  const addLocalTracksToPc = useCallback((pc: RTCPeerConnection, stream: MediaStream) => {
    const existing = pc.getSenders();
    stream.getTracks().forEach(track => {
      const already = existing.some(s => s.track?.id === track.id);
      if (!already) {
        pc.addTrack(track, stream);
        console.log(`✅ Added ${track.kind} track to PC`);
      }
    });
  }, []);

  const drainIceCandidateQueue = useCallback(async (pc: RTCPeerConnection) => {
    for (const c of iceCandidateQueue.current) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) { console.error('ICE drain error:', e); }
    }
    iceCandidateQueue.current = [];
  }, []);

  const getMediaStream = async (callType: CallType): Promise<MediaStream> => {
    callTypeRef.current = callType;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: callType === 'video'
          ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
          : false,
      });
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) cameraTrackRef.current = videoTrack;
      localStreamRef.current = stream;
      setLocalStream(stream);
      setMediaError(null);
      return stream;
    } catch (err: any) {
      const msg = err.name === 'NotAllowedError'
        ? 'Camera/microphone permission denied.'
        : `Could not access media: ${err.message}`;
      setMediaError(msg);
      throw err;
    }
  };

  // ── Screen Share ──────────────────────────────────────────────────────────
  const startScreenShare = useCallback(async () => {
    if (isScreenSharing || !pcRef.current || !localStreamRef.current) return;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30 } }, audio: false,
      });
      const screenTrack = screenStream.getVideoTracks()[0];
      if (!screenTrack) throw new Error('No screen video track');
      screenStreamRef.current = screenStream;

      const pc = pcRef.current;
      const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (videoSender) {
        await videoSender.replaceTrack(screenTrack);
      } else {
        pc.addTrack(screenTrack, localStreamRef.current);
      }

      const ls = localStreamRef.current;
      ls.getVideoTracks().forEach(t => ls.removeTrack(t));
      ls.addTrack(screenTrack);
      setLocalStream(new MediaStream(ls.getTracks()));
      setIsScreenSharing(true);
      setIsVideoEnabled(true);

      socket?.emit('call:screen-share-started', {
        callId: activeCallIdRef.current,
        targetUserId: targetUserIdRef.current,
      });

      screenTrack.onended = () => stopScreenShare();
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        console.error('Screen share error:', err);
        setMediaError('Could not start screen share.');
      }
    }
  }, [isScreenSharing, socket]);

  const stopScreenShare = useCallback(async () => {
    if (!isScreenSharing && !screenStreamRef.current) return;
    try {
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
      const pc = pcRef.current;
      const ls = localStreamRef.current;

      if (callTypeRef.current === 'video' && cameraTrackRef.current) {
        let cameraTrack = cameraTrackRef.current;
        if (cameraTrack.readyState === 'ended') {
          const ns = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          });
          cameraTrack = ns.getVideoTracks()[0];
          cameraTrackRef.current = cameraTrack;
        }
        if (pc) {
          const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (videoSender) await videoSender.replaceTrack(cameraTrack);
        }
        if (ls) {
          ls.getVideoTracks().forEach(t => ls.removeTrack(t));
          ls.addTrack(cameraTrack);
          setLocalStream(new MediaStream(ls.getTracks()));
        }
      } else {
        if (pc && ls) {
          pc.getSenders().filter(s => s.track?.kind === 'video').forEach(s => pc.removeTrack(s));
          ls.getVideoTracks().forEach(t => { t.stop(); ls.removeTrack(t); });
          setLocalStream(new MediaStream(ls.getTracks()));
        }
      }
      setIsScreenSharing(false);
      socket?.emit('call:screen-share-stopped', {
        callId: activeCallIdRef.current,
        targetUserId: targetUserIdRef.current,
      });
    } catch (err) {
      console.error('Stop screen share error:', err);
      setIsScreenSharing(false);
    }
  }, [isScreenSharing, socket]);

  // ── Socket Events ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onInitiated = (data: { callId: string }) => { activeCallIdRef.current = data.callId; };

    const onIncoming = (data: IncomingCall) => {
      if (activeCallIdRef.current) {
        socket.emit('call:busy', { callId: data.callId, callerId: data.caller.id });
        return;
      }
      setIncomingCall(data);
    };

    const onAccepted = async (data: { call: Call }) => {
      const call = data.call;
      setActiveCall(call);
      activeCallIdRef.current = call._id;
      startTimer();
      const receiverId = call.receiver._id || call.receiver.id || '';
      const pc = getOrCreatePC(receiverId, call._id);
      if (localStreamRef.current) addLocalTracksToPc(pc, localStreamRef.current);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc:offer', { targetUserId: receiverId, offer, callId: call._id });
    };

    const onDeclined  = () => { setIncomingCall(null); setActiveCall(null); cleanupCall(); };
    const onEnded     = () => { setIncomingCall(null); setActiveCall(null); cleanupCall(); };
    const onCancelled = () => { setIncomingCall(null); cleanupCall(); };

    const onOffer = async (data: { offer: RTCSessionDescriptionInit; callId: string; senderId: string }) => {
      if (!activeCallIdRef.current || activeCallIdRef.current !== data.callId) return;
      const pc = getOrCreatePC(data.senderId, data.callId);
      if (localStreamRef.current) addLocalTracksToPc(pc, localStreamRef.current);
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      await drainIceCandidateQueue(pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc:answer', { targetUserId: data.senderId, answer, callId: data.callId });
    };

    const onAnswer = async (data: { answer: RTCSessionDescriptionInit; callId: string }) => {
      const pc = pcRef.current;
      if (pc && activeCallIdRef.current === data.callId) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        await drainIceCandidateQueue(pc);
      }
    };

    const onIceCandidate = async (data: { candidate: RTCIceCandidateInit; callId: string }) => {
      if (activeCallIdRef.current !== data.callId) return;
      const pc = pcRef.current;
      if (!pc) return;
      if (pc.remoteDescription) {
        try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); }
        catch (e) { console.error('ICE error:', e); }
      } else {
        iceCandidateQueue.current.push(data.candidate);
      }
    };

    socket.on('call:initiated',            onInitiated);
    socket.on('call:incoming',             onIncoming);
    socket.on('call:accepted',             onAccepted);
    socket.on('call:declined',             onDeclined);
    socket.on('call:ended',                onEnded);
    socket.on('call:cancelled',            onCancelled);
    socket.on('webrtc:offer',              onOffer);
    socket.on('webrtc:answer',             onAnswer);
    socket.on('webrtc:ice-candidate',      onIceCandidate);

    return () => {
      socket.off('call:initiated',         onInitiated);
      socket.off('call:incoming',          onIncoming);
      socket.off('call:accepted',          onAccepted);
      socket.off('call:declined',          onDeclined);
      socket.off('call:ended',             onEnded);
      socket.off('call:cancelled',         onCancelled);
      socket.off('webrtc:offer',           onOffer);
      socket.off('webrtc:answer',          onAnswer);
      socket.off('webrtc:ice-candidate',   onIceCandidate);
    };
  }, [socket, getOrCreatePC, addLocalTracksToPc, drainIceCandidateQueue, cleanupCall, startTimer]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const initiateCall = async (receiverId: string, callType: CallType) => {
    if (activeCallIdRef.current) return;
    try {
      isInitiatorRef.current = true;
      await getMediaStream(callType);
      socket?.emit('call:initiate', { receiverId, callType, workspaceId });
    } catch (err) {
      console.error('Failed to initiate call:', err);
      cleanupCall();
    }
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    try {
      isInitiatorRef.current = false;
      const stream = await getMediaStream(incomingCall.callType);
      activeCallIdRef.current = incomingCall.callId;
      const pc = getOrCreatePC(
        incomingCall.caller.id || incomingCall.caller._id || '',
        incomingCall.callId
      );
      addLocalTracksToPc(pc, stream);
      socket?.emit('call:accept', { callId: incomingCall.callId });
      setActiveCall({
        _id: incomingCall.callId,
        caller: incomingCall.caller,
        receiver: { id: currentUserId, _id: currentUserId, name: 'Me', email: '' },
        callType: incomingCall.callType,
        status: 'ongoing',
        startTime: new Date(),
      });
      setIncomingCall(null);
      startTimer();
    } catch (err) {
      console.error('Failed to accept call:', err);
      declineCall();
    }
  };

  const declineCall = () => {
    if (!incomingCall) return;
    socket?.emit('call:decline', { callId: incomingCall.callId });
    setIncomingCall(null);
    cleanupCall();
  };

  const endCall = () => {
    const callId = activeCallIdRef.current || activeCall?._id;
    if (callId) socket?.emit('call:end', { callId, duration: callDuration });
    setActiveCall(null);
    setIncomingCall(null);
    cleanupCall();
  };

  const cancelCall = () => {
    const callId = activeCallIdRef.current;
    if (callId) socket?.emit('call:cancel', { callId });
    setActiveCall(null);
    cleanupCall();
  };

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(p => !p);
  };

  const toggleVideo = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const videoTracks = stream.getVideoTracks();
    const pc = pcRef.current;

    if (isVideoEnabledRef.current) {
      videoTracks.forEach(t => { t.enabled = false; });
      isVideoEnabledRef.current = false;
      setIsVideoEnabled(false);
    } else {
      const liveTrack = videoTracks.find(t => t.readyState === 'live');
      if (liveTrack) {
        liveTrack.enabled = true;
        isVideoEnabledRef.current = true;
        setIsVideoEnabled(true);
      } else {
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          });
          const newTrack = newStream.getVideoTracks()[0];
          videoTracks.forEach(t => { stream.removeTrack(t); t.stop(); });
          stream.addTrack(newTrack);
          cameraTrackRef.current = newTrack;
          setLocalStream(new MediaStream(stream.getTracks()));
          if (pc) {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender) await sender.replaceTrack(newTrack);
            else pc.addTrack(newTrack, stream);
          }
          isVideoEnabledRef.current = true;
          setIsVideoEnabled(true);
        } catch (err) {
          console.error('Failed to re-enable camera:', err);
          setMediaError('Could not re-enable camera.');
        }
      }
    }
  }, []);

  return {
    activeCall, incomingCall, isCallActive, isRinging,
    isMuted, isVideoEnabled, isScreenSharing,
    localStream, remoteStream, isConnected,
    callDuration, connectionState, mediaError,
    initiateCall, acceptCall, declineCall, endCall, cancelCall,
    toggleMute, toggleVideo, startScreenShare, stopScreenShare,
  };
};