// frontend/src/components/calls/CallButton.tsx

import React, { useState } from 'react';
import { FaPhone, FaVideo, FaSpinner } from 'react-icons/fa';

interface CallButtonProps {
  recipientId: string;
  recipientName: string;
  onInitiateCall: (recipientId: string, isVideo: boolean) => Promise<void>;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const CallButton: React.FC<CallButtonProps> = ({
  recipientId,
  recipientName,
  onInitiateCall,
  disabled = false,
  size = 'medium',
}) => {
  const [isInitiating, setIsInitiating] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const handleCall = async (isVideo: boolean) => {
    if (disabled || isInitiating) return;

    setIsInitiating(true);
    setShowOptions(false);

    try {
      await onInitiateCall(recipientId, isVideo);
    } catch (error) {
      console.error('Failed to initiate call:', error);
    } finally {
      setIsInitiating(false);
    }
  };

  return (
    <div className="call-button-container">
      <button
        className={`call-btn call-btn-${size} ${disabled ? 'disabled' : ''}`}
        onClick={() => setShowOptions(!showOptions)}
        disabled={disabled || isInitiating}
        title={`Call ${recipientName}`}
      >
        {isInitiating ? (
          <FaSpinner className="spinner-icon" size={size === 'small' ? 14 : 16} />
        ) : (
          <FaPhone size={size === 'small' ? 14 : 16} />
        )}
      </button>

      {showOptions && !isInitiating && (
        <>
          <div className="options-backdrop" onClick={() => setShowOptions(false)} />
          <div className="call-options-menu">
            <button className="option-item voice" onClick={() => handleCall(false)}>
              <FaPhone size={16} />
              <span>Voice Call</span>
            </button>
            <button className="option-item video" onClick={() => handleCall(true)}>
              <FaVideo size={16} />
              <span>Video Call</span>
            </button>
          </div>
        </>
      )}

      <style>{`
        .call-button-container {
          position: relative;
          display: inline-block;
        }

        .call-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        }

        .call-btn-small { width: 32px; height: 32px; }
        .call-btn-medium { width: 40px; height: 40px; }
        .call-btn-large { width: 48px; height: 48px; }

        .call-btn:hover:not(.disabled) {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.5);
        }

        .call-btn.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spinner-icon {
          animation: rotate 1s linear infinite;
        }

        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .options-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 999;
        }

        .call-options-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          overflow: hidden;
          z-index: 1000;
          min-width: 160px;
          animation: slideDown 0.2s ease;
        }

        .option-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px 16px;
          border: none;
          background: white;
          cursor: pointer;
          transition: background 0.2s;
          font-size: 14px;
          font-weight: 500;
        }

        .option-item:hover { background: #f3f4f6; }
        .option-item.voice { color: #667eea; }
        .option-item.video {
          color: #764ba2;
          border-top: 1px solid #e5e7eb;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};