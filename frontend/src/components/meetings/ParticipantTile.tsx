// ParticipantTile.tsx - Individual Participant Video Tile
// Displays video stream, avatar fallback, audio/video indicators, and name

import React, { useRef, useEffect, useState } from 'react';
import { MdMic, MdMicOff, MdVolumeUp } from 'react-icons/md';

interface ParticipantTileProps {
  stream: MediaStream | null;
  username: string;
  avatar?: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isLocal?: boolean;
  isAudioActive?: boolean; // Currently speaking
  isSpeaking?: boolean; // Audio level indicator
}

const ParticipantTile: React.FC<ParticipantTileProps> = ({
  stream,
  username,
  avatar,
  isAudioEnabled,
  isVideoEnabled,
  isLocal = false,
  isAudioActive = false,
  isSpeaking = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideoTrack, setHasVideoTrack] = useState(false);
  const [videoError, setVideoError] = useState(false);

  /**
   * Attach stream to video element
   */
  useEffect(() => {
    if (videoRef.current && stream) {
      try {
        videoRef.current.srcObject = stream;
        
        // Check if stream has video tracks
        const videoTracks = stream.getVideoTracks();
        setHasVideoTrack(videoTracks.length > 0 && videoTracks[0].enabled);
        setVideoError(false);
      } catch (error) {
        console.error('Error attaching stream:', error);
        setVideoError(true);
      }
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream]);

  /**
   * Update video track status when isVideoEnabled changes
   */
  useEffect(() => {
    if (stream) {
      const videoTracks = stream.getVideoTracks();
      setHasVideoTrack(videoTracks.length > 0 && videoTracks[0].enabled && isVideoEnabled);
    }
  }, [stream, isVideoEnabled]);

  /**
   * Get initials from username for avatar fallback
   */
  const getInitials = (name: string): string => {
    const words = name.trim().split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  /**
   * Generate random avatar color based on username
   */
  const getAvatarColor = (name: string): string => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-yellow-500',
      'bg-indigo-500',
      'bg-red-500',
      'bg-teal-500',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  /**
   * Render video or avatar
   */
  const renderContent = () => {
    // Show video if enabled and has track
    if (isVideoEnabled && hasVideoTrack && !videoError) {
      return (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal} // Mute local video to prevent echo
          className="w-full h-full object-cover"
        />
      );
    }

    // Show avatar fallback when video is off
    return (
      <div className={`w-full h-full flex items-center justify-center ${getAvatarColor(username)}`}>
        {avatar ? (
          <img
            src={avatar}
            alt={username}
            className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-white"
          />
        ) : (
          <div className="text-4xl md:text-6xl font-bold text-white">
            {getInitials(username)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`
        relative
        w-full
        h-full
        bg-gray-900
        rounded-lg
        overflow-hidden
        ${isSpeaking ? 'ring-4 ring-green-500' : ''}
        ${isLocal ? 'ring-2 ring-blue-500' : ''}
        transition-all
        duration-200
      `}
    >
      {/* Video/Avatar Content */}
      <div className="absolute inset-0">
        {renderContent()}
      </div>

      {/* Overlay Gradient (for better text visibility) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

      {/* Top Left - Local User Badge */}
      {isLocal && (
        <div className="absolute top-3 left-3 bg-blue-500 text-white text-xs font-medium px-2 py-1 rounded">
          You
        </div>
      )}

      {/* Top Right - Video Status Icon */}
      {!isVideoEnabled && (
        <div className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-full">
          <VideoOff className="w-4 h-4" />
        </div>
      )}

      {/* Bottom Left - Username and Audio Status */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
        {/* Username */}
        <div className="flex items-center gap-2 bg-black bg-opacity-50 text-white px-3 py-1.5 rounded-full max-w-[70%]">
          <span className="text-sm font-medium truncate">{username}</span>
        </div>

        {/* Audio Status */}
        <div className="flex items-center gap-1">
          {/* Speaking Indicator */}
          {isAudioActive && isAudioEnabled && (
            <div className="bg-green-500 text-white p-2 rounded-full animate-pulse">
              <MdVolumeUp className="w-4 h-4" />
            </div>
          )}

          {/* Mute Indicator */}
          {!isAudioEnabled && (
            <div className="bg-red-500 text-white p-2 rounded-full">
              <MdMicOff className="w-4 h-4" />
            </div>
          )}

          {/* Audio Enabled but not speaking */}
          {isAudioEnabled && !isAudioActive && (
            <div className="bg-gray-700 bg-opacity-75 text-white p-2 rounded-full">
              <MdMic className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>

      {/* Connection Quality Indicator (Optional) */}
      {/* You can add connection quality dots here */}
      {/* <div className="absolute top-3 left-3 flex gap-1">
        <div className="w-2 h-2 rounded-full bg-green-500"></div>
        <div className="w-2 h-2 rounded-full bg-green-500"></div>
        <div className="w-2 h-2 rounded-full bg-gray-400"></div>
      </div> */}

      {/* Error State */}
      {videoError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="text-center text-gray-400">
            <VideoOff className="w-12 h-12 mx-auto mb-2" />
            <p className="text-sm">Video Error</p>
          </div>
        </div>
      )}

      {/* Hover Overlay (Optional - for future features like pin, spotlight) */}
      <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-200 opacity-0 hover:opacity-100 pointer-events-none" />
    </div>
  );
};

export default ParticipantTile;
