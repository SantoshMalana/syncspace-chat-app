import { useState, useEffect, useRef, useCallback } from 'react';
import type { User, Message } from '../types';

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceMembers: User[];
    currentWorkspaceId: string;
    onSelectUser: (user: User) => void;
    onSelectMessage?: (message: Message) => void;
}

type Tab = 'all' | 'people' | 'messages';

const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const Highlight = ({ text, query }: { text: string; query: string }) => {
    if (!query.trim()) return <>{text}</>;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === query.toLowerCase()
                    ? <mark key={i} className="bg-primary/25 text-primary rounded-sm px-0.5">{part}</mark>
                    : <span key={i}>{part}</span>
            )}
        </>
    );
};

const SearchModal = ({
    isOpen,
    onClose,
    workspaceMembers,
    currentWorkspaceId,
    onSelectUser,
    onSelectMessage,
}: SearchModalProps) => {
    const [query, setQuery] = useState('');
    const [tab, setTab] = useState<Tab>('all');
    const [members, setMembers] = useState<User[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Reset on close
    useEffect(() => {
        if (!isOpen) {
            setQuery('');
            setMembers([]);
            setMessages([]);
            setTab('all');
            setActiveIndex(0);
        } else {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Debounced search
    useEffect(() => {
        if (!query.trim()) {
            setMembers([]);
            setMessages([]);
            return;
        }
        const id = setTimeout(performSearch, 280);
        return () => clearTimeout(id);
    }, [query, currentWorkspaceId]);

    // Reset active index on results change
    useEffect(() => { setActiveIndex(0); }, [members, messages, tab]);

    const performSearch = async () => {
        setLoading(true);
        try {
            const filteredMembers = workspaceMembers
                .filter(m =>
                    m.fullName.toLowerCase().includes(query.toLowerCase()) ||
                    m.email.toLowerCase().includes(query.toLowerCase())
                )
                .slice(0, 6);

            const res = await fetch(
                `${import.meta.env.VITE_API_URL}/api/messages/search?workspaceId=${currentWorkspaceId}&query=${encodeURIComponent(query)}`,
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );

            let msgs: Message[] = [];
            if (res.ok) {
                const data = await res.json();
                msgs = (data.messages || []).slice(0, 10);
            }

            setMembers(filteredMembers);
            setMessages(msgs);
        } catch {
            setMembers(
                workspaceMembers
                    .filter(m => m.fullName.toLowerCase().includes(query.toLowerCase()))
                    .slice(0, 6)
            );
            setMessages([]);
        } finally {
            setLoading(false);
        }
    };

    // Build flat list for keyboard nav
    const visibleMembers = tab === 'messages' ? [] : members;
    const visibleMessages = tab === 'people' ? [] : messages;
    const totalItems = visibleMembers.length + visibleMessages.length;

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') { onClose(); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, totalItems - 1)); }
        if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
        if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex < visibleMembers.length) {
                onSelectUser(visibleMembers[activeIndex]);
                onClose();
            } else {
                const msgIdx = activeIndex - visibleMembers.length;
                if (visibleMessages[msgIdx]) {
                    onSelectMessage?.(visibleMessages[msgIdx]);
                    onClose();
                }
            }
        }
    };

    if (!isOpen) return null;

    const isEmpty = !query.trim();
    const noResults = query.trim() && !loading && totalItems === 0;

    return (
        <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-start justify-center z-50 pt-[15vh] px-4"
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="w-full max-w-xl bg-[#0d0d0d] rounded-2xl border border-[#1a1a1a] shadow-2xl shadow-black/60 overflow-hidden">

                {/* ── Search input ── */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#1a1a1a]">
                    {loading ? (
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    ) : (
                        <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    )}
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search people and messages..."
                        className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
                    />
                    {query && (
                        <button onClick={() => setQuery('')} className="text-gray-600 hover:text-gray-400 transition-colors flex-shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                    <kbd className="hidden sm:flex items-center px-1.5 py-0.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-[10px] text-gray-600 flex-shrink-0">
                        ESC
                    </kbd>
                </div>

                {/* ── Tabs (only when results exist) ── */}
                {!isEmpty && (members.length > 0 || messages.length > 0) && (
                    <div className="flex gap-1 px-3 py-2 border-b border-[#1a1a1a]">
                        {([
                            { id: 'all', label: 'All', count: members.length + messages.length },
                            { id: 'people', label: 'People', count: members.length },
                            { id: 'messages', label: 'Messages', count: messages.length },
                        ] as { id: Tab; label: string; count: number }[]).map(t => (
                            <button
                                key={t.id}
                                onClick={() => setTab(t.id)}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${tab === t.id
                                        ? 'bg-primary/15 text-primary'
                                        : 'text-gray-500 hover:text-gray-300 hover:bg-[#1a1a1a]'
                                    }`}
                            >
                                {t.label}
                                {t.count > 0 && (
                                    <span className={`px-1 rounded text-[10px] ${tab === t.id ? 'bg-primary/20 text-primary' : 'bg-[#1a1a1a] text-gray-600'}`}>
                                        {t.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {/* ── Results ── */}
                <div ref={listRef} className="max-h-[420px] overflow-y-auto">

                    {/* Empty state */}
                    {isEmpty && (
                        <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                            <div className="w-12 h-12 rounded-2xl bg-[#1a1a1a] flex items-center justify-center mb-3">
                                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <p className="text-sm text-gray-500">Search people and messages</p>
                            <p className="text-xs text-gray-700 mt-1">Type to get started</p>
                        </div>
                    )}

                    {/* No results */}
                    {noResults && (
                        <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                            <p className="text-sm text-gray-500">No results for <span className="text-white">"{query}"</span></p>
                            <p className="text-xs text-gray-700 mt-1">Try a different search term</p>
                        </div>
                    )}

                    {/* Results list */}
                    {!isEmpty && !noResults && (
                        <div className="py-2">

                            {/* People */}
                            {visibleMembers.length > 0 && (
                                <div className="mb-1">
                                    <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest px-4 py-1.5">
                                        People
                                    </p>
                                    {visibleMembers.map((member, i) => {
                                        const isActive = activeIndex === i;
                                        return (
                                            <button
                                                key={member._id || member.id}
                                                onClick={() => { onSelectUser(member); onClose(); }}
                                                onMouseEnter={() => setActiveIndex(i)}
                                                className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${isActive ? 'bg-[#161616]' : 'hover:bg-[#111]'}`}
                                            >
                                                <div className="relative flex-shrink-0">
                                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500/40 to-indigo-600/40 flex items-center justify-center text-white text-xs font-bold">
                                                        {member.avatar && !member.avatar.startsWith('/')
                                                            ? <span className="text-base">{member.avatar}</span>
                                                            : getInitials(member.fullName)
                                                        }
                                                    </div>
                                                    {member.status === 'online' && (
                                                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-[#0d0d0d] rounded-full" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-white truncate">
                                                        <Highlight text={member.fullName} query={query} />
                                                    </p>
                                                    <p className="text-xs text-gray-600 truncate">
                                                        <Highlight text={member.email} query={query} />
                                                    </p>
                                                </div>
                                                <div className={`flex items-center gap-1 text-[10px] text-gray-600 flex-shrink-0 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                                                    <kbd className="px-1.5 py-0.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-[10px]">↵</kbd>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Divider between sections */}
                            {visibleMembers.length > 0 && visibleMessages.length > 0 && (
                                <div className="mx-4 my-1 border-t border-[#1a1a1a]" />
                            )}

                            {/* Messages */}
                            {visibleMessages.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest px-4 py-1.5">
                                        Messages
                                    </p>
                                    {visibleMessages.map((message, i) => {
                                        const idx = visibleMembers.length + i;
                                        const isActive = activeIndex === idx;
                                        const sender = typeof message.senderId === 'object' ? message.senderId as User : null;
                                        const date = new Date(message.createdAt);
                                        const isToday = date.toDateString() === new Date().toDateString();
                                        const timeStr = isToday
                                            ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                                            : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                                        return (
                                            <button
                                                key={message._id}
                                                onClick={() => { onSelectMessage?.(message); onClose(); }}
                                                onMouseEnter={() => setActiveIndex(idx)}
                                                className={`w-full flex items-start gap-3 px-4 py-2.5 transition-colors text-left ${isActive ? 'bg-[#161616]' : 'hover:bg-[#111]'}`}
                                            >
                                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500/30 to-indigo-600/30 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                                                    {getInitials(sender?.fullName || 'U')}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="text-xs font-semibold text-white">{sender?.fullName || 'Unknown'}</span>
                                                        <span className="text-[10px] text-gray-600">{timeStr}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-400 truncate leading-relaxed">
                                                        <Highlight text={message.content} query={query} />
                                                    </p>
                                                </div>
                                                <div className={`flex-shrink-0 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                                                    <kbd className="px-1.5 py-0.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-[10px] text-gray-600">↵</kbd>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#1a1a1a] bg-[#0a0a0a]">
                    <div className="flex items-center gap-3 text-[10px] text-gray-700">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1 py-0.5 bg-[#1a1a1a] border border-[#222] rounded">↑↓</kbd>
                            navigate
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1 py-0.5 bg-[#1a1a1a] border border-[#222] rounded">↵</kbd>
                            select
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1 py-0.5 bg-[#1a1a1a] border border-[#222] rounded">ESC</kbd>
                            close
                        </span>
                    </div>
                    {totalItems > 0 && (
                        <span className="text-[10px] text-gray-700">{totalItems} result{totalItems !== 1 ? 's' : ''}</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SearchModal;
