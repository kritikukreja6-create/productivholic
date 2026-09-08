'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function Leaderboard() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      // Fetch top 50 users ordered by total_xp
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, username, total_xp')
        .order('total_xp', { ascending: false })
        .limit(50);

      if (profiles) {
        // Fetch achievements for these profiles
        const userIds = profiles.map(p => p.id);
        const { data: achievements } = await supabase
          .from('user_achievements')
          .select('user_id, badge_id')
          .in('user_id', userIds);

        // Map achievements to each profile
        const leadersWithBadges = profiles.map(profile => ({
          ...profile,
          badges: achievements?.filter(a => a.user_id === profile.id).map(a => a.badge_id) || []
        }));

        setLeaders(leadersWithBadges);
      }
      setLoading(false);
    }
    fetchLeaderboard();
  }, [supabase]);

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 font-bold">Calculating Ranks...</div>;
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-12 text-gray-900">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
          <button 
            onClick={() => router.push('/dashboard')}
            className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition shadow-sm"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900">Global Leaderboard</h1>
            <p className="text-gray-500 mt-1 font-medium">The top focus hackers in the community.</p>
          </div>
        </div>

        {/* Leaderboard List */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          {leaders.length === 0 ? (
            <div className="p-8 text-center text-gray-500 font-medium">No hackers on the board yet.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {leaders.map((leader, index) => {
                const isCurrentUser = leader.id === currentUserId;
                const rank = index + 1;
                
                let rankBadge = <span className="text-gray-400 font-black w-8 text-center">{rank}</span>;
                let rowBg = isCurrentUser ? 'bg-blue-50/50' : 'bg-white hover:bg-gray-50';
                let nameStyle = 'text-gray-900 font-bold';

                if (rank === 1) {
                  rankBadge = <span className="text-2xl w-8 text-center">🥇</span>;
                  rowBg = isCurrentUser ? 'bg-yellow-50' : 'bg-gradient-to-r from-yellow-50/50 to-white hover:from-yellow-50';
                  nameStyle = 'text-yellow-700 font-black text-lg';
                } else if (rank === 2) {
                  rankBadge = <span className="text-2xl w-8 text-center">🥈</span>;
                  rowBg = isCurrentUser ? 'bg-gray-100' : 'bg-gradient-to-r from-gray-50 to-white hover:bg-gray-100';
                  nameStyle = 'text-gray-700 font-black text-lg';
                } else if (rank === 3) {
                  rankBadge = <span className="text-2xl w-8 text-center">🥉</span>;
                  rowBg = isCurrentUser ? 'bg-orange-50' : 'bg-gradient-to-r from-orange-50/30 to-white hover:bg-orange-50/50';
                  nameStyle = 'text-orange-800 font-black text-lg';
                }

                return (
                  <div key={leader.id} className={`p-4 sm:p-6 flex items-center justify-between transition-colors ${rowBg}`}>
                    <div className="flex items-center gap-4 sm:gap-6">
                      {rankBadge}
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className={nameStyle}>
                            @{leader.username || 'Anonymous'}
                          </span>
                          {isCurrentUser && <span className="text-[10px] uppercase tracking-widest bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">You</span>}
                        </div>
                        
                        {/* Render Badges */}
                        {leader.badges.length > 0 && (
                          <div className="flex gap-1.5 mt-1">
                            {leader.badges.map((badge: string) => (
                              <span key={badge} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                {badge === 'first_blood' ? '🎯 First Blood' : badge === 'centurion' ? '💯 Centurion' : badge}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black text-gray-900">{leader.total_xp || 0}</span>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">XP</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}