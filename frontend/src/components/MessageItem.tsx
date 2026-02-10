import { useState, useEffect, useRef } from 'react';
import type { Message, User } from '../types';
import MessageActions from './MessageActions';

interface MessageItemProps {
    message: Message;
    currentUser: User;
    onEdit: (messageId: string, newContent: string) => void;
    onDelete: (messageId: string) => void;
    onReply: (message: Message) => void;
    onReaction: (messageId: string, emoji: string) => void;
    onShowThread: (message: Message) => void;
    onShowProfile: (user: User) => void;
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
}: MessageItemProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(message.content);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const editInputRef = useRef<HTMLInputElement>(null);

    const sender = typeof message.senderId === 'object' ? message.senderId : null;

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

        // Highlight mentions
        const contentWithMentions = message.content.replace(
            /@(\w+)/g,
            '<span class="text-primary font-medium">@$1</span>'
        );

        return (
            <div>
                <p
                    className="text-sm text-gray-300 break-words"
                    dangerouslySetInnerHTML={{ __html: contentWithMentions }}
                />

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
            <button
                onClick={() => sender && typeof sender === 'object' && onShowProfile(sender as User)}
                className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold flex-shrink-0 hover:opacity-80 transition-opacity"
            >
                {sender ? getInitials(sender.fullName) : '?'}
            </button>
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
            />
        </div>
    );
};

export default MessageItem;
