import React, { useEffect, useRef, useState } from 'react';
import type { VideoCallModalProps } from '../../types/call.types';

export const VideoCallModal: React.FC<VideoCallModalProps> = ({
  call, localStream, remoteStream, isMuted, isVideoEnabled = true,
  isScreenSharing, duration, isConnected,
  onToggleMute, onToggleVideo, onStartScreenShare, onStopScreenShare, onEndCall,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [showControls, setShowControls] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const other = call.caller;
  const displayName = other.fullName || other.name || 'Unknown';
  const initials = displayName.split(' ').filter(Boolean).map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  };

  // ── FIX: Always keep video elements mounted; only reroute srcObject ──
  useEffect(() => {
    const el = localVideoRef.current;
    if (!el) return;
    if (localStream) {
      if (el.srcObject !== localStream) el.srcObject = localStream;
      el.play().catch(() => { });
    } else {
      el.srcObject = null;
    }
  }, [localStream]);

  useEffect(() => {
    const el = remoteVideoRef.current;
    if (!el) return;
    if (remoteStream) {
      if (el.srcObject !== remoteStream) el.srcObject = remoteStream;
      el.play().catch(() => { });
    } else {
      el.srcObject = null;
    }
  }, [remoteStream]);

  const nudgeControls = () => {
    setShowControls(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShowControls(false), 4000);
  };

  useEffect(() => {
    nudgeControls();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const remoteHasVideo = !!(remoteStream && remoteStream.getVideoTracks().some(t => t.enabled && t.readyState === 'live'));
  const remoteIsSharing = remoteHasVideo && remoteStream?.getVideoTracks()[0]?.label?.toLowerCase().includes('screen');

  // Local has video when stream exists and video is enabled OR screen sharing (stream always present once call started)
  const localHasVideo = !!(localStream && (isVideoEnabled || isScreenSharing));

  return (
    <div
      className="vcv"
      onMouseMove={nudgeControls}
      onTouchStart={nudgeControls}
    >
      {/* ── Remote video / avatar ── */}
      <div className="vcv-bg">
        <video
          ref={remoteVideoRef}
          autoPlay playsInline
          className="vcv-remote-vid"
          style={{ opacity: remoteHasVideo ? 1 : 0 }}
        />
        {!remoteHasVideo && (
          <div className="vcv-avatar-wrap">
            <div className="vcv-avatar">
              {other.avatar
                ? <img src={other.avatar} alt={displayName} />
                : <span>{initials}</span>}
            </div>
            <p className="vcv-avatar-name">{displayName}</p>
            <p className="vcv-avatar-sub">
              {isConnected ? 'Camera is off' : (
                <span className="vcv-connecting">
                  <span className="vcv-dot" /><span className="vcv-dot" /><span className="vcv-dot" />
                  Connecting
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* ── PiP (local) — always-mounted video, shown/hidden via opacity ── */}
      <div className="vcv-pip">
        {/* Always render the video element so srcObject binding persists */}
        <video
          ref={localVideoRef}
          autoPlay playsInline muted
          className={`vcv-pip-vid${isScreenSharing ? '' : ' vcv-pip-mirror'}`}
          style={{ opacity: localHasVideo ? 1 : 0 }}
        />
        {/* Camera-off overlay — shown on top when camera is disabled */}
        {!localHasVideo && (
          <div className="vcv-pip-off">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" />
              <path d="M7.5 4H14a2 2 0 0 1 2 2v3.5" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
            <span>Cam Off</span>
          </div>
        )}
        {isScreenSharing && <div className="vcv-pip-badge">● Sharing</div>}
        <div className="vcv-pip-label">You</div>
      </div>

      {/* ── Top HUD ── */}
      <div className={`vcv-hud ${showControls ? 'vcv-show' : 'vcv-hide'}`}>
        <div className="vcv-hud-left">
          <span className={`vcv-dot-status ${isConnected ? 'vcv-dot-on' : 'vcv-dot-wait'}`} />
          <span className="vcv-hud-name">{displayName}</span>
          {isConnected && (
            <span className="vcv-hud-timer">{fmt(duration)}</span>
          )}
          {!isConnected && (
            <span className="vcv-hud-connecting">Connecting...</span>
          )}
        </div>
        {remoteIsSharing && (
          <div className="vcv-hud-share-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            Sharing screen
          </div>
        )}
      </div>

      {/* ── Controls ── */}
      <div className={`vcv-controls ${showControls ? 'vcv-show' : 'vcv-hide'}`}>

        {/* Mute */}
        <button
          onClick={onToggleMute}
          className={`vcv-btn ${isMuted ? 'vcv-btn-danger' : 'vcv-btn-default'}`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          <span className="vcv-btn-icon">
            {isMuted ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            )}
          </span>
          <span className="vcv-btn-label">{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>

        {/* Camera */}
        <button
          onClick={onToggleVideo}
          className={`vcv-btn ${!isVideoEnabled ? 'vcv-btn-danger' : 'vcv-btn-default'}`}
          title={isVideoEnabled ? 'Stop camera' : 'Start camera'}
        >
          <span className="vcv-btn-icon">
            {!isVideoEnabled ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" />
                <path d="M7.5 4H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            )}
          </span>
          <span className="vcv-btn-label">{isVideoEnabled ? 'Stop Cam' : 'Start Cam'}</span>
        </button>

        {/* Screen share */}
        <button
          onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare}
          className={`vcv-btn ${isScreenSharing ? 'vcv-btn-active' : 'vcv-btn-default'}`}
          title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
        >
          <span className="vcv-btn-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
              {isScreenSharing && <line x1="2" y1="3" x2="22" y2="17" />}
            </svg>
          </span>
          <span className="vcv-btn-label">{isScreenSharing ? 'Stop Share' : 'Share'}</span>
        </button>

        {/* End call */}
        <button onClick={onEndCall} className="vcv-btn vcv-btn-end" title="End call">
          <span className="vcv-btn-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
            </svg>
          </span>
          <span className="vcv-btn-label">End</span>
        </button>
      </div>

      <style>{`
        .vcv {
          position: fixed; inset: 0; z-index: 10000;
          background: #080810;
          display: flex; flex-direction: column;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          user-select: none;
        }

        /* Remote bg */
        .vcv-bg {
          flex: 1; position: relative;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden; background: #0e0e18;
        }
        .vcv-remote-vid {
          position: absolute; inset: 0;
          width: 100%; height: 100%; object-fit: cover;
          transition: opacity .4s ease;
        }

        /* Avatar placeholder */
        .vcv-avatar-wrap {
          display: flex; flex-direction: column;
          align-items: center; gap: 14px; z-index: 1;
        }
        .vcv-avatar {
          width: 140px; height: 140px; border-radius: 50%;
          background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%);
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
          box-shadow: 0 0 0 1px rgba(124,58,237,.3), 0 0 60px rgba(124,58,237,.25);
        }
        .vcv-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .vcv-avatar span { font-size: 52px; font-weight: 700; color: white; letter-spacing: -2px; }
        .vcv-avatar-name { color: white; font-size: 20px; font-weight: 600; margin: 0; }
        .vcv-avatar-sub { color: rgba(255,255,255,.45); font-size: 13px; margin: 0; }
        .vcv-connecting { display: flex; align-items: center; gap: 5px; }
        .vcv-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: rgba(255,255,255,.5);
          animation: vcvPulse 1.4s ease-in-out infinite;
        }
        .vcv-dot:nth-child(2) { animation-delay: .2s; }
        .vcv-dot:nth-child(3) { animation-delay: .4s; }
        @keyframes vcvPulse { 0%,80%,100%{transform:scale(0);opacity:.5} 40%{transform:scale(1);opacity:1} }

        /* PiP — always-mounted video container */
        .vcv-pip {
          position: absolute; bottom: 96px; right: 20px;
          width: 188px; height: 140px;
          border-radius: 14px; overflow: hidden;
          border: 1.5px solid rgba(255,255,255,.12);
          box-shadow: 0 8px 32px rgba(0,0,0,.7);
          background: #12121e;
          z-index: 30; cursor: pointer;
          transition: transform .2s ease, box-shadow .2s ease;
        }
        .vcv-pip:hover { transform: scale(1.04); box-shadow: 0 12px 40px rgba(0,0,0,.8); }
        .vcv-pip-vid { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; transition: opacity .3s ease; }
        .vcv-pip-mirror { transform: scaleX(-1); }
        .vcv-pip-off {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 6px; color: rgba(255,255,255,.35); font-size: 11px;
          background: #12121e; transition: opacity .3s ease;
        }
        .vcv-pip-badge {
          position: absolute; bottom: 0; left: 0; right: 0;
          background: rgba(16,185,129,.85);
          text-align: center; font-size: 10px; font-weight: 600;
          color: white; padding: 3px 0; letter-spacing: .3px;
        }
        .vcv-pip-label {
          position: absolute; top: 7px; left: 9px;
          font-size: 10px; font-weight: 600; color: rgba(255,255,255,.6);
          text-shadow: 0 1px 3px rgba(0,0,0,.8);
        }

        /* HUD top */
        .vcv-hud {
          position: absolute; top: 0; left: 0; right: 0;
          padding: 18px 24px;
          background: linear-gradient(180deg, rgba(0,0,0,.7) 0%, transparent 100%);
          display: flex; align-items: center; justify-content: space-between;
          z-index: 20; transition: opacity .3s ease;
        }
        .vcv-hud-left { display: flex; align-items: center; gap: 10px; }
        .vcv-dot-status { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .vcv-dot-on { background: #10b981; }
        .vcv-dot-wait { background: #f59e0b; animation: vcvStatusPulse 1.5s infinite; }
        @keyframes vcvStatusPulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        .vcv-hud-name { color: white; font-size: 15px; font-weight: 600; text-shadow: 0 1px 4px rgba(0,0,0,.6); }
        .vcv-hud-timer {
          background: rgba(0,0,0,.35); border: 1px solid rgba(255,255,255,.12);
          border-radius: 20px; padding: 2px 10px;
          color: rgba(255,255,255,.8); font-size: 12px;
          font-variant-numeric: tabular-nums; letter-spacing: .8px;
          backdrop-filter: blur(8px);
        }
        .vcv-hud-connecting { color: rgba(255,255,255,.5); font-size: 12px; }
        .vcv-hud-share-badge {
          display: flex; align-items: center; gap: 5px;
          background: rgba(16,185,129,.2); border: 1px solid rgba(16,185,129,.4);
          border-radius: 20px; padding: 3px 10px;
          color: #10b981; font-size: 11px; font-weight: 600;
        }

        /* Controls */
        .vcv-controls {
          position: absolute; bottom: 0; left: 0; right: 0;
          padding: 20px 24px 32px;
          background: linear-gradient(0deg, rgba(0,0,0,.78) 0%, transparent 100%);
          display: flex; justify-content: center; align-items: center; gap: 12px;
          z-index: 20; transition: opacity .3s ease;
        }
        .vcv-show { opacity: 1; pointer-events: all; }
        .vcv-hide { opacity: 0; pointer-events: none; }

        /* Buttons — unified with GroupCallModal sizing */
        .vcv-btn {
          display: flex; flex-direction: column;
          align-items: center; gap: 6px;
          padding: 13px 20px;
          border-radius: 14px; cursor: pointer;
          transition: all .18s ease;
          min-width: 80px;
          backdrop-filter: blur(16px);
          border: 1px solid transparent;
        }
        .vcv-btn-icon { display: flex; align-items: center; justify-content: center; }
        .vcv-btn-label { font-size: 11px; font-weight: 500; }

        .vcv-btn-default {
          background: rgba(255,255,255,.1);
          border-color: rgba(255,255,255,.13);
          color: white;
        }
        .vcv-btn-default:hover {
          background: rgba(255,255,255,.18);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,.4);
        }

        .vcv-btn-danger {
          background: rgba(239,68,68,.2);
          border-color: rgba(239,68,68,.4);
          color: #f87171;
        }
        .vcv-btn-danger:hover { background: rgba(239,68,68,.3); transform: translateY(-2px); }

        .vcv-btn-active {
          background: rgba(16,185,129,.2);
          border-color: rgba(16,185,129,.5);
          color: #34d399;
        }
        .vcv-btn-active:hover { background: rgba(16,185,129,.3); transform: translateY(-2px); }

        .vcv-btn-end {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          border-color: transparent;
          color: white;
          box-shadow: 0 4px 16px rgba(239,68,68,.35);
          padding: 13px 28px;
        }
        .vcv-btn-end:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(239,68,68,.5);
        }

        @media (max-width: 480px) {
          .vcv-pip { width: 120px; height: 90px; bottom: 80px; right: 12px; }
          .vcv-btn { padding: 11px 14px; min-width: 64px; }
          .vcv-btn-end { padding: 11px 22px; }
          .vcv-avatar { width: 100px; height: 100px; }
          .vcv-avatar span { font-size: 38px; }
          .vcv-controls { gap: 8px; }
        }
      `}</style>
    </div>
  );
};

export default VideoCallModal;
