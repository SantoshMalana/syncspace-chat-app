// frontend/src/hooks/useScreenShare.ts

import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';

export interface ScreenShareRoom {
  roomId: string;
  hostId: string;
  hostName: string;
  channelId: string;
  workspaceId: string;
  viewerCount?: number;
}

interface UseScreenShareProps {
  socket: Socket | null;
  currentUserId: string;
  workspaceId: string;
}

const getIceServers = () => {
  return {
    iceServers: [
      { urls: 'stun:stun.relay.metered.ca:80' },
      { urls: 'turn:syncspaceapplication.metered.live:80', username: 'E7VM0FVYwGYKfra_mi5be7Ph3N5BR-rHw4MXYRHHhU6pyHfB', credential: 'E7VM0FVYwGYKfra_mi5be7Ph3N5BR-rHw4MXYRHHhU6pyHfB' },
      { urls: 'turn:syncspaceapplication.metered.live:80?transport=tcp', username: 'E7VM0FVYwGYKfra_mi5be7Ph3N5BR-rHw4MXYRHHhU6pyHfB', credential: 'E7VM0FVYwGYKfra_mi5be7Ph3N5BR-rHw4MXYRHHhU6pyHfB' },
      { urls: 'turn:syncspaceapplication.metered.live:443', username: 'E7VM0FVYwGYKfra_mi5be7Ph3N5BR-rHw4MXYRHHhU6pyHfB', credential: 'E7VM0FVYwGYKfra_mi5be7Ph3N5BR-rHw4MXYRHHhU6pyHfB' },
      { urls: 'turn:syncspaceapplication.metered.live:443?transport=tcp', username: 'E7VM0FVYwGYKfra_mi5be7Ph3N5BR-rHw4MXYRHHhU6pyHfB', credential: 'E7VM0FVYwGYKfra_mi5be7Ph3N5BR-rHw4MXYRHHhU6pyHfB' },
      { urls: 'turns:syncspaceapplication.metered.live:443?transport=tcp', username: 'E7VM0FVYwGYKfra_mi5be7Ph3N5BR-rHw4MXYRHHhU6pyHfB', credential: 'E7VM0FVYwGYKfra_mi5be7Ph3N5BR-rHw4MXYRHHhU6pyHfB' },
    ],
    iceCandidatePoolSize: 10,
  };
};

