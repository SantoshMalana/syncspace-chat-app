import React, { useEffect, useState } from 'react';
import { FaPhone, FaPhoneSlash, FaVideo } from 'react-icons/fa';

interface IncomingCallModalProps {
  caller: {
    id: string;
    name: string;
    avatar?: string;
  };
  callType: 'voice' | 'video';
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  caller,
  callType,
  onAccept,
  onDecline,
}) => {
  const [isRinging, setIsRinging] = useState(true);

  // Auto-decline after 30 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      console.log('⏰ Call timeout - auto declining');
      onDecline();
    }, 30000); // 30 seconds

    return () => clearTimeout(timeout);
  }, [onDecline]);

  // Ringing animation
  useEffect(() => {
    const interval = setInterval(() => {
      setIsRinging((prev) => !prev);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div className="incoming-call-overlay" onClick={onDecline} />
      <div className="incoming-call-modal">
        <div className="caller-info">
          {/* Caller Avatar */}
          <div className={`caller-avatar ${isRinging ? 'ringing' : ''}`}>
            {caller.avatar ? (
              <img src={caller.avatar} alt={caller.name} />
            ) : (
              <div className="avatar-placeholder">
                {caller.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Caller Name */}
          <h2 className="caller-name">{caller.name}</h2>

          {/* Call Type */}
          <div className="call-type">
            {callType === 'video' ? (
              <>
                <FaVideo size={16} />
                <span>Incoming Video Call</span>
              </>
            ) : (
              <>
                <FaPhone size={16} />
                <span>Incoming Voice Call</span>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="call-actions">
          <button className="decline-button" onClick={onDecline}>
            <FaPhoneSlash size={24} />
            <span>Decline</span>
          </button>

          <button className="accept-button" onClick={onAccept}>
            <FaPhone size={24} />
            <span>Accept</span>
          </button>
        </div>
      </div>

      <style>{`
        .incoming-call-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px);
          z-index: 9998;
          animation: fadeIn 0.3s ease;
        }

        .incoming-call-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          z-index: 9999;
          min-width: 350px;
          animation: slideUp 0.3s ease;
        }

        .caller-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          margin-bottom: 32px;
        }

        .caller-avatar {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          overflow: hidden;
          border: 4px solid white;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
          transition: transform 0.3s ease;
        }

        .caller-avatar.ringing {
          transform: scale(1.05);
        }

        .caller-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.3);
          font-size: 48px;
          font-weight: bold;
          color: white;
        }

        .caller-name {
          font-size: 28px;
          font-weight: 600;
          color: white;
          margin: 0;
          text-align: center;
        }

        .call-type {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(255, 255, 255, 0.9);
          font-size: 16px;
          background: rgba(255, 255, 255, 0.2);
          padding: 8px 16px;
          border-radius: 20px;
        }

        .call-actions {
          display: flex;
          gap: 20px;
          justify-content: center;
        }

        .decline-button,
        .accept-button {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 16px 24px;
          border: none;
          border-radius: 16px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s ease;
          min-width: 120px;
        }

        .decline-button {
          background: #ef4444;
          color: white;
        }

        .decline-button:hover {
          background: #dc2626;
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(239, 68, 68, 0.4);
        }

        .accept-button {
          background: #10b981;
          color: white;
        }

        .accept-button:hover {
          background: #059669;
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(16, 185, 129, 0.4);
        }

        .decline-button:active,
        .accept-button:active {
          transform: translateY(0);
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translate(-50%, -40%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }

        @media (max-width: 768px) {
          .incoming-call-modal {
            min-width: 300px;
            padding: 32px 24px;
          }

          .caller-avatar {
            width: 100px;
            height: 100px;
          }

          .caller-name {
            font-size: 24px;
          }

          .call-actions {
            flex-direction: column;
            gap: 12px;
            width: 100%;
          }

          .decline-button,
          .accept-button {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
};