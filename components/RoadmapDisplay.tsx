import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export default async function RoadmapDisplay({ userId }: { userId: string }) {
  const cookieStore = cookies()
  
  // Initialize Supabase for Server Components
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
      },
    }
  )

  // Fetch the tasks for this user
  const { data: tasks, error } = await supabase
    .from('ai_roadmap')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true }) // Keeps the 30 days in the correct order

  if (error) {
    console.error("Error fetching roadmap:", error)
    return <div>Error loading roadmap data.</div>
  }

  // Show a friendly empty state if they haven't generated one yet
  if (!tasks || tasks.length === 0) {
    return <div className="mt-8 text-gray-500">No roadmap generated yet. Enter a goal above to get started!</div>
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4">Your 30-Day Roadmap</h2>
      <ul className="space-y-3">
        {tasks.map((task) => (
          <li 
            key={task.id} 
            // A tiny bit of inline Tailwind to visually separate active vs locked tasks
            className={`p-3 border rounded-md flex items-start gap-3 ${task.status === 'locked' ? 'opacity-50 bg-gray-50' : 'bg-white'}`}
          >
            <input 
              type="checkbox" 
              className="mt-1"
              checked={task.status === 'completed'} 
              readOnly // We will add the complete action later!
              disabled={task.status === 'locked'}
            />
            <div>
              <p className="font-semibold">{task.timeframe} <span className="text-xs font-normal text-gray-400 uppercase ml-2">{task.status}</span></p>
              <p className="text-gray-700">{task.task_title}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}