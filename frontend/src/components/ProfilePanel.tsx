import type { User } from '../types';

interface ProfilePanelProps {
    user: User;
    currentUser: User;
    onClose: () => void;
    onMessage: (userId: string) => void;
}

const ProfilePanel = ({ user, currentUser, onClose, onMessage }: ProfilePanelProps) => {
    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    const getLocalTime = () => {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getAvatarUrl = (avatar: string) => {
        if (avatar.startsWith('http')) return avatar;
        return `${import.meta.env.VITE_API_URL}${avatar}`;
    };

    const copyEmail = () => {
        navigator.clipboard.writeText(user.email);
        alert('Email copied to clipboard!');
    };

    return (
        <div className="fixed right-0 top-0 h-screen w-[380px] bg-[#0f0f0f] border-l border-[#1f1f1f] flex flex-col shadow-2xl z-50">
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-[#1f1f1f]">
                <h3 className="text-lg font-semibold text-white">Profile</h3>
                <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-[#1a1a1a] transition-colors text-gray-400 hover:text-white"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* Avatar & Status */}
                <div className="p-6 flex flex-col items-center border-b border-[#1f1f1f]">
                    <div className="relative mb-4">
                        <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                            {user.avatar ? (
                                <img src={getAvatarUrl(user.avatar)} alt={user.fullName} className="w-full h-full object-cover rounded-2xl" />
                            ) : (
                                getInitials(user.fullName)
                            )}
                        </div>
                        <div className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 border-[#0f0f0f] ${user.status === 'online' ? 'bg-green-500' : 'bg-gray-500'}`} />
                    </div>
                    
                    <h2 className="text-2xl font-bold text-white mb-2 text-center">{user.fullName}</h2>
                    
                    {/* Email Badge - Prominent Display */}
                    <div className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] mb-3">
                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm text-gray-300 font-mono">{user.email}</span>
                        <button
                            onClick={copyEmail}
                            className="p-1 hover:bg-[#2a2a2a] rounded transition-colors"
                            title="Copy email"
                        >
                            <svg className="w-4 h-4 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex items-center gap-2 text-gray-400">
                        <div className={`w-2 h-2 rounded-full ${user.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                        <span className="text-sm capitalize">{user.status || 'offline'}</span>
                    </div>
                </div>

                {/* Actions */}
                {currentUser.id !== user.id && currentUser._id !== user._id && (
                    <div className="p-4 border-b border-[#1f1f1f]">
                        <button
                            onClick={() => onMessage(user._id || user.id)}
                            className="w-full py-3 px-4 bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:shadow-primary/20 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            Send Message
                        </button>
                    </div>
                )}

                {/* Details */}
                <div className="p-6 space-y-6">
                    <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Contact Information</h4>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3 p-3 bg-[#1a1a1a] rounded-lg">
                                <div className="p-2 bg-[#0f0f0f] rounded-lg">
                                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-500 mb-1">Email Address</p>
                                    <a 
                                        href={`mailto:${user.email}`} 
                                        className="text-sm text-white hover:text-primary transition-colors break-all"
                                    >
                                        {user.email}
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Local Time</h4>
                        <div className="flex items-center gap-3 p-3 bg-[#1a1a1a] rounded-lg">
                            <div className="p-2 bg-[#0f0f0f] rounded-lg">
                                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Current Time</p>
                                <p className="text-sm text-white font-medium">{getLocalTime()}</p>
                            </div>
                        </div>
                    </div>

                    {user.statusMessage && (
                        <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Status Message</h4>
                            <div className="p-3 bg-[#1a1a1a] rounded-lg border-l-4 border-primary">
                                <p className="text-sm text-gray-300 italic">"{user.statusMessage}"</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfilePanel;