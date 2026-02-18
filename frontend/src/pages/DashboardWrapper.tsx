// frontend/src/pages/DashboardWrapper.tsx
// Fix: Pass socket object directly (not in state) — socket.io mutates the same
// object on reconnect, so a ref is always fresh. Only gate rendering on socketReady.

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CallProvider } from '../context/CallContext';
import { GroupCallProvider } from '../context/GroupCallContext';
import { CallManager } from '../components/calls/CallManager';
import Dashboard from './Dashboard';
import { getSocket, initializeSocket } from '../utils/socket';
import type { Socket } from 'socket.io-client';
import type { User } from '../types';

const DashboardWrapper: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>('');
  const [socketReady, setSocketReady] = useState(false);

  // ✅ FIX: Store socket in a ref, NOT in state.
  // socket.io mutates the same object on reconnect — state would hold a stale
  // snapshot, but a ref always points to the live instance.
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      navigate('/login');
      return;
    }

    const user = JSON.parse(userStr);
    setCurrentUser(user);

    // Initialize socket (no-op if already connected)
    initializeSocket(user.id || user._id);
    const socket = getSocket();

    if (!socket) {
      console.error('❌ Socket failed to initialize');
      return;
    }

    socketRef.current = socket;

    // ✅ FIX: Only render CallProvider after socket.id is confirmed
    if (socket.connected && socket.id) {
      console.log('✅ Socket already connected:', socket.id);
      setSocketReady(true);
    } else {
      socket.once('connect', () => {
        console.log('✅ Socket connected:', socket.id);
        setSocketReady(true);
      });
    }

    // Read workspace from storage
    const workspaceStr = localStorage.getItem('currentWorkspace');
    if (workspaceStr) {
      try {
        const workspace = JSON.parse(workspaceStr);
        setCurrentWorkspaceId(workspace._id || '');
      } catch {
        setCurrentWorkspaceId('');
      }
    }
  }, [navigate]);

  // Poll localStorage for workspace changes set by Dashboard
  useEffect(() => {
    if (!socketReady) return;
    const interval = setInterval(() => {
      const workspaceStr = localStorage.getItem('currentWorkspace');
      if (workspaceStr) {
        try {
          const workspace = JSON.parse(workspaceStr);
          const id = workspace._id || '';
          if (id !== currentWorkspaceId) setCurrentWorkspaceId(id);
        } catch { }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [socketReady, currentWorkspaceId]);

  if (!currentUser || !socketReady) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Connecting...</p>
        </div>
      </div>
    );
  }

  return (
    <CallProvider
      socket={socketRef.current}   // ✅ always the live socket object
      currentUserId={currentUser.id || currentUser._id || ''}
      workspaceId={currentWorkspaceId}
    >
      <GroupCallProvider
        socket={socketRef.current}
        currentUserId={currentUser.id || currentUser._id || ''}
        currentUserName={currentUser.fullName || currentUser.email || 'Unknown'}
        currentUserAvatar={currentUser.avatar}
      >
        <Dashboard />
        <CallManager />
      </GroupCallProvider>
    </CallProvider>
  );
};

export default DashboardWrapper;
