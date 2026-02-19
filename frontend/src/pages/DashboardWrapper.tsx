// frontend/src/pages/DashboardWrapper.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CallProvider } from '../context/CallContext';
import { GroupCallProvider } from '../context/GroupCallContext';
import { ScreenShareProvider } from '../context/ScreenShareContext';
import { CallManager } from '../components/calls/CallManager';
import Dashboard from './Dashboard';
import { getSocket, initializeSocket } from '../utils/socket';
import type { Socket } from 'socket.io-client';
import type { User } from '../types';

const DashboardWrapper: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser]           = useState<User | null>(null);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>('');
  const [socketReady, setSocketReady]           = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token   = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) { navigate('/login'); return; }

    const user = JSON.parse(userStr);
    setCurrentUser(user);

    initializeSocket(user.id || user._id);
    const socket = getSocket();
    if (!socket) { console.error('❌ Socket failed to initialize'); return; }
    socketRef.current = socket;

    if (socket.connected && socket.id) {
      setSocketReady(true);
    } else {
      socket.once('connect', () => setSocketReady(true));
    }

    const workspaceStr = localStorage.getItem('currentWorkspace');
    if (workspaceStr) {
      try { setCurrentWorkspaceId(JSON.parse(workspaceStr)._id || ''); } catch {}
    }
  }, [navigate]);

  useEffect(() => {
    if (!socketReady) return;
    const interval = setInterval(() => {
      const workspaceStr = localStorage.getItem('currentWorkspace');
      if (workspaceStr) {
        try {
          const id = JSON.parse(workspaceStr)._id || '';
          if (id !== currentWorkspaceId) setCurrentWorkspaceId(id);
        } catch {}
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [socketReady, currentWorkspaceId]);

  if (!currentUser || !socketReady) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Connecting...</p>
        </div>
      </div>
    );
  }

  return (
    <CallProvider
      socket={socketRef.current}
      currentUserId={currentUser.id || currentUser._id || ''}
      workspaceId={currentWorkspaceId}
    >
      <GroupCallProvider
        socket={socketRef.current}
        currentUserId={currentUser.id || currentUser._id || ''}
        currentUserName={currentUser.fullName || currentUser.email || 'Unknown'}
        currentUserAvatar={currentUser.avatar}
      >
        <ScreenShareProvider
          socket={socketRef.current}
          currentUserId={currentUser.id || currentUser._id || ''}
          workspaceId={currentWorkspaceId}
        >
          <Dashboard />
          <CallManager />
        </ScreenShareProvider>
      </GroupCallProvider>
    </CallProvider>
  );
};

export default DashboardWrapper;
