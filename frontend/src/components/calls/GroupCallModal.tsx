import React, { useEffect, useRef, useState } from 'react';
import type { GroupCallParticipant, CallType } from '../../types/call.types';

interface GroupCallModalProps {
    channelName?: string;
    callType: CallType;
    participants: GroupCallParticipant[];
    localStream: MediaStream | null;
    isMuted: boolean;
    isVideoEnabled: boolean;
    isScreenSharing: boolean;          // ✅ NEW
    currentUserId: string;
    onToggleMute: () => void;
    onToggleVideo: () => void;
    onStartScreenShare: () => Promise<void>;  // ✅ NEW
    onStopScreenShare: () => Promise<void>;   // ✅ NEW
    onLeave: () => void;
}

const MicOn = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>);
const MicOff = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" /><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>);
const CamOn = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>);
const CamOff = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" /><path d="M7.5 4H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" /><line x1="1" y1="1" x2="23" y2="23" /></svg>);
const UsersIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>);
const ScreenShareIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>);

// ── Participant tile ──────────────────────────────────────────────────────────
const Tile: React.FC<{
    participant: GroupCallParticipant;
    isLocal?: boolean;
    isMuted?: boolean;
    isVideoEnabled?: boolean;
    isScreenSharing?: boolean;
}> = ({ participant, isLocal = false, isMuted, isVideoEnabled, isScreenSharing }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && participant.stream) {
            videoRef.current.srcObject = participant.stream;
        }
    }, [participant.stream]);

    // ✅ FIX: Always render video element, show/hide via opacity (same fix as VideoCallModal)
    const hasVideo = !!(
        participant.stream &&
        participant.stream.getVideoTracks().length > 0 &&
        (isLocal ? isVideoEnabled !== false : true)
    );

    const initials = participant.name
        .split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <div className="gcm-tile">
            {/* Always-mounted video element */}
            <video
                ref={videoRef}
                autoPlay playsInline
                muted={isLocal}
                className={`gcm-tile-video${isLocal && !isScreenSharing ? ' gcm-tile-mirror' : ''}`}
                style={{ opacity: hasVideo ? 1 : 0 }}
            />

            {/* Avatar fallback when no video */}
            {!hasVideo && (
                <div className="gcm-tile-avatar-wrap">
                    <div className="gcm-tile-avatar">
                        {participant.avatar
                            ? <img src={participant.avatar} alt={participant.name} />
                            : <span>{initials}</span>
                        }
                    </div>
                    <p className="gcm-tile-name-center">{participant.name}{isLocal ? ' (You)' : ''}</p>
                </div>
            )}

            {/* Screen sharing badge */}
            {isLocal && isScreenSharing && (
                <div className="gcm-tile-screen-badge">🖥️ Sharing</div>
            )}

            {/* Bottom name badge */}
            <div className="gcm-tile-badge">
                {isMuted && (
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="1" y1="1" x2="23" y2="23" />
                        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                    </svg>
                )}
                <span>{participant.name}{isLocal ? ' (You)' : ''}</span>
            </div>

            {isLocal && !isMuted && <div className="gcm-tile-ring" />}
        </div>
    );
};

