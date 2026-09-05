'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import CreatePrivateRoom from '@/components/CreatePrivateRoom';

export default function ExploreRooms() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRooms() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Fetch all available focus communities
      const { data: allGroups } = await supabase.from('focus_groups').select('*');
      
      // Fetch user's current joined rooms
      const { data: userMemberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (allGroups) setGroups(allGroups);
      if (userMemberships) {
        setMemberships(new Set(userMemberships.map(m => m.group_id)));
      }
      setLoading(false);
    }
    fetchRooms();
  }, [supabase]);

  const handleToggleJoin = async (groupId: string, isJoined: boolean) => {
    if (!userId) return;

    if (isJoined) {
      // Leave room
      await supabase.from('group_members').delete().match({ user_id: userId, group_id: groupId });
      setMemberships(prev => {
        const next = new Set(prev);
        next.delete(groupId);
        return next;
      });
    } else {
      // Join room
      await supabase.from('group_members').insert({ user_id: userId, group_id: groupId });
      setMemberships(prev => new Set(prev).add(groupId));
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 font-bold">Loading Communities...</div>;
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-12 text-gray-900">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900">Focus Rooms</h1>
            <p className="text-gray-500 mt-1 font-medium">Join a community and hold each other accountable.</p>
          </div>
          <CreatePrivateRoom />
        </div>

        {/* Communities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => {
            const isJoined = memberships.has(group.id);
            // Mocking active online users for the UI feel (could be tied to real DB presence later)
            const activeUsers = Math.floor(Math.random() * 5) + 1; 

            return (
              <div 
                key={group.id} 
                className={`p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-between h-full ${
                  isJoined ? 'bg-white border-blue-200 shadow-md' : 'bg-white border-gray-100 shadow-sm'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-lg font-black text-gray-900 leading-tight">{group.name}</h2>
                    {isJoined && (
                      <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 font-medium mb-6 line-clamp-2">
                    {group.description}
                  </p>
                </div>

                <div className="space-y-3">
                  {isJoined && (
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-50 p-2 rounded-lg justify-center border border-gray-100">
                      👥 {activeUsers} focusing now
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    {isJoined ? (
                      <>
                        <button 
                          onClick={() => handleToggleJoin(group.id, true)}
                          className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-red-50 hover:text-red-600 transition"
                        >
                          Leave
                        </button>
                        <button 
                          onClick={() => router.push(`/rooms/${group.id}`)}
                          className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-sm hover:bg-blue-700 transition"
                        >
                          Enter Room →
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={() => handleToggleJoin(group.id, false)}
                        className="w-full py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:border-blue-500 hover:text-blue-600 transition"
                      >
                        Join Community
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
      </div>
    </main>
  );
}