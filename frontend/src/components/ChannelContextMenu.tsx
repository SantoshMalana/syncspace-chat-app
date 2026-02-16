import React, { useRef, useEffect } from 'react';
import type { Channel } from '../types';

interface ChannelContextMenuProps {
  channel: Channel;
  x: number;
  y: number;
  onClose: () => void;
  onEdit?: (channel: Channel) => void;
  onLeave?: (channel: Channel) => void;
  onDelete?: (channel: Channel) => void;
}

const ChannelContextMenu: React.FC<ChannelContextMenuProps> = ({
  channel,
  x,
  y,
  onClose,
  onEdit,
  onDelete,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-2xl z-50 w-max"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      <div className="py-2">
        <button
          onClick={() => {
            navigator.clipboard.writeText(channel.name);
            onClose();
          }}
          className="w-full px-4 py-2 text-sm text-left hover:bg-[#2a2a2a] transition-colors text-gray-300 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy name
        </button>
        <button
          onClick={() => {
            navigator.clipboard.writeText(`#${channel.name}`);
            onClose();
          }}
          className="w-full px-4 py-2 text-sm text-left hover:bg-[#2a2a2a] transition-colors text-gray-300 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.658 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Copy link
        </button>

        <div className="border-t border-[#2a2a2a] my-2" />

        <button
          onClick={() => {
            onEdit?.(channel);
            onClose();
          }}
          className="w-full px-4 py-2 text-sm text-left hover:bg-[#2a2a2a] transition-colors text-gray-300 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 6H6.582c-.4 0-.8.158-1.082.44m15.355-2.003V4.75c0-.573-.575-1-1.25-1H4.75c-.675 0-1.25.427-1.25 1v15.5c0 .573.575 1 1.25 1h15.5c.675 0 1.25-.427 1.25-1V6.5" />
          </svg>
          Edit settings
        </button>

        <button
          onClick={() => {
            onDelete?.(channel);
            onClose();
          }}
          className="w-full px-4 py-2 text-sm text-left hover:bg-[#2a2a2a] transition-colors text-red-400 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Leave channel
        </button>
      </div>
    </div>
  );
};

export default ChannelContextMenu;
