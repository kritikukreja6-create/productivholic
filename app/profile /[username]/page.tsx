'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PublicProfile() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [profile, setProfile] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  // Future Social State
  const [isFriend, setIsFriend] = useState(false);

  useEffect(() => {
    fetchProfileData();
  }, [username]);

  const fetchProfileData = async () => {
    // 1. Fetch the user's base profile
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('username', username)
      .single();

    if (error || !profileData) {
      setLoading(false);
      return;
    }
    setProfile(profileData);

    // 2. Fetch their active goals & calculate total points
    const { data: goalsData } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', profileData.id)
      .eq('is_active', true)
      .order('points', { ascending: false });

    if (goalsData) {
      setGoals(goalsData);
      setTotalPoints(goalsData.reduce((sum, goal) => sum + (goal.points || 0), 0));
    }

    // 3. Fetch their joined focus groups
    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', profileData.id);

    if (memberships && memberships.length > 0) {
      const groupIds = memberships.map(m => m.group_id);
      const { data: groupsData } = await supabase
        .from('focus_groups')
        .select('*')
        .in('id', groupIds);
        
      if (groupsData) setGroups(groupsData);
    }

    setLoading(false);
  };

  const handleAddFriend = () => {
    // Placeholder for Phase 3 Friends architecture
    alert('Friend request system coming next!');
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading profile...</div>;
  
  if (!profile) return (
    <div className="min-h-screen bg-gray-50 p-8 flex flex-col items-center justify-center text-gray-800">
      <h1 className="text-3xl font-bold mb-4">404 - User Not Found</h1>
      <p className="text-gray-600 mb-6">We couldn't find a productivity profile for @{username}.</p>
      <Link href="/explore" className="px-6 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700">
        Return to Explore
      </Link>
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-50 p-8 text-gray-800">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Navigation */}
        <Link href="/explore" className="text-gray-500 hover:text-gray-800 font-semibold text-sm inline-flex items-center">
          &larr; Back to Explore
        </Link>

        {/* Profile Header */}
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="h-24 w-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-4xl font-bold uppercase shadow-inner">
              {profile.username.charAt(0)}
            </div>
            <div>
              <h1 className="text-3xl font-bold">@{profile.username}</h1>
              <p className="text-gray-500 font-medium mt-1">Productivity Level: Novice</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6 w-full md:w-auto">
            <div className="text-center md:text-right border-r pr-6 border-gray-200">
              <div className="text-3xl font-black text-blue-600">{totalPoints}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Total Points</div>
            </div>
            <button 
              onClick={handleAddFriend}
              className="flex-1 md:flex-none px-6 py-3 bg-gray-900 text-white rounded font-bold hover:bg-gray-800 transition shadow-sm"
            >
              + Add Friend
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Active Goals Column */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span className="text-blue-600">⚡</span> Current Challenges
            </h2>
            {goals.length === 0 ? (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-dashed border-gray-300 text-gray-500">
                @{profile.username} has no active challenges right now.
              </div>
            ) : (
              goals.map((goal) => (
                <div key={goal.id} className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg">{goal.title}</h3>
                    <p className="text-sm text-gray-500">{goal.duration_days} Day Goal</p>
                  </div>
                  <div className="text-xl font-bold text-gray-800">{goal.points} <span className="text-xs text-gray-400">pts</span></div>
                </div>
              ))
            )}
          </div>

          {/* Focus Rooms Column */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span className="text-blue-600">📚</span> Study Groups
            </h2>
            {groups.length === 0 ? (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-dashed border-gray-300 text-gray-500">
                Not a member of any public focus rooms.
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.id} className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg">{group.name}</h3>
                  </div>
                  <button 
                    onClick={() => router.push(`/rooms/${group.id}`)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded hover:bg-gray-200 transition"
                  >
                    View Room
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </main>
  );
}