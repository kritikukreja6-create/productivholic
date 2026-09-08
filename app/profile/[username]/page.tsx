'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useParams, useRouter } from 'next/navigation';

export default function PublicProfile() {
  const params = useParams();
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [profile, setProfile] = useState<any>(null);
  const [badges, setBadges] = useState<string[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfileData() {
      const username = params.username as string;

      // 1. Fetch Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, total_xp')
        .eq('username', username)
        .single();

      if (profileError || !profileData) {
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // 2. Fetch Achievements
      const { data: achievementData } = await supabase
        .from('user_achievements')
        .select('badge_id')
        .eq('user_id', profileData.id);

      if (achievementData) {
        setBadges(achievementData.map(a => a.badge_id));
      }

      // 3. Fetch Recent Goals
      const { data: goalsData } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', profileData.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (goalsData) {
        setGoals(goalsData);
      }

      setLoading(false);
    }

    fetchProfileData();
  }, [params.username, supabase]);

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 font-bold">Loading Hacker Profile...</div>;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-gray-900">
        <h1 className="text-4xl font-black mb-4">404</h1>
        <p className="text-gray-500 mb-6 font-medium">This hacker hasn't joined the grid yet.</p>
        <button onClick={() => router.push('/leaderboard')} className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition">Return to Leaderboard</button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-12 text-gray-900">
      <div className="max-w-3xl mx-auto space-y-8">
        
        <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
          <button onClick={() => router.push('/leaderboard')} className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition shadow-sm">← Back</button>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900">Hacker Profile</h1>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-32 bg-blue-50 rounded-full blur-3xl -mr-16 -mt-16 z-0"></div>
          
          <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-lg flex items-center justify-center text-white text-4xl font-black z-10">
            {profile?.username?.charAt(0)?.toUpperCase() || 'H'}
          </div>
          
          <div className="text-center sm:text-left z-10">
            <h2 className="text-3xl font-black text-gray-900">@{profile.username}</h2>
            <div className="mt-4 inline-flex items-center gap-2 bg-yellow-50 border border-yellow-200 px-4 py-2 rounded-xl shadow-sm">
              <span className="text-2xl">🏆</span>
              <div className="flex flex-col text-left">
                <span className="text-sm font-bold text-yellow-800 leading-none">{profile.total_xp || 0}</span>
                <span className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest mt-1 leading-none">Total XP</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">Achievement Vault</h3>
          {badges.length === 0 ? (
            <p className="text-gray-500 font-medium italic text-sm">No badges earned yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {badges.map(badge => (
                <div key={badge} className="flex flex-col items-center justify-center p-4 bg-gray-50 border border-gray-100 rounded-2xl text-center shadow-sm">
                  <span className="text-3xl mb-2">
                    {badge === 'first_blood' ? '🎯' : badge === 'centurion' ? '💯' : '🏅'}
                  </span>
                  <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">
                    {badge.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">Recent Focus Goals</h3>
          {goals.length === 0 ? (
            <p className="text-gray-500 font-medium italic text-sm">No goals tracked yet.</p>
          ) : (
            <div className="space-y-4">
              {goals.map(goal => (
                <div key={goal.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-gray-800">{goal.title}</h4>
                    <p className="text-xs text-gray-500 mt-1">{goal.duration_days} Day Challenge</p>
                  </div>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                    +{goal.points || 0} XP
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}