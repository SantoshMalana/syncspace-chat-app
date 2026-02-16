import { useState } from 'react';
import type { Channel, User } from '../types';
import ChannelFiles from './ChannelFiles';
import NotificationPreferences from './NotificationPreferences';

interface ChannelInfoProps {
    channel: Channel;
    currentUser: User;
    workspaceMembers: User[];
    onClose: () => void;
    onLeaveChannel: () => void;
    onOpenSettings: () => void;
    isAdmin: boolean;
}

const ChannelInfo = ({
    channel,
    currentUser,
    workspaceMembers,
    onClose,
    onLeaveChannel,
    onOpenSettings,
    isAdmin,
}: ChannelInfoProps) => {
    const [showAllMembers, setShowAllMembers] = useState(false);
    const [showFiles, setShowFiles] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);

    const getInitials = (name: string) => {
        if (!name || typeof name !== 'string') return 'U';
        const names = name.trim().split(' ').filter(Boolean);
        if (names.length === 0) return 'U';
        if (names.length === 1) return names[0].slice(0, 2).toUpperCase();
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    };

    // Get channel members with full info
    const channelMemberIds = channel.members || [];
    const channelAdminIds = channel.admins || [];

    const members = workspaceMembers.filter(member => {
        const memberId = member._id || member.id;
        return channelMemberIds.includes(memberId);
    });

    // Separate admins and regular members
    const admins = members.filter(member => {
        const memberId = member._id || member.id;
        return channelAdminIds.some(adminId => {
            const aid = (typeof adminId === 'object' && adminId !== null)
                ? ('_id' in adminId ? (adminId as any)._id : (adminId as any).id)
                : String(adminId);
            return aid === memberId;
        });
    });

    const regularMembers = members.filter(member => {
        const memberId = member._id || member.id;
        return !channelAdminIds.some(adminId => {
            const aid = (typeof adminId === 'object' && adminId !== null)
                ? ('_id' in adminId ? (adminId as any)._id : (adminId as any).id)
                : String(adminId);
            return aid === memberId;
        });
    });

    // Count online members
    const onlineCount = members.filter(m => m.status === 'online').length;

    const isCreator = (channel.createdBy === currentUser.id || channel.createdBy === currentUser._id) || false;

    if (showFiles) {
        return <ChannelFiles channelId={channel._id || channel.id} onClose={() => setShowFiles(false)} />;
    }

    if (showNotifications) {
        return (
            <NotificationPreferences
                initialPreferences={{ muted: false, mutedUntil: null }}
                onSave={(prefs) => console.log('Saved prefs:', prefs)}
                onClose={() => setShowNotifications(false)}
                channelId={(channel as any)._id || (channel as any).id}
            />
        );
    }

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0f0f0f] rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col border border-[#1f1f1f]">

                {/* Header */}
                <div className="p-6 border-b border-[#1f1f1f] flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Channel Info</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-[#1a1a1a] transition-colors text-gray-400 hover:text-white"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">

                    {/* Channel Header */}
                    <div className="p-6 text-center border-b border-[#1f1f1f]">
                        <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-4xl mb-4">
                            {channel.isPrivate ? '🔒' : '#'}
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">{channel.name}</h3>
                        {channel.description && (
                            <p className="text-sm text-gray-400 mb-3">{channel.description}</p>
                        )}
                        <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                            <span>{members.length} members</span>
                            <span>•</span>
                            <span>{onlineCount} online</span>
                        </div>
                    </div>

                    {/* Channel Actions */}
                    <div className="p-4 space-y-2 border-b border-[#1f1f1f]">
                        {/* Settings - Only for Admins */}
                        {isAdmin && (
                            <button
                                onClick={() => {
                                    onClose();
                                    onOpenSettings();
                                }}
                                className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-[#1a1a1a] transition-colors text-left"
                            >
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <p className="text-white font-medium">Channel Settings</p>
                                    <p className="text-xs text-gray-500">Manage channel, members & permissions</p>
                                </div>
                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        )}

                        {/* Media & Files */}
                        <button
                            onClick={() => setShowFiles(true)}
                            className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-[#1a1a1a] transition-colors text-left"
                        >
                            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <p className="text-white font-medium">Media & Files</p>
                                <p className="text-xs text-gray-500">View shared media and files</p>
                            </div>
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>

                        {/* Notifications */}
                        <button
                            onClick={() => setShowNotifications(true)}
                            className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-[#1a1a1a] transition-colors text-left"
                        >
                            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <p className="text-white font-medium">Notifications</p>
                                <p className="text-xs text-gray-500">Mute or customize alerts</p>
                            </div>
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    {/* Members Section */}
                    <div className="p-4">
                        <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                            {members.length} Members
                        </h4>

                        {/* Admins */}
                        {admins.length > 0 && (
                            <div className="mb-4">
                                <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">Admins</h5>
                                <div className="space-y-1">
                                    {admins.map(member => {
                                        const isCurrentUser = (member._id === currentUser._id) || (member.id === currentUser.id);
                                        const isMemberCreator = (channel.createdBy === (member._id || member.id)) || false;

                                        return (
                                            <div
                                                key={member._id || member.id}
                                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#1a1a1a] transition-colors"
                                            >
                                                <div className="relative">
                                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-white font-semibold">
                                                        {getInitials(member.fullName)}
                                                    </div>
                                                    {member.status === 'online' && (
                                                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-[#0f0f0f] rounded-full" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-medium text-white truncate">
                                                            {member.fullName}
                                                            {isCurrentUser && <span className="text-gray-500"> (You)</span>}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {isMemberCreator && (
                                                            <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">Creator</span>
                                                        )}
                                                        <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded">Admin</span>
                                                        {member.status === 'online' && (
                                                            <span className="text-xs text-green-400">online</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Regular Members */}
                        {regularMembers.length > 0 && (
                            <div>
                                <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">Members</h5>
                                <div className="space-y-1">
                                    {(showAllMembers ? regularMembers : regularMembers.slice(0, 5)).map(member => {
                                        const isCurrentUser = (member._id === currentUser._id) || (member.id === currentUser.id);

                                        return (
                                            <div
                                                key={member._id || member.id}
                                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#1a1a1a] transition-colors"
                                            >
                                                <div className="relative">
                                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-white font-semibold">
                                                        {getInitials(member.fullName)}
                                                    </div>
                                                    {member.status === 'online' && (
                                                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-[#0f0f0f] rounded-full" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-white truncate">
                                                        {member.fullName}
                                                        {isCurrentUser && <span className="text-gray-500"> (You)</span>}
                                                    </p>
                                                    {member.status === 'online' ? (
                                                        <p className="text-xs text-green-400">online</p>
                                                    ) : (
                                                        <p className="text-xs text-gray-500">
                                                            {member.status === 'away' ? 'away' :
                                                                member.status === 'busy' ? 'busy' : 'offline'}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {regularMembers.length > 5 && (
                                    <button
                                        onClick={() => setShowAllMembers(!showAllMembers)}
                                        className="w-full mt-2 p-2 text-sm text-primary hover:text-primary/80 transition-colors"
                                    >
                                        {showAllMembers ? 'Show less' : `Show all ${regularMembers.length} members`}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Leave Channel */}
                    {channel.name !== 'general' && !isCreator && (
                        <div className="p-4 border-t border-[#1f1f1f]">
                            <button
                                onClick={() => {
                                    onClose();
                                    onLeaveChannel();
                                }}
                                className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Leave Channel
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChannelInfo;
