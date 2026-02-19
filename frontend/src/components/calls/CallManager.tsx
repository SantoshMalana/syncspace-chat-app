import React from 'react';
import { useCallContext } from '../../context/CallContext';
import { useGroupCallContext } from '../../context/GroupCallContext';
import { IncomingCallModal } from './IncomingCallModal';
import { VoiceCallModal } from './VoiceCallModal';
import { VideoCallModal } from './VideoCallModal';
import { GroupCallModal } from './GroupCallModal';

// ── Incoming group call banner ────────────────────────────────────────────────
interface GroupBannerProps {
  callType: 'voice' | 'video';
  startedByName: string;
  onJoin: () => void;
  onDismiss: () => void;
}

const GroupCallBanner: React.FC<GroupBannerProps> = ({ callType, startedByName, onJoin, onDismiss }) => {
  const isVideo = callType === 'video';

  return (
    <>
      <div className="gcb-card">
        {/* Icon */}
        <div className={`gcb-icon ${isVideo ? 'gcb-icon-video' : 'gcb-icon-voice'}`}>
          {isVideo ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          )}
        </div>

        {/* Text */}
        <div className="gcb-text">
          <p className="gcb-title">
            {isVideo ? 'Video' : 'Voice'} call started
          </p>
          <p className="gcb-sub">{startedByName} invited you to join</p>
        </div>

        {/* Actions */}
        <div className="gcb-actions">
          <button className="gcb-btn gcb-join" onClick={onJoin}>
            Join
          </button>
          <button className="gcb-btn gcb-dismiss" onClick={onDismiss}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        .gcb-card {
          position: fixed; top: 20px; right: 20px; z-index: 9990;
          display: flex; align-items: center; gap: 12px;
          background: #111827;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 16px;
          padding: 14px 16px;
          min-width: 300px; max-width: 360px;
          box-shadow: 0 8px 32px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.04);
          backdrop-filter: blur(16px);
          animation: gcbSlide .3s cubic-bezier(.34,1.56,.64,1);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        @keyframes gcbSlide {
          from { opacity:0; transform: translateX(20px) scale(.95); }
          to   { opacity:1; transform: translateX(0) scale(1); }
        }

        .gcb-icon {
          width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          animation: gcbPulse 2s ease-in-out infinite;
        }
        .gcb-icon-video { background: rgba(59,130,246,.18); color: #60a5fa; border: 1px solid rgba(59,130,246,.25); }
        .gcb-icon-voice { background: rgba(34,197,94,.15); color: #4ade80; border: 1px solid rgba(34,197,94,.22); }
        @keyframes gcbPulse { 0%,100%{opacity:1} 50%{opacity:.65} }

        .gcb-text { flex: 1; min-width: 0; }
        .gcb-title { color: white; font-size: 13px; font-weight: 600; margin: 0 0 2px; }
        .gcb-sub { color: rgba(255,255,255,.45); font-size: 11px; margin: 0; truncate: true; }

        .gcb-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

        .gcb-btn {
          border-radius: 9px; cursor: pointer;
          font-size: 12px; font-weight: 600;
          transition: all .15s ease; border: 1px solid transparent;
          display: flex; align-items: center; justify-content: center;
        }
        .gcb-join {
          padding: 7px 14px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          box-shadow: 0 3px 12px rgba(16,185,129,.3);
        }
        .gcb-join:hover {
          transform: translateY(-1px);
          box-shadow: 0 5px 16px rgba(16,185,129,.45);
        }
        .gcb-dismiss {
          width: 30px; height: 30px;
          background: rgba(255,255,255,.06);
          border-color: rgba(255,255,255,.1);
          color: rgba(255,255,255,.4);
        }
        .gcb-dismiss:hover {
          background: rgba(239,68,68,.15);
          border-color: rgba(239,68,68,.3);
          color: #f87171;
        }
      `}</style>
    </>
  );
};

// ── Main CallManager ──────────────────────────────────────────────────────────
export const CallManager: React.FC = () => {
  const {
    activeCall, incomingCall,
    isMuted, isVideoEnabled, isScreenSharing,
    localStream, remoteStream, callDuration,
    acceptCall, declineCall, endCall,
    toggleMute, toggleVideo,
    startScreenShare, stopScreenShare,
  } = useCallContext();

  const {
    groupCall, incomingGroupCall,
    localStream: groupLocalStream,
    isMuted: groupIsMuted,
    isVideoEnabled: groupIsVideoEnabled,
    joinGroupCall, leaveGroupCall, declineGroupCall,
    toggleMute: groupToggleMute,
    toggleVideo: groupToggleVideo,
  } = useGroupCallContext();

  const isConnected = !!remoteStream;

  const currentUserId = (() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u.id || u._id || '';
    } catch { return ''; }
  })();

  return (
    <>
      {/* 1-on-1 incoming */}
      {incomingCall && !activeCall && (
        <IncomingCallModal
          caller={incomingCall.caller}
          callType={incomingCall.callType}
          onAccept={acceptCall}
          onDecline={declineCall}
        />
      )}

      {/* 1-on-1 voice call */}
      {activeCall && activeCall.callType === 'voice' && (
        <VoiceCallModal
          call={activeCall}
          isMuted={isMuted}
          duration={callDuration}
          isConnected={isConnected}
          isScreenSharing={isScreenSharing}
          onToggleMute={toggleMute}
          onStartScreenShare={startScreenShare}
          onStopScreenShare={stopScreenShare}
          onEndCall={endCall}
        />
      )}

      {/* 1-on-1 video call */}
      {activeCall && activeCall.callType === 'video' && (
        <VideoCallModal
          call={activeCall}
          localStream={localStream}
          remoteStream={remoteStream}
          isMuted={isMuted}
          isVideoEnabled={isVideoEnabled}
          isScreenSharing={isScreenSharing}
          duration={callDuration}
          isConnected={isConnected}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onStartScreenShare={startScreenShare}
          onStopScreenShare={stopScreenShare}
          onEndCall={endCall}
        />
      )}

      {/* Incoming group call banner */}
      {incomingGroupCall && !groupCall && (
        <GroupCallBanner
          callType={incomingGroupCall.callType}
          startedByName={incomingGroupCall.startedBy.name}
          onJoin={() => joinGroupCall(
            incomingGroupCall.channelId,
            incomingGroupCall.callId,
            incomingGroupCall.callType,
          )}
          onDismiss={declineGroupCall}
        />
      )}

      {/* Active group call */}
      {groupCall && (
        <GroupCallModal
          callType={groupCall.callType}
          participants={groupCall.participants}
          localStream={groupLocalStream}
          isMuted={groupIsMuted}
          isVideoEnabled={groupIsVideoEnabled}
          currentUserId={currentUserId}
          onToggleMute={groupToggleMute}
          onToggleVideo={groupToggleVideo}
          onLeave={leaveGroupCall}
        />
      )}
    </>
  );
};
