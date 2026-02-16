export interface User {
  id: string;
  name: string;
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
  duration?: number; // in seconds
  workspace: string;
  createdAt: Date;
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
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
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

export interface CallTimerProps {
  startTime: Date;
}

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
  onToggleMute: () => void;
  onEndCall: () => void;
}

export interface VideoCallModalProps extends VoiceCallModalProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isVideoEnabled: boolean;
  onToggleVideo: () => void;
}