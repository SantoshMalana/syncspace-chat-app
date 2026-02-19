// frontend/src/types/call.types.ts

export interface User {
  id: string;
  _id?: string;
  name: string;
  fullName?: string;
  email: string;
  avatar?: string;
}

export type CallType = 'voice' | 'video';
export type CallStatus = 'ringing' | 'ongoing' | 'ended' | 'missed' | 'declined';

export interface Call {
  _id: string;
  caller: User;
  receiver: User;
  callType: CallType;
  status: CallStatus;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  workspace?: string;
  createdAt?: Date;
}

export interface IncomingCall {
  callId: string;
  caller: User;
  callType: CallType;
}

export interface CallState {
  activeCall: Call | null;
  incomingCall: IncomingCall | null;
  isCallActive: boolean;
  isRinging: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isConnected: boolean;
  callDuration: number;
}

export interface CallContextType extends CallState {
  initiateCall: (receiverId: string, callType: CallType) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  endCall: () => void;
  cancelCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
  connectionState: string;
  mediaError: string | null;
}

export interface WebRTCOffer {
  targetUserId: string;
  offer: RTCSessionDescriptionInit;
  callId: string;
}

export interface WebRTCAnswer {
  targetUserId: string;
  answer: RTCSessionDescriptionInit;
  callId: string;
}

export interface WebRTCIceCandidate {
  targetUserId: string;
  candidate: RTCIceCandidateInit;
  callId: string;
}

export interface CallTimerProps { startTime: Date; }
export interface CallControlsProps {
  isMuted: boolean;
  onToggleMute: () => void;
  onEndCall: () => void;
}
export interface CallButtonProps {
  userId: string;
  userName: string;
  callType: CallType;
  disabled?: boolean;
}
export interface IncomingCallModalProps {
  caller: User;
  callType: CallType;
  onAccept: () => void;
  onDecline: () => void;
}

export interface VoiceCallModalProps {
  call: Call;
  isMuted: boolean;
  duration: number;
  isConnected: boolean;
  isScreenSharing: boolean;
  onToggleMute: () => void;
  onStartScreenShare: () => Promise<void>;
  onStopScreenShare: () => Promise<void>;
  onEndCall: () => void;
}

export interface VideoCallModalProps {
  call: Call;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  duration: number;
  isConnected?: boolean;
  isVideoEnabled?: boolean;
  isScreenSharing: boolean;
  onToggleMute: () => void;
  onToggleVideo?: () => void;
  onStartScreenShare: () => Promise<void>;
  onStopScreenShare: () => Promise<void>;
  onEndCall: () => void;
}

// ── Group Call Types ──────────────────────────────────────────

export interface GroupCallParticipant {
  userId: string;
  socketId?: string;
  name: string;
  avatar?: string | null;
  stream?: MediaStream | null;
  isMuted?: boolean;
}

export type GroupCallStatus = 'idle' | 'ringing' | 'active';

export interface GroupCallState {
  channelId: string;
  callId: string;
  callType: CallType;
  participants: GroupCallParticipant[];
  status: GroupCallStatus;
}

export interface IncomingGroupCall {
  channelId: string;
  callId: string;
  callType: CallType;
  startedBy: { userId: string; name: string; avatar?: string | null; };
}

export interface GroupCallContextType {
  groupCall: GroupCallState | null;
  incomingGroupCall: IncomingGroupCall | null;
  localStream: MediaStream | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;          // ✅ NEW
  startGroupCall: (channelId: string, callType: CallType) => Promise<void>;
  joinGroupCall: (channelId: string, callId: string, callType: CallType) => Promise<void>;
  leaveGroupCall: () => void;
  declineGroupCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  startScreenShare: () => Promise<void>;   // ✅ NEW
  stopScreenShare: () => Promise<void>;    // ✅ NEW
}