import React, { useState, useEffect } from 'react';

interface CallTimerProps {
  startTime: Date;
}

export const CallTimer: React.FC<CallTimerProps> = ({ startTime }) => {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setDuration(diff);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="call-timer">
      <span className="timer-text">{formatDuration(duration)}</span>
      <style>{`
        .call-timer {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 16px;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 20px;
          backdrop-filter: blur(10px);
        }

        .timer-text {
          font-size: 16px;
          font-weight: 600;
          color: #fff;
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.5px;
        }
      `}</style>
    </div>
  );
};