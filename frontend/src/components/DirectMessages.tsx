import { useState, useEffect } from 'react';
import type { User, DirectMessage as DMConversation } from '../types';

interface DirectMessagesProps {
    currentUser: User;
    workspaceId: string;
    onSelectConversation: (userId: string, user: User) => void;
    activeConversationUserId?: string;
    onShowProfile: (user: User) => void;
}

const DirectMessages = ({
    currentUser,
    workspaceId,
    onSelectConversation,
    activeConversationUserId,
    onShowProfile,
}: DirectMessagesProps) => {
    const [conversations, setConversations] = useState<DMConversation[]>([]);
    const [workspaceMembers, setWorkspaceMembers] = useState<User[]>([]);
    const [showNewDM, setShowNewDM] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (workspaceId) {
            fetchConversations();
            fetchWorkspaceMembers();
        }
    }, [workspaceId]);

    const fetchConversations = async () => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/messages/conversations/${workspaceId}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                }
            );
            const data = await response.json();
            setConversations(data.conversations || []);
        } catch (error) {
            console.error('Error fetching conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchWorkspaceMembers = async () => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/workspaces/${workspaceId}/members`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                }
            );
            const data = await response.json();
            const members = data.members
                .map((m: any) => m.userId)
                .filter((user: User) => user._id !== currentUser.id && user._id !== currentUser._id);
            setWorkspaceMembers(members);
        } catch (error) {
            console.error('Error fetching workspace members:', error);
        }
    };

    const getOtherUser = (conversation: DMConversation): User | null => {
        const otherUser = conversation.participants.find(
            (p: any) => p._id !== currentUser.id && p._id !== currentUser._id
        );
        return otherUser || null;
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    const filteredMembers = workspaceMembers.filter(member =>
        member.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-[#1f1f1f] flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-400">Direct Messages</h3>
                <button
                    onClick={() => setShowNewDM(!showNewDM)}
                    className="p-1 rounded hover:bg-[#1a1a1a] transition-colors text-gray-400 hover:text-white"
                    title="New direct message"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </div>

            {/* New DM Search */}
            {showNewDM && (
                <div className="p-4 border-b border-[#1f1f1f] bg-[#141414]">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search members..."
                        className="w-full px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary"
                        autoFocus
                    />
                    {searchTerm && (
                        <div className="mt-2 max-h-60 overflow-y-auto space-y-1">
                            {filteredMembers.map(member => (
                                <button
                                    key={member._id || member.id}
                                    onClick={() => {
                                        onSelectConversation(member._id || member.id || '', member);
                                        setShowNewDM(false);
                                        setSearchTerm('');
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#1a1a1a] transition-colors text-left"
                                >
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-sm font-semibold">
                                        {getInitials(member.fullName)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">{member.fullName}</p>
                                        <p className="text-xs text-gray-500 truncate">{member.email}</p>
                                    </div>
                                    <div className={`w-2 h-2 rounded-full ${member.status === 'online' ? 'bg-green-500' : 'bg-gray-600'}`} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4">
                        <svg className="w-12 h-12 text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p className="text-sm text-gray-500">No direct messages yet</p>
                        <p className="text-xs text-gray-600 mt-1">Click + to start a conversation</p>
                    </div>
                ) : (
                    <div className="space-y-1 p-2">
                        {conversations.map(conversation => {
                            const otherUser = getOtherUser(conversation);
                            if (!otherUser) return null;

                            const unreadCount = conversation.unreadCount?.find(
                                (u: any) => u.userId === currentUser.id || u.userId === currentUser._id
                            )?.count || 0;

                            const isActive = activeConversationUserId === otherUser._id;

                            return (
                                <button
                                    key={conversation._id}
                                    onClick={() => onSelectConversation(otherUser._id || '', otherUser)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${isActive
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white'
                                        }`}
                                >
                                    <div className="relative">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onShowProfile(otherUser);
                                            }}
                                            className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold hover:opacity-80 transition-opacity"
                                        >
                                            {getInitials(otherUser.fullName)}
                                        </button>
                                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#141414] ${otherUser.status === 'online' ? 'bg-green-500' : 'bg-gray-600'
                                            }`} />
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <p className="text-sm font-medium truncate">{otherUser.fullName}</p>
                                        {conversation.lastMessage && (
                                            <p className="text-xs text-gray-500 truncate">
                                                {typeof conversation.lastMessage === 'object'
                                                    ? conversation.lastMessage.content
                                                    : ''}
                                            </p>
                                        )}
                                    </div>
                                    {unreadCount > 0 && (
                                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                            <span className="text-xs font-bold text-white">{unreadCount}</span>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DirectMessages;
