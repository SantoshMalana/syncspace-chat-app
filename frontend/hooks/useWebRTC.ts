import { useState, useCallback, useRef, useEffect } from 'react';
import SimplePeer from 'simple-peer';
import { Socket } from 'socket.io-client';

interface UseWebRTCProps {
  socket: Socket | null;
  localStream: MediaStream | null;
  callId: string;
  isInitiator: boolean;
  onRemoteStream: (stream: MediaStream) => void;
  onConnectionStateChange?: (state: string) => void;
}

export const useWebRTC = ({
  socket,
  localStream,
  callId,
  isInitiator,
  onRemoteStream,
  onConnectionStateChange,
}: UseWebRTCProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<string>('new');
  const peerRef = useRef<SimplePeer.Instance | null>(null);

  // Initialize peer connection
  const initializePeer = useCallback((targetUserId: string) => {
    if (!localStream) {
      console.error('❌ No local stream available');
      return;
    }

    if (peerRef.current) {
      console.log('⚠️ Peer already exists, destroying old one');
      peerRef.current.destroy();
    }

    console.log(`🔄 Initializing peer connection (initiator: ${isInitiator})`);

    const peer = new SimplePeer({
      initiator: isInitiator,
      stream: localStream,
      trickle: true,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
        ],
      },
    });

    peerRef.current = peer;

    // When peer generates a signal (offer/answer)
    peer.on('signal', (data) => {
      console.log('📤 Sending signal:', data.type);
      
      if (data.type === 'offer') {
        socket?.emit('webrtc:offer', {
          targetUserId,
          offer: data,
          callId,
        });
      } else if (data.type === 'answer') {
        socket?.emit('webrtc:answer', {
          targetUserId,
          answer: data,
          callId,
        });
      }
    });

    // When we receive remote stream
    peer.on('stream', (remoteStream) => {
      console.log('✅ Received remote stream');
      onRemoteStream(remoteStream);
    });

    // When connection is established
    peer.on('connect', () => {
      console.log('✅ Peer connection established');
      setIsConnected(true);
      setConnectionState('connected');
      onConnectionStateChange?.('connected');
    });

    // Handle errors
    peer.on('error', (err) => {
      console.error('❌ Peer error:', err);
      setConnectionState('failed');
      onConnectionStateChange?.('failed');
    });

    // Handle connection close
    peer.on('close', () => {
      console.log('🔌 Peer connection closed');
      setIsConnected(false);
      setConnectionState('closed');
      onConnectionStateChange?.('closed');
    });

    return peer;
  }, [localStream, isInitiator, socket, callId, onRemoteStream, onConnectionStateChange]);

  // Handle incoming signal (offer/answer)
  const handleSignal = useCallback((signal: SimplePeer.SignalData) => {
    if (!peerRef.current) {
      console.error('❌ No peer connection to handle signal');
      return;
    }

    try {
      console.log('📥 Handling incoming signal:', signal.type);
      peerRef.current.signal(signal);
    } catch (err) {
      console.error('❌ Error handling signal:', err);
    }
  }, []);

  // Handle ICE candidate
  const handleIceCandidate = useCallback((candidate: RTCIceCandidateInit) => {
    if (!peerRef.current) {
      console.error('❌ No peer connection to add ICE candidate');
      return;
    }

    try {
      console.log('📥 Adding ICE candidate');
      peerRef.current.signal({ candidate });
    } catch (err) {
      console.error('❌ Error adding ICE candidate:', err);
    }
  }, []);

  // Destroy peer connection
  const destroyPeer = useCallback(() => {
    if (peerRef.current) {
      console.log('🛑 Destroying peer connection');
      peerRef.current.destroy();
      peerRef.current = null;
      setIsConnected(false);
      setConnectionState('closed');
    }
  }, []);

  // Setup socket listeners for WebRTC signaling
  useEffect(() => {
    if (!socket) return;

    const handleOffer = (data: any) => {
      console.log('📥 Received WebRTC offer');
      handleSignal(data.offer);
    };

    const handleAnswer = (data: any) => {
      console.log('📥 Received WebRTC answer');
      handleSignal(data.answer);
    };

    const handleIceCandidate = (data: any) => {
      console.log('📥 Received ICE candidate');
      if (data.candidate) {
        handleSignal({ candidate: data.candidate });
      }
    };

    socket.on('webrtc:offer', handleOffer);
    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:ice-candidate', handleIceCandidate);

    return () => {
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice-candidate', handleIceCandidate);
    };
  }, [socket, handleSignal]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      destroyPeer();
    };
  }, [destroyPeer]);

  return {
    peer: peerRef.current,
    isConnected,
    connectionState,
    initializePeer,
    handleSignal,
    handleIceCandidate,
    destroyPeer,
  };
};