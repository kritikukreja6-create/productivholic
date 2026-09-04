'use client'
import { useState } from 'react'
import { generateRoadmap } from '@/app/actions/generateRoadmap'
import { createBrowserClient } from '@supabase/ssr'

export default function GoalCreator({ userId, onRoadmapCreated }: { userId: string, onRoadmapCreated?: () => void }) {
  const [goal, setGoal] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. FIRST: Save the goal to the 'goals' table and set it as active
      const { error: goalError } = await supabase
        .from('goals')
        .insert({
          user_id: userId,
          title: goal,
          duration_days: 30,
          is_active: true,
          points: 0
        });

      if (goalError) throw goalError;

      // 2. SECOND: Call the AI server action to generate the 30-day tasks
      const result = await generateRoadmap(goal, userId);

      if (result.success) {
        alert('Roadmap generated successfully! Time to get to work.');
        setGoal('');
        if (onRoadmapCreated) {
          onRoadmapCreated();
        } else {
          window.location.reload(); // Refreshes the page to display the new roadmap box
        }
      } else {
        alert(result.message || 'Failed to generate roadmap. Try again.');
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred while creating your goal.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mb-6">
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700">Enter your goal for AI Roadmap</label>
        <input 
          type="text" 
          required 
          placeholder="e.g., Master Full-Stack Next.js Development" 
          className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 outline-none" 
          value={goal} 
          onChange={(e) => setGoal(e.target.value)} 
        />
      </div>
      <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-semibold shadow-sm">
        {loading ? 'Generating AI Roadmap...' : 'Generate Roadmap'}
      </button>
    </form>
  )
}