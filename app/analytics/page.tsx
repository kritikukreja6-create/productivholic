'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { getInsight } from '@/app/actions/getInsight';

export default function AnalyticsPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ xp: 0, tasksDone: 0, activeGoals: 0, focusScore: 0 });
  const [insight, setInsight] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [recentActivity, setRecentActivity] = useState<boolean[]>(Array(7).fill(false));

  useEffect(() => {
    async function fetchAnalytics() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch Goals
      const { data: goals } = await supabase.from('goals').select('*').eq('user_id', user.id);
      const totalXP = goals?.reduce((sum, g) => sum + (g.points || 0), 0) || 0;
      const activeCount = goals?.filter(g => g.is_active).length || 0;

      // Fetch Roadmap Tasks
      const { data: roadmap } = await supabase.from('ai_roadmap').select('status').eq('user_id', user.id);
      const tasksCompleted = roadmap?.filter(t => t.status === 'completed').length || 0;

      // Fetch Daily Logs (Last 7 Days)
      const today = new Date();
      const pastWeek = new Date(today);
      pastWeek.setDate(pastWeek.getDate() - 7);
      
      const { data: logs } = await supabase
        .from('daily_logs')
        .select('log_date')
        .eq('user_id', user.id)
        .gte('log_date', pastWeek.toISOString().split('T')[0]);

      // Calculate 7-Day Activity Array
      const activityMap = Array(7).fill(false);
      if (logs) {
        logs.forEach(log => {
          const logDate = new Date(log.log_date);
          const diffTime = Math.abs(today.getTime() - logDate.getTime());
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays < 7) activityMap[6 - diffDays] = true; 
        });
      }

      // Calculate Focus Score (Base 40 + XP/Tasks scaling, max 100)
      const calculatedScore = Math.min(100, 40 + (tasksCompleted * 5) + (activeCount * 2));

      setRecentActivity(activityMap);
      setStats({ xp: totalXP, tasksDone: tasksCompleted, activeGoals: activeCount, focusScore: calculatedScore });
      setLoading(false);
    }
    
    fetchAnalytics();
  }, [supabase]);

  const handleGenerateInsight = async () => {
    setIsGenerating(true);
    const result = await getInsight(stats.xp, stats.tasksDone, stats.activeGoals);
    if (result.success) setInsight(result.insight);
    setIsGenerating(false);
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 font-bold">Loading Analytics...</div>;
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-12 text-gray-900">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="pb-4 border-b border-gray-200">
          <h1 className="text-3xl font-black tracking-tight text-gray-900">Performance Analytics</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* FOCUS SCORE */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Focus Score</h3>
            <div className="relative flex items-center justify-center w-40 h-40 rounded-full border-8 border-gray-50">
              <span className="text-5xl font-black text-blue-600">{stats.focusScore}</span>
              <svg className="absolute top-0 left-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="46" fill="transparent" stroke="#3b82f6" strokeWidth="8" strokeDasharray={`${stats.focusScore * 2.89} 289`} strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-xs text-gray-400 mt-6 font-medium">Calculated from completion rates & consistency</p>
          </div>

          {/* AI INSIGHTS & CONSISTENCY */}
          <div className="md:col-span-2 space-y-6">
            
            <div className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-3xl shadow-md text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-32 bg-white opacity-5 rounded-full blur-3xl -mr-16 -mt-16"></div>
              <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">🧠 AI Coach Insight</h2>
              
              {insight ? (
                <p className="text-xl font-medium leading-relaxed text-blue-100 italic">"{insight}"</p>
              ) : (
                <div>
                  <p className="text-gray-300 mb-6">Analyze your trailing data to generate a personalized strategic recommendation.</p>
                  <button 
                    onClick={handleGenerateInsight}
                    disabled={isGenerating}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {isGenerating ? 'Analyzing Data...' : 'Generate Insight'}
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">7-Day Consistency</h3>
              <div className="flex justify-between items-center gap-2">
                {recentActivity.map((isActive, index) => (
                  <div key={index} className="flex flex-col items-center gap-2 flex-1">
                    <div className={`w-full h-12 rounded-lg transition-all ${isActive ? 'bg-blue-500 shadow-inner' : 'bg-gray-100'}`}></div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Day {index + 1}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}