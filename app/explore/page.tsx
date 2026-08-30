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

  // NEW: Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchExploreData();
  }, []);

  const fetchExploreData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/');
      return;
    }

    const { data: groups } = await supabase
      .from('focus_groups')
      .select('*')
      .order('created_at', { ascending: false });

    if (groups) setAllGroups(groups);

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
      const { error } = await supabase.from('group_members').insert({ group_id: groupId, user_id: user.id });
      if (!error) setJoinedGroupIds(prev => new Set([...prev, groupId]));
    } else {
      const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', user.id);
      if (!error) {
        setJoinedGroupIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(groupId);
          return newSet;
        });
      }
    }
  };

  // NEW: Create Room Logic
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // 1. Create the new room
      const { data: newGroup, error: groupError } = await supabase
        .from('focus_groups')
        .insert({ name: newRoomName, description: newRoomDesc })
        .select()
        .single();

      if (newGroup && !groupError) {
        // 2. Automatically join the creator to their new room
        await supabase.from('group_members').insert({ group_id: newGroup.id, user_id: user.id });
        
        // 3. Update UI instantly
        setAllGroups(prev => [newGroup, ...prev]);
        setJoinedGroupIds(prev => new Set([...prev, newGroup.id]));
        
        // 4. Reset Modal
        setIsModalOpen(false);
        setNewRoomName('');
        setNewRoomDesc('');
      } else {
        alert("Make sure your focus_groups table has an RLS policy allowing INSERT!");
      }
    }
    setIsCreating(false);
  };

  const filteredGroups = allGroups.filter(group => 
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (group.description && group.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) return <div className="p-8 text-center text-gray-500">Loading communities...</div>;

  return (
    <main className="min-h-screen bg-gray-50 p-8 text-gray-800 relative">
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

        {/* Search & Create Bar */}
        <div className="flex gap-4">
          <input 
            type="text" 
            placeholder="Search for topics, subjects, or skills..." 
            className="flex-1 p-3 rounded-lg shadow-sm border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-sm hover:bg-blue-700 transition"
          >
            + Create Room
          </button>
        </div>

        {/* Community List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredGroups.length === 0 ? (
            <div className="col-span-full text-center text-gray-500 py-8">No communities found. Why not create one?</div>
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
                        <button onClick={() => router.push(`/rooms/${group.id}`)} className="px-4 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 font-semibold text-sm transition">
                          Enter Chat
                        </button>
                      )}
                      <button onClick={() => toggleMembership(group.id, !hasJoined)} className={`px-4 py-2 rounded font-semibold text-sm transition ${hasJoined ? 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
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

      {/* NEW: Create Room Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Host a New Room</h2>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Room Name</label>
                <input 
                  type="text" 
                  required 
                  maxLength={40}
                  placeholder="e.g., Road Safety Hackathon Team" 
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                <textarea 
                  maxLength={150}
                  placeholder="What is this focus room about?" 
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                  value={newRoomDesc}
                  onChange={(e) => setNewRoomDesc(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-semibold"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isCreating || !newRoomName}
                  className="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Launch Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}