import { useState, useEffect, useRef } from 'react';
import type { Message, User } from '../types';
import MessageActions from './MessageActions';
import EmojiPickerComponent from './EmojiPickerComponent';

interface MessageItemProps {
  message: Message;
  currentUser: User;
  onEdit: (messageId: string, newContent: string) => void;
  onDelete: (messageId: string) => void;
  onReply: (message: Message) => void;
  onReaction: (messageId: string, emoji: string) => void;
  onShowThread: (message: Message) => void;
  onShowProfile: (user: User) => void;
  onReport: (messageId: string) => void;
  onBookmark?: () => void;
  isBookmarked?: boolean;
}

// ── Tick Icons ────────────────────────────────────────────────────────────────

// Single grey tick — message sent
const SingleTick = () => (
  <svg width="16" height="11" viewBox="0 0 16 11" fill="none" className="inline-block">
    <path
      d="M1 5.5L5.5 10L15 1"
      stroke="#6b7280"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Double blue tick — message read
const DoubleTick = () => (
  <svg width="20" height="11" viewBox="0 0 20 11" fill="none" className="inline-block">
    <path
      d="M1 5.5L5.5 10L15 1"
      stroke="#3b82f6"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6 5.5L10.5 10L20 1"
      stroke="#3b82f6"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ── Helpers ───────────────────────────────────────────────────────────────────

const getInitials = (name: string) => {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const formatFullDate = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  if (date.toDateString() === today.toDateString()) return `Today at ${time}`;
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday at ${time}`;
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ── File Icon by type ─────────────────────────────────────────────────────────
const FileIcon = ({ type }: { type: string }) => {
  const isDoc = type.includes('word') || type.includes('document');
  const isPdf = type.includes('pdf');
  const isZip = type.includes('zip') || type.includes('archive');
  const isVideo = type.includes('video');
  const isAudio = type.includes('audio');

  const color = isPdf ? '#ef4444' : isDoc ? '#3b82f6' : isZip ? '#f59e0b' : isVideo ? '#8b5cf6' : isAudio ? '#10b981' : '#6b7280';
  const label = isPdf ? 'PDF' : isDoc ? 'DOC' : isZip ? 'ZIP' : isVideo ? 'VID' : isAudio ? 'AUD' : 'FILE';

  return (
    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}20`, border: `1px solid ${color}40` }}>
      <span className="text-[10px] font-bold" style={{ color }}>{label}</span>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

const MessageItem = ({
  message,
  currentUser,
  onEdit,
  onDelete,
  onReply,
  onReaction,
  onShowThread,
  onShowProfile,
  onReport,
  onBookmark,
  isBookmarked,
}: MessageItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  const sender = typeof message.senderId === 'object' ? message.senderId as User : null;
  const isOwnMessage = typeof message.senderId === 'object'
    ? (message.senderId._id === currentUser.id || message.senderId._id === currentUser._id)
    : message.senderId === currentUser.id || message.senderId === currentUser._id;

  // Check if message has been read by someone other than sender
  const isRead = message.readBy && message.readBy.length > 0;

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.selectionStart = editInputRef.current.value.length;
    }
  }, [isEditing]);

  const handleEditSubmit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit(message._id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  // ── Render text with @mentions highlighted ────────────────────────────────
  const renderText = (text: string) => {
    const parts = text.split(/(@[\w\s]+)/g);
    return parts.map((part, i) =>
      part.startsWith('@') ? (
        <span key={i} className="text-blue-400 font-medium bg-blue-400/10 rounded px-0.5">
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  // ── Group reactions by emoji ──────────────────────────────────────────────
  const groupedReactions = message.reactions?.reduce((acc: Record<string, { count: number; users: string[] }>, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = { count: 0, users: [] };
    acc[r.emoji].count++;
    if (r.userId) acc[r.emoji].users.push(typeof r.userId === 'string' ? r.userId : r.userId._id || '');
    return acc;
  }, {}) || {};

  const hasReacted = (emoji: string) => {
    const uid = currentUser._id || currentUser.id;
    return groupedReactions[emoji]?.users.includes(uid || '');
  };

  return (
    <div
      className={`group flex items-start gap-3 px-4 py-1.5 rounded-xl transition-colors duration-100 relative ${isHovered ? 'bg-[#161616]' : 'bg-transparent'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ── Avatar ─────────────────────────────────────────────────────────── */}
      <button
        onClick={() => sender && onShowProfile(sender)}
        className="flex-shrink-0 mt-0.5 focus:outline-none"
        tabIndex={-1}
      >
        <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br from-violet-500 to-indigo-600 hover:opacity-85 transition-opacity">
          {sender?.avatar ? (
            <img src={sender.avatar} alt={sender.fullName} className="w-full h-full object-cover" />
          ) : (
            getInitials(sender?.fullName || 'U')
          )}
        </div>
      </button>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">

        {/* Header row */}
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <button
            onClick={() => sender && onShowProfile(sender)}
            className="text-sm font-semibold text-white hover:underline leading-tight focus:outline-none"
          >
            {sender?.fullName || 'Unknown'}
          </button>

          <span
            className="text-[11px] text-gray-500 hover:text-gray-400 transition-colors cursor-default leading-tight"
            title={formatFullDate(message.createdAt)}
          >
            {formatTime(message.createdAt)}
          </span>

          {message.isEdited && (
            <span className="text-[10px] text-gray-600 italic leading-tight">(edited)</span>
          )}

          {/* ── Read ticks — only on own messages ── */}
          {isOwnMessage && (
            <span title={isRead ? 'Read' : 'Sent'} className="flex items-center">
              {isRead ? <DoubleTick /> : <SingleTick />}
            </span>
          )}

          {/* Bookmark indicator */}
          {isBookmarked && (
            <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
            </svg>
          )}
        </div>

        {/* Message body */}
        {isEditing ? (
          <div className="mt-1">
            <textarea
              ref={editInputRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSubmit(); }
                if (e.key === 'Escape') handleEditCancel();
              }}
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-[#1a1a1a] border border-primary/50 text-white text-sm focus:outline-none focus:border-primary resize-none"
            />
            <div className="flex items-center gap-2 mt-1.5">
              <button
                onClick={handleEditSubmit}
                className="px-3 py-1 text-xs bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors font-medium"
              >
                Save
              </button>
              <button
                onClick={handleEditCancel}
                className="px-3 py-1 text-xs bg-[#2a2a2a] text-gray-300 rounded-lg hover:bg-[#333] transition-colors"
              >
                Cancel
              </button>
              <span className="text-[10px] text-gray-600">Enter to save · Esc to cancel</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-300 leading-relaxed break-words whitespace-pre-wrap">
            {renderText(message.content)}
          </p>
        )}

        {/* ── Attachments ─────────────────────────────────────────────────── */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 flex flex-col gap-2">
            {message.attachments.map((attachment, i) => {
              const isImage = attachment.fileType?.startsWith('image/');
              const isVideo = attachment.fileType?.startsWith('video/');
              const url = `${import.meta.env.VITE_API_URL}${attachment.url}`;

              if (isImage) return (
                <div key={i} className="relative group/img inline-block">
                  <img
                    src={url}
                    alt={attachment.filename}
                    className="max-w-xs max-h-64 rounded-xl border border-[#2a2a2a] object-cover cursor-pointer hover:opacity-95 transition-opacity"
                    onClick={() => window.open(url, '_blank')}
                  />
                </div>
              );

              if (isVideo) return (
                <video
                  key={i}
                  src={url}
                  controls
                  className="max-w-sm rounded-xl border border-[#2a2a2a]"
                />
              );

              return (
                <a
                  key={i}
                  href={url}
                  download={attachment.filename}
                  className="flex items-center gap-3 px-3 py-2.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] hover:border-[#333] rounded-xl transition-all max-w-xs group/file"
                >
                  <FileIcon type={attachment.fileType || ''} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{attachment.filename}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{formatFileSize(attachment.fileSize || 0)}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-500 group-hover/file:text-gray-300 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </a>
              );
            })}
          </div>
        )}

        {/* ── Reactions ───────────────────────────────────────────────────── */}
        {Object.keys(groupedReactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(groupedReactions).map(([emoji, { count }]) => {
              const reacted = hasReacted(emoji);
              return (
                <button
                  key={emoji}
                  onClick={() => onReaction(message._id, emoji)}
                  title={`${count} ${count === 1 ? 'reaction' : 'reactions'}`}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all ${
                    reacted
                      ? 'bg-primary/15 border-primary/40 text-primary'
                      : 'bg-[#1e1e1e] border-[#2a2a2a] text-gray-300 hover:border-[#3a3a3a] hover:bg-[#252525]'
                  }`}
                >
                  <span className="text-sm leading-none">{emoji}</span>
                  <span className="font-medium leading-none">{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Thread reply count ───────────────────────────────────────────── */}
        {(message.replyCount || 0) > 0 && (
          <button
            onClick={() => onShowThread(message)}
            className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors group/thread"
          >
            <div className="flex -space-x-1">
              <div className="w-4 h-4 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
            <span className="font-medium group-hover/thread:underline">
              {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
            </span>
            <svg className="w-3 h-3 opacity-0 group-hover/thread:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Hover Actions ──────────────────────────────────────────────────── */}
      <div className={`absolute right-3 top-1 transition-all duration-150 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'}`}>
        <MessageActions
          message={message}
          currentUserId={currentUser.id || currentUser._id || ''}
          onEdit={() => setIsEditing(true)}
          onDelete={() => onDelete(message._id)}
          onReply={() => onReply(message)}
          onReaction={() => setShowEmojiPicker(!showEmojiPicker)}
          onReport={() => onReport(message._id)}
          onBookmark={onBookmark}
          isBookmarked={isBookmarked}
        />
      </div>

      {/* ── Emoji Picker ────────────────────────────────────────────────────── */}
      {showEmojiPicker && (
        <div className="absolute right-0 top-10 z-50">
          <EmojiPickerComponent
            onEmojiSelect={(emoji) => {
              onReaction(message._id, emoji);
              setShowEmojiPicker(false);
            }}
            onClose={() => setShowEmojiPicker(false)}
          />
        </div>
      )}
    </div>
  );
};

export default MessageItem;
