// frontend/src/components/calls/VoiceCallModal.tsx

import React from 'react';
import { FaTimes } from 'react-icons/fa';
import { CallTimer } from './CallTimer';
import { CallControls } from './CallControls';
import type { VoiceCallModalProps } from '../../types/call.types';

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
  call,
  isMuted,
  duration,
  isConnected,
  onToggleMute,
  onEndCall,
}) => {
  // Show the OTHER person's info (not current user)
  const otherPerson = call.caller;

  const callStatus = isConnected ? 'connected' : 'connecting';

  return (
    <div className="voice-call-modal">
      {/* Header */}
      <div className="call-header">
        <div className="call-status-indicator">
          <span className={`status-dot ${callStatus}`}></span>
          <span className="status-text">
            {callStatus === 'connecting' ? 'Connecting...' : 'Connected'}
          </span>
        </div>
        <button className="close-button" onClick={onEndCall} title="End call">
          <FaTimes size={20} />
        </button>
      </div>

      {/* Main Content */}
      <div className="call-content">
        <div className="caller-avatar-large">
          {otherPerson.avatar ? (
            <img src={otherPerson.avatar} alt={otherPerson.name} />
          ) : (
            <div className="avatar-placeholder-large">
              {(otherPerson.name || otherPerson.fullName || '?').charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <h2 className="caller-name-large">
          {otherPerson.fullName || otherPerson.name}
        </h2>

        {isConnected ? (
          <div className="call-timer-wrapper">
            {/* CallTimer expects a Date — convert from duration seconds */}
            <CallTimer startTime={new Date(Date.now() - duration * 1000)} />
          </div>
        ) : (
          <p className="status-message">Setting up the call...</p>
        )}
      </div>

      {/* Controls */}
      <div className="call-controls-wrapper">
        <CallControls
          isMuted={isMuted}
          onToggleMute={onToggleMute}
          onEndCall={onEndCall}
        />
      </div>

      <style>{`
        .voice-call-modal {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          z-index: 9999;
          display: flex;
          flex-direction: column;
        }
        .call-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          background: rgba(255,255,255,0.05);
        }
        .call-status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        .status-dot.connecting { background: #f59e0b; }
        .status-dot.connected  { background: #10b981; }
        .status-text {
          color: rgba(255,255,255,0.9);
          font-size: 14px;
          font-weight: 500;
        }
        .close-button {
          background: rgba(255,255,255,0.1);
          border: none;
          border-radius: 8px;
          padding: 8px 12px;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }
        .close-button:hover { background: rgba(255,255,255,0.2); }
        .call-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          gap: 24px;
        }
        .caller-avatar-large {
          width: 180px;
          height: 180px;
          border-radius: 50%;
          overflow: hidden;
          border: 6px solid rgba(255,255,255,0.2);
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
          animation: scaleIn 0.5s ease;
        }
        .caller-avatar-large img {
          width: 100%; height: 100%; object-fit: cover;
        }
        .avatar-placeholder-large {
          width: 100%; height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          font-size: 72px;
          font-weight: bold;
          color: white;
        }
        .caller-name-large {
          font-size: 36px;
          font-weight: 600;
          color: white;
          margin: 0;
        }
        .call-timer-wrapper { margin-top: 8px; }
        .status-message {
          color: rgba(255,255,255,0.7);
          font-size: 16px;
          margin: 0;
          animation: fadeInOut 2s infinite;
        }
        .call-controls-wrapper {
          padding: 32px;
          background: rgba(0,0,0,0.2);
        }
        @keyframes scaleIn {
          from { transform: scale(0.8); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
        @keyframes fadeInOut {
          0%, 100% { opacity: 0.7; }
          50%       { opacity: 0.3; }
        }
        @media (max-width: 768px) {
          .caller-avatar-large { width: 140px; height: 140px; }
          .avatar-placeholder-large { font-size: 56px; }
          .caller-name-large { font-size: 28px; }
        }
      `}</style>
    </div>
  );
};
