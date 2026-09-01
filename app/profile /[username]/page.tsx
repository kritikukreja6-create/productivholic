import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const resolvedParams = await params;
  const username = resolvedParams.username;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
      },
    }
  );

  // 1. Fetch profile details
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .maybeSingle();

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <h1 className="text-5xl font-black text-gray-900 mb-2">404</h1>
        <p className="text-gray-500 mb-6 font-medium">Profile @{username} not found.</p>
        <Link href="/dashboard" className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition shadow-sm font-semibold">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  // 2. Fetch active and completed goals
  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', profile.id);

  // 3. Fetch AI Roadmap tasks to track progress and next steps
  const { data: roadmap } = await supabase
    .from('ai_roadmap')
    .select('*')
    .eq('user_id', profile.id);

  const totalPoints = goals?.reduce((sum, g) => sum + (g.points || 0), 0) || 0;
  const activeGoals = goals?.filter(g => g.is_active) || [];
  
  // Calculate Roadmap completion percentage
  const totalTasks = roadmap?.length || 0;
  const completedTasks = roadmap?.filter(t => t.status === 'completed')?.length || 0;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Find the next pending task
  const nextTask = roadmap?.find(t => t.status === 'active' || t.status === 'locked');

  return (
    <main className="min-h-screen bg-gray-50 p-8 text-gray-800">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 transition font-semibold text-sm flex items-center gap-2 w-fit">
          &larr; Back to Dashboard
        </Link>

        {/* Profile Header */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-4xl font-black shadow-inner border border-blue-100">
              {username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">@{username}</h1>
              <p className="text-blue-600 font-semibold mt-1">GTBIT — B.Tech Computer Science & Engineering</p>
              <p className="text-gray-500 text-sm mt-1">{profile.bio || "Passionate full-stack developer & engineering student building productivity tools."}</p>
            </div>
          </div>
          <div className="bg-blue-50 px-6 py-4 rounded-lg border border-blue-100 text-center">
            <div className="text-3xl font-black text-blue-600">{totalPoints}</div>
            <div className="text-xs text-blue-400 font-bold uppercase tracking-wider">Lifetime Points</div>
          </div>
        </div>

        {/* Stats & Progress Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Roadmap Progress</h3>
            <div className="text-4xl font-black text-gray-900">{completionPercentage}%</div>
            <div className="w-full bg-gray-100 h-2 rounded-full mt-4 overflow-hidden">
              <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${completionPercentage}%` }}></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">{completedTasks} of {totalTasks} tasks completed</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 md:col-span-2 flex flex-col justify-between">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Next Up / Focus Step</h3>
            {nextTask ? (
              <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{nextTask.timeframe}</span>
                <p className="font-semibold text-gray-900 mt-1">{nextTask.task_title}</p>
              </div>
            ) : (
              <p className="text-gray-500 italic">No active roadmap step queued right now.</p>
            )}
          </div>

        </div>

        {/* Active Challenges Section */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Active Goals & Challenges</h2>
          {activeGoals.length === 0 ? (
            <p className="text-gray-500 italic">No active goals currently registered.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeGoals.map((goal) => (
                <div key={goal.id} className="p-4 border border-gray-100 rounded-lg bg-gray-50/50 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-gray-900">{goal.title}</h4>
                    <p className="text-xs text-gray-500 mt-1">{goal.duration_days} Day Challenge</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-blue-600">{goal.points}</span>
                    <span className="text-xs text-gray-400 block uppercase">Pts</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}