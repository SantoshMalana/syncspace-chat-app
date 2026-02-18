// MeetingControls.tsx - Meeting Control Buttons
// Mute, Camera, Leave, and End Meeting controls

import React from 'react';
import { MdMic, MdMicOff, MdCallEnd, MdLogout } from 'react-icons/md';

interface MeetingControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onLeaveMeeting: () => void;
  onEndMeeting?: () => void; // Only for meeting creator
  meetingTitle: string;
}

const MeetingControls: React.FC<MeetingControlsProps> = ({
  isAudioEnabled,
  isVideoEnabled,
  onToggleAudio,
  onToggleVideo,
  onLeaveMeeting,
  onEndMeeting,
  meetingTitle,
}) => {
  return (
    <div className="flex items-center justify-between">
      {/* Left - Meeting Title (Mobile Hidden) */}
      <div className="hidden md:block text-white font-medium truncate max-w-xs">
        {meetingTitle}
      </div>

      {/* Center - Main Controls */}
      <div className="flex items-center gap-3 mx-auto">
        {/* Microphone Toggle */}
        <button
          onClick={onToggleAudio}
          className={`
            group
            relative
            p-4
            rounded-full
            transition-all
            duration-200
            hover:scale-110
            ${
              isAudioEnabled
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }
          `}
          title={isAudioEnabled ? 'Mute (M)' : 'Unmute (M)'}
          aria-label={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
        >
          {isAudioEnabled ? (
            <MdMic className="w-6 h-6" />
          ) : (
            <MdMicOff className="w-6 h-6" />
          )}
          
          {/* Tooltip */}
          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {isAudioEnabled ? 'Mute (M)' : 'Unmute (M)'}
          </span>
        </button>

        {/* Camera Toggle */}
        <button
          onClick={onToggleVideo}
          className={`
            group
            relative
            p-4
            rounded-full
            transition-all
            duration-200
            hover:scale-110
            ${
              isVideoEnabled
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }
          `}
          title={isVideoEnabled ? 'Turn off camera (V)' : 'Turn on camera (V)'}
          aria-label={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          {isVideoEnabled ? (
            <MdMicOff className="w-6 h-6" />
          ) : (
            <MdMicOff className="w-6 h-6" />
          )}
          
          {/* Tooltip */}
          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {isVideoEnabled ? 'Stop video (V)' : 'Start video (V)'}
          </span>
        </button>

        {/* Leave Meeting */}
        <button
          onClick={onLeaveMeeting}
          className="
            group
            relative
            p-4
            rounded-full
            bg-red-500
            hover:bg-red-600
            text-white
            transition-all
            duration-200
            hover:scale-110
          "
          title="Leave Meeting (L)"
          aria-label="Leave meeting"
        >
          <MdCallEnd className="w-6 h-6" />
          
          {/* Tooltip */}
          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Leave (L)
          </span>
        </button>

        {/* End Meeting (Admin Only) */}
        {onEndMeeting && (
          <button
            onClick={onEndMeeting}
            className="
              group
              relative
              px-4
              py-3
              rounded-full
              bg-red-600
              hover:bg-red-700
              text-white
              font-medium
              text-sm
              transition-all
              duration-200
              hover:scale-105
              flex
              items-center
              gap-2
            "
            title="End meeting for all participants"
            aria-label="End meeting for everyone"
          >
            <MdLogout className="w-5 h-5" />
            <span className="hidden sm:inline">End Meeting</span>
            
            {/* Tooltip */}
            <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              End for everyone
            </span>
          </button>
        )}
      </div>

      {/* Right - Additional Controls (Future: Share Screen, Chat, Participants) */}
      <div className="hidden md:flex items-center gap-2">
        {/* Placeholder for future features */}
        {/* 
        <button className="p-2 text-gray-400 hover:text-white transition-colors">
          <Monitor className="w-5 h-5" />
        </button>
        <button className="p-2 text-gray-400 hover:text-white transition-colors">
          <MessageSquare className="w-5 h-5" />
        </button>
        <button className="p-2 text-gray-400 hover:text-white transition-colors">
          <Users className="w-5 h-5" />
        </button>
        */}
      </div>
    </div>
  );
};

export default MeetingControls;
