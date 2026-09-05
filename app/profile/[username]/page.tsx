import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
import AvatarUpload from '@/components/AvatarUpload'; 
import EditProfile from '@/components/EditProfile';

// Rank Title Generator based on Level
const getRankTitle = (level: number) => {
  if (level < 3) return 'Novice Starter';
  if (level < 6) return 'Focused Learner';
  if (level < 10) return 'Consistency Scholar';
  if (level < 15) return 'Deep Work Master';
  return 'Productivity Grandmaster';
};

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .maybeSingle();

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-800 p-6">
        <h1 className="text-6xl font-black text-gray-900 mb-2">404</h1>
        <p className="text-gray-500 mb-6 font-medium text-lg">
          Profile <span className="text-blue-600 font-semibold">@{username}</span> could not be found.
        </p>
        <Link href="/dashboard" className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold shadow-sm text-sm">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const { data: goals } = await supabase.from('goals').select('*').eq('user_id', profile.id);
  const { data: roadmap } = await supabase.from('ai_roadmap').select('*').eq('user_id', profile.id);

  // --- XP & LEVEL CALCULATION ---
  const totalXP = goals?.reduce((sum, g) => sum + (g.points || 0), 0) || 0;
  
  // Every 100 XP = 1 Level
  const currentLevel = Math.floor(totalXP / 100) + 1;
  const xpInCurrentLevel = totalXP % 100;
  const xpRequiredForNext = 100; // Flat 100 XP per level for early momentum
  const levelProgressPercentage = Math.round((xpInCurrentLevel / xpRequiredForNext) * 100);
  
  const rankTitle = getRankTitle(currentLevel);
  // ------------------------------

  const activeGoals = goals?.filter((g) => g.is_active) || [];
  const queuedGoals = goals?.filter((g) => !g.is_active) || [];

  const totalTasks = roadmap?.length || 0;
  const completedTasks = roadmap?.filter((t) => t.status === 'completed')?.length || 0;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const nextTask = roadmap?.find((t) => t.status === 'active' || t.status === 'locked');

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-12 text-gray-800">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 transition font-semibold text-sm flex items-center gap-2 w-fit">
          &larr; Back to Mission Control
        </Link>

        {/* Centered Profile Header with XP Gamification */}
        <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center relative overflow-hidden">
          
          {/* XP & Level Badge (Top Right) */}
          <div className="absolute top-6 right-6 flex flex-col items-end hidden md:flex">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 rounded-xl text-white shadow-md flex items-center gap-2">
              <span className="text-2xl font-black">{totalXP}</span>
              <span className="text-xs font-bold uppercase tracking-widest opacity-80">XP</span>
            </div>
          </div>

          <div className="mb-4 relative z-10">
            <AvatarUpload userId={profile.id} username={username} initialAvatarUrl={profile.avatar_url} />
          </div>

          <h1 className="text-3xl font-black text-gray-900 tracking-tight">@{username}</h1>
          
          {/* Dynamic Gamification Rank */}
          <div className="mt-2 inline-flex items-center gap-2 bg-purple-50 border border-purple-100 px-4 py-1.5 rounded-full">
            <span className="flex h-2 w-2 rounded-full bg-purple-500 animate-pulse"></span>
            <span className="text-purple-700 font-bold text-sm">Level {currentLevel} • {rankTitle}</span>
          </div>

          <p className="text-blue-600 font-bold text-lg mt-4">{profile.college || 'Guru Tegh Bahadur Institute of Technology'}</p>
          <p className="text-gray-500 font-medium text-sm mt-1">
            {profile.course || 'B.Tech CSE Student'} {profile.year ? `• ${profile.year}` : ''}
          </p>

          {profile.skills ? (
            <div className="mt-4 bg-gray-50 px-4 py-1.5 rounded-full border border-gray-200 inline-block">
              <p className="text-gray-700 text-sm font-semibold">
                Skills: <span className="text-gray-500 font-medium">{profile.skills}</span>
              </p>
            </div>
          ) : (
            <p className="text-gray-500 text-sm mt-3 max-w-lg">Full-Stack Web Development & DSA Problem Solving</p>
          )}

          {/* Level Progress Bar */}
          <div className="w-full max-w-md mt-8">
            <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              <span>Level {currentLevel}</span>
              <span>{xpInCurrentLevel} / {xpRequiredForNext} XP</span>
            </div>
            <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-1000 ease-out"
                style={{ width: `${levelProgressPercentage}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2 font-medium">Complete focus sessions to reach Level {currentLevel + 1}!</p>
          </div>
        </div>

        {/* Progress & Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Roadmap Progress</h3>
              <div className="text-4xl font-black text-gray-900 mt-2">{completionPercentage}%</div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${completionPercentage}%` }} />
              </div>
              <p className="text-xs text-gray-500 mt-2 font-medium">{completedTasks} of {totalTasks} milestones completed</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 md:col-span-2 flex flex-col justify-between">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Next Up / Active Focus</h3>
            {nextTask ? (
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{nextTask.timeframe}</span>
                <p className="font-semibold text-gray-900 mt-1">{nextTask.task_title}</p>
              </div>
            ) : (
              <p className="text-gray-400 text-sm italic py-4">No active roadmap milestones remaining.</p>
            )}
          </div>
        </div>

        {/* Active & Queued Goals Section */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Active Goals</h2>
            {activeGoals.length === 0 ? (
              <p className="text-gray-400 text-sm italic mt-2">No active challenges in progress.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {activeGoals.map((goal) => (
                  <div key={goal.id} className="p-4 border border-gray-100 rounded-xl bg-gray-50 flex justify-between items-center hover:shadow-sm transition">
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{goal.title}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">{goal.duration_days} Day Challenge</p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-blue-600">{goal.points}</span>
                      <span className="text-xs text-gray-400 block uppercase font-bold tracking-widest">XP</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="pt-2">
          <EditProfile userId={profile.id} />
        </div>
        
      </div>
    </main>
  );
}