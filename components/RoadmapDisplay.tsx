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

  useEffect(() => {
    if (!userId) return

    const fetchRoadmap = async () => {
      const { data, error } = await supabase
        .from('ai_roadmap')
        .select('*')
        .eq('user_id', userId)
       

      if (error) {
        console.error("Error fetching roadmap:", error)
      } else if (data) {
        setTasks(data)
      }
      setLoading(false)
    }

    fetchRoadmap()
  }, [userId])

  if (loading) {
    return <div className="mt-8 text-gray-500 animate-pulse">Loading your AI roadmap...</div>
  }

  if (tasks.length === 0) {
    return <div className="mt-8 text-gray-500">No roadmap generated yet. Enter a goal above to get started!</div>
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4">Your 30-Day Roadmap</h2>
      <ul className="space-y-3">
        {tasks.map((task) => (
          <li 
            key={task.id} 
            className={`p-3 border rounded-md flex items-start gap-3 transition-opacity ${task.status === 'locked' ? 'opacity-50 bg-gray-50' : 'bg-white shadow-sm'}`}
          >
            <input 
              type="checkbox" 
              className="mt-1 w-4 h-4 text-blue-600 rounded cursor-pointer"
              checked={task.status === 'completed'} 
              readOnly 
              disabled={task.status === 'locked'}
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