'use client';

import { useState, useEffect, useRef } from 'react';

interface PomodoroProps {
  channel: any; // Supabase Realtime Channel instance
  onThemeChange?: (themeClass: string) => void;
}

export type TimerMode = 'work25' | 'work50' | 'shortBreak' | 'longBreak';

const MODE_CONFIG: Record<TimerMode, { label: string; duration: number }> = {
  work25: { label: '25m Focus', duration: 25 * 60 },
  work50: { label: '50m Deep Focus', duration: 50 * 60 },
  shortBreak: { label: '5m Short Break', duration: 5 * 60 },
  longBreak: { label: '15m Long Break', duration: 15 * 60 },
};

export const COLOR_THEMES = [
  { id: 'slate', name: 'Dark Slate', headerBg: 'bg-gray-900', roomBg: 'bg-gray-950', accent: 'bg-blue-600' },
  { id: 'indigo', name: 'Midnight Indigo', headerBg: 'bg-indigo-950', roomBg: 'bg-slate-950', accent: 'bg-indigo-600' },
  { id: 'emerald', name: 'Calm Emerald', headerBg: 'bg-emerald-950', roomBg: 'bg-stone-950', accent: 'bg-emerald-600' },
  { id: 'amber', name: 'Cozy Warmth', headerBg: 'bg-stone-900', roomBg: 'bg-neutral-950', accent: 'bg-amber-600' },
];

export default function PomodoroTimer({ channel, onThemeChange }: PomodoroProps) {
  const [mode, setMode] = useState<TimerMode>('work25');
  const [timeLeft, setTimeLeft] = useState(MODE_CONFIG.work25.duration);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(COLOR_THEMES[0].id);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Supabase Realtime Sync Listener
  useEffect(() => {
    if (!channel) return;

    channel.on(
      'broadcast',
      { event: 'timer_update' },
      ({ payload }: { payload: { mode: TimerMode; isRunning: boolean; timeLeft: number } }) => {
        setMode(payload.mode);
        setIsRunning(payload.isRunning);
        setTimeLeft(payload.timeLeft);
      }
    );
  }, [channel]);

  // Tick logic
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  const broadcastTimer = (newMode: TimerMode, newRunning: boolean, newTime: number) => {
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'timer_update',
        payload: { mode: newMode, isRunning: newRunning, timeLeft: newTime },
      });
    }
  };

  const handleModeSwitch = (newMode: TimerMode) => {
    const newTime = MODE_CONFIG[newMode].duration;
    setMode(newMode);
    setIsRunning(false);
    setTimeLeft(newTime);
    broadcastTimer(newMode, false, newTime);
  };

  const togglePlay = () => {
    const nextRunning = !isRunning;
    setIsRunning(nextRunning);
    broadcastTimer(mode, nextRunning, timeLeft);
  };

  const handleReset = () => {
    const defaultTime = MODE_CONFIG[mode].duration;
    setIsRunning(false);
    setTimeLeft(defaultTime);
    broadcastTimer(mode, false, defaultTime);
  };

  const handleThemeSelect = (themeId: string) => {
    setSelectedTheme(themeId);
    const theme = COLOR_THEMES.find((t) => t.id === themeId);
    if (theme && onThemeChange) {
      onThemeChange(theme.roomBg);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 items-center w-full px-2 py-3 bg-transparent text-white">
      
      {/* Left Column: Mode Selectors */}
      <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
        {(Object.keys(MODE_CONFIG) as TimerMode[]).map((key) => (
          <button
            key={key}
            onClick={() => handleModeSwitch(key)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-all ${
              mode === key 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {MODE_CONFIG[key].label}
          </button>
        ))}
      </div>

      {/* Center Column: Huge Timer & Controls */}
      <div className="flex flex-col items-center justify-center mt-3 md:mt-0">
        <span className="font-mono text-3xl font-black tracking-[0.15em] text-white">
          {formatTime(timeLeft)}
        </span>
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={togglePlay}
            className={`px-6 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
              isRunning 
                ? 'bg-amber-500 hover:bg-amber-400 text-black' 
                : 'bg-emerald-500 hover:bg-emerald-400 text-black'
            }`}
          >
            {isRunning ? 'Pause' : 'Start'}
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-1 bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full text-xs transition-all font-medium"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Right Column: Theme Picker */}
      <div className="flex items-center justify-center md:justify-end gap-3 mt-4 md:mt-0">
        <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Theme:</span>
        <select
          value={selectedTheme}
          onChange={(e) => handleThemeSelect(e.target.value)}
          className="bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
        >
          {COLOR_THEMES.map((theme) => (
            <option key={theme.id} value={theme.id}>
              {theme.name}
            </option>
          ))}
        </select>
      </div>

    </div>
);
}