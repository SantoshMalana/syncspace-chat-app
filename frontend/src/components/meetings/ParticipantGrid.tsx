// ParticipantGrid.tsx - Responsive Grid Layout for Participants
// Adapts layout based on participant count (1-4 people)

import React, { useMemo } from 'react';
import { ActiveParticipant } from '../../types/meeting.types';
import ParticipantTile from './ParticipantTile';

interface ParticipantGridProps {
  localStream: MediaStream | null;
  participants: ActiveParticipant[];
  isLocalAudioEnabled: boolean;
  isLocalVideoEnabled: boolean;
  currentUserId: string;
}

interface GridConfig {
  columns: number;
  rows: number;
  gridClass: string;
}

const ParticipantGrid: React.FC<ParticipantGridProps> = ({
  localStream,
  participants,
  isLocalAudioEnabled,
  isLocalVideoEnabled,
  currentUserId,
}) => {
  /**
   * Calculate grid configuration based on participant count
   */
  const gridConfig: GridConfig = useMemo(() => {
    const totalCount = participants.length + 1; // +1 for local user

    switch (totalCount) {
      case 1:
        // Single participant - centered, large
        return {
          columns: 1,
          rows: 1,
          gridClass: 'grid-cols-1 grid-rows-1',
        };
      
      case 2:
        // Two participants - side by side (1x2)
        return {
          columns: 2,
          rows: 1,
          gridClass: 'grid-cols-2 grid-rows-1',
        };
      
      case 3:
        // Three participants - 2 top, 1 bottom centered (2x2 grid with empty space)
        return {
          columns: 2,
          rows: 2,
          gridClass: 'grid-cols-2 grid-rows-2',
        };
      
      case 4:
        // Four participants - 2x2 grid
        return {
          columns: 2,
          rows: 2,
          gridClass: 'grid-cols-2 grid-rows-2',
        };
      
      default:
        // Default to 2x2 for any edge cases
        return {
          columns: 2,
          rows: 2,
          gridClass: 'grid-cols-2 grid-rows-2',
        };
    }
  }, [participants.length]);

  /**
   * Get grid item positioning class for special layouts
   */
  const getGridItemClass = (index: number, total: number): string => {
    // For 3 participants, center the third one in the second row
    if (total === 3 && index === 2) {
      return 'col-span-2'; // Span across both columns
    }
    return '';
  };

  /**
   * Render all participants including local user
   */
  const renderParticipants = () => {
    const totalCount = participants.length + 1;
    const allParticipants = [
      // Local user first
      {
        isLocal: true,
        stream: localStream,
        audioEnabled: isLocalAudioEnabled,
        videoEnabled: isLocalVideoEnabled,
        userId: currentUserId,
        username: 'You',
      },
      // Remote participants
      ...participants.map((p) => ({
        isLocal: false,
        stream: p.stream,
        audioEnabled: p.audioEnabled,
        videoEnabled: p.videoEnabled,
        userId: p.user._id,
        username: p.user.username,
        avatar: p.user.avatar,
        isAudioActive: p.isAudioActive,
      })),
    ];

    return allParticipants.map((participant, index) => (
      <div
        key={participant.userId}
        className={`
          relative
          ${getGridItemClass(index, totalCount)}
          ${totalCount === 1 ? 'flex items-center justify-center' : ''}
        `}
      >
        <ParticipantTile
          stream={participant.stream || null}
          username={participant.username}
          avatar={participant.avatar}
          isAudioEnabled={participant.audioEnabled}
          isVideoEnabled={participant.videoEnabled}
          isLocal={participant.isLocal}
          isAudioActive={participant.isAudioActive || false}
          isSpeaking={participant.isAudioActive || false}
        />
      </div>
    ));
  };

  return (
    <div className="w-full h-full p-4">
      {/* Grid Container */}
      <div
        className={`
          grid
          ${gridConfig.gridClass}
          gap-4
          w-full
          h-full
          auto-rows-fr
        `}
      >
        {renderParticipants()}
      </div>

      {/* Participant Count Indicator (Bottom Left) */}
      <div className="absolute bottom-8 left-8 bg-gray-800 bg-opacity-75 text-white px-3 py-2 rounded-lg text-sm font-medium">
        {participants.length + 1} / 4 participants
      </div>

      {/* Grid Layout Info (Debug - Remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-8 right-8 bg-gray-800 bg-opacity-75 text-white px-3 py-2 rounded-lg text-xs">
          <div>Layout: {gridConfig.columns}x{gridConfig.rows}</div>
          <div>Total: {participants.length + 1} participants</div>
        </div>
      )}
    </div>
  );
};

export default ParticipantGrid;
