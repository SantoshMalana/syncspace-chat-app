// MeetingScheduler.tsx - Fixed
// Fix: Uses /api/workspaces/:id/members (channel endpoint returns 404)
// Fix: Properly unwraps nested { userId: {...}, role } member objects

import React, { useState, useEffect, useRef } from 'react';
import { useMeetingContext } from '../../context/MeetingContext';
import { CreateMeetingData } from '../../types/meeting.types';
import { MdAddCall } from 'react-icons/md';
import { FiClock, FiCalendar, FiUsers } from 'react-icons/fi';
import axios from 'axios';

interface MeetingSchedulerProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId?: string;
  channelId?: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const token = localStorage.getItem('token');
const currentUser = (() => {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
})();

const MeetingScheduler: React.FC<MeetingSchedulerProps> = ({ isOpen, onClose, workspaceId, channelId }) => {
  const { createMeeting, isLoading } = useMeetingContext();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [duration, setDuration] = useState(30);
  const [meetingType, setMeetingType] = useState<'video' | 'audio'>('video');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) { fetchedRef.current = false; return; }
    if (fetchedRef.current || !workspaceId) return;
    fetchedRef.current = true;
    setLoadingUsers(true);

    // ✅ FIX: Use workspace members — /api/channels/:id/members returns 404
    axios.get(`${API_URL}/api/workspaces/${workspaceId}/members`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        const currentUserId = currentUser?._id || currentUser?.id;
        const raw: any[] = res.data.members || [];
        // ✅ FIX: Workspace members shape: [{ userId: { _id, fullName, email }, role }]
        const normalized = raw
          .map((m: any) => (typeof m.userId === 'object' && m.userId ? m.userId : m))
          .filter((u: any) => (u._id || u.id) && (u._id || u.id) !== currentUserId);
        setAvailableUsers(normalized);
      })
      .catch((err) => { console.error('Error fetching members:', err); setAvailableUsers([]); })
      .finally(() => setLoadingUsers(false));
  }, [isOpen, workspaceId]);

  const reset = () => {
    setTitle(''); setDescription(''); setScheduledDate(''); setScheduledTime('');
    setDuration(30); setMeetingType('video'); setSelectedParticipants([]);
    setErrors({}); setSubmitError(''); setSubmitSuccess(false);
    fetchedRef.current = false;
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Meeting title is required';
    if (!scheduledDate) e.scheduledDate = 'Date is required';
    if (!scheduledTime) e.scheduledTime = 'Time is required';
    if (scheduledDate && scheduledTime && new Date(`${scheduledDate}T${scheduledTime}`) <= new Date())
      e.scheduledDate = 'Meeting must be in the future';
    if (!selectedParticipants.length) e.participants = 'Select at least one participant';
    if (selectedParticipants.length > 3) e.participants = 'Maximum 4 participants (including you)';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const toggleParticipant = (uid: string) =>
    setSelectedParticipants((p) => p.includes(uid) ? p.filter((x) => x !== uid) : [...p, uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (!validate()) return;
    try {
      await createMeeting({
        title: title.trim(), description: description.trim(),
        workspaceId: workspaceId || '', channelId,
        scheduledFor: new Date(`${scheduledDate}T${scheduledTime}`),
        duration, participants: selectedParticipants, meetingType,
      } as CreateMeetingData);
      setSubmitSuccess(true);
      setTimeout(() => { reset(); onClose(); }, 1500);
    } catch (err: any) { setSubmitError(err.message || 'Failed to schedule meeting'); }
  };

  const minDate = () => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
  };

  if (!isOpen) return null;

  const inputCls = (field: string) =>
    `w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors[field] ? 'border-red-500' : 'border-gray-300'}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <MdAddCall className="w-6 h-6 text-blue-500" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Schedule Meeting</h2>
          </div>
          <button onClick={() => { reset(); onClose(); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {submitSuccess && (
            <div className="bg-green-50 dark:bg-green-900 border border-green-200 text-green-800 dark:text-green-200 px-4 py-3 rounded-lg">
              Meeting scheduled successfully! 🎉
            </div>
          )}
          {submitError && (
            <div className="bg-red-50 dark:bg-red-900 border border-red-200 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg">
              {submitError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Meeting Title *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Team Standup, Project Review" className={inputCls('title')} />
            {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description (Optional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Add meeting agenda..." rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FiCalendar className="w-4 h-4" /> Date *
              </label>
              <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)}
                min={minDate()} className={inputCls('scheduledDate')} />
              {errors.scheduledDate && <p className="mt-1 text-sm text-red-500">{errors.scheduledDate}</p>}
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FiClock className="w-4 h-4" /> Time *
              </label>
              <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)}
                className={inputCls('scheduledTime')} />
              {errors.scheduledTime && <p className="mt-1 text-sm text-red-500">{errors.scheduledTime}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Duration</label>
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              {[[15,'15 minutes'],[30,'30 minutes'],[45,'45 minutes'],[60,'1 hour'],[90,'1.5 hours'],[120,'2 hours']].map(([v,l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Meeting Type</label>
            <div className="flex gap-4">
              {(['video','audio'] as const).map((type) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={meetingType===type} onChange={() => setMeetingType(type)} className="w-4 h-4 text-blue-500" />
                  <span className="text-gray-700 dark:text-gray-300">{type==='video' ? 'Video Call' : 'Audio Only'}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FiUsers className="w-4 h-4" /> Participants * (Max 3 + You = 4 total)
            </label>
            {loadingUsers ? (
              <div className="text-center py-4 text-gray-500">Loading workspace members...</div>
            ) : (
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg max-h-48 overflow-y-auto">
                {availableUsers.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 text-sm">No other workspace members found</div>
                ) : (
                  availableUsers.map((u: any) => {
                    const uid = u._id || u.id;
                    const name = u.fullName || u.name || 'Unknown';
                    return (
                      <label key={uid} className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-200 dark:border-gray-600 last:border-b-0">
                        <input type="checkbox" checked={selectedParticipants.includes(uid)} onChange={() => toggleParticipant(uid)} className="w-4 h-4 text-blue-500 rounded" />
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                          {name.slice(0,2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{name}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            )}
            <p className="mt-2 text-xs text-gray-500">Selected: {selectedParticipants.length} / 3</p>
            {errors.participants && <p className="mt-1 text-sm text-red-500">{errors.participants}</p>}
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => { reset(); onClose(); }}
              className="flex-1 px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isLoading}
              className="flex-1 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed font-medium transition-colors">
              {isLoading ? 'Scheduling...' : 'Schedule Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MeetingScheduler;
