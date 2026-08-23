'use client'
import { useState, useTransition } from 'react';
import { generateRoadmap } from '@/app/actions/generateRoadmap';

export default function GoalCreator({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition();
  const [goal, setGoal] = useState('');

  const handleGenerate = () => {
    startTransition(async () => {
      const result = await generateRoadmap(goal, userId);
      if (result.success) {
        alert("Roadmap generated successfully! Time to get to work.");
        // Redirect to the roadmap view or refresh the page here
      } else {
        alert("Failed to generate roadmap. Try again.");
      }
    });
  };

  return (
    <div>
      <input 
        type="text" 
        placeholder="e.g., Learn Full Stack Web Dev" 
        value={goal} 
        onChange={(e) => setGoal(e.target.value)} 
      />
      <button onClick={handleGenerate} disabled={isPending}>
        {isPending ? 'AI is building your roadmap...' : 'Generate 30-Day Plan'}
      </button>
    </div>
  );
}