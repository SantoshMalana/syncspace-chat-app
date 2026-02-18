// frontend/src/hooks/useCall.ts
// Fixed WebRTC call flow:
// - Receiver creates PC on acceptCall, reuses it when offer arrives (no double-create)
// - Tracks added to PC immediately when stream is ready
// - ICE candidates queued until remote description is set

import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import type { Call, CallContextType, CallType, IncomingCall } from '../types/call.types';

interface UseCallProps {
  socket: Socket | null;
  currentUserId: string;
  workspaceId: string;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const useCall = ({ socket, currentUserId, workspaceId }: UseCallProps): CallContextType => {
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionState, setConnectionState] = useState<string>('disconnected');
  const [mediaError, setMediaError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const activeCallIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // ✅ Queue ICE candidates that arrive before remote description is set
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  // ✅ Track whether we are the initiator (caller) or receiver
  const isInitiatorRef = useRef<boolean>(false);
  // ✅ Track the target peer's userId for signaling
  const targetUserIdRef = useRef<string | null>(null);

  const isCallActive = !!activeCall;
  const isRinging = !!incomingCall;
  const isConnected = connectionState === 'connected';

  // ─── Cleanup ────────────────────────────────────────────────────────────────
  const cleanupCall = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);

    pcRef.current?.close();
    pcRef.current = null;

    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    iceCandidateQueue.current = [];
    activeCallIdRef.current = null;
    isInitiatorRef.current = false;
    targetUserIdRef.current = null;

