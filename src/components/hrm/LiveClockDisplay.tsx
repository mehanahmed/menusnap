"use client";

import { useState, useEffect } from 'react';

export function LiveClockDisplay({ className }: { className?: string }) {
  const [time, setTime] = useState('');
  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className={className}>{time || '--:--:--'}</span>;
}
