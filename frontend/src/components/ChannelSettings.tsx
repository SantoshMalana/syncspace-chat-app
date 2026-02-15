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
    isAdmin: boolean;
}

const ChannelSettings = ({
    channel,
    currentUser,
    workspaceMembers,
    onClose,
    onAddMember,
    onRemoveMember,
    onUpdateChannel,
    onDeleteChannel,
    isAdmin,
}: ChannelSettingsProps) => {
    const [activeTab, setActiveTab] = useState<'about' | 'members'>('about');
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(channel.name);
    const [description, setDescription] = useState(channel.description || '');
    const [topic, setTopic] = useState(channel.topic || '');
    
    // Add member states
    const [showAddMember, setShowAddMember] = useState(false);
    const [memberEmail, setMemberEmail] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [addError, setAddError] = useState('');

    const getInitials = (fullName: string) => {
        return fullName.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    const handleSaveChanges = () => {
        onUpdateChannel({ name, description, topic });
        setIsEditing(false);
    };

    const handleAddMemberByEmail = () => {
        setAddError('');
        
        if (!memberEmail.trim()) {
            setAddError('Please enter an email address');
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(memberEmail)) {
            setAddError('Please enter a valid email address');
            return;
        }

        onAddMember(memberEmail.trim().toLowerCase());
        setMemberEmail('');
        setShowAddMember(false);
    };

    const handleAddMemberFromList = (user: User) => {
        const email = user.email;
        onAddMember(email);
    };

    const filteredMembers = workspaceMembers.filter(member => {
        const query = searchQuery.toLowerCase();
        return (
            member.fullName.toLowerCase().includes(query) ||
            member.email.toLowerCase().includes(query)
        );
    });

    const channelMemberIds = channel.members?.map(m => 
        typeof m === 'object' ? (m._id || m.id) : m
    ) || [];

    const nonMembers = filteredMembers.filter(member => {
        const memberId = member._id || member.id;
        return !channelMemberIds.includes(memberId);
    });

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0f0f0f] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-[#1f1f1f]">
                {/* Header */}
                <div className="p-6 border-b border-[#1f1f1f] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-2xl">
                            {channel.isPrivate ? '🔒' : '#'}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">{channel.name}</h2>
                            <p className="text-sm text-gray-500">{channel.members?.length || 0} members</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-[#1a1a1a] transition-colors text-gray-400 hover:text-white"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[#1f1f1f]">
                    <button
                        onClick={() => setActiveTab('about')}
                        className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                            activeTab === 'about'
                                ? 'text-white border-b-2 border-primary'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        About
                    </button>
                    <button
                        onClick={() => setActiveTab('members')}
                        className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                            activeTab === 'members'
                                ? 'text-white border-b-2 border-primary'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        Members
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'about' ? (
                        <div className="space-y-6">
                            {/* Channel Info */}
                            {isEditing && isAdmin ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Channel Name</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full px-4 py-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-white focus:outline-none focus:border-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            rows={3}
                                            className="w-full px-4 py-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-white focus:outline-none focus:border-primary resize-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Topic</label>
                                        <input
                                            type="text"
                                            value={topic}
                                            onChange={(e) => setTopic(e.target.value)}
                                            className="w-full px-4 py-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-white focus:outline-none focus:border-primary"
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleSaveChanges}
                                            className="px-6 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-white font-medium hover:shadow-lg hover:shadow-primary/20 transition-all"
                                        >
                                            Save Changes
                                        </button>
                                        <button
                                            onClick={() => {
                                                setName(channel.name);
                                                setDescription(channel.description || '');
                                                setTopic(channel.topic || '');
                                                setIsEditing(false);
                                            }}
                                            className="px-6 py-2 rounded-lg bg-[#1a1a1a] text-gray-300 hover:bg-[#2a2a2a] transition-all"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</h3>
                                        <p className="text-gray-300">{channel.description || 'No description set'}</p>
                                    </div>
                                    {channel.topic && (
                                        <div>
                                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Topic</h3>
                                            <p className="text-gray-300">{channel.topic}</p>
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Created</h3>
                                        <p className="text-gray-300">{new Date(channel.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    {isAdmin && (
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="px-6 py-2 rounded-lg bg-[#1a1a1a] text-white hover:bg-[#2a2a2a] transition-all"
                                        >
                                            Edit Channel
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Danger Zone */}
                            {isAdmin && channel.name !== 'general' && (
                                <div className="pt-6 border-t border-[#1f1f1f]">
                                    <h3 className="text-sm font-semibold text-red-400 mb-3">Danger Zone</h3>
                                    <button
                                        onClick={onDeleteChannel}
                                        className="px-6 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                                    >
                                        Delete Channel
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Add Member Section */}
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-white">Channel Members</h3>
                                {isAdmin && (
                                    <button
                                        onClick={() => setShowAddMember(!showAddMember)}
                                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-white text-sm font-medium hover:shadow-lg hover:shadow-primary/20 transition-all flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Add Member
                                    </button>
                                )}
                            </div>

                            {/* Add Member Panel */}
                            {showAddMember && isAdmin && (
                                <div className="p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] space-y-4 mb-4">
                                    <div>
                                        <h4 className="text-sm font-semibold text-white mb-3">Add by Email</h4>
                                        <div className="flex gap-2">
                                            <input
                                                type="email"
                                                placeholder="user@example.com"
                                                value={memberEmail}
                                                onChange={(e) => setMemberEmail(e.target.value)}
                                                onKeyPress={(e) => {
                                                    if (e.key === 'Enter') {
                                                        handleAddMemberByEmail();
                                                    }
                                                }}
                                                className="flex-1 px-4 py-2 rounded-lg bg-[#0f0f0f] border border-[#2a2a2a] text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                                            />
                                            <button
                                                onClick={handleAddMemberByEmail}
                                                className="px-6 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/80 transition-all"
                                            >
                                                Add
                                            </button>
                                        </div>
                                        {addError && (
                                            <p className="text-xs text-red-400 mt-2">{addError}</p>
                                        )}
                                    </div>

                                    {/* Or add from workspace members */}
                                    {nonMembers.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-semibold text-white mb-3">Or select from workspace</h4>
                                            <input
                                                type="text"
                                                placeholder="Search members..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full px-4 py-2 rounded-lg bg-[#0f0f0f] border border-[#2a2a2a] text-white placeholder-gray-500 focus:outline-none focus:border-primary mb-3"
                                            />
                                            <div className="max-h-60 overflow-y-auto space-y-2">
                                                {nonMembers.map(member => (
                                                    <div
                                                        key={member._id || member.id}
                                                        className="flex items-center justify-between p-3 bg-[#0f0f0f] rounded-lg hover:bg-[#141414] transition-colors"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-white font-semibold">
                                                                {getInitials(member.fullName)}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-white">{member.fullName}</p>
                                                                <p className="text-xs text-gray-500">{member.email}</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleAddMemberFromList(member)}
                                                            className="px-3 py-1 rounded bg-primary/20 text-primary text-sm hover:bg-primary/30 transition-colors"
                                                        >
                                                            Add
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Current Members List */}
                            <div className="space-y-2">
                                {channel.members?.map((member: any) => {
                                    const user = typeof member === 'object' ? member : workspaceMembers.find(m => 
                                        (m._id === member || m.id === member)
                                    );
                                    
                                    if (!user) return null;

                                    const isCurrentUser = (user._id === currentUser._id) || (user.id === currentUser.id);

                                    return (
                                        <div
                                            key={user._id || user.id}
                                            className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-white font-semibold">
                                                        {getInitials(user.fullName)}
                                                    </div>
                                                    {user.status === 'online' && (
                                                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-[#1a1a1a] rounded-full" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-white flex items-center gap-2">
                                                        {user.fullName}
                                                        {isCurrentUser && (
                                                            <span className="text-xs text-gray-500">(you)</span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-gray-500">{user.email}</p>
                                                </div>
                                            </div>
                                            {isAdmin && !isCurrentUser && (
                                                <button
                                                    onClick={() => onRemoveMember(user._id || user.id)}
                                                    className="px-3 py-1 rounded bg-red-500/10 text-red-400 text-sm hover:bg-red-500/20 transition-colors"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChannelSettings;
