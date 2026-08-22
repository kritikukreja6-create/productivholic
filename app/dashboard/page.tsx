'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function Dashboard() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Goal State
  const router = useRouter();
  const [goals, setGoals] = useState<any[]>([]);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [duration, setDuration] = useState(10);
  const [loading, setLoading] = useState(false);
  const [completedToday, setCompletedToday] = useState<Record<string, boolean>>({});

  // Matchmaking State
  const [suggestedGroups, setSuggestedGroups] = useState<any[]>([]);
  const [joinedGroupIds, setJoinedGroupIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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
    const { data: profileData } = await supabase
      .from('onboarding_responses')
      .select('field_of_interest_id')
      .eq('user_id', user.id)
      .single();

    if (profileData?.field_of_interest_id) {
      const { data: groupsData } = await supabase
        .from('focus_groups')
        .select('*')
        .eq('field_of_interest_id', profileData.field_of_interest_id);
      
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

  // ... (Keep handleCreateGoal and handleCheckIn exactly the same as before)
  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from('goals').insert({
        user_id: user.id, title: newGoalTitle, duration_days: duration, points: 0,
      });
      if (!error) { setNewGoalTitle(''); setDuration(10); fetchDashboardData(); }
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
        
        {/* TOP SECTION: Gamified Task Engine */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1 bg-white p-6 rounded-lg shadow-md h-fit">
            <h2 className="text-xl font-bold mb-4">Start a Challenge</h2>
            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">What is your goal?</label>
                <input type="text" required placeholder="e.g., Build a Next.js API" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" value={newGoalTitle} onChange={(e) => setNewGoalTitle(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Duration</label>
                <select className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                  <option value={10}>10 Days</option>
                  <option value={15}>15 Days</option>
                  <option value={20}>20 Days</option>
                  <option value={30}>30 Days</option>
                </select>
              </div>
              <button type="submit" disabled={loading || !newGoalTitle} className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50">
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

        {/* BOTTOM SECTION: Community Matchmaking */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Suggested Focus Rooms</h2>
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