import React, { useState, useEffect } from 'react';

interface CallTimerProps {
  startTime: Date;
}

export const CallTimer: React.FC<CallTimerProps> = ({ startTime }) => {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  const fmt = (s: number): string => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  };

  return (
    <span style={{
      fontVariantNumeric: 'tabular-nums',
      fontSize: 13,
      fontWeight: 500,
      letterSpacing: '0.8px',
      color: 'rgba(255,255,255,0.75)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {fmt(duration)}
    </span>
  );
};