export const useScreenShare = ({ socket, currentUserId, workspaceId }: UseScreenShareProps) => {
  const [isHosting, setIsHosting] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [activeRoom, setActiveRoom] = useState<ScreenShareRoom | null>(null);
  const [availableRooms, setAvailableRooms] = useState<ScreenShareRoom[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<{ userId: string; name: string; text: string; time: number }[]>([]);

  // Refs — always current, safe to use inside socket callbacks
  const viewerPCsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const viewerPCRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const activeRoomRef = useRef<ScreenShareRoom | null>(null);
  const isHostingRef = useRef(false);
  const isViewingRef = useRef(false);
  const pendingRoomIdRef = useRef<string | null>(null); // roomId we're joining, before server confirms
  const iceCandidateQueues = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  // Keep refs in sync
  useEffect(() => { activeRoomRef.current = activeRoom; }, [activeRoom]);
  useEffect(() => { isHostingRef.current = isHosting; }, [isHosting]);
  useEffect(() => { isViewingRef.current = isViewing; }, [isViewing]);

  // ─── Cleanup ───────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    viewerPCsRef.current.forEach(pc => pc.close());
    viewerPCsRef.current.clear();
    viewerPCRef.current?.close();
    viewerPCRef.current = null;
    iceCandidateQueues.current.clear();
    setIsHosting(false);
    setIsViewing(false);
    setActiveRoom(null);
    setViewerCount(0);
    setError(null);
    pendingRoomIdRef.current = null;
    setChatMessages([]);
  }, []);

  // ─── Host: start room ─────────────────────────────────────────────────────
  const startRoom = useCallback(async (channelId: string) => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30 }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: true,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsHosting(true);
      setError(null);
      socket?.emit('screenshare:start', { channelId, workspaceId });
      // Auto-end if user clicks browser's stop button
      stream.getVideoTracks()[0].onended = () => endRoom();
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') setError('Could not start screen share');
      setIsHosting(false);
    }
  }, [socket, workspaceId]);

  // ─── Host: end room ───────────────────────────────────────────────────────
  const endRoom = useCallback(() => {
    const room = activeRoomRef.current;
    if (room) socket?.emit('screenshare:end', { roomId: room.roomId });
    cleanup();
  }, [socket, cleanup]);

  // ─── Viewer: join room ────────────────────────────────────────────────────
  const joinRoom = useCallback((roomId: string) => {
    pendingRoomIdRef.current = roomId;
    setIsViewing(true);
    setError(null);
    socket?.emit('screenshare:join', { roomId });
  }, [socket]);

  // ─── Viewer: leave room ───────────────────────────────────────────────────
  const leaveRoom = useCallback(() => {
    const room = activeRoomRef.current;
    if (room) socket?.emit('screenshare:leave', { roomId: room.roomId });
    cleanup();
  }, [socket, cleanup]);

  // ─── Host: create PC for a viewer ────────────────────────────────────────
  const createViewerPC = useCallback((viewerId: string, roomId: string): RTCPeerConnection => {
    if (viewerPCsRef.current.has(viewerId)) return viewerPCsRef.current.get(viewerId)!;

    const pc = new RTCPeerConnection(getIceServers());
    viewerPCsRef.current.set(viewerId, pc);
    iceCandidateQueues.current.set(viewerId, []);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!));
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket?.emit('screenshare:ice', { targetUserId: viewerId, candidate: e.candidate, roomId });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        pc.close();
        viewerPCsRef.current.delete(viewerId);
      }
    };

    return pc;
  }, [socket]);

  // ─── Drain ICE queue ─────────────────────────────────────────────────────
  const drainIce = async (pc: RTCPeerConnection, peerId: string) => {
    const queue = iceCandidateQueues.current.get(peerId) || [];
    for (const c of queue) { try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { } }
    iceCandidateQueues.current.set(peerId, []);
  };

  // ─── Chat ─────────────────────────────────────────────────────────────────
  const sendChat = useCallback((text: string, userName: string) => {
    const room = activeRoomRef.current;
    if (!room || !text.trim()) return;
    socket?.emit('screenshare:chat', { roomId: room.roomId, text, workspaceId });
    setChatMessages(prev => [...prev, { userId: currentUserId, name: userName, text, time: Date.now() }]);
  }, [socket, currentUserId, workspaceId]);

  const refreshRooms = useCallback(() => {
    socket?.emit('screenshare:list', { workspaceId });
  }, [socket, workspaceId]);

  // ─── Socket events ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // Host: server confirmed room created
    const onStarted = (data: { roomId: string; channelId: string }) => {
      console.log('🖥️ Screen share room started:', data.roomId);
      const room: ScreenShareRoom = {
        roomId: data.roomId,
        hostId: currentUserId,
        hostName: 'You',
        channelId: data.channelId,
        workspaceId,
      };
      setActiveRoom(room);
    };

    // Viewer: server confirmed join — now wait for host offer
    const onJoined = (data: { roomId: string; hostId: string; hostName: string; channelId: string; workspaceId: string; viewerCount: number }) => {
      console.log('👁️ Joined screen share room:', data.roomId);
      const room: ScreenShareRoom = {
        roomId: data.roomId,
        hostId: data.hostId,
        hostName: data.hostName,
        channelId: data.channelId,
        workspaceId: data.workspaceId,
        viewerCount: data.viewerCount,
      };
      setActiveRoom(room);
      setViewerCount(data.viewerCount);
    };

    // Host: new viewer joined — send them an offer
    const onViewerJoined = async (data: { viewerId: string; viewerName: string; roomId: string }) => {
      console.log('👤 Viewer joined, sending offer to:', data.viewerName);
      const pc = createViewerPC(data.viewerId, data.roomId);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('screenshare:offer', { targetUserId: data.viewerId, offer, roomId: data.roomId });
        console.log('📤 Offer sent to viewer:', data.viewerName);
      } catch (err) {
        console.error('Failed to create offer for viewer:', err);
      }
    };

    // Viewer: received offer from host — create answer
    const onOffer = async (data: { offer: RTCSessionDescriptionInit; roomId: string; hostId: string }) => {
      console.log('📥 Received offer from host, creating answer...');
      try {
        const pc = new RTCPeerConnection(getIceServers());
        viewerPCRef.current = pc;

        pc.ontrack = (e) => {
          console.log('🎥 Received remote track from host');
          const stream = e.streams?.[0] || new MediaStream([e.track]);
          setRemoteStream(stream);
        };

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            socket.emit('screenshare:ice', { targetUserId: data.hostId, candidate: e.candidate, roomId: data.roomId });
          }
        };

        pc.onconnectionstatechange = () => {
          console.log('🔌 Viewer PC state:', pc.connectionState);
        };

        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        await drainIce(pc, data.hostId);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('screenshare:answer', { targetUserId: data.hostId, answer, roomId: data.roomId });
        console.log('📤 Answer sent to host');
      } catch (err) {
        console.error('Failed to handle offer:', err);
      }
    };

    // Host: received answer from viewer
    const onAnswer = async (data: { answer: RTCSessionDescriptionInit; viewerId: string; roomId: string }) => {
      console.log('📥 Received answer from viewer:', data.viewerId);
      const pc = viewerPCsRef.current.get(data.viewerId);
      if (!pc) { console.warn('No PC found for viewer:', data.viewerId); return; }
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        await drainIce(pc, data.viewerId);
      } catch (err) {
        console.error('Failed to handle answer:', err);
      }
    };

    // ICE candidate from either side
    const onIce = async (data: { candidate: RTCIceCandidateInit; senderId: string; roomId: string }) => {
      // Try host-side viewer PCs first
      const hostPC = viewerPCsRef.current.get(data.senderId);
      const pc = hostPC || viewerPCRef.current;

      if (!pc) {
        const q = iceCandidateQueues.current.get(data.senderId) || [];
        q.push(data.candidate);
        iceCandidateQueues.current.set(data.senderId, q);
        return;
      }

      if (pc.remoteDescription) {
        try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch { }
      } else {
        const q = iceCandidateQueues.current.get(data.senderId) || [];
        q.push(data.candidate);
        iceCandidateQueues.current.set(data.senderId, q);
      }
    };

    const onViewerCount = (data: { count: number }) => setViewerCount(data.count);

    const onEnded = (data: { roomId: string }) => {
      console.log('📵 Screen share session ended:', data.roomId);
      cleanup();
    };

    const onAvailable = (data: ScreenShareRoom) => {
      setAvailableRooms(prev => {
        if (prev.find(r => r.roomId === data.roomId)) return prev;
        return [...prev, data];
      });
    };

    const onUnavailable = (data: { roomId: string }) => {
      setAvailableRooms(prev => prev.filter(r => r.roomId !== data.roomId));
    };

    const onList = (data: { rooms: ScreenShareRoom[] }) => setAvailableRooms(data.rooms);

    const onChat = (data: { userId: string; name: string; text: string; time: number }) => {
      if (data.userId !== currentUserId) {
        setChatMessages(prev => [...prev, data]);
      }
    };

    socket.on('screenshare:started', onStarted);
    socket.on('screenshare:joined', onJoined);
    socket.on('screenshare:viewer-joined', onViewerJoined);
    socket.on('screenshare:offer', onOffer);
    socket.on('screenshare:answer', onAnswer);
    socket.on('screenshare:ice', onIce);
    socket.on('screenshare:viewer-count', onViewerCount);
    socket.on('screenshare:ended', onEnded);
    socket.on('screenshare:available', onAvailable);
    socket.on('screenshare:unavailable', onUnavailable);
    socket.on('screenshare:list', onList);
    socket.on('screenshare:chat', onChat);

    refreshRooms();

    return () => {
      socket.off('screenshare:started', onStarted);
      socket.off('screenshare:joined', onJoined);
      socket.off('screenshare:viewer-joined', onViewerJoined);
      socket.off('screenshare:offer', onOffer);
      socket.off('screenshare:answer', onAnswer);
      socket.off('screenshare:ice', onIce);
      socket.off('screenshare:viewer-count', onViewerCount);
      socket.off('screenshare:ended', onEnded);
      socket.off('screenshare:available', onAvailable);
      socket.off('screenshare:unavailable', onUnavailable);
      socket.off('screenshare:list', onList);
      socket.off('screenshare:chat', onChat);
    };
  }, [socket, currentUserId, workspaceId, createViewerPC, cleanup, refreshRooms]);

  return {
    isHosting, isViewing, activeRoom, availableRooms,
    localStream, remoteStream, viewerCount,
    error, chatMessages,
    startRoom, endRoom, joinRoom, leaveRoom, sendChat, refreshRooms,
  };
};