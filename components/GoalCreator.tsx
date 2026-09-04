'use client'
import { useState } from 'react'
import { generateRoadmap } from '@/app/actions/generateRoadmap'

export default function GoalCreator({ userId, onRoadmapCreated }: { userId: string, onRoadmapCreated?: () => void }) {
  const [goal, setGoal] = useState('')
  const [duration, setDuration] = useState(30) // Default to 30 days
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Pass the goal title, user ID, and selected duration (e.g., 10, 15, 20, 30)
      const result = await generateRoadmap(goal, userId, Number(duration));

      if (result.success) {
        alert('Roadmap generated successfully! Time to get to work.');
        setGoal('');
        if (onRoadmapCreated) {
          onRoadmapCreated();
        } else {
          window.location.reload();
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
    <form onSubmit={handleSubmit} className="space-y-4 mb-6 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900">Start a Challenge</h3>
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700">What is your goal?</label>
        <input 
          type="text" 
          required 
          placeholder="e.g., Master Full-Stack Next.js Development" 
          className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 outline-none text-sm" 
          value={goal} 
          onChange={(e) => setGoal(e.target.value)} 
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700">Duration</label>
        <select
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 outline-none text-sm"
        >
          <option value={10}>10 Days</option>
          <option value={15}>15 Days</option>
          <option value={20}>20 Days</option>
          <option value={30}>30 Days</option>
        </select>
      </div>

      <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-semibold shadow-sm text-sm">
        {loading ? 'Generating AI Roadmap...' : 'Commit to Goal'}
      </button>
    </form>
  )
}