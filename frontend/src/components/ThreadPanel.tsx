import { useState, useEffect, useRef } from 'react';
import type { Message, User } from '../types';
import MessageItem from './MessageItem';

interface ThreadPanelProps {
  parentMessage: Message;
  currentUser: User;
  onClose: () => void;
  onSendReply: (content: string) => void;
  onEditMessage: (messageId: string, content: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onReaction: (messageId: string, emoji: string) => void;
  onShowProfile: (user: User) => void;
}

const ThreadPanel = ({
  parentMessage,
  currentUser,
  onClose,
  onSendReply,
  onEditMessage,
  onDeleteMessage,
  onReaction,
  onShowProfile,
}: ThreadPanelProps) => {
  const [replies, setReplies] = useState<Message[]>([]);
  const [replyInput, setReplyInput] = useState('');
  const [loading, setLoading] = useState(true);
  const repliesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchReplies();
  }, [parentMessage._id]);

  useEffect(() => {
    if (!loading) {
      setTimeout(() => repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [replies, loading]);

  // Focus input on open
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 150);
  }, []);

  const fetchReplies = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/messages/thread/${parentMessage._id}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      const data = await res.json();
      setReplies(data.replies || []);
    } catch (err) {
      console.error('Error fetching thread replies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = () => {
    if (!replyInput.trim()) return;
    onSendReply(replyInput.trim());
    setReplyInput('');
    inputRef.current?.focus();
  };

  const sender = typeof parentMessage.senderId === 'object' ? parentMessage.senderId as User : null;
  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="fixed right-0 top-0 h-screen w-[420px] bg-[#0d0d0d] border-l border-[#1a1a1a] flex flex-col shadow-2xl z-50">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1a1a1a] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white leading-tight">Thread</h3>
            {replies.length > 0 && (
              <p className="text-[11px] text-gray-500 leading-tight">
                {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
              </p>
            )}
          </div>
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

      {/* ── Parent Message ── */}
      <div className="px-5 py-4 border-b border-[#1a1a1a] bg-[#111] flex-shrink-0">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br from-violet-500 to-indigo-600 flex-shrink-0">
            {sender?.avatar
              ? <img src={sender.avatar} className="w-full h-full rounded-xl object-cover" />
              : getInitials(sender?.fullName || 'U')
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-semibold text-white">{sender?.fullName || 'Unknown'}</span>
              <span className="text-[11px] text-gray-600">
                {new Date(parentMessage.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </span>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed break-words">{parentMessage.content}</p>
          </div>
        </div>
      </div>

      {/* ── Reply count divider ── */}
      {!loading && replies.length > 0 && (
        <div className="flex items-center gap-3 px-5 py-2 flex-shrink-0">
          <div className="flex-1 h-px bg-[#1a1a1a]" />
          <span className="text-[11px] text-gray-600 font-medium whitespace-nowrap">
            {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
          </span>
          <div className="flex-1 h-px bg-[#1a1a1a]" />
        </div>
      )}

      {/* ── Replies ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : replies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-14 h-14 rounded-2xl bg-[#1a1a1a] flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-400">No replies yet</p>
            <p className="text-xs text-gray-600 mt-1">Start the conversation below</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {replies.map(reply => (
              <MessageItem
                key={reply._id}
                message={reply}
                currentUser={currentUser}
                onEdit={onEditMessage}
                onDelete={onDeleteMessage}
                onReply={() => {}}
                onReaction={onReaction}
                onShowThread={() => {}}
                onShowProfile={onShowProfile}
              />
            ))}
            <div ref={repliesEndRef} />
          </div>
        )}
      </div>

      {/* ── Reply Input ── */}
      <div className="px-4 py-3 border-t border-[#1a1a1a] flex-shrink-0 bg-[#0d0d0d]">
        <div className="flex items-center gap-2 bg-[#141414] border border-[#222] rounded-xl px-3 py-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
          {/* Current user avatar */}
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
            {getInitials(currentUser.fullName)}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={replyInput}
            onChange={e => setReplyInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); }
            }}
            placeholder="Reply in thread..."
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
          />

          <button
            onClick={handleSendReply}
            disabled={!replyInput.trim()}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-primary text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/80 transition-all flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-gray-700 mt-1.5 text-center">Enter to send · replies visible to channel</p>
      </div>
    </div>
  );
};

export default ThreadPanel;
