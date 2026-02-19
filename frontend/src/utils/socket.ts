// frontend/src/utils/socket.ts
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

let socket: Socket | null = null;
let currentUserId: string | null = null;

export const initializeSocket = (userId: string): Socket => {
  currentUserId = userId;

  if (socket) return socket;

  const token = localStorage.getItem('token');

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity, // Keep trying — Render cold starts can take 30s+
    timeout: 20000,
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket?.id);
    // Re-emit user:online on every (re)connect — critical after Render cold start
    if (currentUserId) {
      socket?.emit('user:online', currentUserId);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason);
    // If server forced disconnect, manually reconnect
    if (reason === 'io server disconnect') {
      socket?.connect();
    }
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

// Legacy alias kept for backward compat
export const setSocketInstance = (_s: any) => {};
export const socketInstance = socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentUserId = null;
  }
};

export const joinWorkspace  = (workspaceId: string)   => socket?.emit('workspace:join', workspaceId);
export const joinChannel    = (channelId: string)      => socket?.emit('channel:join', channelId);
export const leaveChannel   = (channelId: string)      => socket?.emit('channel:leave', channelId);
export const joinThread     = (threadId: string)       => socket?.emit('thread:join', threadId);
export const leaveThread    = (threadId: string)       => socket?.emit('thread:leave', threadId);

export const sendTypingStart = (channelId: string, userId: string, userName: string) =>
  socket?.emit('typing:start', { channelId, userId, userName });

export const sendTypingStop = (channelId: string, userId: string) =>
  socket?.emit('typing:stop', { channelId, userId });

export const sendMessageEdit = (messageId: string, channelId: string, content: string) =>
  socket?.emit('message:edit', { messageId, channelId, content });

export const sendMessageDelete = (messageId: string, channelId: string) =>
  socket?.emit('message:delete', { messageId, channelId });

export const sendReaction = (messageId: string, channelId: string, emoji: string) =>
  socket?.emit('reaction:add', { messageId, channelId, emoji });