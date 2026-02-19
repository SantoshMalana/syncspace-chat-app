import { useState, useRef, useEffect } from 'react';
import type { User } from '../types';

interface ProfilePanelProps {
  user: User;
  currentUser: User;
  onClose: () => void;
  onMessage: (userId: string) => void;
  onProfileUpdate?: (updatedUser: User) => void;
}

const PRESET_AVATARS = [
  '🧑', '👨', '👩', '🧑‍🦱', '👨‍🦱', '👩‍🦰',
  '🧑‍🦲', '👨‍🦲', '👩‍🦲', '🧔', '👨‍🦰', '👩‍🦱',
  '🧑‍🦳', '👴', '👵', '🧑‍💼', '👨‍💼', '🧑‍🎤',
];

const getInitials = (name: string) => {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// ── Status badge ──────────────────────────────────────────────────────────────
const StatusDot = ({ status }: { status?: string }) => {
  const isOnline = status === 'online';
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${isOnline ? 'bg-green-500' : 'bg-gray-600'}`} />
  );
};

// ── Feedback banner ───────────────────────────────────────────────────────────
const Feedback = ({ msg }: { msg: string }) => {
  if (!msg) return null;
  const isSuccess = msg.startsWith('✓');
  const isError = msg.toLowerCase().includes('error');
  return (
    <div className={`w-full px-3 py-2 rounded-lg text-xs text-center font-medium ${
      isSuccess ? 'bg-green-500/15 text-green-400 border border-green-500/20' :
      isError   ? 'bg-red-500/15 text-red-400 border border-red-500/20' :
                  'bg-blue-500/15 text-blue-400 border border-blue-500/20'
    }`}>
      {msg}
    </div>
  );
};

const ProfilePanel = ({ user, currentUser, onClose, onMessage, onProfileUpdate }: ProfilePanelProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState(user.fullName);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [restrictions, setRestrictions] = useState<any>(null);
  const [localTime, setLocalTime] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwn = currentUser.id === user.id || currentUser._id === user._id;

  // Live clock
  useEffect(() => {
    const tick = () => setLocalTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (isOwn) fetchRestrictions();
  }, [isOwn]);

  const setMsg = (msg: string, duration = 3000) => {
    setFeedback(msg);
    if (msg) setTimeout(() => setFeedback(''), duration);
  };

  const fetchRestrictions = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/profile/restrictions`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (res.ok) setRestrictions(data);
    } catch {}
  };

  const copyEmail = async () => {
    await navigator.clipboard.writeText(user.email);
    setMsg('✓ Email copied!', 2000);
  };

  const handleNameSave = async () => {
    if (!editingName.trim() || editingName === user.fullName) { setIsEditing(false); return; }
    setIsUploading(true);
    setMsg('Updating name...');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ fullName: editingName }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(`Error: ${data.error}`); return; }
      setMsg('✓ Name updated!');
      onProfileUpdate?.(data.user);
      setIsEditing(false);
      fetchRestrictions();
    } catch { setMsg('Error updating name'); }
    finally { setIsUploading(false); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setMsg('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { setMsg('Max file size is 5MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUploadAvatar = async () => {
    if (!avatarPreview || !fileInputRef.current?.files?.[0]) return;
    setIsUploading(true);
    setMsg('Uploading...');
    try {
      const formData = new FormData();
      formData.append('file', fileInputRef.current.files[0]);
      const uploadRes = await fetch(`${import.meta.env.VITE_API_URL}/api/uploads/single`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error);

      const profileRes = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ avatar: uploadData.file.url }),
      });
      const profileData = await profileRes.json();
      if (!profileRes.ok) throw new Error(profileData.error);

      setMsg('✓ Photo updated!');
      setAvatarPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onProfileUpdate?.(profileData.user);
      fetchRestrictions();
    } catch (err) { setMsg(`Error: ${(err as Error).message}`); }
    finally { setIsUploading(false); }
  };

  const handlePresetAvatar = async (emoji: string) => {
    setIsUploading(true);
    setMsg('Updating...');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ avatar: emoji }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg('✓ Avatar updated!');
      onProfileUpdate?.(data.user);
      fetchRestrictions();
    } catch (err) { setMsg(`Error: ${(err as Error).message}`); }
    finally { setIsUploading(false); }
  };

  const avatarUrl = user.avatar?.startsWith('http')
    ? user.avatar
    : user.avatar
    ? `${import.meta.env.VITE_API_URL}${user.avatar}`
    : null;

  const isEmoji = user.avatar && !user.avatar.startsWith('http') && !user.avatar.startsWith('/');

  return (
    <div className="fixed right-0 top-0 h-screen w-[360px] bg-[#0d0d0d] border-l border-[#1a1a1a] flex flex-col shadow-2xl z-50">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1a1a1a] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-white">{isOwn ? 'My Profile' : 'Profile'}</h3>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-[#1e1e1e] transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* ── Hero section ── */}
        <div className="px-6 pt-6 pb-5 flex flex-col items-center border-b border-[#1a1a1a]">

          {/* Avatar */}
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-2xl overflow-hidden flex items-center justify-center bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-xl">
              {avatarPreview ? (
                <img src={avatarPreview} className="w-full h-full object-cover" />
              ) : isEmoji ? (
                <span className="text-5xl">{user.avatar}</span>
              ) : avatarUrl ? (
                <img src={avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold">{getInitials(user.fullName)}</span>
              )}
            </div>

            {/* Online dot */}
            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-[3px] border-[#0d0d0d] ${user.status === 'online' ? 'bg-green-500' : 'bg-gray-600'}`} />

            {/* Camera button for own profile */}
            {isOwn && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute -bottom-1 -left-1 w-7 h-7 bg-[#1a1a1a] border border-[#2a2a2a] hover:bg-[#222] rounded-full flex items-center justify-center transition-all shadow-lg"
                title="Change photo"
              >
                <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

          {/* Upload confirm buttons */}
          {avatarPreview && isOwn && (
            <div className="flex gap-2 mb-3 w-full">
              <button onClick={handleUploadAvatar} disabled={isUploading}
                className="flex-1 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors">
                ✓ Save photo
              </button>
              <button onClick={() => { setAvatarPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                disabled={isUploading}
                className="flex-1 py-1.5 text-xs font-medium bg-[#1e1e1e] hover:bg-[#2a2a2a] text-gray-300 rounded-lg border border-[#2a2a2a] transition-colors">
                Cancel
              </button>
            </div>
          )}

          {/* Feedback */}
          {feedback && <div className="mb-3 w-full"><Feedback msg={feedback} /></div>}

          {/* Name */}
          {isEditing && isOwn ? (
            <div className="w-full mb-1">
              <input
                type="text"
                value={editingName}
                onChange={e => setEditingName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') setIsEditing(false); }}
                disabled={isUploading}
                autoFocus
                className="w-full text-center text-lg font-bold bg-[#1a1a1a] border border-primary/50 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-primary"
              />
              {restrictions && !restrictions.canChangeName && (
                <p className="text-[11px] text-orange-400 text-center mt-1">
                  Can change in {restrictions.daysUntilNameChange}d
                </p>
              )}
            </div>
          ) : (
            <h2 className="text-xl font-bold text-white mb-1 text-center">{user.fullName}</h2>
          )}

          {/* Status */}
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <StatusDot status={user.status} />
            <span className="capitalize">{user.status || 'offline'}</span>
            {localTime && <span className="text-gray-700">· {localTime}</span>}
          </div>
        </div>

        {/* ── Primary action ── */}
        <div className="px-5 py-4 border-b border-[#1a1a1a]">
          {isOwn ? (
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button onClick={handleNameSave} disabled={isUploading || !editingName.trim() || editingName === user.fullName}
                    className="flex-1 py-2 text-sm font-medium bg-primary hover:bg-primary/80 disabled:opacity-40 text-white rounded-xl transition-colors">
                    Save
                  </button>
                  <button onClick={() => { setIsEditing(false); setEditingName(user.fullName); }}
                    className="flex-1 py-2 text-sm font-medium bg-[#1a1a1a] hover:bg-[#222] text-gray-300 rounded-xl border border-[#2a2a2a] transition-colors">
                    Cancel
                  </button>
                </>
              ) : (
                <button onClick={() => setIsEditing(true)}
                  className="w-full py-2.5 text-sm font-medium bg-[#1a1a1a] hover:bg-[#1e1e1e] text-white rounded-xl border border-[#2a2a2a] transition-colors flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit name
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => onMessage(user._id || user.id)}
              className="w-full py-2.5 text-sm font-semibold bg-primary hover:bg-primary/80 text-white rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Send Message
            </button>
          )}
        </div>

        {/* ── Contact info ── */}
        <div className="px-5 py-4 border-b border-[#1a1a1a]">
          <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-widest mb-3">Contact</p>
          <div className="flex items-center gap-3 px-3 py-2.5 bg-[#111] rounded-xl border border-[#1a1a1a]">
            <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-sm text-gray-300 flex-1 truncate font-mono text-xs">{user.email}</span>
            <button onClick={copyEmail} className="text-gray-600 hover:text-gray-300 transition-colors flex-shrink-0" title="Copy email">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Avatar presets (own profile only, when editing) ── */}
        {isOwn && isEditing && (
          <div className="px-5 py-4 border-b border-[#1a1a1a]">
            <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-widest mb-3">Quick Avatars</p>
            <div className="grid grid-cols-6 gap-1.5">
              {PRESET_AVATARS.map((emoji, i) => (
                <button
                  key={i}
                  onClick={() => handlePresetAvatar(emoji)}
                  disabled={isUploading}
                  className="aspect-square flex items-center justify-center text-2xl rounded-xl hover:bg-[#1e1e1e] transition-colors disabled:opacity-40"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Profile limits (own profile) ── */}
        {isOwn && restrictions && (
          <div className="px-5 py-4">
            <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-widest mb-3">Limits</p>
            <div className="space-y-2">
              <div className={`px-3 py-2.5 rounded-xl text-xs flex items-center justify-between ${restrictions.canChangeName ? 'bg-green-500/8 border border-green-500/15' : 'bg-orange-500/8 border border-orange-500/15'}`}>
                <span className={restrictions.canChangeName ? 'text-green-400' : 'text-orange-400'}>Name changes</span>
                <span className={`font-medium ${restrictions.canChangeName ? 'text-green-400' : 'text-orange-400'}`}>
                  {restrictions.canChangeName ? 'Available' : `${restrictions.daysUntilNameChange}d remaining`}
                </span>
              </div>
              <div className={`px-3 py-2.5 rounded-xl text-xs flex items-center justify-between ${restrictions.avatarChangesRemaining > 0 ? 'bg-green-500/8 border border-green-500/15' : 'bg-red-500/8 border border-red-500/15'}`}>
                <span className={restrictions.avatarChangesRemaining > 0 ? 'text-green-400' : 'text-red-400'}>Avatar changes</span>
                <span className={`font-medium ${restrictions.avatarChangesRemaining > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {restrictions.avatarChangesRemaining}/{restrictions.totalAvatarChanges} this month
                </span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ProfilePanel;
