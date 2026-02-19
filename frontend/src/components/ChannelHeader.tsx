import { useState, useRef, useEffect } from 'react';

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

// ── Tooltip ───────────────────────────────────────────────────────────────────
const Tip = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="relative group/tip">
    {children}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#0a0a0a] border border-[#2a2a2a] text-[11px] text-gray-300 rounded-lg whitespace-nowrap pointer-events-none opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 z-50 shadow-lg">
      {label}
    </div>
  </div>
);

// ── Icon button ───────────────────────────────────────────────────────────────
const IconBtn = ({
  onClick,
  title,
  disabled = false,
  variant = 'default',
  active = false,
  children,
}: {
  onClick?: () => void;
  title: string;
  disabled?: boolean;
  variant?: 'default' | 'green' | 'blue' | 'red';
  active?: boolean;
  children: React.ReactNode;
}) => {
  const hoverColor =
    variant === 'green' ? 'hover:text-green-400 hover:bg-green-500/10' :
    variant === 'blue'  ? 'hover:text-blue-400 hover:bg-blue-500/10' :
    variant === 'red'   ? 'hover:text-red-400 hover:bg-red-500/10' :
                          'hover:text-white hover:bg-[#1e1e1e]';

  const activeClass = active ? 'text-white bg-[#1e1e1e]' : 'text-gray-500';

  return (
    <Tip label={title}>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 ${activeClass} ${hoverColor} disabled:opacity-30 disabled:cursor-not-allowed`}
      >
        {children}
      </button>
    </Tip>
  );
};

// ── Divider ───────────────────────────────────────────────────────────────────
const Divider = () => <div className="w-px h-5 bg-[#1f1f1f] mx-0.5" />;

// ── Main ─────────────────────────────────────────────────────────────────────
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
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMoreMenu) return;
    const handle = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showMoreMenu]);

  return (
    <header className="h-14 bg-[#0d0d0d] border-b border-[#1a1a1a] px-5 flex items-center justify-between flex-shrink-0">

      {/* ── Left: Channel name + description ── */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Channel prefix */}
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center">
          {isPrivate ? (
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          ) : (
            <span className="text-gray-400 font-bold text-base leading-none">#</span>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white truncate leading-tight">
              {channelName}
            </h2>
            {memberCount !== undefined && (
              <span className="text-[11px] text-gray-600 flex-shrink-0 hidden sm:block">
                {memberCount} {memberCount === 1 ? 'member' : 'members'}
              </span>
            )}
          </div>
          {description && (
            <p className="text-[11px] text-gray-600 truncate leading-tight max-w-xs">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* ── Right: Actions ── */}
      <div className="flex items-center gap-0.5">

        {/* Call buttons — primary actions, always visible */}
        {onStartGroupCall && (
          <>
            <IconBtn
              onClick={() => onStartGroupCall('voice')}
              disabled={isGroupCallActive}
              title={isGroupCallActive ? 'Call in progress' : 'Voice call'}
              variant="green"
            >
              {isGroupCallActive ? (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </span>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              )}
            </IconBtn>

            <IconBtn
              onClick={() => onStartGroupCall('video')}
              disabled={isGroupCallActive}
              title={isGroupCallActive ? 'Call in progress' : 'Video call'}
              variant="blue"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </IconBtn>

            <Divider />
          </>
        )}

        {/* Search */}
        {onSearch && (
          <IconBtn onClick={onSearch} title="Search  Ctrl+K">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </IconBtn>
        )}

        {/* Members / Add people */}
        {onShowInfo && (
          <IconBtn onClick={onShowInfo} title="Members">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </IconBtn>
        )}

        {isAdmin && onAddPeople && (
          <IconBtn onClick={onAddPeople} title="Add people" variant="green">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </IconBtn>
        )}

        <Divider />

        {/* Bookmarks */}
        {onShowBookmarks && (
          <IconBtn onClick={onShowBookmarks} title="Bookmarks">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </IconBtn>
        )}

        {/* Media & Files */}
        {onShowMediaFiles && (
          <IconBtn onClick={onShowMediaFiles} title="Media & Files">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </IconBtn>
        )}

        {/* More (schedule meeting, start meeting, settings) */}
        {(onScheduleMeeting || onStartMeeting || (isAdmin && onShowSettings)) && (
          <>
            <Divider />
            <div className="relative" ref={moreRef}>
              <IconBtn
                onClick={() => setShowMoreMenu(p => !p)}
                title="More options"
                active={showMoreMenu}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="5" cy="12" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="19" cy="12" r="1.5" />
                </svg>
              </IconBtn>

              {showMoreMenu && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-[#111] border border-[#222] rounded-xl shadow-2xl shadow-black/60 overflow-hidden z-50 py-1">

                  {onScheduleMeeting && (
                    <button
                      onClick={() => { onScheduleMeeting(); setShowMoreMenu(false); }}
                      className="w-full px-3 py-2.5 text-left text-sm text-gray-300 hover:bg-[#1a1a1a] hover:text-white transition-colors flex items-center gap-3"
                    >
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Schedule meeting
                    </button>
                  )}

                  {onStartMeeting && (
                    <button
                      onClick={() => { onStartMeeting(); setShowMoreMenu(false); }}
                      className="w-full px-3 py-2.5 text-left text-sm text-gray-300 hover:bg-[#1a1a1a] hover:text-white transition-colors flex items-center gap-3"
                    >
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Join a meeting
                    </button>
                  )}

                  {isAdmin && onShowSettings && (onScheduleMeeting || onStartMeeting) && (
                    <div className="my-1 border-t border-[#1f1f1f]" />
                  )}

                  {isAdmin && onShowSettings && (
                    <button
                      onClick={() => { onShowSettings(); setShowMoreMenu(false); }}
                      className="w-full px-3 py-2.5 text-left text-sm text-gray-300 hover:bg-[#1a1a1a] hover:text-white transition-colors flex items-center gap-3"
                    >
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Channel settings
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
};

export default ChannelHeader;
