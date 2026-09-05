'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';

export default function FocusMode() {
  const { taskId } = useParams();
  const router = useRouter();
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [task, setTask] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isActive, setIsActive] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    async function fetchTask() {
      const { data } = await supabase
        .from('ai_roadmap')
        .select('*, goals(title, points)')
        .eq('id', taskId as string)
        .single();
      
      if (data) setTask(data);
    }
    if (taskId) fetchTask();
  }, [taskId, supabase]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      // Play a sound or auto-complete here if desired
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const toggleTimer = () => setIsActive(!isActive);
  
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !task) return;

    const today = new Date().toISOString().split('T')[0];

    try {
      // 1. Mark the roadmap task as completed
      await supabase.from('ai_roadmap').update({ status: 'completed' }).eq('id', task.id);

      // 2. Unlock the NEXT task in the sequence (if it exists)
      const { data: nextTasks } = await supabase
        .from('ai_roadmap')
        .select('id')
        .eq('goal_id', task.goal_id)
        .eq('status', 'locked')
        .order('id', { ascending: true })
        .limit(1);

      if (nextTasks && nextTasks.length > 0) {
        await supabase.from('ai_roadmap').update({ status: 'active' }).eq('id', nextTasks[0].id);
      }

      // 3. Log the completion for the streak
      await supabase.from('daily_logs').insert({ 
        goal_id: task.goal_id, 
        log_date: today, 
        is_completed: true 
      });

      // 4. Award XP (+25 for a deep focus session)
      const currentPoints = task.goals?.points || 0;
      await supabase.from('goals').update({ points: currentPoints + 25 }).eq('id', task.goal_id);

      // Route back to dashboard
      router.push('/dashboard');
      router.refresh();
      
    } catch (error) {
      console.error("Error completing task:", error);
      setIsCompleting(false);
    }
  };

  if (!task) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white font-bold">Loading Mission...</div>;
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6 relative selection:bg-blue-500/30">
      
      {/* Top Nav */}
      <div className="absolute top-8 left-8">
        <Link href="/dashboard" className="text-gray-400 hover:text-white font-semibold transition flex items-center gap-2">
          &larr; Abort Mission
        </Link>
      </div>

      {/* Ambient Audio Player (Optional Lo-fi/Acoustic) */}
      <div className="absolute top-8 right-8">
        <iframe 
          width="250" 
          height="80" 
          src="https://www.youtube.com/embed/5qap5aO4i9A?autoplay=0&loop=1&playlist=5qap5aO4i9A" 
          title="Ambient Focus Audio" 
          frameBorder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          className="rounded-lg opacity-30 hover:opacity-100 transition-opacity"
        ></iframe>
      </div>

      {/* Main Focus UI */}
      <div className="max-w-2xl w-full flex flex-col items-center text-center space-y-12">
        
        {/* Task Context */}
        <div className="space-y-4">
          <h3 className="text-blue-400 font-bold tracking-widest uppercase text-sm">
            🎯 {task.goals?.title}
          </h3>
          <h1 className="text-4xl md:text-5xl font-black text-gray-100 leading-tight">
            {task.task_title}
          </h1>
        </div>

        {/* Timer Display */}
        <div className="relative">
          <div className="text-8xl md:text-[10rem] font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500 tabular-nums">
            {formatTime(timeLeft)}
          </div>
          {/* Progress Bar under timer */}
          <div className="w-full h-2 bg-gray-800 rounded-full mt-8 overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
              style={{ width: `${((25 * 60 - timeLeft) / (25 * 60)) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-6 pt-8">
          <button 
            onClick={toggleTimer}
            className="px-12 py-5 bg-white text-gray-950 rounded-2xl font-black text-xl hover:bg-gray-200 transition shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_60px_rgba(255,255,255,0.2)]"
          >
            {isActive ? '⏸ Pause' : '▶ Resume Focus'}
          </button>
          
          <button 
            onClick={handleComplete}
            disabled={isCompleting}
            className="px-8 py-5 bg-transparent border-2 border-blue-500 text-blue-400 rounded-2xl font-bold text-lg hover:bg-blue-500 hover:text-white transition disabled:opacity-50"
          >
            {isCompleting ? 'Securing XP...' : '✓ Complete & Claim XP'}
          </button>
        </div>
      </div>
    </main>
  );
}