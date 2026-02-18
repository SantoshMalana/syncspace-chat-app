// frontend/src/context/GroupCallContext.tsx
// React context wrapping the useGroupCall hook for global group call state

import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useGroupCall } from '../hooks/useGroupCall';
import type { GroupCallContextType } from '../types/call.types';
import { Socket } from 'socket.io-client';

interface GroupCallProviderProps {
    children: ReactNode;
    socket: Socket | null;
    currentUserId: string;
    currentUserName: string;
    currentUserAvatar?: string;
}

const GroupCallContext = createContext<GroupCallContextType | undefined>(undefined);

export const GroupCallProvider: React.FC<GroupCallProviderProps> = ({
    children,
    socket,
    currentUserId,
    currentUserName,
    currentUserAvatar,
}) => {
    const groupCallState = useGroupCall({
        socket,
        currentUserId,
        currentUserName,
        currentUserAvatar,
    });

    return (
        <GroupCallContext.Provider value={groupCallState}>
            {children}
        </GroupCallContext.Provider>
    );
};

export const useGroupCallContext = (): GroupCallContextType => {
    const context = useContext(GroupCallContext);
    if (!context) {
        throw new Error('useGroupCallContext must be used within GroupCallProvider');
    }
    return context;
};

export default GroupCallContext;
