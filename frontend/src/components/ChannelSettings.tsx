import { useState } from 'react';
import type { Channel, User } from '../types';

interface ChannelSettingsProps {
  channel: Channel;
  currentUser: User;
  workspaceMembers: User[];
  onClose: () => void;
  onAddMember: (email: string) => void;
  onRemoveMember: (userId: string) => void;
  onUpdateChannel: (data: { name?: string; description?: string; topic?: string }) => void;
  onDeleteChannel: () => void;
  onUpdatePrivacy?: (isPrivate: boolean) => void;
  onPromoteToAdmin?: (userId: string) => void;
  onDemoteFromAdmin?: (userId: string) => void;
  isAdmin: boolean;
}

type Tab = 'about' | 'members' | 'permissions';

const getInitials = (name: string) => {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// ── Toggle switch ─────────────────────────────────────────────────────────────
const Toggle = ({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) => (
  <button
    onClick={onChange}
    disabled={disabled}
    className={`relative inline-flex h-5 w-9 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-40 ${checked ? 'bg-primary' : 'bg-[#333]'}`}
  >
    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 mt-0.5 ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
  </button>
);

// ── Section label ─────────────────────────────────────────────────────────────
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-widest mb-2">{children}</p>
);

const ChannelSettings = ({
  channel,
  currentUser,
  workspaceMembers,
  onClose,
  onAddMember,
  onRemoveMember,
  onUpdateChannel,
  onDeleteChannel,
  onUpdatePrivacy,
  onPromoteToAdmin,
  onDemoteFromAdmin,
  isAdmin,
}: ChannelSettingsProps) => {
  const [tab, setTab] = useState<Tab>('about');
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(channel.name);
  const [description, setDescription] = useState(channel.description || '');
  const [topic, setTopic] = useState(channel.topic || '');
  const [isPrivate, setIsPrivate] = useState(channel.isPrivate || false);
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [addError, setAddError] = useState('');

  const channelAdminIds: string[] = (channel.admins || []).map((a: any) =>
    typeof a === 'object' ? a._id || a.id : a
  );
  const isChannelAdmin = isAdmin || channelAdminIds.includes(currentUser.id || currentUser._id || '');
  const isCreator = channel.createdBy === currentUser.id || channel.createdBy === currentUser._id;

  const handleSave = () => {
    onUpdateChannel({ name, description, topic });
    setIsEditing(false);
  };

  const handleTogglePrivacy = async () => {
    if (!onUpdatePrivacy) return;
    setPrivacyLoading(true);
    try { await onUpdatePrivacy(!isPrivate); setIsPrivate(p => !p); }
    catch {}
    finally { setPrivacyLoading(false); }
  };

  const handleAddByEmail = () => {
    setAddError('');
    if (!memberEmail.trim()) { setAddError('Enter an email address'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(memberEmail)) { setAddError('Enter a valid email'); return; }
    onAddMember(memberEmail.trim().toLowerCase());
    setMemberEmail('');
    setShowAddMember(false);
  };

  const filteredWorkspace = workspaceMembers.filter(m => {
    const q = searchQuery.toLowerCase();
    return m.fullName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
  });

  const channelMemberIds = (channel.members || []).map((m: any) =>
    typeof m === 'object' ? m._id || m.id : m
  );

  const nonMembers = filteredWorkspace.filter(m => !channelMemberIds.includes(m._id || m.id));

  const tabs: { id: Tab; label: string }[] = [
    { id: 'about', label: 'About' },
    { id: 'members', label: `Members · ${channel.members?.length || 0}` },
    ...(isChannelAdmin ? [{ id: 'permissions' as Tab, label: 'Permissions' }] : []),
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0d0d0d] rounded-2xl w-full max-w-xl max-h-[88vh] flex flex-col border border-[#1a1a1a] shadow-2xl shadow-black/60">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1a1a1a] flex items-center justify-center">
              {channel.isPrivate ? (
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              ) : (
                <span className="text-gray-400 font-bold">#</span>
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">{channel.name}</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isChannelAdmin && <span className="text-[10px] px-1.5 py-0.5 bg-primary/15 text-primary rounded font-medium">Admin</span>}
                {isCreator && <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/15 text-yellow-400 rounded font-medium">Creator</span>}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-500 hover:text-white hover:bg-[#1e1e1e] transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-[#1a1a1a] flex-shrink-0 px-2">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
                tab === t.id
                  ? 'text-white border-primary'
                  : 'text-gray-500 border-transparent hover:text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto">

          {/* About tab */}
          {tab === 'about' && (
            <div className="p-6 space-y-5">
              {isEditing && isChannelAdmin ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Channel name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#111] border border-[#222] text-white text-sm focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Description</label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#111] border border-[#222] text-white text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Topic</label>
                    <input
                      type="text"
                      value={topic}
                      onChange={e => setTopic(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#111] border border-[#222] text-white text-sm focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleSave}
                      className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/80 text-white text-sm font-medium transition-colors">
                      Save changes
                    </button>
                    <button onClick={() => { setName(channel.name); setDescription(channel.description || ''); setTopic(channel.topic || ''); setIsEditing(false); }}
                      className="px-5 py-2 rounded-xl bg-[#1a1a1a] hover:bg-[#222] text-gray-300 text-sm transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <SectionLabel>Description</SectionLabel>
                    <p className="text-sm text-gray-300">{channel.description || <span className="text-gray-600 italic">No description set</span>}</p>
                  </div>

                  {channel.topic && (
                    <div>
                      <SectionLabel>Topic</SectionLabel>
                      <p className="text-sm text-gray-300">{channel.topic}</p>
                    </div>
                  )}

                  <div>
                    <SectionLabel>Privacy</SectionLabel>
                    <div className="flex items-center justify-between px-4 py-3 bg-[#111] rounded-xl border border-[#1a1a1a]">
                      <div>
                        <p className="text-sm font-medium text-white">{isPrivate ? 'Private' : 'Public'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{isPrivate ? 'Only members can view' : 'Anyone in workspace can join'}</p>
                      </div>
                      {isChannelAdmin && <Toggle checked={isPrivate} onChange={handleTogglePrivacy} disabled={privacyLoading} />}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Created</SectionLabel>
                    <p className="text-sm text-gray-400">{new Date(channel.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  </div>

                  {isChannelAdmin && (
                    <button onClick={() => setIsEditing(true)}
                      className="px-4 py-2 text-sm rounded-xl bg-[#1a1a1a] hover:bg-[#1e1e1e] text-white border border-[#222] transition-colors flex items-center gap-2">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit channel
                    </button>
                  )}
                </div>
              )}

              {/* Danger zone */}
              {isChannelAdmin && channel.name !== 'general' && (
                <div className="pt-5 border-t border-[#1a1a1a]">
                  <SectionLabel>Danger zone</SectionLabel>
                  <button onClick={onDeleteChannel}
                    className="px-4 py-2 text-sm rounded-xl bg-red-500/8 hover:bg-red-500/15 text-red-400 border border-red-500/15 transition-colors">
                    Delete channel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Members tab */}
          {tab === 'members' && (
            <div className="p-6 space-y-4">

              {/* Add member button */}
              {isChannelAdmin && (
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-400">{channel.members?.length || 0} members</p>
                  <button onClick={() => setShowAddMember(p => !p)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-primary/15 text-primary hover:bg-primary/25 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add member
                  </button>
                </div>
              )}

              {/* Add member panel */}
              {showAddMember && isChannelAdmin && (
                <div className="p-4 bg-[#111] rounded-xl border border-[#1a1a1a] space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Add by email</p>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        placeholder="user@example.com"
                        value={memberEmail}
                        onChange={e => setMemberEmail(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddByEmail(); }}
                        className="flex-1 px-3 py-2 text-sm rounded-xl bg-[#0d0d0d] border border-[#222] text-white placeholder-gray-600 focus:outline-none focus:border-primary/50"
                      />
                      <button onClick={handleAddByEmail}
                        className="px-4 py-2 text-sm rounded-xl bg-primary hover:bg-primary/80 text-white font-medium transition-colors">
                        Add
                      </button>
                    </div>
                    {addError && <p className="text-xs text-red-400 mt-1.5">{addError}</p>}
                  </div>

                  {nonMembers.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">From workspace</p>
                      <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-xl bg-[#0d0d0d] border border-[#222] text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 mb-2"
                      />
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {nonMembers.map(m => (
                          <div key={m._id || m.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#161616] transition-colors">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/30 to-indigo-600/30 flex items-center justify-center text-white text-xs font-bold">
                                {getInitials(m.fullName)}
                              </div>
                              <div>
                                <p className="text-xs font-medium text-white">{m.fullName}</p>
                                <p className="text-[10px] text-gray-600">{m.email}</p>
                              </div>
                            </div>
                            <button onClick={() => onAddMember(m.email)}
                              className="text-xs px-2.5 py-1 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-colors font-medium">
                              Add
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Member list */}
              <div className="space-y-1">
                {channel.members?.map((member: any) => {
                  const user: User = typeof member === 'object' ? member : workspaceMembers.find(m => m._id === member || m.id === member)!;
                  if (!user) return null;

                  const uid = user._id || user.id || '';
                  const isCurrentUser = uid === currentUser._id || uid === currentUser.id;
                  const isMemberAdmin = channelAdminIds.includes(uid);
                  const isMemberCreator = channel.createdBy === uid;

                  return (
                    <div key={uid} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[#111] transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500/30 to-indigo-600/30 flex items-center justify-center text-white text-xs font-bold">
                            {getInitials(user.fullName)}
                          </div>
                          {user.status === 'online' && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-[#0d0d0d] rounded-full" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white flex items-center gap-1.5">
                            {user.fullName}
                            {isCurrentUser && <span className="text-[10px] text-gray-600">(you)</span>}
                            {isMemberCreator && <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/15 text-yellow-400 rounded font-medium">Creator</span>}
                            {isMemberAdmin && !isMemberCreator && <span className="text-[10px] px-1.5 py-0.5 bg-primary/15 text-primary rounded font-medium">Admin</span>}
                          </p>
                          <p className="text-[11px] text-gray-600">{user.email}</p>
                        </div>
                      </div>

                      {isChannelAdmin && !isCurrentUser && !isMemberCreator && (
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isMemberAdmin ? (
                            onDemoteFromAdmin && (
                              <button onClick={() => onDemoteFromAdmin(uid)}
                                className="text-[11px] px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-colors font-medium">
                                Demote
                              </button>
                            )
                          ) : (
                            onPromoteToAdmin && (
                              <button onClick={() => onPromoteToAdmin(uid)}
                                className="text-[11px] px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium">
                                Promote
                              </button>
                            )
                          )}
                          <button onClick={() => onRemoveMember(uid)}
                            className="text-[11px] px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors font-medium">
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Permissions tab */}
          {tab === 'permissions' && (
            <div className="p-6 space-y-4">
              <div className="px-4 py-3.5 bg-[#111] rounded-xl border border-[#1a1a1a]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">Channel admins</p>
                    <p className="text-xs text-gray-500 mt-0.5">Can edit settings, manage members, moderate</p>
                  </div>
                  <span className="text-xs text-gray-500">{channelAdminIds.length} admin{channelAdminIds.length !== 1 ? 's' : ''}</span>
                </div>
              </div>

              <div className="px-4 py-3.5 bg-[#111] rounded-xl border border-[#1a1a1a]">
                <p className="text-sm font-medium text-white">Posting</p>
                <p className="text-xs text-gray-500 mt-0.5">All members can post messages</p>
              </div>

              <div className="px-4 py-3.5 bg-[#111] rounded-xl border border-[#1a1a1a]">
                <p className="text-sm font-medium text-white">Reactions</p>
                <p className="text-xs text-gray-500 mt-0.5">All members can add reactions</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ChannelSettings;