// ── Group call modal ──────────────────────────────────────────────────────────
export const GroupCallModal: React.FC<GroupCallModalProps> = ({
    channelName, callType, participants,
    localStream, isMuted, isVideoEnabled, isScreenSharing,
    currentUserId, onToggleMute, onToggleVideo,
    onStartScreenShare, onStopScreenShare, onLeave,
}) => {
    const [showControls, setShowControls] = useState(true);
    const timerRef = useRef<ReturnType<typeof setTimeout>>();

    const nudge = () => {
        setShowControls(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setShowControls(false), 4000);
    };

    useEffect(() => {
        nudge();
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, []);

    const localParticipant: GroupCallParticipant = {
        userId: currentUserId,
        name: 'You',
        stream: localStream || undefined,
    };

    const remoteParticipants = participants.filter(p => p.userId !== currentUserId);
    const allParticipants = [localParticipant, ...remoteParticipants];
    const count = allParticipants.length;
    const cols = count <= 1 ? 1 : count <= 4 ? 2 : count <= 9 ? 3 : 4;

    return (
        <div className="gcm" onMouseMove={nudge} onTouchStart={nudge}>

            {/* Header */}
            <div className={`gcm-header ${showControls ? 'gcm-show' : 'gcm-hide'}`}>
                <div className="gcm-header-left">
                    <div className={`gcm-header-icon ${callType === 'video' ? 'gcm-header-icon-video' : 'gcm-header-icon-voice'}`}>
                        {callType === 'video' ? <CamOn /> : <MicOn />}
                    </div>
                    <div>
                        <p className="gcm-header-title">
                            {callType === 'video' ? 'Video Call' : 'Voice Call'}
                            {channelName && <span className="gcm-header-channel"> · #{channelName}</span>}
                        </p>
                        <p className="gcm-header-sub">
                            <UsersIcon />
                            {count} participant{count !== 1 ? 's' : ''}
                            {isScreenSharing && <span className="gcm-sharing-badge">🖥️ You're sharing</span>}
                        </p>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="gcm-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                {allParticipants.map((p, i) => (
                    <Tile
                        key={p.userId}
                        participant={p}
                        isLocal={i === 0}
                        isMuted={i === 0 ? isMuted : false}
                        isVideoEnabled={i === 0 ? isVideoEnabled : true}
                        isScreenSharing={i === 0 ? isScreenSharing : false}
                    />
                ))}
            </div>

            {/* Controls */}
            <div className={`gcm-controls ${showControls ? 'gcm-show' : 'gcm-hide'}`}>

                {/* Mute */}
                <button onClick={onToggleMute} className={`gcm-btn ${isMuted ? 'gcm-btn-danger' : 'gcm-btn-default'}`} title={isMuted ? 'Unmute' : 'Mute'}>
                    <span className="gcm-btn-icon">{isMuted ? <MicOff /> : <MicOn />}</span>
                    <span className="gcm-btn-label">{isMuted ? 'Unmute' : 'Mute'}</span>
                </button>

                {/* Camera (video calls only) */}
                {callType === 'video' && (
                    <button onClick={onToggleVideo} className={`gcm-btn ${!isVideoEnabled ? 'gcm-btn-danger' : 'gcm-btn-default'}`} title={isVideoEnabled ? 'Stop camera' : 'Start camera'}>
                        <span className="gcm-btn-icon">{isVideoEnabled ? <CamOn /> : <CamOff />}</span>
                        <span className="gcm-btn-label">{isVideoEnabled ? 'Stop Video' : 'Start Video'}</span>
                    </button>
                )}

                {/* ✅ Screen Share */}
                <button
                    onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare}
                    className={`gcm-btn ${isScreenSharing ? 'gcm-btn-sharing' : 'gcm-btn-default'}`}
                    title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
                >
                    <span className="gcm-btn-icon"><ScreenShareIcon /></span>
                    <span className="gcm-btn-label">{isScreenSharing ? 'Stop Share' : 'Share Screen'}</span>
                </button>

                {/* Leave */}
                <button onClick={onLeave} className="gcm-btn gcm-btn-end" title="Leave call">
                    <span className="gcm-btn-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
                        </svg>
                    </span>
                    <span className="gcm-btn-label">Leave</span>
                </button>
            </div>

            <style>{`
        .gcm { position:fixed;inset:0;z-index:10000;background:#090912;display:flex;flex-direction:column;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
        .gcm-header { padding:14px 22px;background:linear-gradient(180deg,rgba(0,0,0,.7) 0%,transparent 100%);display:flex;align-items:center;justify-content:space-between;position:absolute;top:0;left:0;right:0;z-index:10;transition:opacity .3s ease; }
        .gcm-header-left { display:flex;align-items:center;gap:10px; }
        .gcm-header-icon { width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center; }
        .gcm-header-icon-video { background:rgba(59,130,246,.18);color:#60a5fa; }
        .gcm-header-icon-voice { background:rgba(34,197,94,.15);color:#4ade80; }
        .gcm-header-title { color:white;font-size:14px;font-weight:600;margin:0; }
        .gcm-header-channel { color:rgba(255,255,255,.5);font-weight:400; }
        .gcm-header-sub { color:rgba(255,255,255,.4);font-size:11px;margin:2px 0 0;display:flex;align-items:center;gap:6px; }
        .gcm-sharing-badge { background:rgba(16,185,129,.25);border:1px solid rgba(16,185,129,.4);border-radius:10px;padding:1px 8px;color:#10b981;font-size:11px;font-weight:600; }
        .gcm-grid { flex:1;display:grid;gap:10px;padding:60px 14px 80px;overflow:hidden;align-items:stretch; }
        .gcm-tile { position:relative;background:#12121e;border-radius:14px;overflow:hidden;display:flex;align-items:center;justify-content:center;min-height:0;height:100%;border:1.5px solid rgba(255,255,255,.07); }
        .gcm-tile-video { position:absolute;inset:0;width:100%;height:100%;object-fit:contain;transition:opacity .3s ease; }
        .gcm-tile-mirror { transform:scaleX(-1); }
        .gcm-tile-avatar-wrap { display:flex;flex-direction:column;align-items:center;gap:10px;z-index:1; }
        .gcm-tile-avatar { width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#7c3aed 0%,#2563eb 100%);display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 6px 20px rgba(0,0,0,.5); }
        .gcm-tile-avatar img { width:100%;height:100%;object-fit:cover; }
        .gcm-tile-avatar span { font-size:24px;font-weight:700;color:white; }
        .gcm-tile-name-center { color:rgba(255,255,255,.7);font-size:13px;margin:0; }
        .gcm-tile-screen-badge { position:absolute;top:8px;left:8px;background:rgba(16,185,129,.85);border-radius:7px;padding:3px 8px;font-size:11px;color:white;font-weight:600;z-index:2; }
        .gcm-tile-badge { position:absolute;bottom:8px;left:8px;background:rgba(0,0,0,.55);border-radius:7px;padding:3px 8px;font-size:11px;color:rgba(255,255,255,.85);display:flex;align-items:center;gap:4px;backdrop-filter:blur(6px);z-index:2;border:1px solid rgba(255,255,255,.07); }
        .gcm-tile-ring { position:absolute;inset:-2px;border-radius:15px;border:2px solid rgba(16,185,129,.5);pointer-events:none;z-index:3; }
        .gcm-controls { position:absolute;bottom:0;left:0;right:0;padding:18px 24px 28px;background:linear-gradient(0deg,rgba(0,0,0,.75) 0%,transparent 100%);display:flex;justify-content:center;gap:12px;z-index:10;transition:opacity .3s ease; }
        .gcm-show { opacity:1;pointer-events:all; }
        .gcm-hide { opacity:0;pointer-events:none; }
        .gcm-btn { display:flex;flex-direction:column;align-items:center;gap:6px;padding:13px 20px;border-radius:14px;cursor:pointer;transition:all .18s ease;min-width:78px;backdrop-filter:blur(16px);border:1px solid transparent; }
        .gcm-btn-icon { display:flex;align-items:center;justify-content:center; }
        .gcm-btn-label { font-size:11px;font-weight:500; }
        .gcm-btn-default { background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.13);color:white; }
        .gcm-btn-default:hover { background:rgba(255,255,255,.18);transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,.4); }
        .gcm-btn-danger { background:rgba(239,68,68,.2);border-color:rgba(239,68,68,.4);color:#f87171; }
        .gcm-btn-danger:hover { background:rgba(239,68,68,.3);transform:translateY(-2px); }
        .gcm-btn-sharing { background:rgba(16,185,129,.25);border-color:rgba(16,185,129,.6);color:#10b981; }
        .gcm-btn-sharing:hover { background:rgba(16,185,129,.35);transform:translateY(-2px); }
        .gcm-btn-end { background:linear-gradient(135deg,#ef4444,#dc2626);border-color:transparent;color:white;box-shadow:0 4px 16px rgba(239,68,68,.35);padding:13px 28px; }
        .gcm-btn-end:hover { transform:translateY(-2px);box-shadow:0 8px 24px rgba(239,68,68,.5); }
        @media(max-width:480px){.gcm-grid{padding:56px 8px 72px;gap:7px}.gcm-tile{min-height:0;height:100%}.gcm-btn{padding:11px 14px;min-width:64px}.gcm-btn-end{padding:11px 22px}.gcm-controls{gap:8px;padding-bottom:22px}}
      `}</style>
        </div>
    );
};

export default GroupCallModal;
