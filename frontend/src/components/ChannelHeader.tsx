interface ChannelHeaderProps {
    channelName: string;
    description?: string;
    isPrivate: boolean;
    memberCount?: number;
    onShowInfo?: () => void;
    onShowSettings?: () => void;
    onSearch?: () => void;
    onAddPeople?: () => void;
    onShowBookmarks?: () => void;
    onShowMediaFiles?: () => void;
    onScheduleMeeting?: () => void;
    onStartMeeting?: () => void;
    onStartGroupCall?: (callType: 'voice' | 'video') => void;
    isAdmin?: boolean;
    isGroupCallActive?: boolean;
}

const ChannelHeader = ({
    channelName,
    description,
    isPrivate,
    memberCount,
    onShowInfo,
    onShowSettings,
    onSearch,
    onAddPeople,
    onShowBookmarks,
    onShowMediaFiles,
    onScheduleMeeting,
    onStartMeeting,
    onStartGroupCall,
    isAdmin = false,
    isGroupCallActive = false,
}: ChannelHeaderProps) => {
    return (
        <header className="h-16 bg-[#0a0a0a] border-b border-[#1f1f1f] px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <span className="text-xl">{isPrivate ? '🔒' : '#'}</span>
                        <span>{channelName}</span>
                    </h2>
                    {description && (
                        <p className="text-xs text-gray-500">{description}</p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                {memberCount !== undefined && (
                    <span className="text-sm text-gray-500 px-3">{memberCount} members</span>
                )}

                {/* Search Button */}
                {onSearch && (
                    <button
                        onClick={onSearch}
                        className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors text-gray-400 hover:text-white"
                        title="Search (Ctrl+K)"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </button>
                )}

                {/* Add People Button - Only for Admins */}
                {onAddPeople && isAdmin && (
                    <button
                        onClick={onAddPeople}
                        className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors text-gray-400 hover:text-white"
                        title="Add people"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                    </button>
                )}

                {/* Group Info Button (Everyone can see) */}
                {onShowInfo && (
                    <button
                        onClick={onShowInfo}
                        className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors text-gray-400 hover:text-white"
                        title="Channel info"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                )}

                {/* Settings Button - Only for Admins */}
                {onShowSettings && isAdmin && (
                    <button
                        onClick={onShowSettings}
                        className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors text-gray-400 hover:text-white"
                        title="Channel settings (Admin)"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>
                )}

                {/* Bookmarks Button */}
                {onShowBookmarks && (
                    <button
                        onClick={onShowBookmarks}
                        className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors text-gray-400 hover:text-white"
                        title="View bookmarked messages"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h6a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                    </button>
                )}

                {/* Media & Files Button */}
                {onShowMediaFiles && (
                    <button
                        onClick={onShowMediaFiles}
                        className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors text-gray-400 hover:text-white"
                        title="View media and files"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </button>
                )}

                {/* Schedule Meeting Button */}
                {onScheduleMeeting && (
                    <button
                        onClick={onScheduleMeeting}
                        className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors text-gray-400 hover:text-white"
                        title="Schedule a meeting"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </button>
                )}

                {/* Group Voice Call Button */}
                {onStartGroupCall && (
                    <button
                        onClick={() => onStartGroupCall('voice')}
                        disabled={isGroupCallActive}
                        className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors text-gray-400 hover:text-green-500 disabled:opacity-40 disabled:cursor-not-allowed"
                        title={isGroupCallActive ? 'Call in progress' : 'Start voice call'}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                    </button>
                )}

                {/* Group Video Call Button */}
                {onStartGroupCall && (
                    <button
                        onClick={() => onStartGroupCall('video')}
                        disabled={isGroupCallActive}
                        className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors text-gray-400 hover:text-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                        title={isGroupCallActive ? 'Call in progress' : 'Start video call'}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </button>
                )}

                {/* Start Meeting Button */}
                {onStartMeeting && (
                    <button
                        onClick={onStartMeeting}
                        className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors text-gray-400 hover:text-white"
                        title="Start a meeting"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                )}
            </div>
        </header>
    );
};

export default ChannelHeader;
