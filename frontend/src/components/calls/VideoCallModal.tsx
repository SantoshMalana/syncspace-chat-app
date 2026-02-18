// frontend/src/components/calls/VideoCallModal.tsx

import React, { useEffect, useRef, useState } from 'react';
import { FaTimes, FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhone } from 'react-icons/fa';
import { CallTimer } from './CallTimer';
import type { VideoCallModalProps } from '../../types/call.types';

export const VideoCallModal: React.FC<VideoCallModalProps> = ({
  call,
  localStream,
  remoteStream,
  isMuted,
  isVideoEnabled = true,
  duration,
  isConnected,
  onToggleMute,
  onToggleVideo,
  onEndCall,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  // The other person in the call
  const otherPerson = call.caller;

  const callStatus = isConnected ? 'connected' : 'connecting';

  // Setup local video
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Setup remote video
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Auto-hide controls after 3 seconds of no mouse movement
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const displayName = otherPerson.fullName || otherPerson.name;

  return (
    <div
      className="video-call-modal"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setShowControls(true)}
    >
      {/* Remote Video (Main) */}
      <div className="remote-video-container">
        {remoteStream && remoteStream.getVideoTracks()[0]?.enabled ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="remote-video" />
        ) : (
          <div className="video-placeholder">
            <div className="avatar-placeholder-video">
              {otherPerson.avatar ? (
                <img src={otherPerson.avatar} alt={displayName} />
              ) : (
                <span>{getInitials(displayName)}</span>
              )}
            </div>
            <p className="video-off-text">{displayName}'s camera is off</p>
          </div>
        )}
      </div>

      {/* Local Video (Picture-in-Picture) */}
      <div className={`local-video-container ${!isVideoEnabled ? 'video-off' : ''}`}>
        {localStream && isVideoEnabled ? (
          <video ref={localVideoRef} autoPlay playsInline muted className="local-video" />
        ) : (
          <div className="local-video-placeholder">
            <FaVideoSlash size={24} />
          </div>
        )}
      </div>

      {/* Header */}
      <div className={`video-call-header ${showControls ? 'visible' : 'hidden'}`}>
        <div className="call-status-info">
          <span className={`status-dot ${callStatus}`}></span>
          <span className="caller-name">{displayName}</span>
          {isConnected && (
            <>
              <span className="separator">•</span>
              {/* Convert duration (seconds) to a Date for CallTimer */}
              <CallTimer startTime={new Date(Date.now() - duration * 1000)} />
            </>
          )}
          {!isConnected && (
            <>
              <span className="separator">•</span>
              <span className="status-text">Connecting...</span>
            </>
          )}
        </div>
        <button className="close-button" onClick={onEndCall} title="End Call">
          <FaTimes size={20} />
        </button>
      </div>

      {/* Controls Bar */}
      <div className={`video-controls-bar ${showControls ? 'visible' : 'hidden'}`}>
        <div className="controls-group">
          <button
            onClick={onToggleMute}
            className={`control-button ${isMuted ? 'active' : ''}`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <FaMicrophoneSlash size={20} /> : <FaMicrophone size={20} />}
            <span className="control-label">{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          <button
            onClick={onToggleVideo}
            className={`control-button ${!isVideoEnabled ? 'active' : ''}`}
            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoEnabled ? <FaVideo size={20} /> : <FaVideoSlash size={20} />}
            <span className="control-label">{isVideoEnabled ? 'Stop Video' : 'Start Video'}</span>
          </button>

          <button onClick={onEndCall} className="control-button end-call" title="End Call">
            <FaPhone size={20} />
            <span className="control-label">End Call</span>
          </button>
        </div>
      </div>

      <style>{`
        .video-call-modal {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: #000;
          z-index: 10000;
          display: flex;
          flex-direction: column;
        }
        .remote-video-container {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #1a1a1a;
        }
        .remote-video {
          width: 100%; height: 100%; object-fit: cover;
        }
        .video-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 24px;
        }
        .avatar-placeholder-video {
          width: 200px; height: 200px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 72px;
          font-weight: bold;
          color: white;
          overflow: hidden;
        }
        .avatar-placeholder-video img {
          width: 100%; height: 100%; object-fit: cover;
        }
        .video-off-text {
          color: rgba(255,255,255,0.7);
          font-size: 18px;
        }
        .local-video-container {
          position: absolute;
          bottom: 100px; right: 24px;
          width: 240px; height: 180px;
          border-radius: 12px;
          overflow: hidden;
          border: 3px solid rgba(255,255,255,0.2);
          box-shadow: 0 8px 24px rgba(0,0,0,0.5);
          z-index: 10;
        }
        .local-video-container.video-off { background: #2a2a2a; }
        .local-video {
          width: 100%; height: 100%;
          object-fit: cover;
          transform: scaleX(-1);
        }
        .local-video-placeholder {
          width: 100%; height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #2a2a2a;
          color: rgba(255,255,255,0.5);
        }
        .video-call-header {
          position: absolute;
          top: 0; left: 0; right: 0;
          padding: 24px;
          background: linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%);
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: opacity 0.3s ease;
          z-index: 20;
        }
        .video-call-header.hidden { opacity: 0; pointer-events: none; }
        .video-call-header.visible { opacity: 1; pointer-events: all; }
        .call-status-info {
          display: flex; align-items: center; gap: 12px; color: white;
        }
        .status-dot {
          width: 10px; height: 10px; border-radius: 50%;
          animation: pulse 2s infinite;
        }
        .status-dot.connecting { background: #f59e0b; }
        .status-dot.connected  { background: #10b981; }
        .caller-name { font-size: 16px; font-weight: 600; }
        .separator { color: rgba(255,255,255,0.5); }
        .status-text { font-size: 14px; color: rgba(255,255,255,0.8); }
        .close-button {
          background: rgba(255,255,255,0.1);
          border: none; border-radius: 8px;
          padding: 8px 12px; color: white;
          cursor: pointer; transition: all 0.2s;
          backdrop-filter: blur(10px);
        }
        .close-button:hover { background: rgba(255,255,255,0.2); }
        .video-controls-bar {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          padding: 32px;
          background: linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%);
          display: flex;
          justify-content: center;
          transition: opacity 0.3s ease;
          z-index: 20;
        }
        .video-controls-bar.hidden { opacity: 0; pointer-events: none; }
        .video-controls-bar.visible { opacity: 1; pointer-events: all; }
        .controls-group { display: flex; gap: 16px; }
        .control-button {
          display: flex; flex-direction: column;
          align-items: center; gap: 8px;
          padding: 16px 24px;
          background: rgba(255,255,255,0.1);
          border: none; border-radius: 12px;
          color: white; cursor: pointer;
          transition: all 0.2s;
          backdrop-filter: blur(10px);
          min-width: 100px;
        }
        .control-button:hover {
          background: rgba(255,255,255,0.2);
          transform: translateY(-2px);
        }
        .control-button.active {
          background: rgba(239,68,68,0.3);
          border: 2px solid #ef4444;
        }
        .control-button.end-call { background: rgba(239,68,68,0.9); }
        .control-button.end-call:hover { background: rgb(220,38,38); }
        .control-label { font-size: 12px; font-weight: 500; }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @media (max-width: 768px) {
          .local-video-container { width: 120px; height: 90px; bottom: 80px; right: 16px; }
          .avatar-placeholder-video { width: 120px; height: 120px; font-size: 48px; }
          .video-off-text { font-size: 14px; }
          .control-button { min-width: 80px; padding: 12px 16px; }
          .control-label { font-size: 10px; }
        }
      `}</style>
    </div>
  );
};
