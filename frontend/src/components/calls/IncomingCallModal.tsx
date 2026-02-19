import React, { useEffect, useState } from 'react';

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
  caller, callType, onAccept, onDecline,
}) => {
  const [countdown, setCountdown] = useState(30);
  const displayName = caller.name || 'Unknown';
  const initials = displayName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);

  useEffect(() => {
    const id = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { onDecline(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [onDecline]);

  return (
    <>
      <div className="icm-backdrop" />

      <div className="icm-card">

        {/* Call type badge */}
        <div className="icm-badge">
          {callType === 'video' ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          )}
          <span>Incoming {callType === 'video' ? 'Video' : 'Voice'} Call</span>
        </div>

        {/* Avatar + rings */}
        <div className="icm-rings">
          <div className="icm-ring icm-r1" />
          <div className="icm-ring icm-r2" />
          <div className="icm-avatar">
            {caller.avatar
              ? <img src={caller.avatar} alt={displayName} />
              : <span>{initials}</span>
            }
          </div>
        </div>

        <h2 className="icm-name">{displayName}</h2>
        <p className="icm-sub">is calling you</p>

        {/* Progress bar */}
        <div className="icm-bar">
          <div className="icm-bar-fill" style={{ width: `${(countdown / 30) * 100}%` }} />
        </div>
        <p className="icm-countdown">{countdown}s</p>

        {/* Action buttons */}
        <div className="icm-actions">
          <button className="icm-btn icm-btn-decline" onClick={onDecline}>
            <span className="icm-btn-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
                <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </span>
            <span>Decline</span>
          </button>

          <button className="icm-btn icm-btn-accept" onClick={onAccept}>
            <span className="icm-btn-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
              </svg>
            </span>
            <span>Accept</span>
          </button>
        </div>
      </div>

      <style>{`
        .icm-backdrop {
          position: fixed; inset: 0;
          background: rgba(0,0,0,.72);
          backdrop-filter: blur(12px);
          z-index: 9998;
          animation: icmFade .22s ease;
        }
        @keyframes icmFade { from{opacity:0} to{opacity:1} }

        .icm-card {
          position: fixed; top: 50%; left: 50%;
          transform: translate(-50%,-50%);
          z-index: 9999;
          background: linear-gradient(150deg, #141428 0%, #0f1535 60%, #0d1a3a 100%);
          border: 1px solid rgba(124,58,237,.25);
          border-radius: 26px;
          padding: 32px 36px 28px;
          min-width: 330px; max-width: 390px; width: 90%;
          box-shadow:
            0 0 0 1px rgba(255,255,255,.04),
            0 24px 80px rgba(0,0,0,.65),
            0 0 60px rgba(124,58,237,.08);
          display: flex; flex-direction: column;
          align-items: center; gap: 14px;
          animation: icmUp .3s cubic-bezier(.34,1.56,.64,1);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        @keyframes icmUp {
          from { opacity:0; transform:translate(-50%,-44%) scale(.9); }
          to   { opacity:1; transform:translate(-50%,-50%) scale(1); }
        }

        /* Badge */
        .icm-badge {
          display: flex; align-items: center; gap: 6px;
          background: rgba(124,58,237,.12);
          border: 1px solid rgba(124,58,237,.25);
          border-radius: 20px; padding: 5px 13px;
          color: rgba(255,255,255,.75); font-size: 12px; font-weight: 500;
        }

        /* Rings + avatar */
        .icm-rings {
          position: relative; width: 128px; height: 128px;
          display: flex; align-items: center; justify-content: center;
          margin: 4px 0;
        }
        .icm-ring {
          position: absolute; border-radius: 50%;
          border: 1.5px solid rgba(124,58,237,.4);
          animation: icmRingPulse 2s ease-out infinite;
        }
        .icm-r1 { width: 128px; height: 128px; }
        .icm-r2 { width: 100px; height: 100px; animation-delay: .5s; }
        @keyframes icmRingPulse {
          0%   { transform:scale(.9); opacity:.75; }
          65%  { transform:scale(1.08); opacity:.15; }
          100% { transform:scale(.9); opacity:.75; }
        }
        .icm-avatar {
          width: 82px; height: 82px; border-radius: 50%;
          background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%);
          display: flex; align-items: center; justify-content: center;
          overflow: hidden; position: relative; z-index: 2;
          box-shadow: 0 0 0 3px rgba(124,58,237,.2), 0 12px 36px rgba(0,0,0,.55);
        }
        .icm-avatar img { width:100%; height:100%; object-fit:cover; }
        .icm-avatar span { font-size:30px; font-weight:700; color:white; letter-spacing:-1px; }

        .icm-name {
          font-size: 24px; font-weight: 700; color: white;
          margin: 0; text-align: center; letter-spacing: -.3px;
        }
        .icm-sub {
          color: rgba(255,255,255,.4); font-size: 13px;
          margin: -6px 0 0; text-align: center;
        }

        /* Progress */
        .icm-bar {
          width: 100%; height: 2px;
          background: rgba(255,255,255,.08); border-radius: 2px; overflow: hidden;
        }
        .icm-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #7c3aed, #3b82f6);
          border-radius: 2px;
          transition: width 1s linear;
        }
        .icm-countdown {
          font-size: 11px; color: rgba(255,255,255,.25);
          margin: -8px 0 0; font-variant-numeric: tabular-nums;
        }

        /* Buttons */
        .icm-actions { display: flex; gap: 12px; width: 100%; margin-top: 4px; }
        .icm-btn {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; gap: 7px;
          padding: 15px 12px; border-radius: 16px;
          cursor: pointer; font-size: 12px; font-weight: 600;
          transition: all .18s ease; border: 1px solid transparent;
        }
        .icm-btn-icon { display:flex; align-items:center; justify-content:center; }

        .icm-btn-decline {
          background: rgba(239,68,68,.12);
          border-color: rgba(239,68,68,.3);
          color: #f87171;
        }
        .icm-btn-decline:hover {
          background: rgba(239,68,68,.22);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(239,68,68,.25);
        }

        .icm-btn-accept {
          background: linear-gradient(135deg, #10b981, #059669);
          border-color: transparent; color: white;
          box-shadow: 0 4px 18px rgba(16,185,129,.32);
        }
        .icm-btn-accept:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 26px rgba(16,185,129,.48);
        }

        @media (max-width: 480px) {
          .icm-card { padding: 26px 22px 22px; min-width: 280px; }
          .icm-name { font-size: 20px; }
          .icm-avatar { width: 70px; height: 70px; }
          .icm-avatar span { font-size: 26px; }
        }
      `}</style>
    </>
  );
};
