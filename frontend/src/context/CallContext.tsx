// frontend/src/context/CallContext.tsx
// Global Call State Management - wraps useCall hook

import React, { createContext, useContext, ReactNode } from 'react';
import { useCall } from '../hooks/useCall';
import { CallContextType } from '../types/call.types';
import { Socket } from 'socket.io-client';

interface CallProviderProps {
  children: ReactNode;
  socket: Socket | null;
  currentUserId: string;
  workspaceId: string;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<CallProviderProps> = ({
  children,
  socket,
  currentUserId,
  workspaceId,
}) => {
  const callState = useCall({ socket, currentUserId, workspaceId });

  return (
    <CallContext.Provider value={callState}>
      {children}
    </CallContext.Provider>
  );
};

export const useCallContext = (): CallContextType => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCallContext must be used within CallProvider');
  }
  return context;
};

export default CallContext;
