import React, { useEffect, useRef, useState } from 'react';
import type { VoiceCallModalProps } from '../../types/call.types';

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
  call, remoteStream, isMuted, duration, isConnected, isScreenSharing,
  onToggleMute, onStartScreenShare, onStopScreenShare, onEndCall,
}) => {
  const currentUserId = (() => { try { const u = JSON.parse(localStorage.getItem('user') || '{}'); return u.id || u._id || ''; } catch { return ''; } })();
  const isInitiator = call.caller.id === currentUserId || call.caller._id === currentUserId;
  const other = isInitiator ? call.receiver : call.caller;
  const displayName = other.fullName || other.name || 'Unknown';
  const initials = displayName.split(' ').filter(Boolean).map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const [isPulsing, setIsPulsing] = useState(true);

  // ── Safety-net hidden audio element (CallManager already has the primary one) ──
  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !remoteStream) return;
    if (el.srcObject !== remoteStream) { el.srcObject = remoteStream; el.play().catch(() => { }); }
  }, [remoteStream]);

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  };

  // Stop aggressive pulsing once connected
  useEffect(() => {
    if (isConnected) setIsPulsing(false);
    else setIsPulsing(true);
  }, [isConnected]);

  return (
    <div className="vcm">
      {/* Hidden audio safety-net for remote voice */}
      <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />

      {/* Ambient blobs */}
      <div className="vcm-blob vcm-blob-a" />
      <div className="vcm-blob vcm-blob-b" />

      {/* Top bar */}
      <div className="vcm-topbar">
        <div className="vcm-pill vcm-pill-status">
          <span className={`vcm-dot ${isConnected ? 'vcm-dot-on' : 'vcm-dot-wait'}`} />
          <span>{isConnected ? 'Connected' : 'Connecting...'}</span>
        </div>
        {isConnected && (
          <div className="vcm-pill vcm-pill-timer">
            <span>⏱</span>
            <span>{fmt(duration)}</span>
          </div>
        )}
        {isScreenSharing && (
          <div className="vcm-pill vcm-pill-sharing">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            Sharing screen
          </div>
        )}
      </div>

      {/* Center content */}
      <div className="vcm-body">
        {/* Pulse rings — only animate while calling/connected */}
        <div className="vcm-rings">
          <div className={`vcm-ring vcm-ring-3${isPulsing ? '' : ' vcm-ring-idle'}`} />
          <div className={`vcm-ring vcm-ring-2${isPulsing ? '' : ' vcm-ring-idle'}`} />
          <div className={`vcm-ring vcm-ring-1${isPulsing ? '' : ' vcm-ring-idle'}`} />
          <div className="vcm-avatar">
            {other.avatar
              ? <img src={other.avatar} alt={displayName} />
              : <span>{initials}</span>
            }
          </div>
        </div>

        <h2 className="vcm-name">{displayName}</h2>

        <div className="vcm-status-row">
          {isConnected ? (
            <span className="vcm-status-connected">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              Voice call in progress
            </span>
          ) : (
            <div className="vcm-ringing">
              <span className="vcm-rdot" />
              <span className="vcm-rdot" />
              <span className="vcm-rdot" />
              <span className="vcm-rtext">Ringing</span>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="vcm-controls">

        {/* Mute */}
        <button
          onClick={onToggleMute}
          className={`vcm-btn ${isMuted ? 'vcm-btn-danger' : 'vcm-btn-default'}`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          <span className="vcm-btn-icon">
            {isMuted ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            )}
          </span>
          <span className="vcm-btn-label">{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>

        {/* Screen share */}
        <button
          onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare}
          className={`vcm-btn ${isScreenSharing ? 'vcm-btn-active' : 'vcm-btn-default'}`}
          title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
        >
          <span className="vcm-btn-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </span>
          <span className="vcm-btn-label">{isScreenSharing ? 'Stop Share' : 'Share'}</span>
        </button>

        {/* End */}
        <button onClick={onEndCall} className="vcm-btn vcm-btn-end" title="End call">
          <span className="vcm-btn-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
            </svg>
          </span>
          <span className="vcm-btn-label">End</span>
        </button>
      </div>

      <style>{`
        .vcm {
          position: fixed; inset: 0; z-index: 9999;
          background: linear-gradient(145deg, #0d0d1a 0%, #12102b 50%, #0d1020 100%);
          display: flex; flex-direction: column;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        /* Ambient blobs */
        .vcm-blob {
          position: absolute; border-radius: 50%;
          filter: blur(90px); opacity: .12; pointer-events: none;
        }
        .vcm-blob-a {
          width: 480px; height: 480px;
          background: radial-gradient(circle, #7c3aed, transparent);
          top: -140px; left: -140px;
          animation: vcmFloat 9s ease-in-out infinite;
        }
        .vcm-blob-b {
          width: 400px; height: 400px;
          background: radial-gradient(circle, #2563eb, transparent);
          bottom: -100px; right: -100px;
          animation: vcmFloat 11s ease-in-out infinite reverse;
        }
        @keyframes vcmFloat {
          0%,100% { transform: translate(0,0) scale(1); }
          50%      { transform: translate(24px,-24px) scale(1.08); }
        }

        /* Top bar */
        .vcm-topbar {
          padding: 22px 24px 0;
          display: flex; justify-content: center;
          align-items: center; gap: 8px;
          flex-wrap: wrap; position: relative; z-index: 1;
        }
        .vcm-pill {
          display: flex; align-items: center; gap: 7px;
          border-radius: 20px; padding: 5px 14px;
          font-size: 12px; font-weight: 500;
          backdrop-filter: blur(12px);
        }
        .vcm-pill-status {
          background: rgba(255,255,255,.07);
          border: 1px solid rgba(255,255,255,.1);
          color: rgba(255,255,255,.8);
        }
        .vcm-pill-timer {
          background: rgba(124,58,237,.12);
          border: 1px solid rgba(124,58,237,.25);
          color: rgba(255,255,255,.75);
          font-variant-numeric: tabular-nums; letter-spacing: .5px;
        }
        .vcm-pill-sharing {
          background: rgba(16,185,129,.18);
          border: 1px solid rgba(16,185,129,.35);
          color: #34d399; font-weight: 600;
          animation: vcmSharePulse 2.5s ease-in-out infinite;
        }
        @keyframes vcmSharePulse { 0%,100%{opacity:1} 50%{opacity:.65} }

        .vcm-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .vcm-dot-on   { background: #10b981; }
        .vcm-dot-wait { background: #f59e0b; animation: vcmDotBlink 1.4s infinite; }
        @keyframes vcmDotBlink { 0%,100%{opacity:1} 50%{opacity:.3} }

        /* Body */
        .vcm-body {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 20px; position: relative; z-index: 1;
        }

        /* Rings */
        .vcm-rings {
          position: relative; width: 220px; height: 220px;
          display: flex; align-items: center; justify-content: center;
        }
        .vcm-ring {
          position: absolute; border-radius: 50%;
          border: 1.5px solid rgba(124,58,237,.35);
          animation: vcmRing 2.8s ease-out infinite;
        }
        .vcm-ring-idle { animation: vcmRingIdle 4s ease-in-out infinite; opacity: .25; }
        .vcm-ring-1 { width: 220px; height: 220px; }
        .vcm-ring-2 { width: 175px; height: 175px; animation-delay: .5s; }
        .vcm-ring-3 { width: 130px; height: 130px; animation-delay: 1s; }
        @keyframes vcmRing {
          0%   { transform: scale(.92); opacity: .7; }
          60%  { transform: scale(1.06); opacity: .2; }
          100% { transform: scale(.92); opacity: .7; }
        }
        @keyframes vcmRingIdle {
          0%,100% { transform: scale(1); opacity: .2; }
          50% { transform: scale(1.02); opacity: .3; }
        }

        .vcm-avatar {
          width: 108px; height: 108px; border-radius: 50%;
          background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%);
          display: flex; align-items: center; justify-content: center;
          overflow: hidden; position: relative; z-index: 2;
          box-shadow: 0 0 0 3px rgba(124,58,237,.25), 0 20px 60px rgba(0,0,0,.55);
        }
        .vcm-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .vcm-avatar span { font-size: 38px; font-weight: 700; color: white; letter-spacing: -1px; }

        .vcm-name {
          font-size: 30px; font-weight: 700; color: white;
          margin: 0; letter-spacing: -.5px;
          text-shadow: 0 2px 16px rgba(0,0,0,.4);
        }

        /* Status row */
        .vcm-status-row { display: flex; align-items: center; justify-content: center; min-height: 36px; }
        .vcm-status-connected {
          display: flex; align-items: center; gap: 7px;
          font-size: 13px; color: rgba(255,255,255,.5);
          background: rgba(16,185,129,.08); border: 1px solid rgba(16,185,129,.2);
          border-radius: 20px; padding: 6px 16px;
        }
        .vcm-status-connected svg { color: #10b981; flex-shrink: 0; }

        .vcm-ringing { display: flex; align-items: center; gap: 6px; }
        .vcm-rdot {
          width: 6px; height: 6px; border-radius: 50%;
          background: rgba(255,255,255,.45);
          animation: vcmRdot 1.4s ease-in-out infinite;
        }
        .vcm-rdot:nth-child(2) { animation-delay: .2s; }
        .vcm-rdot:nth-child(3) { animation-delay: .4s; }
        @keyframes vcmRdot { 0%,80%,100%{transform:scale(0.5);opacity:.4} 40%{transform:scale(1);opacity:1} }
        .vcm-rtext {
          font-size: 14px; color: rgba(255,255,255,.5);
          font-weight: 500; margin-left: 4px; letter-spacing: .3px;
        }

        /* Controls — unified sizing with VideoCallModal and GroupCallModal */
        .vcm-controls {
          padding: 20px 40px 40px;
          display: flex; justify-content: center; gap: 12px;
          position: relative; z-index: 1;
        }
        .vcm-btn {
          display: flex; flex-direction: column;
          align-items: center; gap: 6px;
          padding: 13px 20px; border-radius: 14px;
          cursor: pointer; transition: all .18s ease;
          min-width: 80px; backdrop-filter: blur(14px);
          border: 1px solid transparent;
        }
        .vcm-btn-icon { display: flex; align-items: center; justify-content: center; }
        .vcm-btn-label { font-size: 11px; font-weight: 500; }

        .vcm-btn-default {
          background: rgba(255,255,255,.09);
          border-color: rgba(255,255,255,.12);
          color: white;
        }
        .vcm-btn-default:hover {
          background: rgba(255,255,255,.16);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,.35);
        }
        .vcm-btn-danger {
          background: rgba(239,68,68,.2);
          border-color: rgba(239,68,68,.4);
          color: #f87171;
        }
        .vcm-btn-danger:hover { background: rgba(239,68,68,.3); transform: translateY(-2px); }

        .vcm-btn-active {
          background: rgba(16,185,129,.2);
          border-color: rgba(16,185,129,.45);
          color: #34d399;
        }
        .vcm-btn-active:hover { background: rgba(16,185,129,.3); transform: translateY(-2px); }

        .vcm-btn-end {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          border-color: transparent; color: white;
          box-shadow: 0 4px 18px rgba(239,68,68,.38);
          padding: 13px 28px;
        }
        .vcm-btn-end:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(239,68,68,.52);
        }

        @media (max-width: 480px) {
          .vcm-name { font-size: 24px; }
          .vcm-rings { width: 180px; height: 180px; }
          .vcm-ring-1 { width: 180px; height: 180px; }
          .vcm-ring-2 { width: 144px; height: 144px; }
          .vcm-ring-3 { width: 108px; height: 108px; }
          .vcm-avatar { width: 88px; height: 88px; }
          .vcm-avatar span { font-size: 30px; }
          .vcm-btn { padding: 11px 14px; min-width: 68px; }
          .vcm-btn-end { padding: 11px 22px; }
          .vcm-controls { gap: 8px; padding-bottom: 36px; }
        }
      `}</style>
    </div>
  );
};

export default VoiceCallModal;
