// Meeting Types for SyncSpace Group Video Meetings
// Supports up to 4 participants in a mesh network

import { User } from './index';

/**
 * Meeting Status
 */
export type MeetingStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';

/**
 * Participant Status in Meeting
 */
export type ParticipantStatus = 
  | 'invited' 
  | 'accepted' 
  | 'declined' 
  | 'joined' 
  | 'left';

/**
 * Meeting Type
 */
export type MeetingType = 'video' | 'audio';

/**
 * Participant in a Meeting
 */
export interface MeetingParticipant {
  user: User;
  status: ParticipantStatus;
  joinedAt?: Date;
  leftAt?: Date;
}

/**
 * Active Participant with Stream and Peer Connection
 * Used during an active meeting
 */
export interface ActiveParticipant extends MeetingParticipant {
  stream?: MediaStream;
  peer?: any; // SimplePeer.Instance type
  audioEnabled: boolean;
  videoEnabled: boolean;
  isAudioActive: boolean; // Currently speaking
  connectionQuality?: 'excellent' | 'good' | 'poor' | 'disconnected';
  peerId?: string; // Unique peer connection ID
}

/**
 * Meeting Interface
 */
export interface Meeting {
  _id: string;
  title: string;
  description?: string;
  workspace: string; // Workspace ID
  channel?: string; // Channel ID (optional)
  creator: User;
  scheduledFor: Date;
  duration: number; // in minutes
  participants: MeetingParticipant[];
  meetingType: MeetingType;
  status: MeetingStatus;
  meetingLink: string; // Unique meeting room ID
  maxParticipants: number; // default 4
  recordingEnabled?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Meeting Creation Data (for scheduling)
 */
export interface CreateMeetingData {
  title: string;
  description?: string;
  workspace: string;
  channel?: string;
  scheduledFor: Date;
  duration: number;
  participants: string[]; // Array of User IDs
  meetingType: MeetingType;
  maxParticipants?: number;
}

/**
 * Meeting State in Context
 */
export interface MeetingState {
  currentMeeting: Meeting | null;
  activeMeeting: ActiveMeetingState | null;
  upcomingMeetings: Meeting[];
  pastMeetings: Meeting[];
  isInMeeting: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Active Meeting State (during ongoing meeting)
 */
export interface ActiveMeetingState {
  meeting: Meeting;
  participants: ActiveParticipant[];
  localStream: MediaStream | null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  activeSpeaker: string | null; // User ID of active speaker
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'failed';
  startedAt: Date;
  duration: number; // in seconds
}

/**
 * Meeting Actions
 */
export interface MeetingActions {
  // Meeting Management
  createMeeting: (data: CreateMeetingData) => Promise<Meeting>;
  getMeeting: (meetingId: string) => Promise<Meeting>;
  getUpcomingMeetings: () => Promise<Meeting[]>;
  cancelMeeting: (meetingId: string) => Promise<void>;
  
  // Join/Leave
  joinMeeting: (meetingLink: string) => Promise<void>;
  leaveMeeting: () => Promise<void>;
  
  // Meeting Controls
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => Promise<void>;
  
  // Participant Management
  updateParticipantStatus: (userId: string, status: ParticipantStatus) => void;
  
  // Admin Controls
  endMeeting: () => Promise<void>; // Only creator can end
  removeMeetingParticipant: (userId: string) => Promise<void>; // Only creator
}

/**
 * Meeting Context Type
 */
export interface MeetingContextType extends MeetingState, MeetingActions {}

/**
 * WebRTC Signal Types for Multi-Peer
 */
export interface WebRTCSignal {
  from: string; // User ID sending the signal
  to: string; // User ID receiving the signal
  signal: any; // SimplePeer signal data
  meetingId: string;
}

/**
 * ICE Candidate for WebRTC
 */
export interface ICECandidate {
  from: string;
  to: string;
  candidate: any;
  meetingId: string;
}

/**
 * Meeting Socket Events Payload
 */
export interface MeetingSocketEvents {
  // Meeting lifecycle
  'meeting:join': { meetingLink: string; userId: string };
  'meeting:leave': { meetingLink: string; userId: string };
  'meeting:start': { meetingId: string };
  'meeting:end': { meetingId: string };
  
  // Participant updates
  'meeting:participant-joined': ActiveParticipant;
  'meeting:participant-left': { userId: string };
  'meeting:participant-audio-toggled': { userId: string; enabled: boolean };
  'meeting:participant-video-toggled': { userId: string; enabled: boolean };
  
  // WebRTC signaling
  'meeting:webrtc:offer': WebRTCSignal;
  'meeting:webrtc:answer': WebRTCSignal;
  'meeting:webrtc:ice-candidate': ICECandidate;
}

/**
 * Meeting Notification
 */
export interface MeetingNotification {
  _id: string;
  type: 'meeting_scheduled' | 'meeting_started' | 'meeting_reminder' | 'meeting_cancelled';
  meeting: Meeting;
  user: User;
  read: boolean;
  createdAt: Date;
}

/**
 * Meeting Filter Options
 */
export interface MeetingFilterOptions {
  status?: MeetingStatus;
  startDate?: Date;
  endDate?: Date;
  workspace?: string;
  channel?: string;
}

/**
 * Grid Layout Configuration
 */
export interface GridLayoutConfig {
  participantCount: number;
  columns: number;
  rows: number;
  layout: 'grid' | 'speaker-view' | 'gallery';
}

export default MeetingState;