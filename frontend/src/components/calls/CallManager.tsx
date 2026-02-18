// frontend/src/components/calls/CallManager.tsx
// Manages all call-related modals and UI (1-on-1 and group calls)

import React from 'react';
import { useCallContext } from '../../context/CallContext';
import { useGroupCallContext } from '../../context/GroupCallContext';
import { IncomingCallModal } from './IncomingCallModal';
import { VoiceCallModal } from './VoiceCallModal';
import { VideoCallModal } from './VideoCallModal';
import { GroupCallModal } from './GroupCallModal';

export const CallManager: React.FC = () => {
  const {
    activeCall,
    incomingCall,
    isMuted,
    isVideoEnabled,
    localStream,
    remoteStream,
    callDuration,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleVideo,
  } = useCallContext();

  const {
    groupCall,
    incomingGroupCall,
    localStream: groupLocalStream,
    isMuted: groupIsMuted,
    isVideoEnabled: groupIsVideoEnabled,
    joinGroupCall,
    leaveGroupCall,
    declineGroupCall,
    toggleMute: groupToggleMute,
    toggleVideo: groupToggleVideo,
  } = useGroupCallContext();

  // Consider connected when we have a remote stream
  const isConnected = !!remoteStream;

  // Get current user id from localStorage (safe fallback)
  const currentUserId = (() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u.id || u._id || '';
    } catch { return ''; }
  })();

  return (
    <>
      {/* ── 1-on-1 Incoming Call Modal ── */}
      {incomingCall && !activeCall && (
        <IncomingCallModal
          caller={incomingCall.caller}
          callType={incomingCall.callType}
          onAccept={acceptCall}
          onDecline={declineCall}
        />
      )}

      {/* ── 1-on-1 Active Voice Call Modal ── */}
      {activeCall && activeCall.callType === 'voice' && (
        <VoiceCallModal
          call={activeCall}
          isMuted={isMuted}
          duration={callDuration}
          isConnected={isConnected}
          onToggleMute={toggleMute}
          onEndCall={endCall}
        />
      )}

      {/* ── 1-on-1 Active Video Call Modal ── */}
      {activeCall && activeCall.callType === 'video' && (
        <VideoCallModal
          call={activeCall}
          localStream={localStream}
          remoteStream={remoteStream}
          isMuted={isMuted}
          isVideoEnabled={isVideoEnabled}
          duration={callDuration}
          isConnected={isConnected}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onEndCall={endCall}
        />
      )}

      {/* ── Incoming Group Call Banner ── */}
      {incomingGroupCall && !groupCall && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 9999,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          border: '1px solid rgba(99,102,241,0.4)',
          borderRadius: 16,
          padding: '16px 20px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          minWidth: 300,
          maxWidth: 360,
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: incomingGroupCall.callType === 'video'
                ? 'rgba(59,130,246,0.2)' : 'rgba(34,197,94,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
              animation: 'pulse 1.5s infinite',
            }}>
              {incomingGroupCall.callType === 'video' ? '📹' : '📞'}
            </div>
            <div>
              <div style={{ color: 'white', fontWeight: 600, fontSize: 15 }}>
                Incoming {incomingGroupCall.callType === 'video' ? 'Video' : 'Voice'} Call
              </div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
                {incomingGroupCall.startedBy.name} started a group call
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => joinGroupCall(
                incomingGroupCall.channelId,
                incomingGroupCall.callId,
                incomingGroupCall.callType,
              )}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                background: incomingGroupCall.callType === 'video'
                  ? 'rgba(59,130,246,0.8)' : 'rgba(34,197,94,0.8)',
                color: 'white', fontWeight: 600, fontSize: 14, cursor: 'pointer',
              }}
            >
              Join
            </button>
            <button
              onClick={declineGroupCall}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                background: 'rgba(239,68,68,0.8)',
                color: 'white', fontWeight: 600, fontSize: 14, cursor: 'pointer',
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ── Active Group Call Modal ── */}
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
