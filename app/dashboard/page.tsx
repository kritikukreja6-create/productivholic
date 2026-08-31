'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import GoalCreator from '@/components/GoalCreator';
import RoadmapDisplay from '@/components/RoadmapDisplay';
import Link from 'next/link';

export default function Dashboard() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const router = useRouter();
  
  // NEW: State to store the user ID for our AI components
   const [username, setUsername] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);



// Goal State
  const [goals, setGoals] = useState<any[]>([]);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [goalSelection, setGoalSelection] = useState(''); 
  const [duration, setDuration] = useState(10);
  const [loading, setLoading] = useState(false); // <-- Add this back
  const [completedToday, setCompletedToday] = useState<Record<string, boolean>>({}); // <-- Add this back

  // Matchmaking State
  const [suggestedGroups, setSuggestedGroups] = useState<any[]>([]);
  const [joinedGroupIds, setJoinedGroupIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // NEW: Save the user ID to state so we can pass it to components
    setUserId(user.id);
   const { data: profileData } = await supabase
  .from('profiles')
  .select('username')
  .eq('id', user.id)
  .maybeSingle();

if (profileData?.username) {
  setUsername(profileData.username);
}
   

    // 1. Fetch Goals & Penalties
    await supabase.rpc('enforce_penalties', { user_uid: user.id });
    
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
      setJoinedGroupIds(new Set(memberships.map(m => m.group_id)));
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from('goals').insert({
        user_id: user.id, title: newGoalTitle, duration_days: duration, points: 0,
      });
      if (!error) { setNewGoalTitle(''); setGoalSelection(''); setDuration(10); fetchDashboardData(); }
    }
    setLoading(false);
  };

  const handleCheckIn = async (goalId: string, currentPoints: number) => {
    const today = new Date().toISOString().split('T')[0];
    const { error: logError } = await supabase.from('daily_logs').insert({ goal_id: goalId, log_date: today, is_completed: true });
    if (!logError) {
      const { error: pointError } = await supabase.from('goals').update({ points: currentPoints + 10 }).eq('id', goalId);
      if (!pointError) {
        setCompletedToday((prev) => ({ ...prev, [goalId]: true }));
        fetchDashboardData();
      }
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from('group_members').insert({ group_id: groupId, user_id: user.id });
      if (!error) fetchDashboardData();
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8 text-gray-800">
  <div className="max-w-5xl mx-auto space-y-12">
    
    {/* TOP HEADER WITH PROFILE BUTTON */}
    <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <div>
        <h1 className="text-2xl font-bold">Productivity Dashboard</h1>
        <p className="text-sm text-gray-500">Track your goals and connect with your study groups.</p>
      </div>
      <Link 
        href={username ? `/profile/${username}` : '#'} 
        className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-semibold hover:bg-blue-100 transition shadow-sm"
      >
        View My Profile &rarr;
      </Link>
    </div>

    {/* TOP SECTION: Gamified Task Engine */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1 bg-white p-6 rounded-lg shadow-md h-fit">
            <h2 className="text-xl font-bold mb-4">Start a Challenge</h2>
        
            <form onSubmit={handleCreateGoal} className="space-y-4">
            <div>
            <label className="block text-sm font-medium mb-1">What is your goal?</label>
            <select 
            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 mb-2 bg-white"
            value={goalSelection}
            onChange={(e) => {
            setGoalSelection(e.target.value);
            if (e.target.value !== 'custom') {
            setNewGoalTitle(e.target.value);
            } else {
            setNewGoalTitle('');
            }
      }}
          required
         >
      <option value="" disabled>Select a trending goal...</option>
      <option value="Solve 20 DSA problems in C">Solve 20 DSA problems in C</option>
      <option value="Build a Full-Stack Next.js & Supabase App">Build a Full-Stack Next.js & Supabase App</option>
      <option value="Merge an SSoC Open Source PR">Merge an SSoC Open Source PR</option>
      <option value="Complete a Data Analysis project">Complete a Data Analysis project</option>
      <option value="custom">Other (Type a custom goal)</option>
      </select>

      {goalSelection === 'custom' && (
      <input 
        type="text" 
        required 
        placeholder="e.g., Read 10 pages of a book" 
        className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 animate-in fade-in slide-in-from-top-2" 
        value={newGoalTitle} 
        onChange={(e) => setNewGoalTitle(e.target.value)} 
      />
      )}
      </div>
  <div>
    <label className="block text-sm font-medium mb-1">Duration</label>
    <select className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 bg-white" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
      <option value={10}>10 Days</option>
      <option value={15}>15 Days</option>
      <option value={20}>20 Days</option>
      <option value={30}>30 Days</option>
    </select>
  </div>
  <button type="submit" disabled={loading || !newGoalTitle} className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50 transition">
    {loading ? 'Starting...' : 'Commit to Goal'}
  </button>
  </form>
          </div>

          <div className="md:col-span-2 space-y-4">
            <h2 className="text-2xl font-bold">Your Active Goals</h2>
            {goals.length === 0 ? (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-dashed border-gray-300 text-center text-gray-500">No active challenges right now. Set a goal to start earning points!</div>
            ) : (
              goals.map((goal) => {
                const isDone = completedToday[goal.id];
                return (
                  
                  <div key={goal.id} className="bg-white p-6 rounded-lg shadow-md flex justify-between items-center border-l-4 border-blue-600">
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold">{goal.title}</h3>
                      <p className="text-sm text-gray-500">{goal.duration_days} Day Challenge</p>
                      <button disabled={isDone} onClick={() => handleCheckIn(goal.id, goal.points)} className={`px-4 py-1.5 rounded text-sm font-semibold transition ${isDone ? 'bg-green-100 text-green-700 cursor-default' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
                        {isDone ? '✓ Completed Today' : 'Daily Check-In (+10 pts)'}
                      </button>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black text-blue-600">{goal.points}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Points</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* MIDDLE SECTION: AI Roadmap Generator */}
        {userId && (
          <div>
            <h2 className="text-2xl font-bold mb-6">AI-Powered Roadmap</h2>
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100">
              <GoalCreator userId={userId} />
              <RoadmapDisplay userId={userId} />
            </div>
          </div>
        )}

        <hr className="border-gray-200" />

        {/* BOTTOM SECTION: Community Matchmaking */}
        <div>
          <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Your Focus Rooms</h2>
          <button 
          onClick={() => router.push('/explore')}
          className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
          >
          Explore More Rooms &rarr;
          </button>
        </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {suggestedGroups.length === 0 ? (
              <div className="col-span-full text-gray-500 italic">No groups available for your interest yet.</div>
            ) : (
              suggestedGroups.map((group) => {
                const hasJoined = joinedGroupIds.has(group.id);
                return (
                  <div key={group.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold">{group.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                    </div>
                   
                    <button 
                      onClick={() => hasJoined ? router.push(`/rooms/${group.id}`) : handleJoinGroup(group.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold text-sm transition"
                    >
                      {hasJoined ? 'Enter Chat ->' : 'Join Room'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </main>
  );
}