    setCallDuration(0);
    setConnectionState('disconnected');
    setIsMuted(false);
    setIsVideoEnabled(true);
  }, []);

  // ─── Timer ──────────────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const start = Date.now();
    timerRef.current = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - start) / 1000));
    }, 1000);
  }, []);

  // ─── Create / Get Peer Connection ───────────────────────────────────────────
  // ✅ KEY FIX: getOrCreatePC reuses existing PC instead of creating a new one.
  // This prevents the receiver's PC (created in acceptCall) from being replaced
  // when the offer arrives, which caused tracks to be lost.
  const getOrCreatePC = useCallback((targetUserId: string, callId: string): RTCPeerConnection => {
    if (pcRef.current) return pcRef.current; // reuse!

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;
    targetUserIdRef.current = targetUserId;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket?.emit('webrtc:ice-candidate', {
          targetUserId,
          candidate: e.candidate,
          callId,
        });
      }
    };

    pc.ontrack = (e) => {
      console.log('🎥 Remote track received');
      setRemoteStream(e.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      console.log('🔌 Connection state:', pc.connectionState);
      setConnectionState(pc.connectionState);
    };

    return pc;
  }, [socket]);

  // ─── Add local tracks to PC ─────────────────────────────────────────────────
  const addLocalTracksToPc = useCallback((pc: RTCPeerConnection, stream: MediaStream) => {
    const existingSenders = pc.getSenders();
    stream.getTracks().forEach(track => {
      const alreadyAdded = existingSenders.some(s => s.track?.id === track.id);
      if (!alreadyAdded) {
        pc.addTrack(track, stream);
        console.log(`✅ Added ${track.kind} track to PC`);
      }
    });
  }, []);

  // ─── Drain ICE queue after remote description is set ────────────────────────
  const drainIceCandidateQueue = useCallback(async (pc: RTCPeerConnection) => {
    for (const candidate of iceCandidateQueue.current) {
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { console.error('ICE drain error:', e); }
    }
    iceCandidateQueue.current = [];
  }, []);

  // ─── Media ──────────────────────────────────────────────────────────────────
  const getMediaStream = async (callType: CallType): Promise<MediaStream> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: callType === 'video'
          ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
          : false,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setMediaError(null);
      return stream;
    } catch (err: any) {
      const msg = err.name === 'NotAllowedError'
        ? 'Camera/microphone permission denied. Please allow access and try again.'
        : `Could not access camera/microphone: ${err.message}`;
      setMediaError(msg);
      throw err;
    }
  };

  // ─── Socket Events ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) {
      console.log('⚠️ useCall: socket is null, skipping listener registration');
      return;
    }
    console.log('🔌 useCall: registering call listeners on socket', socket.id);

    // Caller: server acknowledged call:initiate and assigned a callId
    const onInitiated = (data: { callId: string }) => {
      console.log('📋 Got callId:', data.callId);
      activeCallIdRef.current = data.callId;
    };

    // Receiver: incoming call notification
    const onIncoming = (data: IncomingCall) => {
      console.log('📞 call:incoming received! from:', data.caller.name || data.caller.id, 'callId:', data.callId);
      if (activeCallIdRef.current) {
        socket.emit('call:busy', { callId: data.callId, callerId: data.caller.id });
        return;
      }
      setIncomingCall(data);
    };

    // Caller: call was accepted → send WebRTC offer
    const onAccepted = async (data: { call: Call }) => {
      const call = data.call;
      console.log('✅ Call accepted, creating offer...');
      setActiveCall(call);
      activeCallIdRef.current = call._id;
      startTimer();

      const receiverId = call.receiver._id || call.receiver.id || '';
      const pc = getOrCreatePC(receiverId, call._id);

      // Add local tracks (stream was already captured in initiateCall)
      if (localStreamRef.current) {
        addLocalTracksToPc(pc, localStreamRef.current);
      }

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('webrtc:offer', { targetUserId: receiverId, offer, callId: call._id });
      console.log('📤 Offer sent to', receiverId);
    };

    const onDeclined = () => { console.log('❌ Call declined'); setIncomingCall(null); setActiveCall(null); cleanupCall(); };
    const onEnded = () => { console.log('📴 Call ended'); setIncomingCall(null); setActiveCall(null); cleanupCall(); };
    const onCancelled = () => { console.log('🚫 Call cancelled'); setIncomingCall(null); cleanupCall(); };

    // Receiver: gets offer from caller
    const onOffer = async (data: { offer: RTCSessionDescriptionInit; callId: string; senderId: string }) => {
      console.log('📥 Received WebRTC offer from', data.senderId);
      const currentCallId = activeCallIdRef.current;
      if (!currentCallId || currentCallId !== data.callId) {
        console.warn('⚠️ Offer callId mismatch, ignoring');
        return;
      }

      // ✅ KEY FIX: getOrCreatePC — reuses the PC created during acceptCall,
      // so the tracks we already added are preserved
      const pc = getOrCreatePC(data.senderId, data.callId);

      // Make sure local tracks are on this PC (in case they weren't added yet)
      if (localStreamRef.current) {
        addLocalTracksToPc(pc, localStreamRef.current);
      }

      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      await drainIceCandidateQueue(pc); // flush any early ICE candidates

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('webrtc:answer', { targetUserId: data.senderId, answer, callId: data.callId });
      console.log('📤 Answer sent to', data.senderId);
    };

    // Caller: gets answer from receiver
    const onAnswer = async (data: { answer: RTCSessionDescriptionInit; callId: string }) => {
      console.log('📥 Received WebRTC answer');
      const pc = pcRef.current;
      if (pc && activeCallIdRef.current === data.callId) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        await drainIceCandidateQueue(pc);
        console.log('✅ Remote description set, ICE negotiation starting...');
      }
    };

    // Both: ICE candidates
    const onIceCandidate = async (data: { candidate: RTCIceCandidateInit; callId: string }) => {
      if (activeCallIdRef.current !== data.callId) return;
      const pc = pcRef.current;
      if (!pc) return;

      if (pc.remoteDescription) {
        // Remote description already set — add immediately
        try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); }
        catch (e) { console.error('ICE error:', e); }
      } else {
        // Queue for later
        console.log('⏳ Queuing ICE candidate (no remote desc yet)');
        iceCandidateQueue.current.push(data.candidate);
      }
    };

    socket.on('call:initiated', onInitiated);
    socket.on('call:incoming', onIncoming);
    socket.on('call:accepted', onAccepted);
    socket.on('call:declined', onDeclined);
    socket.on('call:ended', onEnded);
    socket.on('call:cancelled', onCancelled);
    socket.on('webrtc:offer', onOffer);
    socket.on('webrtc:answer', onAnswer);
    socket.on('webrtc:ice-candidate', onIceCandidate);

    return () => {
      socket.off('call:initiated', onInitiated);
      socket.off('call:incoming', onIncoming);
      socket.off('call:accepted', onAccepted);
      socket.off('call:declined', onDeclined);
      socket.off('call:ended', onEnded);
      socket.off('call:cancelled', onCancelled);
      socket.off('webrtc:offer', onOffer);
      socket.off('webrtc:answer', onAnswer);
      socket.off('webrtc:ice-candidate', onIceCandidate);
    };
  }, [socket, getOrCreatePC, addLocalTracksToPc, drainIceCandidateQueue, cleanupCall, startTimer]);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const initiateCall = async (receiverId: string, callType: CallType) => {
    if (activeCallIdRef.current) return;
    try {
      console.log(`📞 Initiating ${callType} call to`, receiverId);
      isInitiatorRef.current = true;
      await getMediaStream(callType);

      // ✅ FIX: call:initiated is now handled in the main useEffect listener,
      // not with socket.once() here — so it always fires on the correct socket.
      socket?.emit('call:initiate', { receiverId, callType, workspaceId });
    } catch (err) {
      console.error('Failed to initiate call:', err);
      cleanupCall();
    }
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    try {
      console.log('✅ Accepting call:', incomingCall.callId);
      isInitiatorRef.current = false;

      const stream = await getMediaStream(incomingCall.callType);
      activeCallIdRef.current = incomingCall.callId;

      // ✅ KEY FIX: Create PC now and add tracks immediately,
      // so when the offer arrives the tracks are already on the connection
      const pc = getOrCreatePC(incomingCall.caller.id || incomingCall.caller._id || '', incomingCall.callId);
      addLocalTracksToPc(pc, stream);

      socket?.emit('call:accept', { callId: incomingCall.callId });

      // Set up local UI state immediately
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

  const toggleVideo = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsVideoEnabled(p => !p);
  };

  return {
    activeCall, incomingCall, isCallActive, isRinging,
    isMuted, isVideoEnabled, localStream, remoteStream,
    isConnected, callDuration, connectionState, mediaError,
    initiateCall, acceptCall, declineCall, endCall, cancelCall,
    toggleMute, toggleVideo,
  };
};