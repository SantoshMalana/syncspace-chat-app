import React from 'react';
import { FaMicrophone, FaMicrophoneSlash, FaPhoneSlash } from 'react-icons/fa';

interface CallControlsProps {
  isMuted: boolean;
  onToggleMute: () => void;
  onEndCall: () => void;
}

export const CallControls: React.FC<CallControlsProps> = ({
  isMuted,
  onToggleMute,
  onEndCall,
}) => {
  return (
    <div className="call-controls">
      <button
        className={`control-button ${isMuted ? 'muted' : ''}`}
        onClick={onToggleMute}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? <FaMicrophoneSlash size={20} /> : <FaMicrophone size={20} />}
      </button>

      <button
        className="control-button end-call"
        onClick={onEndCall}
        title="End Call"
      >
        <FaPhoneSlash size={20} />
      </button>

      <style>{`
        .call-controls {
          display: flex;
          gap: 16px;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .control-button {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          backdrop-filter: blur(10px);
        }

        .control-button:hover {
          transform: scale(1.1);
          background: rgba(255, 255, 255, 0.3);
        }

        .control-button:active {
          transform: scale(0.95);
        }

        .control-button.muted {
          background: #ef4444;
        }

        .control-button.muted:hover {
          background: #dc2626;
        }

        .control-button.end-call {
          background: #ef4444;
          width: 64px;
          height: 64px;
        }

        .control-button.end-call:hover {
          background: #dc2626;
        }

        @media (max-width: 768px) {
          .control-button {
            width: 48px;
            height: 48px;
          }

          .control-button.end-call {
            width: 56px;
            height: 56px;
          }
        }
      `}</style>
    </div>
  );
};