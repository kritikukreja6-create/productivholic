'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function RoadmapDisplay({ userId }: { userId: string }) {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Initialize Supabase for Client Components
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // 1. Pulled fetchRoadmap OUTSIDE of the useEffect so the whole component can use it
  const fetchRoadmap = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // First, find the user's active goal
    const { data: activeGoal } = await supabase
      .from('goals')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (!activeGoal) {
      setLoading(false);
      return;
    }

    // Fetch ONLY the roadmap tasks linked to that specific goal
    const { data, error } = await supabase
      .from('ai_roadmap')
      .select('*')
      .eq('goal_id', activeGoal.id); 

    if (error) {
      console.error("Error fetching roadmap:", error);
    } else if (data) {
      // Force sort mathematically by extracting the number from "Day X"
      const sortedTasks = data.sort((a, b) => {
        const numA = parseInt(a.timeframe.replace(/[^0-9]/g, '')) || 0;
        const numB = parseInt(b.timeframe.replace(/[^0-9]/g, '')) || 0;
        return numA - numB;
      });
      setTasks([...sortedTasks]);
    }
    setLoading(false);
  }

  // 2. useEffect now simply calls the function when the component loads
  useEffect(() => {
    fetchRoadmap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])
  
  const handleTaskComplete = async (task: any) => {
    // Prevent clicking locked tasks
    if (task.status !== 'active') return;

    // Mark the clicked task as completed
    await supabase.from('ai_roadmap').update({ status: 'completed' }).eq('id', task.id);

    // Find the next day's task and unlock it
    const currentDayNum = parseInt(task.timeframe.replace(/[^0-9]/g, ''));
    const nextTask = tasks.find((t: any) => parseInt(t.timeframe.replace(/[^0-9]/g, '')) === currentDayNum + 1);

    if (nextTask) {
      await supabase.from('ai_roadmap').update({ status: 'active' }).eq('id', nextTask.id);
    }

    // 3. Refresh the UI successfully because fetchRoadmap is in scope!
    fetchRoadmap();
  };

  if (loading) {
    return <div className="mt-8 text-gray-500 animate-pulse">Loading your AI roadmap...</div>
  }

  if (tasks.length === 0) {
    return <div className="mt-8 text-gray-500">No roadmap generated yet. Enter a goal above to get started!</div>
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4">Your 30-Day Roadmap</h2>
      <ul className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
        {tasks.map((task) => (
          <li 
            key={task.id} 
            className={`p-3 border rounded-md flex items-start gap-3 transition-opacity ${task.status === 'locked' ? 'opacity-50 bg-gray-50' : 'bg-white shadow-sm'}`}
          >
            <input
               type="checkbox"
               checked={task.status === 'completed'}
               disabled={task.status === 'locked'}
               onChange={() => handleTaskComplete(task)}
               className="w-5 h-5 text-blue-600 border-gray-300 rounded-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 flex-shrink-0 mt-0.5"
            />
            <div>
              <p className="font-semibold text-gray-900">
                {task.timeframe} 
                <span className={`text-xs font-bold uppercase ml-2 ${task.status === 'active' ? 'text-blue-600' : 'text-gray-400'}`}>
                  {task.status}
                </span>
              </p>
              <p className="text-gray-700">{task.task_title}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}