import { useState, useCallback, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { useMediaStream } from './useMediaStream';
import { useWebRTC } from './useWebRTC';
import { Call, IncomingCall, CallType } from '../types/call.types';

interface UseCallProps {
  socket: Socket | null;
  currentUserId: string;
  workspaceId: string;
}

export const useCall = ({ socket, currentUserId, workspaceId }: UseCallProps) => {
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);

  const {
    localStream,
    error: mediaError,
    getMediaStream,
    stopMediaStream,
    toggleAudio,
  } = useMediaStream();

  const {
    isConnected,
    connectionState,
    initializePeer,
    destroyPeer,
  } = useWebRTC({
    socket,
    localStream,
    callId: activeCall?._id || '',
    isInitiator: activeCall?.caller.id === currentUserId,
    onRemoteStream: setRemoteStream,
    onConnectionStateChange: (state) => {
      console.log('Connection state changed:', state);
    },
  });

  // Initiate a call
  const initiateCall = useCallback(async (receiverId: string, callType: CallType) => {
    try {
      console.log(`📞 Initiating ${callType} call to user:`, receiverId);

      // Get media stream
      const stream = await getMediaStream({
        audio: true,
        video: callType === 'video',
      });

      if (!stream) {
        throw new Error('Failed to get media stream');
      }

      // Create call record in backend
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/calls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          receiverId,
          callType,
          workspaceId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create call');
      }

      const { call } = await response.json();
      setActiveCall(call);

      // Emit call initiation via socket
      socket?.emit('call:initiate', {
        callId: call._id,
        receiverId,
        callType,
      });

      console.log('✅ Call initiated successfully:', call._id);
    } catch (error) {
      console.error('❌ Error initiating call:', error);
      stopMediaStream();
      throw error;
    }
  }, [socket, getMediaStream, stopMediaStream, workspaceId]);

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;

    try {
      console.log('✅ Accepting call:', incomingCall.callId);

      // Get media stream
      const stream = await getMediaStream({
        audio: true,
        video: incomingCall.callType === 'video',
      });

      if (!stream) {
        throw new Error('Failed to get media stream');
      }

      // Initialize peer connection as receiver
      initializePeer(incomingCall.caller.id);

      // Notify caller that call was accepted
      socket?.emit('call:accept', {
        callId: incomingCall.callId,
        callerId: incomingCall.caller.id,
      });

      // Update call status to ongoing
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/calls/${incomingCall.callId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            status: 'ongoing',
            startTime: new Date(),
          }),
        }
      );

      if (response.ok) {
        const { call } = await response.json();
        setActiveCall(call);
        setCallStartTime(new Date());
      }

      setIncomingCall(null);
      console.log('✅ Call accepted successfully');
    } catch (error) {
      console.error('❌ Error accepting call:', error);
      declineCall();
    }
  }, [incomingCall, socket, getMediaStream, initializePeer]);

  // Decline incoming call
  const declineCall = useCallback(() => {
    if (!incomingCall) return;

    console.log('❌ Declining call:', incomingCall.callId);

    socket?.emit('call:decline', {
      callId: incomingCall.callId,
      callerId: incomingCall.caller.id,
    });

    setIncomingCall(null);
  }, [incomingCall, socket]);

  // End active call
  const endCall = useCallback(async () => {
    if (!activeCall) return;

    try {
      console.log('📴 Ending call:', activeCall._id);

      const endTime = new Date();
      const duration = callStartTime
        ? Math.floor((endTime.getTime() - callStartTime.getTime()) / 1000)
        : 0;

      // Get the other user's ID
      const otherUserId =
        activeCall.caller.id === currentUserId
          ? activeCall.receiver.id
          : activeCall.caller.id;

      // Notify other user
      socket?.emit('call:end', {
        callId: activeCall._id,
        otherUserId,
        duration,
      });

      // Update call in backend
      await fetch(`${import.meta.env.VITE_API_URL}/api/calls/${activeCall._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          status: 'ended',
          endTime,
          duration,
        }),
      });

      // Cleanup
      destroyPeer();
      stopMediaStream();
      setActiveCall(null);
      setRemoteStream(null);
      setCallStartTime(null);
      setCallDuration(0);
      setIsMuted(false);

      console.log('✅ Call ended successfully');
    } catch (error) {
      console.error('❌ Error ending call:', error);
    }
  }, [activeCall, socket, stopMediaStream, destroyPeer, callStartTime, currentUserId]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    toggleAudio(!newMutedState);
    console.log(`🎤 ${newMutedState ? 'Muted' : 'Unmuted'}`);
  }, [isMuted, toggleAudio]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Incoming call
    const handleIncomingCall = (data: any) => {
      console.log('📞 Incoming call from:', data.caller.name);
      setIncomingCall({
        callId: data.callId,
        caller: data.caller,
        callType: data.callType,
      });
    };

    // Call accepted by receiver
    const handleCallAccepted = (data: any) => {
      console.log('✅ Call accepted by:', data.receiver.name);
      setCallStartTime(new Date());
      
      // Initialize peer connection as caller (initiator)
      initializePeer(data.receiver.id);
    };

    // Call declined by receiver
    const handleCallDeclined = () => {
      console.log('❌ Call was declined');
      alert('Call was declined');
      stopMediaStream();
      setActiveCall(null);
    };

    // Call cancelled by caller
    const handleCallCancelled = () => {
      console.log('❌ Call was cancelled');
      setIncomingCall(null);
    };

    // Call ended by other user
    const handleCallEnded = (data: any) => {
      console.log('📴 Call ended by other user');
      destroyPeer();
      stopMediaStream();
      setActiveCall(null);
      setRemoteStream(null);
      setCallStartTime(null);
      setCallDuration(0);
      setIsMuted(false);
    };

    // Call error
    const handleCallError = (data: any) => {
      console.error('❌ Call error:', data.message);
      alert(`Call error: ${data.message}`);
      stopMediaStream();
      setActiveCall(null);
      setIncomingCall(null);
    };

    socket.on('call:incoming', handleIncomingCall);
    socket.on('call:accepted', handleCallAccepted);
    socket.on('call:declined', handleCallDeclined);
    socket.on('call:cancelled', handleCallCancelled);
    socket.on('call:ended', handleCallEnded);
    socket.on('call:error', handleCallError);

    return () => {
      socket.off('call:incoming', handleIncomingCall);
      socket.off('call:accepted', handleCallAccepted);
      socket.off('call:declined', handleCallDeclined);
      socket.off('call:cancelled', handleCallCancelled);
      socket.off('call:ended', handleCallEnded);
      socket.off('call:error', handleCallError);
    };
  }, [socket, stopMediaStream, destroyPeer, initializePeer]);

  // Call duration timer
  useEffect(() => {
    if (!callStartTime || !activeCall) return;

    const interval = setInterval(() => {
      const now = new Date();
      const duration = Math.floor((now.getTime() - callStartTime.getTime()) / 1000);
      setCallDuration(duration);
    }, 1000);

    return () => clearInterval(interval);
  }, [callStartTime, activeCall]);

  return {
    activeCall,
    incomingCall,
    isMuted,
    localStream,
    remoteStream,
    isConnected,
    connectionState,
    mediaError,
    callDuration,
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
  };
};