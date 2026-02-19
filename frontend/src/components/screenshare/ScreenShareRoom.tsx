// frontend/src/components/screenshare/ScreenShareRoom.tsx
// Full-screen room UI — shown when hosting or viewing a screen share session

import React, { useEffect, useRef, useState } from 'react';
import { useScreenShareContext } from '../../context/ScreenShareContext';

interface Props {
  currentUserName: string;
  onClose: () => void;
}

const ScreenShareRoom: React.FC<Props> = ({ currentUserName, onClose }) => {
  const {
    isHosting, isViewing, remoteStream, localStream,
    viewerCount, chatMessages, endRoom, leaveRoom, sendChat,
  } = useScreenShareContext();

  const videoRef    = useRef<HTMLVideoElement>(null);
  const chatEndRef  = useRef<HTMLDivElement>(null);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat]   = useState(true);

  // Attach stream to video element
  useEffect(() => {
    if (!videoRef.current) return;
    const stream = isHosting ? localStream : remoteStream;
    if (stream) videoRef.current.srcObject = stream;
  }, [localStream, remoteStream, isHosting]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleEnd = () => {
    if (isHosting) endRoom();
    else leaveRoom();
    onClose();
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    sendChat(chatInput.trim(), currentUserName);
    setChatInput('');
  };

  const fmt = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  return (
    <div style={styles.overlay}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <div style={styles.topLeft}>
          <span style={styles.liveDot} />
          <span style={styles.liveLabel}>LIVE</span>
          <span style={styles.titleText}>
            {isHosting ? 'You are sharing your screen' : 'Viewing screen share'}
          </span>
        </div>
        <div style={styles.topRight}>
          <span style={styles.viewerBadge}>👁 {viewerCount} viewer{viewerCount !== 1 ? 's' : ''}</span>
          <button style={styles.chatToggle} onClick={() => setShowChat(p => !p)}>
            {showChat ? '⬛ Hide Chat' : '💬 Show Chat'}
          </button>
          <button style={styles.endBtn} onClick={handleEnd}>
            {isHosting ? '⏹ End Session' : '← Leave'}
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div style={{ ...styles.body, gridTemplateColumns: showChat ? '1fr 320px' : '1fr' }}>

        {/* Video */}
        <div style={styles.videoWrap}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isHosting}
            style={styles.video}
          />
          {!localStream && !remoteStream && (
            <div style={styles.videoPlaceholder}>
              <div style={styles.spinnerWrap}>
                <div style={styles.spinner} />
                <p style={styles.spinnerText}>
                  {isViewing ? 'Waiting for host to share screen...' : 'Starting screen share...'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Chat sidebar */}
        {showChat && (
          <div style={styles.chat}>
            <div style={styles.chatHeader}>💬 Live Chat</div>
            <div style={styles.chatMessages}>
              {chatMessages.length === 0 && (
                <p style={styles.chatEmpty}>No messages yet. Say something!</p>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} style={styles.chatMsg}>
                  <div style={styles.chatMsgTop}>
                    <span style={styles.chatName}>{msg.name}</span>
                    <span style={styles.chatTime}>{fmt(msg.time)}</span>
                  </div>
                  <p style={styles.chatText}>{msg.text}</p>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div style={styles.chatInputRow}>
              <input
                style={styles.chatInput}
                placeholder="Type a message..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSendChat(); }}
              />
              <button style={styles.chatSendBtn} onClick={handleSendChat}>Send</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, zIndex: 10000, background: '#0a0a10', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' },
  topBar: { height: 52, background: 'rgba(0,0,0,0.7)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', flexShrink: 0, backdropFilter: 'blur(10px)' },
  topLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  liveDot: { width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite', display: 'inline-block' },
  liveLabel: { fontSize: 11, fontWeight: 700, color: '#ef4444', letterSpacing: 2 },
  titleText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 500 },
  topRight: { display: 'flex', alignItems: 'center', gap: 10 },
  viewerBadge: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '4px 12px', color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  chatToggle: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 14px', color: 'white', fontSize: 12, cursor: 'pointer' },
  endBtn: { background: 'linear-gradient(135deg, #ef4444, #dc2626)', border: 'none', borderRadius: 8, padding: '6px 16px', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  body: { flex: 1, display: 'grid', overflow: 'hidden' },
  videoWrap: { position: 'relative', background: '#050508', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  video: { width: '100%', height: '100%', objectFit: 'contain' },
  videoPlaceholder: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  spinnerWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 },
  spinner: { width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #7c3aed', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  spinnerText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0 },
  chat: { borderLeft: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', background: '#0d0d15' },
  chatHeader: { padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600 },
  chatMessages: { flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 },
  chatEmpty: { color: 'rgba(255,255,255,0.25)', fontSize: 13, textAlign: 'center', marginTop: 20 },
  chatMsg: { background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '8px 12px' },
  chatMsgTop: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 },
  chatName: { color: '#a78bfa', fontSize: 12, fontWeight: 600 },
  chatTime: { color: 'rgba(255,255,255,0.3)', fontSize: 11 },
  chatText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, margin: 0, wordBreak: 'break-word' },
  chatInputRow: { padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8 },
  chatInput: { flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: 'white', fontSize: 13, outline: 'none' },
  chatSendBtn: { background: 'linear-gradient(135deg, #7c3aed, #2563eb)', border: 'none', borderRadius: 8, padding: '8px 16px', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
};

export default ScreenShareRoom;
