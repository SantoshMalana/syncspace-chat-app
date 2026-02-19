import React from 'react';
import { useCallContext } from '../../context/CallContext';

interface DMCallButtonProps {
  userId: string;
  userName: string;
  compact?: boolean;
}

const PhoneIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

const VideoIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7"/>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
  </svg>
);

export const DMCallButton: React.FC<DMCallButtonProps> = ({
  userId, userName, compact = false,
}) => {
  const { initiateCall, activeCall } = useCallContext();
  const isDisabled = !!activeCall;

  const call = async (type: 'voice' | 'video') => {
    try {
      await initiateCall(userId, type);
    } catch (err) {
      console.error(`Failed to start ${type} call:`, err);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => call('voice')}
          disabled={isDisabled}
          title={`Voice call ${userName}`}
          className="p-1.5 rounded-lg text-gray-500 hover:text-green-400 hover:bg-green-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <PhoneIcon size={13} />
        </button>
        <button
          onClick={() => call('video')}
          disabled={isDisabled}
          title={`Video call ${userName}`}
          className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <VideoIcon size={13} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => call('voice')}
        disabled={isDisabled}
        title={`Voice call ${userName}`}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/18 border border-green-500/15 hover:border-green-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm font-medium"
      >
        <PhoneIcon size={14} />
        Voice
      </button>
      <button
        onClick={() => call('video')}
        disabled={isDisabled}
        title={`Video call ${userName}`}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/18 border border-blue-500/15 hover:border-blue-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm font-medium"
      >
        <VideoIcon size={14} />
        Video
      </button>
    </div>
  );
};
