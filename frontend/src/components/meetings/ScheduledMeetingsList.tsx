// ScheduledMeetingsList.tsx

import React, { useState, useEffect } from 'react';
import { useMeetingContext } from '../../context/MeetingContext';
import { Meeting } from '../../types/meeting.types';
import {
  MdAccessTime, MdPeople, MdCall, MdDelete,
  MdOpenInNew, MdWarning,
} from 'react-icons/md';
import { FiClock } from 'react-icons/fi'; // ✅ FIX: Clock was used but never imported
import { format, formatDistanceToNow, isPast, isWithinInterval, addMinutes } from 'date-fns';

interface ScheduledMeetingsListProps {
  workspaceId?: string;
  channelId?: string;
  onJoinMeeting?: (meeting: Meeting) => void;
}

// ✅ FIX: Read user from localStorage — useAuth doesn't exist in this project
const currentUser = (() => {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
})();

const ScheduledMeetingsList: React.FC<ScheduledMeetingsListProps> = ({
  workspaceId,
  channelId,
  onJoinMeeting,
}) => {
  const {
    upcomingMeetings,
    pastMeetings,
    getUpcomingMeetings,
    cancelMeeting,
    isLoading,
  } = useMeetingContext();

  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [filteredMeetings, setFilteredMeetings] = useState<Meeting[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    getUpcomingMeetings();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const meetings = activeTab === 'upcoming' ? upcomingMeetings : pastMeetings;

    let filtered = [...meetings];

    if (workspaceId) filtered = filtered.filter((m) => m.workspace === workspaceId);
    if (channelId) filtered = filtered.filter((m) => m.channel === channelId);

    filtered.sort((a, b) => {
      const diff = new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
      return activeTab === 'upcoming' ? diff : -diff;
    });

    setFilteredMeetings(filtered);
  }, [activeTab, upcomingMeetings, pastMeetings, workspaceId, channelId]);

  const canJoinMeeting = (meeting: Meeting): boolean => {
    const now = new Date();
    const scheduledTime = new Date(meeting.scheduledFor);
    const fifteenMinBefore = addMinutes(scheduledTime, -15);
    const endTime = addMinutes(scheduledTime, meeting.duration);
    return (
      meeting.status === 'ongoing' ||
      (meeting.status === 'scheduled' &&
        isWithinInterval(now, { start: fifteenMinBefore, end: endTime }))
    );
  };

  const isMeetingLive = (meeting: Meeting): boolean => {
    const now = new Date();
    const scheduledTime = new Date(meeting.scheduledFor);
    const endTime = addMinutes(scheduledTime, meeting.duration);
    return (
      meeting.status === 'ongoing' &&
      isWithinInterval(now, { start: scheduledTime, end: endTime })
    );
  };

  const handleCancelMeeting = async (meetingId: string) => {
    if (!window.confirm('Are you sure you want to cancel this meeting?')) return;
    setCancellingId(meetingId);
    try {
      await cancelMeeting(meetingId);
    } catch (error) {
      console.error('Failed to cancel meeting:', error);
      alert('Failed to cancel meeting. Please try again.');
    } finally {
      setCancellingId(null);
    }
  };

  // ✅ FIX: Use currentUser from localStorage instead of useAuth
  const isCreator = (meeting: Meeting): boolean => {
    const uid = currentUser?._id || currentUser?.id;
    const creatorId = typeof meeting.creator === 'object'
      ? (meeting.creator._id || meeting.creator.id)
      : meeting.creator;
    return creatorId === uid;
  };

  const formatMeetingTime = (meeting: Meeting): string => {
    const scheduledTime = new Date(meeting.scheduledFor);
    if (isPast(scheduledTime)) return formatDistanceToNow(scheduledTime, { addSuffix: true });

    const today = new Date();
    if (scheduledTime.toDateString() === today.toDateString()) {
      return `Today at ${format(scheduledTime, 'h:mm a')}`;
    }

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (scheduledTime.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${format(scheduledTime, 'h:mm a')}`;
    }

    return format(scheduledTime, 'MMM d, yyyy • h:mm a');
  };

  // ✅ FIX: Use creator.name (not creator.username which doesn't exist)
  const getCreatorName = (meeting: Meeting): string => {
    if (typeof meeting.creator === 'object') {
      return meeting.creator.name || meeting.creator.fullName || 'Unknown';
    }
    return 'Unknown';
  };

  const renderMeetingCard = (meeting: Meeting) => {
    const isLive = isMeetingLive(meeting);
    const canJoin = canJoinMeeting(meeting);

    return (
      <div
        key={meeting._id}
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{meeting.title}</h3>
              {isLive && (
                <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 rounded-full animate-pulse">
                  LIVE
                </span>
              )}
              {meeting.status === 'cancelled' && (
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-full">
                  Cancelled
                </span>
              )}
            </div>
            {meeting.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{meeting.description}</p>
            )}
          </div>
          <MdCall className={`w-5 h-5 ml-3 ${meeting.meetingType === 'video' ? 'text-blue-500' : 'text-green-500'}`} />
        </div>

        {/* Info */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <FiClock className="w-4 h-4" />
            <span>{formatMeetingTime(meeting)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <MdAccessTime className="w-4 h-4" />
            <span>{meeting.duration} minutes</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <MdPeople className="w-4 h-4" />
            <span>{meeting.participants.length} participant{meeting.participants.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500">
            Created by{' '}
            <span className="font-medium">{isCreator(meeting) ? 'You' : getCreatorName(meeting)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {activeTab === 'upcoming' && meeting.status !== 'cancelled' && (
            <>
              {canJoin ? (
                <button
                  onClick={() => onJoinMeeting?.(meeting)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    isLive ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  <MdOpenInNew className="w-4 h-4" />
                  {isLive ? 'Join Now' : 'Join Meeting'}
                </button>
              ) : (
                <button disabled className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-400 rounded-lg cursor-not-allowed">
                  Not Available Yet
                </button>
              )}
              {isCreator(meeting) && (
                <button
                  onClick={() => handleCancelMeeting(meeting._id)}
                  disabled={cancellingId === meeting._id}
                  className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors disabled:opacity-50"
                  title="Cancel Meeting"
                >
                  {cancellingId === meeting._id ? <span className="text-sm">Cancelling...</span> : <MdDelete className="w-4 h-4" />}
                </button>
              )}
            </>
          )}
          {activeTab === 'past' && (
            <div className="flex-1 text-center py-2 text-sm text-gray-500 dark:text-gray-400 capitalize">
              {meeting.status}
            </div>
          )}
        </div>

        {activeTab === 'upcoming' && !canJoin && meeting.status === 'scheduled' && (
          <div className="mt-3 flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-800 dark:text-yellow-200">
            <MdWarning className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>You can join 15 minutes before the scheduled time</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
        {(['upcoming', 'past'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 capitalize ${
              activeTab === tab
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {tab} ({tab === 'upcoming' ? upcomingMeetings.length : pastMeetings.length})
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading meetings...</p>
        </div>
      )}

      {!isLoading && filteredMeetings.length === 0 && (
        <div className="text-center py-12">
          <MdAccessTime className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No {activeTab} meetings</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {activeTab === 'upcoming' ? 'Schedule a meeting to get started' : 'Your past meetings will appear here'}
          </p>
        </div>
      )}

      {!isLoading && filteredMeetings.length > 0 && (
        <div className="space-y-3">
          {filteredMeetings.map((meeting) => renderMeetingCard(meeting))}
        </div>
      )}
    </div>
  );
};

export default ScheduledMeetingsList;
