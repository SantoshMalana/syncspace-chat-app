// MeetingContext.tsx
// Fix 1: Login alerts only show AFTER user is authenticated (token exists + user logged in)
// Fix 2: Listens for storage events so if token is set after mount, alerts still trigger
// Fix 3: alertsShownRef prevents duplicate alerts across re-renders

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
  Meeting, MeetingContextType, CreateMeetingData,
  ActiveMeetingState, MeetingNotification,
} from '../types/meeting.types';
import { format, differenceInMinutes, differenceInHours } from 'date-fns';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const MeetingContext = createContext<MeetingContextType | undefined>(undefined);

// ─── Alert Toast Component ────────────────────────────────────────────────────
interface MeetingAlert { id: string; title: string; scheduledFor: Date; timeLabel: string; }

const MeetingAlertToast: React.FC<{ alerts: MeetingAlert[]; onDismiss: (id: string) => void }> = ({ alerts, onDismiss }) => {
  if (!alerts.length) return null;
  return (
    <div className="fixed top-4 right-4 z-[99999] flex flex-col gap-3 max-w-sm">
      {alerts.map((alert) => (
        <div key={alert.id} style={{ animation: 'slideInRight 0.3s ease' }}
          className="bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-xl shadow-2xl p-4 flex gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-0.5">Upcoming Meeting</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{alert.title}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              📅 {format(alert.scheduledFor, 'MMM d')} at {format(alert.scheduledFor, 'h:mm a')}
            </p>
            <p className="text-xs font-medium text-orange-500 mt-0.5">⏰ {alert.timeLabel}</p>
          </div>
          <button onClick={() => onDismiss(alert.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0 self-start">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export const MeetingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ✅ FIX: Read token reactively — don't cache it at module level
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));

  const [currentMeeting, setCurrentMeeting] = useState<Meeting | null>(null);
  const [activeMeeting, setActiveMeeting] = useState<ActiveMeetingState | null>(null);
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [pastMeetings, setPastMeetings] = useState<Meeting[]>([]);
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginAlerts, setLoginAlerts] = useState<MeetingAlert[]>([]);
  const alertsShownRef = useRef(false);

  // ✅ FIX: Listen for token being set (i.e. after login) so alert runs at right time
  useEffect(() => {
    const handleStorage = () => {
      const t = localStorage.getItem('token');
      if (t && t !== token) {
        setToken(t);
        alertsShownRef.current = false; // reset so new login gets fresh alerts
      }
      if (!t) {
        setToken(null);
        alertsShownRef.current = false;
      }
    };
    window.addEventListener('storage', handleStorage);
    // Also poll once in case login happens in same tab (storage event doesn't fire same-tab)
    const interval = setInterval(() => {
      const t = localStorage.getItem('token');
      if (t !== token) handleStorage();
    }, 1000);
    return () => { window.removeEventListener('storage', handleStorage); clearInterval(interval); };
  }, [token]);

  const axiosConfig = useCallback(() => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  }), []);

  // ─── Build login alerts from meetings list ──────────────────────────────────
  const buildLoginAlerts = useCallback((meetings: Meeting[]) => {
    if (alertsShownRef.current) return;
    alertsShownRef.current = true;

    const now = new Date();
    const alerts: MeetingAlert[] = [];

    meetings.forEach((m) => {
      if (m.status !== 'scheduled' && m.status !== 'ongoing') return;
      const scheduledFor = new Date(m.scheduledFor);
      const minutesUntil = differenceInMinutes(scheduledFor, now);
      const hoursUntil = differenceInHours(scheduledFor, now);

      // Only show if within next 24 hours (and not more than duration minutes in the past)
      if (minutesUntil > -(m.duration || 60) && hoursUntil < 24) {
        let timeLabel: string;
        if (minutesUntil <= 0) timeLabel = 'Currently ongoing';
        else if (minutesUntil < 60) timeLabel = `In ${minutesUntil} minute${minutesUntil !== 1 ? 's' : ''}`;
        else timeLabel = `In ${hoursUntil} hour${hoursUntil !== 1 ? 's' : ''}`;
        alerts.push({ id: m._id, title: m.title, scheduledFor, timeLabel });
      }
    });

    if (alerts.length > 0) {
      setLoginAlerts(alerts);
      setTimeout(() => setLoginAlerts([]), 10000);
    }
  }, []);

  // ─── API methods ────────────────────────────────────────────────────────────
  const createMeeting = useCallback(async (data: CreateMeetingData): Promise<Meeting> => {
    setIsLoading(true); setError(null);
    try {
      const res = await axios.post(`${API_URL}/api/meetings`, data, axiosConfig());
      const meeting = res.data.meeting;
      setUpcomingMeetings((prev) => [...prev, meeting]);
      return meeting;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to create meeting';
      setError(msg); throw new Error(msg);
    } finally { setIsLoading(false); }
  }, [axiosConfig]);

  const getMeeting = useCallback(async (meetingId: string): Promise<Meeting> => {
    setIsLoading(true); setError(null);
    try {
      const res = await axios.get(`${API_URL}/api/meetings/${meetingId}`, axiosConfig());
      setCurrentMeeting(res.data.meeting); return res.data.meeting;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to fetch meeting';
      setError(msg); throw new Error(msg);
    } finally { setIsLoading(false); }
  }, [axiosConfig]);

  const getUpcomingMeetings = useCallback(async (): Promise<Meeting[]> => {
    setIsLoading(true); setError(null);
    try {
      const res = await axios.get(`${API_URL}/api/meetings?status=scheduled,ongoing`, axiosConfig());
      const meetings = res.data.meetings || [];
      setUpcomingMeetings(meetings);
      return meetings;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to fetch meetings';
      setError(msg); throw new Error(msg);
    } finally { setIsLoading(false); }
  }, [axiosConfig]);

  const cancelMeeting = useCallback(async (meetingId: string): Promise<void> => {
    setIsLoading(true); setError(null);
    try {
      await axios.delete(`${API_URL}/api/meetings/${meetingId}`, axiosConfig());
      setUpcomingMeetings((prev) => prev.filter((m) => m._id !== meetingId));
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to cancel meeting';
      setError(msg); throw new Error(msg);
    } finally { setIsLoading(false); }
  }, [axiosConfig]);

  const joinMeeting = useCallback(async (meetingLink: string): Promise<void> => {
    setIsLoading(true); setError(null);
    try {
      const res = await axios.get(`${API_URL}/api/meetings/link/${meetingLink}`, axiosConfig());
      const meeting = res.data.meeting;
      if (meeting.status === 'completed' || meeting.status === 'cancelled')
        throw new Error('Meeting has ended or been cancelled');
      setIsInMeeting(true); setCurrentMeeting(meeting);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to join meeting';
      setError(msg); throw new Error(msg);
    } finally { setIsLoading(false); }
  }, [axiosConfig]);

  const leaveMeeting = useCallback(async (_id: string): Promise<void> => {
    setIsInMeeting(false); setActiveMeeting(null); setCurrentMeeting(null);
  }, []);

  const endMeeting = useCallback(async (): Promise<void> => {
    if (!currentMeeting) return;
    setIsLoading(true); setError(null);
    try {
      await axios.put(`${API_URL}/api/meetings/${currentMeeting._id}`, { status: 'completed' }, axiosConfig());
      setIsInMeeting(false); setActiveMeeting(null); setCurrentMeeting(null);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to end meeting';
      setError(msg); throw new Error(msg);
    } finally { setIsLoading(false); }
  }, [currentMeeting, axiosConfig]);

  const updateParticipantStatus = useCallback((userId: string, status: string) => {
    if (!currentMeeting) return;
    setCurrentMeeting({
      ...currentMeeting,
      participants: currentMeeting.participants.map((p) =>
        p.user._id === userId ? { ...p, status: status as any } : p
      ),
    });
  }, [currentMeeting]);

  const toggleAudio = useCallback(() => {}, []);
  const toggleVideo = useCallback(() => {}, []);
  const toggleScreenShare = useCallback(async (): Promise<void> => {}, []);
  const removeMeetingParticipant = useCallback(async (_uid: string): Promise<void> => {}, []);

  // ✅ FIX: Only fetch meetings (and show alerts) once token is actually set
  useEffect(() => {
    if (!token) return; // 🔑 Don't run until user is logged in
    getUpcomingMeetings()
      .then(buildLoginAlerts)
      .catch(() => {}); // silently fail — user might not be authenticated yet
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const value: MeetingContextType = {
    currentMeeting, activeMeeting, upcomingMeetings, pastMeetings,
    isInMeeting, isLoading, error,
    createMeeting, getMeeting, getUpcomingMeetings, cancelMeeting,
    joinMeeting, leaveMeeting, toggleAudio, toggleVideo, toggleScreenShare,
    updateParticipantStatus, endMeeting, removeMeetingParticipant,
  };

  return (
    <MeetingContext.Provider value={value}>
      {children}
      <MeetingAlertToast alerts={loginAlerts} onDismiss={(id) => setLoginAlerts((p) => p.filter((a) => a.id !== id))} />
    </MeetingContext.Provider>
  );
};

export const useMeetingContext = (): MeetingContextType => {
  const context = useContext(MeetingContext);
  if (!context) throw new Error('useMeetingContext must be used within MeetingProvider');
  return context;
};

export default MeetingContext;
