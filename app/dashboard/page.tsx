'use client';

import OnboardingModal from '@/components/OnboardingModal';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import GoalCreator from '@/components/GoalCreator';
import RoadmapDisplay from '@/components/RoadmapDisplay';
import LogoutButton from '@/components/LogoutButton';
import CreatePrivateRoom from '@/components/CreatePrivateRoom';
import { quickPlan } from '@/app/actions/quickPlan';
import EveningReflection from '@/components/EveningReflection';

export default function Dashboard() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const router = useRouter();

  const [username, setUsername] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Goal & Mission State
  const [goals, setGoals] = useState<any[]>([]);
  const [nextTask, setNextTask] = useState<any | null>(null);
  const [completedToday, setCompletedToday] = useState<Record<string, boolean>>({});
  
  // Quick Capture State
  const [quickTask, setQuickTask] = useState('');
  const [isPlanning, setIsPlanning] = useState(false);

  // Matchmaking State
  const [suggestedGroups, setSuggestedGroups] = useState<any[]>([]);
  const [joinedGroupIds, setJoinedGroupIds] = useState<Set<string>>(new Set());

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const fetchDashboardData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUserId(user.id);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle();

    if (profileData?.username) setUsername(profileData.username);

    // 1. Fetch Goals & Roadmap for Today's Mission
    const { data: goalsData } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (goalsData) {
      setGoals(goalsData);
      const today = new Date().toISOString().split('T')[0];
      const goalIds = goalsData.map((g) => g.id);

      // Find the absolute next active task for the "Today's Mission" banner
      const { data: roadmapData } = await supabase
        .from('ai_roadmap')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['active', 'locked'])
        .order('id', { ascending: true })
        .limit(1);
        
      if (roadmapData && roadmapData.length > 0) {
        setNextTask(roadmapData[0]);
      }

      const { data: logsData } = await supabase
        .from('daily_logs')
        .select('goal_id')
        .in('goal_id', goalIds)
        .eq('log_date', today)
        .eq('is_completed', true);

      if (logsData) {
        const statusMap: Record<string, boolean> = {};
        logsData.forEach((log) => { statusMap[log.goal_id] = true; });
        setCompletedToday(statusMap);
      }
    }

    // 2. Fetch Matchmaking Data
    const { data: onboardingData } = await supabase
      .from('onboarding_responses')
      .select('field_of_interest_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (onboardingData?.field_of_interest_id) {
      const { data: groupsData } = await supabase
        .from('focus_groups')
        .select('*')
        .eq('field_of_interest_id', onboardingData.field_of_interest_id);
      if (groupsData) setSuggestedGroups(groupsData);
    }

    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id);

    if (memberships) {
      setJoinedGroupIds(new Set(memberships.map((m) => m.group_id)));
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCheckIn = async (goalId: string, currentPoints: number) => {
    const today = new Date().toISOString().split('T')[0];
    const { error: logError } = await supabase
      .from('daily_logs')
      .insert({ goal_id: goalId, log_date: today, is_completed: true });

    if (!logError) {
      const { error: pointError } = await supabase
        .from('goals')
        .update({ points: currentPoints + 10 })
        .eq('id', goalId);
      if (!pointError) {
        setCompletedToday((prev) => ({ ...prev, [goalId]: true }));
        fetchDashboardData();
      }
    }
  };

  const handleQuickCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTask.trim() || !userId) return;
    
    setIsPlanning(true);
    
    const result = await quickPlan(quickTask, userId);
    
    if (result.success) {
      setQuickTask('');
      await fetchDashboardData(); 
    } else {
      alert("Failed to plan task. Please try again.");
    }
    
    setIsPlanning(false);
  };

  return (
    <main className="min-h-screen bg-gray-50/50 p-6 md:p-12 text-gray-900 relative">
      {userId && <OnboardingModal userId={userId} />}
      <EveningReflection />

      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* HEADER: Personalized & Time-Aware */}
        <div className="flex justify-between items-end pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900">
              {getGreeting()}, {username ? `@${username}` : 'there'} 👋
            </h1>
            <p className="text-gray-500 mt-1 font-medium">Ready to crush your goals today?</p>
          </div>
          <div className="flex items-center gap-3">
            <LogoutButton />
          </div>
        </div>

        {/* TOP METRICS */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-blue-600">
              {goals.reduce((sum, g) => sum + (g.points || 0), 0)}
            </span>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">Total XP</span>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-green-600">🔥 1</span>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">Day Streak</span>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-purple-600">{Object.keys(completedToday).length}</span>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">Tasks Done Today</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
          
          {/* LEFT COLUMN: The Daily Loop */}
          <div className="md:col-span-2 space-y-6">
            
            {/* TODAY'S MISSION HERO CARD */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl shadow-md text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-32 bg-white opacity-5 rounded-full blur-3xl -mr-16 -mt-16"></div>
              
              <h2 className="text-sm font-black text-blue-200 uppercase tracking-widest mb-4">🎯 Today's Mission</h2>
              
              {nextTask ? (
                <div>
                  <h3 className="text-3xl font-bold mb-2 leading-tight">{nextTask.task_title}</h3>
                  <p className="text-blue-100 mb-8 font-medium">Estimated Focus: 25 mins • {nextTask.timeframe}</p>
                  
                  <button 
                    onClick={() => router.push(`/focus/${nextTask.id}`)}
                    className="w-full sm:w-auto px-8 py-4 bg-white text-blue-700 rounded-xl font-black text-lg hover:bg-blue-50 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    ▶ Start Focus Session
                  </button>
                </div>
              ) : (
                <div>
                  <h3 className="text-2xl font-bold mb-2 leading-tight">Your schedule is clear.</h3>
                  <p className="text-blue-100 mb-8 font-medium">Create a new goal below to generate your next AI roadmap.</p>
                </div>
              )}
            </div>

            {/* QUICK CAPTURE */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">⚡ Quick AI Planner</h3>
              <form onSubmit={handleQuickCapture} className="flex gap-3">
                <input 
                  type="text" 
                  value={quickTask}
                  onChange={(e) => setQuickTask(e.target.value)}
                  placeholder="e.g., Have class till 2pm, need to solve 5 DSA questions tonight..." 
                  className="flex-1 bg-gray-50 border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
                <button 
                  type="submit" 
                  disabled={isPlanning || !quickTask}
                  className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition disabled:opacity-50 min-w-[120px]"
                >
                  {isPlanning ? 'Thinking...' : 'Plan It'}
                </button>
              </form>
            </div>
            
            {/* AI ROADMAP GENERATOR */}
            {userId && (
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mt-8">
                <h2 className="text-xl font-bold mb-6 text-gray-900">Generate New Roadmap</h2>
                <GoalCreator userId={userId} onRoadmapCreated={fetchDashboardData} />
                <div className="mt-8">
                  <RoadmapDisplay userId={userId} />
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Secondary Info & Rooms */}
          <div className="md:col-span-1 space-y-6">
            
            {/* ACTIVE GOALS LIST */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Active Goals</h2>
              {goals.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No active goals.</p>
              ) : (
                <div className="space-y-3">
                  {goals.map((goal) => {
                    const isDone = completedToday[goal.id];
                    return (
                      <div key={goal.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50 flex flex-col gap-3">
                        <div>
                          <h4 className="font-bold text-gray-800 text-sm">{goal.title}</h4>
                          <p className="text-xs text-gray-500 mt-0.5">{goal.duration_days} Day Challenge</p>
                        </div>
                        <button
                          disabled={isDone}
                          onClick={() => handleCheckIn(goal.id, goal.points)}
                          className={`w-full py-2 rounded-lg text-sm font-bold transition ${
                            isDone
                              ? 'bg-green-100 text-green-700 cursor-default border border-green-200'
                              : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-600'
                          }`}
                        >
                          {isDone ? '✓ Checked In' : '+10 XP Check-In'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* FOCUS ROOMS */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-900">Live Focus Rooms</h2>
              </div>
              
              <div className="space-y-3">
                <CreatePrivateRoom />
                {suggestedGroups.map((group) => {
                  const hasJoined = joinedGroupIds.has(group.id);
                  return (
                    <div key={group.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                      <h4 className="font-bold text-gray-800 text-sm">{group.name}</h4>
                      <p className="text-xs text-gray-500 mt-1 mb-3">{group.description}</p>
                      <button
                        onClick={() => router.push(hasJoined ? `/rooms/${group.id}` : '#')}
                        className="w-full py-2 bg-blue-50 text-blue-600 rounded-lg font-bold text-sm hover:bg-blue-100 transition"
                      >
                        {hasJoined ? 'Enter Room →' : 'Join Community'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}