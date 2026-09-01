'use client'
import { useState } from 'react'
import { generateRoadmap } from '@/app/actions/generateRoadmap'

export default function GoalCreator({ userId, onRoadmapCreated }: { userId: string, onRoadmapCreated?: () => void }) {
  const [goal, setGoal] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const result = await generateRoadmap(goal, userId)
    setLoading(false)

    if (result.success) {
      alert('Roadmap generated successfully! Time to get to work.')
      setGoal('')
      if (onRoadmapCreated) onRoadmapCreated() // Triggers instant UI update
    } else {
      alert('Failed to generate roadmap. Try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mb-6">
      <div>
        <label className="block text-sm font-medium mb-1">Enter your goal for AI Roadmap</label>
        <input 
          type="text" 
          required 
          placeholder="e.g., Master Full-Stack Next.js Development" 
          className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 bg-white" 
          value={goal} 
          onChange={(e) => setGoal(e.target.value)} 
        />
      </div>
      <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50 transition font-semibold">
        {loading ? 'Generating AI Roadmap...' : 'Generate Roadmap'}
      </button>
    </form>
  )
}