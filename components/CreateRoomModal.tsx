'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function CreateRoomModal({ onRoomCreated }: { onRoomCreated: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [topic, setTopic] = useState('General');
  const [isPublic, setIsPublic] = useState(false);
  const [scheduledFor, setScheduledFor] = useState(''); // NEW: State for scheduling

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const predefinedTopics = ['General', 'Computer Science', 'DSA', 'Web Development', 'Design', 'Exam Prep'];

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Convert local datetime-local string to proper ISO timestamp for Supabase, if provided
    const scheduledTimestamp = scheduledFor ? new Date(scheduledFor).toISOString() : null;

    const { data: newRoom, error: roomError } = await supabase
      .from('focus_groups')
      .insert({ 
        name, 
        description, 
        topic, 
        is_public: isPublic,
        scheduled_for: scheduledTimestamp 
      })
      .select('id')
      .single();

    if (!roomError && newRoom) {
      await supabase.from('group_members').insert({ user_id: user.id, group_id: newRoom.id });
      setIsOpen(false);
      setName('');
      setDescription('');
      setIsPublic(false);
      setTopic('General');
      setScheduledFor('');
      onRoomCreated();
    }
    setLoading(false);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="px-5 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition shadow-sm text-sm"
      >
        + Create Room
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl my-8">
            <h2 className="text-xl font-black text-gray-900 mb-6">Create a Focus Room</h2>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Room Name</label>
                <input required type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Midnight Hackers" className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Topic</label>
                  <select value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                    {predefinedTopics.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Schedule (Optional)</label>
                  <input 
                    type="datetime-local" 
                    value={scheduledFor} 
                    onChange={(e) => setScheduledFor(e.target.value)} 
                    className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What are we focusing on?" className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none h-20" />
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                <input type="checkbox" id="isPublic" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" />
                <label htmlFor="isPublic" className="text-sm font-semibold text-blue-900">
                  Make this room public <br/><span className="text-xs font-medium text-blue-700">Anyone can discover and join.</span>
                </label>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsOpen(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50">
                  {loading ? 'Creating...' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}