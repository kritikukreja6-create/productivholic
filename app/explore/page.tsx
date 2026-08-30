'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ExploreRooms() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [allGroups, setAllGroups] = useState<any[]>([]);
  const [joinedGroupIds, setJoinedGroupIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExploreData();
  }, []);

  const fetchExploreData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/');
      return;
    }

    // Fetch ALL available groups
    const { data: groups } = await supabase
      .from('focus_groups')
      .select('*')
      .order('name', { ascending: true });

    if (groups) setAllGroups(groups);

    // Fetch the groups this specific user has joined
    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id);

    if (memberships) {
      setJoinedGroupIds(new Set(memberships.map(m => m.group_id)));
    }
    
    setLoading(false);
  };

  const toggleMembership = async (groupId: string, isJoining: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (isJoining) {
      // Join the group
      const { error } = await supabase
        .from('group_members')
        .insert({ group_id: groupId, user_id: user.id });
        
      if (!error) {
        setJoinedGroupIds(prev => new Set([...prev, groupId]));
      }
    } else {
      // Leave the group
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);
        
      if (!error) {
        setJoinedGroupIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(groupId);
          return newSet;
        });
      }
    }
  };

  // Filter groups based on the search bar
  const filteredGroups = allGroups.filter(group => 
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (group.description && group.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) return <div className="p-8 text-center text-gray-500">Loading communities...</div>;

  return (
    <main className="min-h-screen bg-gray-50 p-8 text-gray-800">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header & Navigation */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Explore Communities</h1>
            <p className="text-gray-600 mt-2">Discover and join focus rooms based on your current goals.</p>
          </div>
          <Link href="/dashboard" className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-semibold transition">
            &larr; Back to Dashboard
          </Link>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <input 
            type="text" 
            placeholder="Search for topics, subjects, or skills (e.g., React, DSA, Marketing)..." 
            className="w-full p-2 outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Community List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredGroups.length === 0 ? (
            <div className="col-span-full text-center text-gray-500 py-8">No communities found matching "{searchQuery}"</div>
          ) : (
            filteredGroups.map((group) => {
              const hasJoined = joinedGroupIds.has(group.id);
              return (
                <div key={group.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-bold">{group.name}</h3>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{group.description}</p>
                  </div>
                  
                  <div className="mt-6 flex justify-between items-center border-t pt-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      {hasJoined ? 'Joined' : 'Not Joined'}
                    </span>
                    
                    <div className="space-x-3">
                      {hasJoined && (
                        <button 
                          onClick={() => router.push(`/rooms/${group.id}`)}
                          className="px-4 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 font-semibold text-sm transition"
                        >
                          Enter Chat
                        </button>
                      )}
                      <button 
                        onClick={() => toggleMembership(group.id, !hasJoined)}
                        className={`px-4 py-2 rounded font-semibold text-sm transition ${
                          hasJoined 
                            ? 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600' 
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {hasJoined ? 'Leave' : 'Join Room'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </main>
  );
}