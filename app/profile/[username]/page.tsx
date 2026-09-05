import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
// IMPORT YOUR NEW COMPONENT
import AvatarUpload from '@/components/AvatarUpload'; 
import EditProfile from '@/components/EditProfile';

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

  // 1. Fetch profile details
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
        <Link
          href="/dashboard"
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold shadow-sm text-sm"
        >
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

  // 3. Fetch AI Roadmap tasks
  const { data: roadmap } = await supabase
    .from('ai_roadmap')
    .select('*')
    .eq('user_id', profile.id);

  const totalPoints = goals?.reduce((sum, g) => sum + (g.points || 0), 0) || 0;
  const activeGoals = goals?.filter((g) => g.is_active) || [];
  const queuedGoals = goals?.filter((g) => !g.is_active) || [];

  const totalTasks = roadmap?.length || 0;
  const completedTasks = roadmap?.filter((t) => t.status === 'completed')?.length || 0;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const nextTask = roadmap?.find((t) => t.status === 'active' || t.status === 'locked');

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-12 text-gray-800">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <Link
          href="/dashboard"
          className="text-blue-600 hover:text-blue-800 transition font-semibold text-sm flex items-center gap-2 w-fit"
        >
          &larr; Back to Dashboard
        </Link>

        {/* Centered Profile Header */}
        <div className="bg-white p-10 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center relative">
          
          <div className="absolute top-6 right-6 bg-blue-50/60 px-4 py-2 rounded-xl border border-blue-100 text-center hidden md:block">
            <div className="text-2xl font-black text-blue-600">{totalPoints}</div>
            <div className="text-[10px] text-blue-500 font-bold uppercase tracking-wider mt-0.5">
              Lifetime Points
            </div>
          </div>

          {/* USE THE NEW AVATAR COMPONENT HERE */}
          <div className="mb-4">
            <AvatarUpload 
              userId={profile.id} 
              username={username} 
              initialAvatarUrl={profile.avatar_url} 
            />
          </div>

          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            @{username}
          </h1>
          
          {profile.college ? (
            <p className="text-blue-600 font-bold text-lg mt-2">
              {profile.college}
            </p>
          ) : (
            <p className="text-blue-600 font-bold text-lg mt-2">Guru Tegh Bahadur Institute of Technology</p>
          )}

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
            <p className="text-gray-500 text-sm mt-3 max-w-lg">
              Full-Stack Web Development & DSA Problem Solving
            </p>
          )}
        </div>

        {/* Progress & Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Roadmap Progress
              </h3>
              <div className="text-4xl font-black text-gray-900 mt-2">
                {completionPercentage}%
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 font-medium">
                {completedTasks} of {totalTasks} milestones completed
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 md:col-span-2 flex flex-col justify-between">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Next Up / Active Focus
            </h3>
            {nextTask ? (
              <div className="bg-blue-50/40 p-4 rounded-lg border border-blue-100">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                  {nextTask.timeframe}
                </span>
                <p className="font-semibold text-gray-900 mt-1">
                  {nextTask.task_title}
                </p>
              </div>
            ) : (
              <p className="text-gray-400 text-sm italic py-4">
                No active roadmap milestones remaining.
              </p>
            )}
          </div>
        </div>

        {/* Active & Queued Goals Section */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Active Goals</h2>
            {activeGoals.length === 0 ? (
              <p className="text-gray-400 text-sm italic mt-2">
                No active challenges in progress.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {activeGoals.map((goal) => (
                  <div key={goal.id} className="p-4 border border-gray-100 rounded-lg bg-gray-50/50 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{goal.title}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">{goal.duration_days} Day Challenge</p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-blue-600">{goal.points}</span>
                      <span className="text-xs text-gray-400 block uppercase font-bold">Pts</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {queuedGoals.length > 0 && (
            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                Queued / Pending Goals
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {queuedGoals.map((goal) => (
                  <div key={goal.id} className="p-4 border border-gray-100 rounded-lg bg-gray-50/30 flex justify-between items-center opacity-75">
                    <div>
                      <h4 className="font-semibold text-gray-800 text-sm">{goal.title}</h4>
                      <p className="text-xs text-gray-400 mt-0.5">{goal.duration_days} Day Challenge (Queued)</p>
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-600 font-bold px-2 py-1 rounded">Upcoming</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}