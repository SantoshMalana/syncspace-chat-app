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
}

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
}: MessageItemProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(message.content);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const editInputRef = useRef<HTMLInputElement>(null);

    const sender = typeof message.senderId === 'object' ? message.senderId : null;
    const isOwnMessage = typeof message.senderId === 'object'
        ? (message.senderId._id === currentUser.id || message.senderId.id === currentUser.id)
        : message.senderId === currentUser.id;

    useEffect(() => {
        if (isEditing && editInputRef.current) {
            editInputRef.current.focus();
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

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const renderContent = () => {
        if (isEditing) {
            return (
                <div className="flex items-center gap-2">
                    <input
                        ref={editInputRef}
                        type="text"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') handleEditSubmit();
                            if (e.key === 'Escape') handleEditCancel();
                        }}
                        className="flex-1 px-3 py-1 rounded bg-[#1a1a1a] border border-primary text-white text-sm focus:outline-none"
                    />
                    <button
                        onClick={handleEditSubmit}
                        className="px-3 py-1 bg-primary text-white rounded text-sm hover:bg-primary/80"
                    >
                        Save
                    </button>
                    <button
                        onClick={handleEditCancel}
                        className="px-3 py-1 bg-[#2a2a2a] text-gray-300 rounded text-sm hover:bg-[#3a3a3a]"
                    >
                        Cancel
                    </button>
                </div>
            );
        }

        // Safely render mentions without XSS vulnerability
        const renderTextWithMentions = (text: string) => {
            const parts = text.split(/(@\w+)/g);
            return parts.map((part, index) => {
                if (part.startsWith('@')) {
                    return (
                        <span key={index} className="text-primary font-medium">
                            {part}
                        </span>
                    );
                }
                return <span key={index}>{part}</span>;
            });
        };

        return (
            <div>
                <p className="text-sm text-gray-300 break-words">
                    {renderTextWithMentions(message.content)}
                </p>

                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                        {message.attachments.map((attachment, index) => (
                            <div key={index}>
                                {attachment.fileType.startsWith('image/') ? (
                                    <img
                                        src={`${import.meta.env.VITE_API_URL}${attachment.url}`}
                                        alt={attachment.filename}
                                        className="max-w-sm rounded-lg border border-[#2a2a2a]"
                                    />
                                ) : (
                                    <a
                                        href={`${import.meta.env.VITE_API_URL}${attachment.url}`}
                                        download={attachment.filename}
                                        className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] hover:border-primary transition-colors max-w-sm"
                                    >
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                        </svg>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white truncate">{attachment.filename}</p>
                                            <p className="text-xs text-gray-500">{(attachment.fileSize / 1024).toFixed(1)} KB</p>
                                        </div>
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Reactions */}
                {message.reactions && message.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(
                            message.reactions.reduce((acc, reaction) => {
                                acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
                                return acc;
                            }, {} as Record<string, number>)
                        ).map(([emoji, count]) => (
                            <button
                                key={emoji}
                                onClick={() => onReaction(message._id, emoji)}
                                className="flex items-center gap-1 px-2 py-1 bg-[#1a1a1a] hover:bg-[#2a2a2a] rounded-full border border-[#2a2a2a] transition-colors"
                            >
                                <span>{emoji}</span>
                                <span className="text-xs text-gray-400">{count}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Thread Reply Count */}
                {(message.replyCount || 0) > 0 && (
                    <button
                        onClick={() => onShowThread(message)}
                        className="mt-2 flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="flex items-start gap-3 group relative">
            <div className="relative">
                {/* Avatar with Frame */}
                <button
                    onClick={() => sender && typeof sender === 'object' && onShowProfile(sender as User)}
                    className={`
                        w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold flex-shrink-0 hover:opacity-80 transition-opacity
                        ${sender && typeof sender === 'object' && (sender as User).avatarFrame === 'gold' ? 'ring-2 ring-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]' : ''}
                        ${sender && typeof sender === 'object' && (sender as User).avatarFrame === 'neon' ? 'ring-2 ring-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : ''}
                        ${!sender || (typeof sender === 'object' && !(sender as User).avatar) ? 'bg-gradient-to-br from-primary to-secondary' : ''}
                    `}
                >
                    {sender && typeof sender === 'object' && (sender as User).avatar ? (
                        <img src={(sender as User).avatar} alt="" className="w-full h-full rounded-lg object-cover" />
                    ) : (
                        sender ? getInitials(sender.fullName) : '?'
                    )}
                </button>
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                    <button
                        onClick={() => sender && typeof sender === 'object' && onShowProfile(sender as User)}
                        className="font-semibold text-sm hover:underline"
                    >
                        {sender?.fullName || 'Unknown'}
                    </button>
                    <span className="text-xs text-gray-500">{formatTime(message.createdAt)}</span>
                    {message.isEdited && <span className="text-xs text-gray-600 italic">(edited)</span>}

                    {/* Read Status Indicators (Ticks) */}
                    {isOwnMessage && (
                        <span className="ml-1" title={message.readBy && message.readBy.length > 0 ? "Read" : "Sent"}>
                            {message.readBy && message.readBy.length > 0 ? (
                                // Blue Double Tick (Read)
                                <div className="flex -space-x-1">
                                    <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            ) : (
                                // Single Grey Tick (Sent/Delivered)
                                <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            )}
                        </span>
                    )}
                </div>
                {renderContent()}
            </div>

            {/* Message Actions */}
            <MessageActions
                message={message}
                currentUserId={currentUser.id || currentUser._id || ''}
                onEdit={() => setIsEditing(true)}
                onDelete={() => onDelete(message._id)}
                onReply={() => onReply(message)}
                onReaction={() => setShowEmojiPicker(!showEmojiPicker)}
                onReport={() => onReport(message._id)}
            />

            {showEmojiPicker && (
                <div className="absolute right-0 top-8 z-50">
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
