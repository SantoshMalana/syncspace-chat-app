import { useState, useRef, useEffect } from 'react';
import type { Message } from '../types';

interface MessageActionsProps {
  message: Message;
  currentUserId: string;
  onEdit: () => void;
  onDelete: () => void;
  onReply: () => void;
  onReaction: () => void;
  onReport: () => void;
  onBookmark?: () => void;
  isBookmarked?: boolean;
}

// ── Tooltip wrapper ───────────────────────────────────────────────────────────
const Tip = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="relative group/tip">
    {children}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 bg-[#0a0a0a] border border-[#2a2a2a] text-[11px] text-gray-300 rounded-md whitespace-nowrap pointer-events-none opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 z-50">
      {label}
    </div>
  </div>
);

// ── Action button ─────────────────────────────────────────────────────────────
const ActionBtn = ({
  onClick,
  title,
  active = false,
  activeClass = 'text-primary bg-primary/10',
  danger = false,
  children,
}: {
  onClick: () => void;
  title: string;
  active?: boolean;
  activeClass?: string;
  danger?: boolean;
  children: React.ReactNode;
}) => (
  <Tip label={title}>
    <button
      onClick={onClick}
      className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150 ${
        active
          ? activeClass
          : danger
          ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/10'
          : 'text-gray-500 hover:text-white hover:bg-[#2a2a2a]'
      }`}
    >
      {children}
    </button>
  </Tip>
);

// ── Main component ────────────────────────────────────────────────────────────
const MessageActions = ({
  message,
  currentUserId,
  onEdit,
  onDelete,
  onReply,
  onReaction,
  onReport,
  onBookmark,
  isBookmarked,
}: MessageActionsProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOwn = typeof message.senderId === 'object'
    ? message.senderId._id === currentUserId || message.senderId.id === currentUserId
    : message.senderId === currentUserId;

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showMenu]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      console.error('Failed to copy');
    }
  };

  return (
    <div className="flex items-center gap-0.5 bg-[#141414] border border-[#252525] rounded-xl px-1 py-1 shadow-lg shadow-black/30">

      {/* React */}
      <ActionBtn onClick={onReaction} title="Add reaction">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </ActionBtn>

      {/* Reply in thread */}
      <ActionBtn onClick={onReply} title="Reply in thread">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      </ActionBtn>

      {/* Copy */}
      <ActionBtn
        onClick={handleCopy}
        title={copied ? 'Copied!' : 'Copy text'}
        active={copied}
        activeClass="text-green-400 bg-green-500/10"
      >
        {copied ? (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </ActionBtn>

      {/* Bookmark */}
      {onBookmark && (
        <ActionBtn
          onClick={onBookmark}
          title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
          active={!!isBookmarked}
          activeClass="text-yellow-400 bg-yellow-400/10"
        >
          <svg className="w-3.5 h-3.5" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </ActionBtn>
      )}

      {/* Divider */}
      <div className="w-px h-4 bg-[#252525] mx-0.5" />

      {/* More options (⋯) */}
      <div className="relative" ref={menuRef}>
        <ActionBtn
          onClick={() => setShowMenu(p => !p)}
          title="More options"
          active={showMenu}
          activeClass="text-white bg-[#2a2a2a]"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="5" cy="12" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="19" cy="12" r="1.5" />
          </svg>
        </ActionBtn>

        {/* Dropdown menu */}
        {showMenu && (
          <div className="absolute right-0 top-full mt-2 w-44 bg-[#141414] border border-[#252525] rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50 py-1">

            {/* Own message actions */}
            {isOwn && (
              <>
                <button
                  onClick={() => { onEdit(); setShowMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-[#1e1e1e] hover:text-white transition-colors flex items-center gap-2.5"
                >
                  <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit message
                </button>

                <div className="my-1 border-t border-[#1f1f1f]" />

                <button
                  onClick={() => { onDelete(); setShowMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/8 hover:text-red-300 transition-colors flex items-center gap-2.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete message
                </button>

                <div className="my-1 border-t border-[#1f1f1f]" />
              </>
            )}

            {/* Report — always visible for others' messages */}
            {!isOwn && (
              <button
                onClick={() => { onReport(); setShowMenu(false); }}
                className="w-full px-3 py-2 text-left text-sm text-yellow-500 hover:bg-yellow-500/8 hover:text-yellow-400 transition-colors flex items-center gap-2.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Report message
              </button>
            )}

            {/* Copy (also in menu for convenience) */}
            <button
              onClick={() => { handleCopy(); setShowMenu(false); }}
              className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-[#1e1e1e] hover:text-white transition-colors flex items-center gap-2.5"
            >
              <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy text
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageActions;
