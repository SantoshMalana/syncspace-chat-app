import { useState, useEffect, useRef } from 'react';
import type { User, Message } from '../types';

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceMembers: User[];
    currentWorkspaceId: string;
    onSelectUser: (user: User) => void;
    onSelectMessage?: (message: Message) => void;
}

const SearchModal = ({ 
    isOpen, 
    onClose, 
    workspaceMembers, 
    currentWorkspaceId,
    onSelectUser,
    onSelectMessage 
}: SearchModalProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{
        members: User[];
        messages: Message[];
    }>({
        members: [],
        messages: []
    });
    const [isSearching, setIsSearching] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'members' | 'messages'>('all');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
            setSearchResults({ members: [], messages: [] });
            setActiveTab('all');
        }
    }, [isOpen]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchQuery.trim()) {
                performSearch();
            } else {
                setSearchResults({ members: [], messages: [] });
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, currentWorkspaceId]);

    const performSearch = async () => {
        setIsSearching(true);
        try {
            // Search members locally
            const filteredMembers = workspaceMembers.filter(member =>
                member.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                member.email.toLowerCase().includes(searchQuery.toLowerCase())
            ).slice(0, 5);

            // Search messages via API
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/messages/search?workspaceId=${currentWorkspaceId}&query=${encodeURIComponent(searchQuery)}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                }
            );

            let messages: Message[] = [];
            if (response.ok) {
                const data = await response.json();
                messages = data.messages || [];
            }

            setSearchResults({
                members: filteredMembers,
                messages: messages.slice(0, 10),
            });
        } catch (error) {
            console.error('Search error:', error);
            setSearchResults({
                members: workspaceMembers.filter(member =>
                    member.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    member.email.toLowerCase().includes(searchQuery.toLowerCase())
                ).slice(0, 5),
                messages: [],
            });
        } finally {
            setIsSearching(false);
        }
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    const highlightText = (text: string, query: string) => {
        if (!query.trim()) return text;
        
        const parts = text.split(new RegExp(`(${query})`, 'gi'));
        return parts.map((part, i) => 
            part.toLowerCase() === query.toLowerCase() 
                ? <mark key={i} className="bg-primary/30 text-white">{part}</mark>
                : part
        );
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    const filteredResults = {
        members: activeTab === 'messages' ? [] : searchResults.members,
        messages: activeTab === 'members' ? [] : searchResults.messages,
    };

    const totalResults = filteredResults.members.length + filteredResults.messages.length;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-start justify-center z-50 p-4 pt-20">
            <div className="bg-[#0f0f0f] rounded-2xl w-full max-w-2xl border border-[#1f1f1f] shadow-2xl">
                {/* Search Input */}
                <div className="p-4 border-b border-[#1f1f1f]">
                    <div className="relative">
                        <svg 
                            className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500"
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Search messages and people..."
                            className="w-full pl-12 pr-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                        {isSearching && (
                            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                    </div>
                    
                    {/* Tabs */}
                    <div className="flex gap-2 mt-3">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                activeTab === 'all'
                                    ? 'bg-primary/20 text-primary'
                                    : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
                            }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setActiveTab('members')}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                activeTab === 'members'
                                    ? 'bg-primary/20 text-primary'
                                    : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
                            }`}
                        >
                            People
                        </button>
                        <button
                            onClick={() => setActiveTab('messages')}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                activeTab === 'messages'
                                    ? 'bg-primary/20 text-primary'
                                    : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
                            }`}
                        >
                            Messages
                        </button>
                    </div>
                </div>

                {/* Results */}
                <div className="max-h-[500px] overflow-y-auto">
                    {!searchQuery.trim() ? (
                        <div className="p-8 text-center">
                            <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <p className="text-gray-400 text-sm">Start typing to search messages and people</p>
                            <p className="text-gray-600 text-xs mt-2">Press ESC to close</p>
                        </div>
                    ) : totalResults === 0 && !isSearching ? (
                        <div className="p-8 text-center">
                            <p className="text-gray-400">No results found for "{searchQuery}"</p>
                        </div>
                    ) : (
                        <div className="p-2">
                            {/* Members Results */}
                            {filteredResults.members.length > 0 && (
                                <div className="mb-4">
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
                                        People ({filteredResults.members.length})
                                    </h3>
                                    <div className="space-y-1">
                                        {filteredResults.members.map(member => (
                                            <button
                                                key={member._id || member.id}
                                                onClick={() => {
                                                    onSelectUser(member);
                                                    onClose();
                                                }}
                                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#1a1a1a] transition-colors text-left"
                                            >
                                                <div className="relative">
                                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-white font-semibold">
                                                        {getInitials(member.fullName)}
                                                    </div>
                                                    {member.status === 'online' && (
                                                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-[#0f0f0f] rounded-full" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-white truncate">
                                                        {highlightText(member.fullName, searchQuery)}
                                                    </p>
                                                    <p className="text-xs text-gray-500 truncate">
                                                        {highlightText(member.email, searchQuery)}
                                                    </p>
                                                </div>
                                                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Messages Results */}
                            {filteredResults.messages.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
                                        Messages ({filteredResults.messages.length})
                                    </h3>
                                    <div className="space-y-1">
                                        {filteredResults.messages.map(message => {
                                            const sender = typeof message.senderId === 'object' ? message.senderId : null;
                                            return (
                                                <button
                                                    key={message._id}
                                                    onClick={() => {
                                                        onSelectMessage?.(message);
                                                        onClose();
                                                    }}
                                                    className="w-full flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-[#1a1a1a] transition-colors text-left"
                                                >
                                                    {sender && (
                                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                                                            {getInitials(sender.fullName)}
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <p className="text-sm font-medium text-white">
                                                                {sender ? sender.fullName : 'Unknown'}
                                                            </p>
                                                            <span className="text-xs text-gray-500">
                                                                {new Date(message.createdAt).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-400 truncate">
                                                            {highlightText(message.content, searchQuery)}
                                                        </p>
                                                    </div>
                                                    <svg className="w-5 h-5 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-[#1f1f1f] bg-[#0a0a0a] rounded-b-2xl">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Use ↑↓ to navigate, Enter to select</span>
                        <span>ESC to close</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SearchModal;
