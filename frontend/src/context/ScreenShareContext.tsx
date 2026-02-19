// frontend/src/context/ScreenShareContext.tsx

import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useScreenShare, ScreenShareRoom } from '../hooks/useScreenShare';
import { Socket } from 'socket.io-client';

interface ScreenShareContextType {
  isHosting: boolean;
  isViewing: boolean;
  activeRoom: ScreenShareRoom | null;
  availableRooms: ScreenShareRoom[];
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  viewerCount: number;
  error: string | null;
  chatMessages: { userId: string; name: string; text: string; time: number }[];
  startRoom: (channelId: string) => Promise<void>;
  endRoom: () => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;
  sendChat: (text: string, userName: string) => void;
  refreshRooms: () => void;
}

const ScreenShareContext = createContext<ScreenShareContextType | undefined>(undefined);

interface Props {
  children: ReactNode;
  socket: Socket | null;
  currentUserId: string;
  workspaceId: string;
}

export const ScreenShareProvider: React.FC<Props> = ({ children, socket, currentUserId, workspaceId }) => {
  const value = useScreenShare({ socket, currentUserId, workspaceId });
  return (
    <ScreenShareContext.Provider value={value}>
      {children}
    </ScreenShareContext.Provider>
  );
};

export const useScreenShareContext = () => {
  const ctx = useContext(ScreenShareContext);
  if (!ctx) throw new Error('useScreenShareContext must be used within ScreenShareProvider');
  return ctx;
};
