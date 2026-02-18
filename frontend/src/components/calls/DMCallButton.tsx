// frontend/src/components/calls/DMCallButton.tsx
// Call button specifically for Direct Messages in Dashboard

import React from 'react';
import { FaPhone, FaVideo } from 'react-icons/fa';
import { useCallContext } from '../../context/CallContext';

interface DMCallButtonProps {
  userId: string;
  userName: string;
  compact?: boolean;
}

export const DMCallButton: React.FC<DMCallButtonProps> = ({
  userId,
  userName,
  compact = false,
}) => {
  const { initiateCall, activeCall } = useCallContext();

  const handleVoiceCall = async () => {
    try {
      await initiateCall(userId, 'voice');
    } catch (error) {
      console.error('Failed to start voice call:', error);
      alert('Failed to start call. Please try again.');
    }
  };

  const handleVideoCall = async () => {
    try {
      await initiateCall(userId, 'video');
    } catch (error) {
      console.error('Failed to start video call:', error);
      alert('Failed to start call. Please try again.');
    }
  };

  const isDisabled = !!activeCall;

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={handleVoiceCall}
          disabled={isDisabled}
          className="p-1.5 hover:bg-[#1a1a1a] rounded-lg transition-colors text-gray-400 hover:text-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          title={`Voice call ${userName}`}
        >
          <FaPhone className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleVideoCall}
          disabled={isDisabled}
          className="p-1.5 hover:bg-[#1a1a1a] rounded-lg transition-colors text-gray-400 hover:text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          title={`Video call ${userName}`}
        >
          <FaVideo className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleVoiceCall}
        disabled={isDisabled}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        title={`Voice call ${userName}`}
      >
        <FaPhone className="w-4 h-4" />
        <span className="text-sm font-medium">Voice Call</span>
      </button>
      <button
        onClick={handleVideoCall}
        disabled={isDisabled}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        title={`Video call ${userName}`}
      >
        <FaVideo className="w-4 h-4" />
        <span className="text-sm font-medium">Video Call</span>
      </button>
    </div>
  );
};
