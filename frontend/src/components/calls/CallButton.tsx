import React, { useState, useRef, useEffect } from 'react';

interface CallButtonProps {
  recipientId: string;
  recipientName: string;
  onInitiateCall: (recipientId: string, isVideo: boolean) => Promise<void>;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const CallButton: React.FC<CallButtonProps> = ({
  recipientId, recipientName, onInitiateCall,
  disabled = false, size = 'medium',
}) => {
  const [isInitiating, setIsInitiating] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!showOptions) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowOptions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showOptions]);

  const handleCall = async (isVideo: boolean) => {
    if (disabled || isInitiating) return;
    setIsInitiating(true);
    setShowOptions(false);
    try {
      await onInitiateCall(recipientId, isVideo);
    } catch (err) {
      console.error('Failed to initiate call:', err);
    } finally {
      setIsInitiating(false);
    }
  };

  const sz = size === 'small' ? 28 : size === 'large' ? 44 : 34;
  const iconSz = size === 'small' ? 13 : size === 'large' ? 18 : 15;

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => !disabled && !isInitiating && setShowOptions(v => !v)}
        disabled={disabled || isInitiating}
        title={`Call ${recipientName}`}
        style={{
          width: sz, height: sz,
          borderRadius: '50%',
          border: 'none',
          background: showOptions
            ? 'rgba(124,58,237,.35)'
            : 'rgba(124,58,237,.15)',
          color: '#a78bfa',
          cursor: disabled || isInitiating ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .15s ease',
          opacity: disabled ? 0.4 : 1,
          flexShrink: 0,
        }}
        onMouseEnter={e => {
          if (!disabled && !isInitiating)
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(124,58,237,.28)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = showOptions
            ? 'rgba(124,58,237,.35)' : 'rgba(124,58,237,.15)';
        }}
      >
        {isInitiating ? (
          <svg width={iconSz} height={iconSz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            style={{ animation: 'cbSpin 1s linear infinite' }}>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        ) : (
          <svg width={iconSz} height={iconSz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        )}
      </button>

      {showOptions && !isInitiating && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          background: '#111', border: '1px solid #222',
          borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 8px 28px rgba(0,0,0,.6)',
          zIndex: 1000, minWidth: 148,
          animation: 'cbSlide .18s ease',
        }}>
          <button onClick={() => handleCall(false)} style={menuItemStyle('#a78bfa')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <span>Voice Call</span>
          </button>
          <div style={{ height: 1, background: '#1a1a1a' }} />
          <button onClick={() => handleCall(true)} style={menuItemStyle('#60a5fa')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
            <span>Video Call</span>
          </button>
        </div>
      )}

      <style>{`
        @keyframes cbSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes cbSlide { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
};

const menuItemStyle = (color: string): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 9,
  width: '100%', padding: '10px 14px',
  border: 'none', background: 'transparent',
  color, cursor: 'pointer', fontSize: 13, fontWeight: 500,
  transition: 'background .12s ease',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
});
