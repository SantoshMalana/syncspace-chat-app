// MeetingNotification.tsx - Meeting Toast Notifications
// Displays alerts for meeting reminders, started meetings, and invitations

import React, { useEffect, useState } from 'react';
import { Meeting } from '../../types/meeting.types';
import { MdAccessTime, MdNotifications } from 'react-icons/md';
import { format, formatDistanceToNow } from 'date-fns';

interface MeetingNotificationProps {
  meeting: Meeting;
  type: 'reminder' | 'started' | 'invitation' | 'cancelled';
  onJoin?: (meeting: Meeting) => void;
  onDismiss?: () => void;
  autoHide?: boolean;
  autoHideDelay?: number; // in milliseconds
}

const MeetingNotification: React.FC<MeetingNotificationProps> = ({
  meeting,
  type,
  onJoin,
  onDismiss,
  autoHide = true,
  autoHideDelay = 10000, // 10 seconds default
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  /**
   * Auto-hide notification after delay
   */
  useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay]);

  /**
   * Handle dismiss with animation
   */
  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      if (onDismiss) {
        onDismiss();
      }
    }, 300); // Match animation duration
  };

  /**
   * Handle join meeting
   */
  const handleJoin = () => {
    if (onJoin) {
      onJoin(meeting);
      handleDismiss();
    }
  };

  /**
   * Get notification config based on type
   */
  const getNotificationConfig = () => {
    switch (type) {
      case 'reminder':
        return {
          icon: <Bell className="w-6 h-6" />,
          bgColor: 'bg-blue-500',
          title: 'Meeting Reminder',
          message: `Your meeting "${meeting.title}" starts in 15 minutes`,
          actionText: 'Join Now',
          showJoin: true,
        };
      
      case 'started':
        return {
          icon: <Bell className="w-6 h-6" />,
          bgColor: 'bg-green-500',
          title: 'Meeting Started',
          message: `"${meeting.title}" has started`,
          actionText: 'Join Meeting',
          showJoin: true,
        };
      
      case 'invitation':
        return {
          icon: <MdAccessTime className="w-6 h-6" />,
          bgColor: 'bg-purple-500',
          title: 'New Meeting Invitation',
          message: `You've been invited to "${meeting.title}"`,
          actionText: 'View Details',
          showJoin: false,
        };
      
      case 'cancelled':
        return {
          icon: <Bell className="w-6 h-6" />,
          bgColor: 'bg-red-500',
          title: 'Meeting Cancelled',
          message: `"${meeting.title}" has been cancelled`,
          actionText: 'Dismiss',
          showJoin: false,
        };
      
      default:
        return {
          icon: <Bell className="w-6 h-6" />,
          bgColor: 'bg-gray-500',
          title: 'Meeting Notification',
          message: meeting.title,
          actionText: 'Dismiss',
          showJoin: false,
        };
    }
  };

  const config = getNotificationConfig();

  if (!isVisible) return null;

  return (
    <div
      className={`
        fixed
        top-20
        right-6
        z-50
        w-96
        max-w-[calc(100vw-3rem)]
        bg-white
        dark:bg-gray-800
        rounded-lg
        shadow-2xl
        border
        border-gray-200
        dark:border-gray-700
        overflow-hidden
        transform
        transition-all
        duration-300
        ${isExiting ? 'translate-x-[120%] opacity-0' : 'translate-x-0 opacity-100'}
      `}
    >
      {/* Color Bar */}
      <div className={`h-1 ${config.bgColor}`} />

      {/* Content */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`${config.bgColor} text-white p-2 rounded-lg`}>
              {config.icon}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {config.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                {config.message}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Dismiss notification"
          >
            <MdNotifications className="w-5 h-5" />
          </button>
        </div>

        {/* Meeting Details */}
        <div className="space-y-2 mb-4 ml-12">
          {/* Scheduled Time */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span>
              {format(new Date(meeting.scheduledFor), 'MMM d, yyyy • h:mm a')}
            </span>
          </div>

          {/* Duration */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span>{meeting.duration} minutes</span>
          </div>

          {/* Participants Count */}
          {meeting.participants.length > 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {meeting.participants.length} participant{meeting.participants.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 ml-12">
          {config.showJoin && type !== 'cancelled' && (
            <button
              onClick={handleJoin}
              className={`
                flex-1
                px-4
                py-2
                ${config.bgColor}
                hover:opacity-90
                text-white
                rounded-lg
                font-medium
                text-sm
                transition-all
                duration-200
              `}
            >
              {config.actionText}
            </button>
          )}
          
          <button
            onClick={handleDismiss}
            className="
              px-4
              py-2
              border
              border-gray-300
              dark:border-gray-600
              text-gray-700
              dark:text-gray-300
              hover:bg-gray-50
              dark:hover:bg-gray-700
              rounded-lg
              font-medium
              text-sm
              transition-all
              duration-200
            "
          >
            Dismiss
          </button>
        </div>
      </div>

      {/* Progress Bar for Auto-hide */}
      {autoHide && (
        <div className="h-1 bg-gray-200 dark:bg-gray-700">
          <div
            className={`h-full ${config.bgColor} transition-all ease-linear`}
            style={{
              width: '100%',
              animation: `shrink ${autoHideDelay}ms linear`,
            }}
          />
        </div>
      )}

      {/* CSS for progress bar animation */}
      <style jsx>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
};

export default MeetingNotification;
