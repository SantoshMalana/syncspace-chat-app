// Socket.io client setup for real-time communication

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export const initializeSocket = (userId: string): Socket => {
    if (socket?.connected) {
        return socket;
    }

    socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        auth: {
            token: localStorage.getItem('token'),
        },
    });

    socket.on('connect', () => {
        console.log('✅ Socket connected:', socket?.id);
        // Notify server that user is online
        socket?.emit('user:online', userId);
    });

    socket.on('disconnect', () => {
        console.log('❌ Socket disconnected');
    });

    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
    });

    return socket;
};

export const getSocket = (): Socket | null => {
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

// Socket event helpers
export const joinWorkspace = (workspaceId: string) => {
    socket?.emit('workspace:join', workspaceId);
};

export const joinChannel = (channelId: string) => {
    socket?.emit('channel:join', channelId);
};

export const leaveChannel = (channelId: string) => {
    socket?.emit('channel:leave', channelId);
};

export const sendTypingStart = (channelId: string, userId: string, userName: string) => {
    socket?.emit('typing:start', { channelId, userId, userName });
};

export const sendTypingStop = (channelId: string, userId: string) => {
    socket?.emit('typing:stop', { channelId, userId });
};

export const joinThread = (threadId: string) => {
    socket?.emit('thread:join', threadId);
};

export const leaveThread = (threadId: string) => {
    socket?.emit('thread:leave', threadId);
};

export const sendMessageEdit = (messageId: string, channelId: string, content: string) => {
    socket?.emit('message:edit', { messageId, channelId, content });
};

export const sendMessageDelete = (messageId: string, channelId: string) => {
    socket?.emit('message:delete', { messageId, channelId });
};

export const sendReaction = (messageId: string, channelId: string, emoji: string) => {
    socket?.emit('reaction:add', { messageId, channelId, emoji });
};
