import React, { useMemo } from 'react';
import { format } from 'date-fns';
import type { Message } from '../types';

interface BookmarksPanelProps {
    messages: Message[];
    bookmarkedMessageIds: Set<string>;
    onRemoveBookmark: (messageId: string) => void;
    onClose: () => void;
}

export const BookmarksPanel: React.FC<BookmarksPanelProps> = ({
    messages,
    bookmarkedMessageIds,
    onRemoveBookmark,
    onClose,
}) => {
    const bookmarkedMessages = useMemo(() => {
        return messages.filter(msg => bookmarkedMessageIds.has(msg._id));
    }, [messages, bookmarkedMessageIds]);

    const formatBookmarkTime = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return `Today at ${format(date, 'h:mm a')}`;
        } else if (date.toDateString() === yesterday.toDateString()) {
            return `Yesterday at ${format(date, 'h:mm a')}`;
        } else {
            return format(date, 'MMM d, yyyy \'at\' h:mm a');
        }
    };

    return (
        <div className="fixed inset-y-0 left-0 right-0 bg-black/50 z-40 flex" onClick={onClose}>
            <div
                className="bg-[#0f0f0f] border-l border-gray-700 w-96 ml-auto h-full flex flex-col overflow-hidden shadow-lg"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="border-b border-gray-700 p-4 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M5 5a2 2 0 012-2h6a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                        <h2 className="text-lg font-semibold text-white">Bookmarks</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors p-1"
                        title="Close bookmarks"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto">
                    {bookmarkedMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
                            <svg className="w-12 h-12 mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h6a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                            <p className="text-center">No bookmarked messages yet</p>
                            <p className="text-xs text-gray-600 mt-1">Save messages by clicking the bookmark icon</p>
                        </div>
                    ) : (
                        <div className="p-3 space-y-3">
                            {bookmarkedMessages.map(message => (
                                <div
                                    key={message._id}
                                    className="bg-[#1a1a1a] rounded-lg p-3 border border-gray-700 hover:border-yellow-500/50 transition-colors group"
                                >
                                    {/* Sender Info */}
                                    <div className="flex items-center gap-2 mb-2">
                                        {typeof message.senderId === 'object' && message.senderId?.avatar && (
                                            <img
                                                src={message.senderId.avatar}
                                                alt={typeof message.senderId === 'object' ? message.senderId.fullName : 'Unknown'}
                                                className="w-6 h-6 rounded-full"
                                            />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white truncate">
                                                {typeof message.senderId === 'object' ? message.senderId.fullName : message.senderId}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => onRemoveBookmark(message._id)}
                                            className="text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                                            title="Remove bookmark"
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Message Content */}
                                    <p className="text-sm text-gray-300 mb-2 break-words">{message.content}</p>

                                    {/* Attachments Preview */}
                                    {message.attachments && message.attachments.length > 0 && (
                                        <div className="mb-2 space-y-1">
                                            {message.attachments.map((attachment, idx) => (
                                                <div key={idx} className="flex items-center gap-2 text-xs text-gray-400">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                    </svg>
                                                    <span className="truncate">{attachment.filename || attachment.url}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Timestamp */}
                                    <p className="text-xs text-gray-500">{formatBookmarkTime(message.createdAt)}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {bookmarkedMessages.length > 0 && (
                    <div className="border-t border-gray-700 p-3 text-xs text-gray-500 text-center flex-shrink-0">
                        {bookmarkedMessages.length} bookmarked {bookmarkedMessages.length === 1 ? 'message' : 'messages'}
                    </div>
                )}
            </div>
        </div>
    );
};
