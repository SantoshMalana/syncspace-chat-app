// frontend/src/components/calls/GroupCallModal.tsx
// Full-screen group call UI — shows a responsive video/voice grid for all participants

import React, { useEffect, useRef, useState } from 'react';
import {
    FaMicrophone, FaMicrophoneSlash,
    FaVideo, FaVideoSlash, FaPhone, FaUsers
} from 'react-icons/fa';
import type { GroupCallParticipant, CallType } from '../../types/call.types';

interface GroupCallModalProps {
    channelName?: string;
    callType: CallType;
    participants: GroupCallParticipant[];
    localStream: MediaStream | null;
    isMuted: boolean;
    isVideoEnabled: boolean;
    currentUserId: string;
    onToggleMute: () => void;
    onToggleVideo: () => void;
    onLeave: () => void;
}

// Individual participant tile
const ParticipantTile: React.FC<{
    participant: GroupCallParticipant;
    isLocal?: boolean;
    isMuted?: boolean;
    isVideoEnabled?: boolean;
}> = ({ participant, isLocal = false, isMuted, isVideoEnabled }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && participant.stream) {
            videoRef.current.srcObject = participant.stream;
        }
    }, [participant.stream]);

    const hasVideo = participant.stream &&
        participant.stream.getVideoTracks().length > 0 &&
        (isLocal ? isVideoEnabled !== false : true);

    const initials = participant.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <div style={{
            position: 'relative',
            background: '#1a1a2e',
            borderRadius: '12px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '160px',
            border: '2px solid rgba(255,255,255,0.08)',
        }}>
            {hasVideo ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isLocal}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transform: isLocal ? 'scaleX(-1)' : 'none',
                    }}
                />
            ) : (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                }}>
                    {participant.avatar ? (
                        <img
                            src={participant.avatar}
                            alt={participant.name}
                            style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }}
                        />
                    ) : (
                        <div style={{
                            width: 72, height: 72, borderRadius: '50%',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 28, fontWeight: 'bold', color: 'white',
                        }}>
                            {initials}
                        </div>
                    )}
                    <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>{participant.name}</span>
                </div>
            )}

            {/* Name badge */}
            <div style={{
                position: 'absolute', bottom: 8, left: 8,
                background: 'rgba(0,0,0,0.6)', borderRadius: 6,
                padding: '2px 8px', fontSize: 12, color: 'white',
                display: 'flex', alignItems: 'center', gap: 4,
                backdropFilter: 'blur(4px)',
            }}>
                {isMuted && <FaMicrophoneSlash size={10} color="#ef4444" />}
                {participant.name}{isLocal ? ' (You)' : ''}
            </div>
        </div>
    );
};

export const GroupCallModal: React.FC<GroupCallModalProps> = ({
    channelName,
    callType,
    participants,
    localStream,
    isMuted,
    isVideoEnabled,
    currentUserId,
    onToggleMute,
    onToggleVideo,
    onLeave,
}) => {
    const [showControls, setShowControls] = useState(true);
    const controlsTimeout = useRef<ReturnType<typeof setTimeout>>();

    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
        controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
    };

    useEffect(() => {
        return () => { if (controlsTimeout.current) clearTimeout(controlsTimeout.current); };
    }, []);

    // Build participant list: local user first, then remotes
    const localParticipant: GroupCallParticipant = {
        userId: currentUserId,
        name: 'You',
        stream: localStream || undefined,
    };

    const remoteParticipants = participants.filter(p => p.userId !== currentUserId);
    const allParticipants = [localParticipant, ...remoteParticipants];
    const count = allParticipants.length;

    // Responsive grid columns
    const cols = count <= 1 ? 1 : count <= 4 ? 2 : count <= 9 ? 3 : 4;

    return (
        <div
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setShowControls(true)}
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: '#0d0d1a',
                zIndex: 10000,
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Header */}
            <div style={{
                padding: '16px 24px',
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                transition: 'opacity 0.3s',
                opacity: showControls ? 1 : 0,
                pointerEvents: showControls ? 'all' : 'none',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: callType === 'video' ? 'rgba(59,130,246,0.2)' : 'rgba(34,197,94,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        {callType === 'video'
                            ? <FaVideo size={16} color="#3b82f6" />
                            : <FaMicrophone size={16} color="#22c55e" />
                        }
                    </div>
                    <div>
                        <div style={{ color: 'white', fontWeight: 600, fontSize: 16 }}>
                            {callType === 'video' ? 'Video Call' : 'Voice Call'}
                            {channelName ? ` — #${channelName}` : ''}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <FaUsers size={10} />
                            {count} participant{count !== 1 ? 's' : ''}
                        </div>
                    </div>
                </div>
            </div>

            {/* Video Grid */}
            <div style={{
                flex: 1,
                padding: 16,
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gap: 12,
                alignContent: 'center',
                overflow: 'hidden',
            }}>
                {allParticipants.map((p, idx) => (
                    <ParticipantTile
                        key={p.userId}
                        participant={p}
                        isLocal={idx === 0}
                        isMuted={idx === 0 ? isMuted : false}
                        isVideoEnabled={idx === 0 ? isVideoEnabled : true}
                    />
                ))}
            </div>

            {/* Controls Bar */}
            <div style={{
                padding: '20px 32px',
                background: 'rgba(0,0,0,0.6)',
                display: 'flex',
                justifyContent: 'center',
                gap: 16,
                backdropFilter: 'blur(10px)',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                transition: 'opacity 0.3s',
                opacity: showControls ? 1 : 0,
                pointerEvents: showControls ? 'all' : 'none',
            }}>
                {/* Mute */}
                <button
                    onClick={onToggleMute}
                    title={isMuted ? 'Unmute' : 'Mute'}
                    style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        padding: '14px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
                        background: isMuted ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)',
                        color: 'white', minWidth: 80,
                        outline: isMuted ? '2px solid #ef4444' : 'none',
                        transition: 'all 0.2s',
                    }}
                >
                    {isMuted ? <FaMicrophoneSlash size={20} /> : <FaMicrophone size={20} />}
                    <span style={{ fontSize: 11, fontWeight: 500 }}>{isMuted ? 'Unmute' : 'Mute'}</span>
                </button>

                {/* Camera (only for video calls) */}
                {callType === 'video' && (
                    <button
                        onClick={onToggleVideo}
                        title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                        style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                            padding: '14px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
                            background: !isVideoEnabled ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)',
                            color: 'white', minWidth: 80,
                            outline: !isVideoEnabled ? '2px solid #ef4444' : 'none',
                            transition: 'all 0.2s',
                        }}
                    >
                        {isVideoEnabled ? <FaVideo size={20} /> : <FaVideoSlash size={20} />}
                        <span style={{ fontSize: 11, fontWeight: 500 }}>{isVideoEnabled ? 'Stop Video' : 'Start Video'}</span>
                    </button>
                )}

                {/* Leave */}
                <button
                    onClick={onLeave}
                    title="Leave call"
                    style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        padding: '14px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
                        background: 'rgba(239,68,68,0.9)',
                        color: 'white', minWidth: 80,
                        transition: 'all 0.2s',
                    }}
                >
                    <FaPhone size={20} style={{ transform: 'rotate(135deg)' }} />
                    <span style={{ fontSize: 11, fontWeight: 500 }}>Leave</span>
                </button>
            </div>
        </div>
    );
};
