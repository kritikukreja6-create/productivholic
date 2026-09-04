'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function RoadmapDisplay({ userId }: { userId: string }) {
  const [goals, setGoals] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchRoadmap = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // 1. Fetch ALL active goals for this user (so we have their IDs and Titles)
    const { data: activeGoals, error: goalsError } = await supabase
      .from('goals')
      .select('id, title')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (goalsError || !activeGoals || activeGoals.length === 0) {
      setLoading(false);
      return;
    }

    const goalIds = activeGoals.map(g => g.id);

    // 2. Fetch tasks for ALL of those active goals
    const { data: tasksData, error: tasksError } = await supabase
      .from('ai_roadmap')
      .select('*')
      .in('goal_id', goalIds); // .in() lets us grab tasks for multiple goals at once

    if (tasksError) {
      console.error("Error fetching roadmap:", tasksError);
    } else if (tasksData) {
      // Sort mathematically from Day 1 to Day 30
      const sortedTasks = tasksData.sort((a, b) => {
        const numA = parseInt(a.timeframe.replace(/[^0-9]/g, '')) || 0;
        const numB = parseInt(b.timeframe.replace(/[^0-9]/g, '')) || 0;
        return numA - numB;
      });
      setGoals(activeGoals);
      setTasks([...sortedTasks]);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchRoadmap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])
  
  const handleTaskComplete = async (task: any) => {
    if (task.status !== 'active') return;

    // Mark current task completed
    await supabase.from('ai_roadmap').update({ status: 'completed' }).eq('id', task.id);

    const currentDayNum = parseInt(task.timeframe.replace(/[^0-9]/g, ''));
    
    // Find the next day's task FOR THIS SPECIFIC GOAL ONLY
    const nextTask = tasks.find((t: any) => 
      t.goal_id === task.goal_id && 
      parseInt(t.timeframe.replace(/[^0-9]/g, '')) === currentDayNum + 1
    );

    if (nextTask) {
      await supabase.from('ai_roadmap').update({ status: 'active' }).eq('id', nextTask.id);
    }

    fetchRoadmap();
  };

  if (loading) {
    return <div className="mt-8 text-gray-500 animate-pulse">Loading your AI roadmaps...</div>
  }

  if (goals.length === 0 || tasks.length === 0) {
    return <div className="mt-8 text-gray-500">No active roadmaps found. Enter a goal above to get started!</div>
  }

  return (
    <div className="mt-8 space-y-10">
      {goals.map((goal) => {
        // STRICT FILTER: Only grab tasks that belong to THIS specific goal's ID
        const goalTasks = tasks.filter(t => t.goal_id === goal.id);

        // If a goal doesn't have tasks yet, don't show an empty box
        if (goalTasks.length === 0) return null;

        return (
          <div key={goal.id} className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-xl font-bold mb-6 text-gray-900">{goal.title}</h2>
            
            <ul className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {goalTasks.map((task) => (
                <li 
                  key={task.id} 
                  className={`p-3 border rounded-md flex items-start gap-3 transition-all ${task.status === 'locked' ? 'opacity-50 bg-gray-50 border-gray-100' : 'bg-white shadow-sm border-gray-200'}`}
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
                    <p className="text-gray-700 mt-1 text-sm">{task.task_title}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  )
}