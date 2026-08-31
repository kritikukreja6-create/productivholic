import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  // Await the dynamic route parameters
  const resolvedParams = await params;
  const username = resolvedParams.username;

  // 1. Initialize Supabase with async cookies
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

  // 2. Fetch the profile matching the URL username
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .maybeSingle();

  // If the user doesn't exist, show a clean 404 state
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

  // 3. Fetch user's active goals to calculate lifetime points
  const { data: goals } = await supabase
    .from('goals')
    .select('points, is_active')
    .eq('user_id', profile.id);

  const totalPoints = goals?.reduce((sum, goal) => sum + (goal.points || 0), 0) || 0;
  const activeChallenges = goals?.filter(g => g.is_active).length || 0;

  const displayBio = profile.bio || "B.Tech CSE Student | DSA in C | Full-Stack Web Dev";

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 transition font-semibold text-sm flex items-center gap-2 w-fit">
          &larr; Back to Dashboard
        </Link>

        {/* Profile Header Card */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex items-center gap-6">
          <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-4xl font-black shadow-inner border border-blue-100">
            {username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">@{username}</h1>
            <p className="text-gray-500 mt-2 font-medium">{displayBio}</p>
          </div>
        </div>

        {/* Gamified Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
            <span className="text-5xl font-black text-blue-600 tracking-tighter">{totalPoints}</span>
            <span className="text-sm text-gray-400 uppercase tracking-widest font-bold mt-2">Lifetime Points</span>
          </div>
          
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
            <span className="text-5xl font-black text-gray-800 tracking-tighter">{activeChallenges}</span>
            <span className="text-sm text-gray-400 uppercase tracking-widest font-bold mt-2">Active Challenges</span>
          </div>
        </div>

      </div>
    </main>
  );
}