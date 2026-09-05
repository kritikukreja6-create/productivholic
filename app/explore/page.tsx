'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import CreateRoomModal from '@/components/CreateRoomModal';

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
  const [activeFilter, setActiveFilter] = useState<string>('All');

  useEffect(() => {
    async function fetchRooms() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: allGroups } = await supabase.from('focus_groups').select('*');
      
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
      await supabase.from('group_members').delete().match({ user_id: userId, group_id: groupId });
      setMemberships(prev => {
        const next = new Set(prev);
        next.delete(groupId);
        return next;
      });
    } else {
      await supabase.from('group_members').insert({ user_id: userId, group_id: groupId });
      setMemberships(prev => new Set(prev).add(groupId));
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 font-bold">Loading Communities...</div>;
  }

  const myRooms = groups.filter(g => memberships.has(g.id));
  const publicRooms = groups.filter(g => g.is_public && !memberships.has(g.id));
  
  const topics = ['All', ...Array.from(new Set(publicRooms.map(g => g.topic).filter(Boolean)))];
  
  const filteredPublicRooms = activeFilter === 'All' 
    ? publicRooms 
    : publicRooms.filter(g => g.topic === activeFilter);

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-12 text-gray-900">
      <div className="max-w-5xl mx-auto space-y-12">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900">Focus Hub</h1>
            <p className="text-gray-500 mt-1 font-medium">Join public study sessions, RSVP for upcoming events, or manage your groups.</p>
          </div>
          <CreateRoomModal onRoomCreated={() => window.location.reload()} />
        </div>

        {/* My Active Rooms */}
        {myRooms.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              My Rooms & RSVPs
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myRooms.map((group) => {
                const isScheduled = group.scheduled_for && new Date(group.scheduled_for) > new Date();
                return (
                  <div key={group.id} className="p-6 rounded-3xl border border-blue-200 bg-white shadow-md flex flex-col justify-between h-full">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-black text-gray-900 leading-tight">{group.name}</h3>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded-md">
                          {group.topic || 'General'}
                        </span>
                        {isScheduled && (
                          <span className="px-2 py-1 bg-purple-50 text-purple-700 text-[10px] font-black uppercase tracking-widest rounded-md">
                            📅 {new Date(group.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 font-medium mb-6 line-clamp-2">{group.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleToggleJoin(group.id, true)} className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-red-50 hover:text-red-600 transition">
                        Leave
                      </button>
                      <button onClick={() => router.push(`/rooms/${group.id}`)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-sm hover:bg-blue-700 transition">
                        {isScheduled ? 'View Session →' : 'Enter Room →'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Discover Public Rooms */}
        <section>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h2 className="text-xl font-bold text-gray-900">Discover Public Rooms</h2>
            
            <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto hide-scrollbar">
              {topics.map(topic => (
                <button
                  key={topic}
                  onClick={() => setActiveFilter(topic)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                    activeFilter === topic ? 'bg-gray-900 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          {filteredPublicRooms.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-gray-100 text-center">
              <p className="text-gray-500 font-medium">No public rooms available for this topic yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPublicRooms.map((group) => {
                const isScheduled = group.scheduled_for && new Date(group.scheduled_for) > new Date();
                return (
                  <div key={group.id} className="p-6 rounded-3xl border border-gray-100 bg-white shadow-sm flex flex-col justify-between h-full">
                    <div>
                      <h3 className="text-lg font-black text-gray-900 leading-tight mb-2">{group.name}</h3>
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-widest rounded-md">
                          {group.topic || 'General'}
                        </span>
                        {isScheduled && (
                          <span className="px-2 py-1 bg-purple-50 text-purple-700 text-[10px] font-black uppercase tracking-widest rounded-md">
                            📅 {new Date(group.scheduled_for).toLocaleDateString([], { month: 'short', day: 'numeric' })} @ {new Date(group.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 font-medium mb-6 line-clamp-2">{group.description}</p>
                    </div>
                    <button onClick={() => handleToggleJoin(group.id, false)} className="w-full py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:border-blue-500 hover:text-blue-600 transition">
                      {isScheduled ? 'RSVP to Session' : 'Join Community'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
        
      </div>
    </main>
  );
}