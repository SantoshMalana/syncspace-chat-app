import { useState } from 'react';
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
    const [copyFeedback, setCopyFeedback] = useState(false);
    const isOwnMessage = typeof message.senderId === 'object'
        ? message.senderId._id === currentUserId || message.senderId.id === currentUserId
        : message.senderId === currentUserId;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(message.content);
            setCopyFeedback(true);
            setTimeout(() => setCopyFeedback(false), 1500);
        } catch {
            console.error('Failed to copy message');
        }
    };

    return (
        <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-1 shadow-lg">
                {/* Emoji Reaction */}
                <button
                    onClick={onReaction}
                    className="p-1.5 rounded hover:bg-[#2a2a2a] transition-colors text-gray-400 hover:text-white"
                    title="Add reaction"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>

                {/* Reply in Thread */}
                <button
                    onClick={onReply}
                    className="p-1.5 rounded hover:bg-[#2a2a2a] transition-colors text-gray-400 hover:text-white"
                    title="Reply in thread"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                </button>

                {/* Copy Message */}
                <button
                    onClick={handleCopy}
                    className={`p-1.5 rounded transition-colors ${
                        copyFeedback
                            ? 'bg-green-500 text-white'
                            : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                    }`}
                    title="Copy message"
                >
                    {copyFeedback ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    )}
                </button>

                {/* Bookmark Button */}
                {onBookmark && (
                    <button
                        onClick={onBookmark}
                        className={`p-1.5 rounded transition-colors ${
                            isBookmarked
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                        }`}
                        title={isBookmarked ? 'Remove bookmark' : 'Bookmark message'}
                    >
                        <svg className="w-4 h-4" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h6a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                    </button>
                )}

                {/* More Options (Edit/Delete/Report) */}
                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-1.5 rounded hover:bg-[#2a2a2a] transition-colors text-gray-400 hover:text-white"
                        title="More options"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                    </button>

                    {showMenu && (
                        <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl overflow-hidden z-10 min-w-[140px]">
                            {isOwnMessage && (
                                <>
                                    <button
                                        onClick={() => {
                                            onEdit();
                                            setShowMenu(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-[#2a2a2a] transition-colors flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => {
                                            onDelete();
                                            setShowMenu(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-[#2a2a2a] transition-colors flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Delete
                                    </button>
                                </>
                            )}
                            <button
                                onClick={() => {
                                    onReport();
                                    setShowMenu(false);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-yellow-500 hover:bg-[#2a2a2a] transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                Report
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MessageActions;
