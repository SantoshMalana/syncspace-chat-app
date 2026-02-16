import React, { useState } from 'react';
import { userAPI } from '../utils/api';

interface NotificationPreferencesProps {
  channelId: string;
  onClose: () => void;
  onSave?: (preferences: any) => void;
  initialPreferences?: {
    muted: boolean;
    mutedUntil: string | null;
  };
}

const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({
  channelId,
  onClose,
  onSave,
  initialPreferences
}) => {
  const [selected, setSelected] = useState(initialPreferences?.muted ? 'muted' : 'all');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const muted = selected === 'muted';
      await userAPI.updateChannelPreferences(channelId, {
        muted,
        mutedUntil: muted ? null : null // For now simpler logic, mute forever
      });
      if (onSave) {
        onSave({ muted });
      }
      onClose();
    } catch (error) {
      console.error('Failed to save preferences:', error);
      alert('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const options = [
    {
      id: 'all',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
      label: 'All new posts',
      description: 'Messages and threads you follow',
    },
    {
      id: 'mentions',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
      label: 'Just mentions',
      description: '@you, @channel, @here',
    },
    {
      id: 'muted',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1V10a1 1 0 011-1h1.586l4.707-4.707a1 1 0 011.414 1.414L6 8.586V15z" clipPath="url(#a)" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16.168A6.002 6.002 0 006.82 8.999m10.36 8.17A6 6 0 009.574 4M9 1a1 1 0 011-1h4a1 1 0 011 1v2m-1 16a1 1 0 001 1h-4a1 1 0 01-1-1v-2" />
        </svg>
      ),
      label: 'Mute channel',
      description: 'Only badge the channel when someone @mentions you',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-2xl max-w-xl w-full mx-4">
        {/* Header */}
        <div className="p-6 border-b border-[#2a2a2a] flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Edit notifications</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-3">
          <p className="text-sm text-gray-400 mb-4">Choose notification settings for this channel</p>

          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => setSelected(option.id)}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${selected === option.id
                  ? 'border-primary bg-primary/10'
                  : 'border-[#2a2a2a] hover:border-[#3a3a3a]'
                }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg mt-1 ${selected === option.id ? 'text-primary' : 'text-gray-400'}`}>
                  {option.icon}
                </div>
                <div>
                  <h3 className={`font-semibold ${selected === option.id ? 'text-white' : 'text-gray-300'}`}>
                    {option.label}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">{option.description}</p>
                </div>
                {selected === option.id && (
                  <div className="ml-auto p-2 text-primary">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M10 15.172l9.192-9.193 1.415 1.414L10 18 .393 8.393 1.807 6.979z" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#2a2a2a] flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg border border-[#2a2a2a] text-gray-300 hover:bg-[#2a2a2a] transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-white hover:shadow-lg hover:shadow-primary/20 transition-all font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPreferences;
