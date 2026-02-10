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

    useEffect(() => {
        fetchReplies();
    }, [parentMessage._id]);

    const fetchReplies = async () => {
        try {
            setLoading(true);
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/messages/thread/${parentMessage._id}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                }
            );
            const data = await response.json();
            setReplies(data.replies || []);
        } catch (error) {
            console.error('Error fetching thread replies:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendReply = () => {
        if (replyInput.trim()) {
            onSendReply(replyInput.trim());
            setReplyInput('');
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    useEffect(() => {
        scrollToBottom();
    }, [replies]);

    return (
        <div className="fixed right-0 top-0 h-screen w-[500px] bg-[#0f0f0f] border-l border-[#1f1f1f] flex flex-col shadow-2xl z-50">
            {/* Header */}
            <div className="p-4 border-b border-[#1f1f1f] flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Thread</h3>
                <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-[#1a1a1a] transition-colors text-gray-400 hover:text-white"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Parent Message */}
            <div className="p-4 border-b border-[#1f1f1f] bg-[#141414]">
                <MessageItem
                    message={parentMessage}
                    currentUser={currentUser}
                    onEdit={onEditMessage}
                    onDelete={onDeleteMessage}
                    onReply={() => { }}
                    onReaction={onReaction}
                    onShowThread={() => { }}
                    onShowProfile={onShowProfile}
                />
            </div>

            {/* Replies */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : replies.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <svg className="w-16 h-16 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p className="text-gray-500">No replies yet</p>
                        <p className="text-sm text-gray-600 mt-1">Be the first to reply!</p>
                    </div>
                ) : (
                    <>
                        {replies.map((reply) => (
                            <MessageItem
                                key={reply._id}
                                message={reply}
                                currentUser={currentUser}
                                onEdit={onEditMessage}
                                onDelete={onDeleteMessage}
                                onReply={() => { }}
                                onReaction={onReaction}
                                onShowThread={() => { }}
                                onShowProfile={onShowProfile}
                            />
                        ))}
                        <div ref={repliesEndRef} />
                    </>
                )}
            </div>

            {/* Reply Input */}
            <div className="p-4 border-t border-[#1f1f1f]">
                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        value={replyInput}
                        onChange={(e) => setReplyInput(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendReply();
                            }
                        }}
                        placeholder="Reply to thread..."
                        className="flex-1 px-4 py-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    <button
                        onClick={handleSendReply}
                        disabled={!replyInput.trim()}
                        className="px-6 py-3 rounded-lg bg-gradient-to-r from-primary to-secondary text-white font-medium hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ThreadPanel;
