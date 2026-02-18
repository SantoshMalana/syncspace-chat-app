// MeetingRoom.tsx - Main Meeting Interface
// Full-screen meeting room with participants grid and controls

import React, { useEffect, useState, useRef } from 'react';
import { Meeting } from '../../types/meeting.types';
import { useMeetingContext } from '../../context/MeetingContext';
import ParticipantGrid from './ParticipantGrid';
import MeetingControls from './MeetingControls';
import { MdWarning, MdPeople, MdAccessTime } from 'react-icons/md';
import { format } from 'date-fns';

interface MeetingRoomProps {
  meeting: Meeting;
  onLeaveMeeting: () => void;
}

const MeetingRoom: React.FC<MeetingRoomProps> = ({ meeting, onLeaveMeeting }) => {
  const { updateParticipantStatus, endMeeting, leaveMeeting } = useMeetingContext();
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'failed'>('connecting');
  const [participants, setParticipants] = useState(meeting.participants || []);
  
  const [isJoining, setIsJoining] = useState(true);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [meetingDuration, setMeetingDuration] = useState<string>('00:00');
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date>(new Date());

  /**
   * Join meeting on mount
   */
  useEffect(() => {
    const join = async () => {
      try {
        setIsJoining(true);
        setJoinError(null);
        // Connection simulated - real implementation would use WebRTC
        setConnectionStatus('connected');
        startTimeRef.current = new Date();
      } catch (error: any) {
        console.error('Failed to join meeting:', error);
        setJoinError(error.message || 'Failed to join meeting');
      } finally {
        setIsJoining(false);
      }
    };

    join();

    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [meeting, joinMeeting]);

  /**
   * Start meeting timer
   */
  useEffect(() => {
    if (activeMeeting && !isJoining) {
      timerRef.current = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - startTimeRef.current.getTime()) / 1000);
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;

        if (hours > 0) {
          setMeetingDuration(
            `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
          );
        } else {
          setMeetingDuration(
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
          );
        }
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [activeMeeting, isJoining]);

  /**
   * Handle leave meeting
   */
  const handleLeaveMeeting = () => {
    setShowExitConfirm(true);
  };

  /**
   * Confirm leave
   */
  const confirmLeave = () => {
    leaveMeeting();
    setShowExitConfirm(false);
    onLeaveMeeting();
  };

  /**
   * Cancel leave
   */
  const cancelLeave = () => {
    setShowExitConfirm(false);
  };

  /**
   * Handle end meeting (admin only)
   */
  const handleEndMeeting = () => {
    if (!window.confirm('Are you sure you want to end this meeting for everyone?')) {
      return;
    }

    endMeeting();
    onLeaveMeeting();
  };

  /**
   * Check if user is meeting creator
   */
  const isCreator = meeting.creator._id === user?._id;

  /**
   * Get participant count (including self)
   */
  const participantCount = participants.length + 1; // +1 for local user

  /**
   * Render joining state
   */
  if (isJoining) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
          <h2 className="text-2xl font-semibold text-white mb-2">Joining Meeting...</h2>
          <p className="text-gray-400">Setting up your camera and microphone</p>
        </div>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (joinError) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-8 max-w-md">
          <MdWarning className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-white text-center mb-4">
            Failed to Join Meeting
          </h2>
          <p className="text-gray-400 text-center mb-6">{joinError}</p>
          <button
            onClick={onLeaveMeeting}
            className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  /**
   * Render connection status banner
   */
  const renderConnectionStatus = () => {
    if (connectionStatus === 'connecting') {
      return (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg z-10 flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
          <span>Connecting...</span>
        </div>
      );
    }

    if (connectionStatus === 'failed') {
      return (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-10 flex items-center gap-2">
          <MdWarning className="w-4 h-4" />
          <span>Connection Failed</span>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Meeting Info */}
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-semibold text-white">{meeting.title}</h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{meetingDuration}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MdPeople className="w-4 h-4" />
                  <span>{participantCount} participant{participantCount !== 1 ? 's' : ''}</span>
                </div>
                <div className="text-xs">
                  Started at {format(startTimeRef.current, 'h:mm a')}
                </div>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={handleLeaveMeeting}
            className="text-gray-400 hover:text-white transition-colors"
            title="Leave Meeting"
          >
            <MdWarning className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Connection Status Banner */}
      {renderConnectionStatus()}

      {/* Main Content - Participant Grid */}
      <div className="flex-1 relative overflow-hidden">
        <ParticipantGrid
          localStream={localStream}
          participants={participants}
          isLocalAudioEnabled={isAudioEnabled}
          isLocalVideoEnabled={isVideoEnabled}
          currentUserId={user?._id || ''}
        />
      </div>

      {/* Controls Bar */}
      <div className="bg-gray-800 border-t border-gray-700 px-6 py-4">
        <MeetingControls
          isAudioEnabled={isAudioEnabled}
          isVideoEnabled={isVideoEnabled}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onLeaveMeeting={handleLeaveMeeting}
          onEndMeeting={isCreator ? handleEndMeeting : undefined}
          meetingTitle={meeting.title}
        />
      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-white mb-4">Leave Meeting?</h3>
            <p className="text-gray-400 mb-6">
              Are you sure you want to leave this meeting?
              {isCreator && (
                <span className="block mt-2 text-yellow-400 text-sm">
                  Note: To end the meeting for everyone, use the "End Meeting" button.
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancelLeave}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Stay
              </button>
              <button
                onClick={confirmLeave}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help (Optional) */}
      <div className="absolute bottom-20 left-4 text-xs text-gray-500 hidden lg:block">
        <div className="bg-gray-800 rounded px-3 py-2 space-y-1">
          <div><kbd className="bg-gray-700 px-2 py-0.5 rounded">M</kbd> Mute/Unmute</div>
          <div><kbd className="bg-gray-700 px-2 py-0.5 rounded">V</kbd> Video On/Off</div>
          <div><kbd className="bg-gray-700 px-2 py-0.5 rounded">L</kbd> Leave Meeting</div>
        </div>
      </div>
    </div>
  );
};

export default MeetingRoom;
