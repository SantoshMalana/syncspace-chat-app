import React, { useState } from 'react';
import type { Channel } from '../types';

interface ChannelDetailsMenuProps {
  channel: Channel;
  onClose: () => void;
  onNotifications?: () => void;
  onSummarize?: () => void;
  onStar?: () => void;
  onMoveChannel?: () => void;
  onAddTemplate?: () => void;
  onAddWorkflow?: () => void;
  onEditSettings?: () => void;
}

const ChannelDetailsMenu: React.FC<ChannelDetailsMenuProps> = ({
  channel,
  onClose,
  onNotifications,
  onStar,
  onMoveChannel,
  onAddTemplate,
  onAddWorkflow,
  onEditSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'notifications' | 'main'>('main');

  const notificationOptions = [
    {
      id: 'all',
      icon: '🔔',
      label: 'All new posts',
      description: 'Messages and threads you follow',
    },
    {
      id: 'mentions',
      icon: '🔔',
      label: 'Just mentions',
      description: '@you, @channel, @here',
    },
    {
      id: 'muted',
      icon: '🚫',
      label: 'Mute and hide',
      description: 'Only badge the channel when someone @mentions you',
    },
  ];

  return (
    <div className="fixed inset-0 flex items-center justify-end z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative bg-[#1a1a1a] w-80 h-screen border-l border-[#2a2a2a] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#2a2a2a]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Open channel details</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-2xl font-bold text-white">#{channel.name}</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'main' && (
            <div className="divide-y divide-[#2a2a2a]">
              {/* Notifications */}
              <button
                onClick={() => {
                  onNotifications?.();
                  setActiveTab('notifications');
                }}
                className="w-full px-6 py-4 text-left hover:bg-[#2a2a2a] transition-colors border-b border-[#2a2a2a]"
              >
                <h3 className="font-semibold text-white mb-1">Summarize channel</h3>
                <p className="text-sm text-gray-400">Get AI-powered summary of recent activity</p>
              </button>

              <button
                onClick={onEditSettings}
                className="w-full px-6 py-4 text-left hover:bg-[#2a2a2a] transition-colors"
              >
                <h3 className="font-semibold text-white mb-1">Edit notifications</h3>
                <p className="text-sm text-gray-400">All new posts</p>
              </button>

              <button
                onClick={onStar}
                className="w-full px-6 py-4 text-left hover:bg-[#2a2a2a] transition-colors"
              >
                <h3 className="font-semibold text-white mb-1">Star channel</h3>
                <p className="text-sm text-gray-400">Add to starred channels</p>
              </button>

              <button
                onClick={onMoveChannel}
                className="w-full px-6 py-4 text-left hover:bg-[#2a2a2a] transition-colors"
              >
                <h3 className="font-semibold text-white mb-1">Move channel</h3>
                <p className="text-sm text-gray-400">Reorganize your channels</p>
              </button>

              <button
                onClick={onAddTemplate}
                className="w-full px-6 py-4 text-left hover:bg-[#2a2a2a] transition-colors"
              >
                <h3 className="font-semibold text-white mb-1">Add template to channel</h3>
                <p className="text-sm text-gray-400">Browse templates</p>
              </button>

              <button
                onClick={onAddWorkflow}
                className="w-full px-6 py-4 text-left hover:bg-[#2a2a2a] transition-colors"
              >
                <h3 className="font-semibold text-white mb-1">Add a workflow</h3>
                <p className="text-sm text-gray-400">Automate channel tasks</p>
              </button>

              <button
                onClick={onEditSettings}
                className="w-full px-6 py-4 text-left hover:bg-[#2a2a2a] transition-colors"
              >
                <h3 className="font-semibold text-white mb-1">Edit settings</h3>
                <p className="text-sm text-gray-400">Channel configuration</p>
              </button>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="p-6 space-y-3">
              <button
                onClick={() => setActiveTab('main')}
                className="mb-4 text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              <h3 className="font-semibold text-white mb-4">Edit notifications</h3>

              {notificationOptions.map((option) => (
                <button
                  key={option.id}
                  className="w-full p-4 rounded-lg border border-[#2a2a2a] hover:border-[#3a3a3a] hover:bg-[#2a2a2a] transition-all text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-lg mt-1">{option.icon}</div>
                    <div>
                      <h4 className="font-semibold text-white text-sm">{option.label}</h4>
                      <p className="text-xs text-gray-500 mt-1">{option.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-[#2a2a2a] space-y-3">
          <button className="w-full px-4 py-2 text-left text-primary hover:bg-[#2a2a2a] rounded-lg transition-colors font-medium text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Search in channel
          </button>

          <button className="w-full px-4 py-2 text-left text-red-400 hover:bg-[#2a2a2a] rounded-lg transition-colors font-medium text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Leave channel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChannelDetailsMenu;
