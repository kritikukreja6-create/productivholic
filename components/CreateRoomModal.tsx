'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function CreateRoomModal({ onRoomCreated }: { onRoomCreated: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [topic, setTopic] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [scheduledFor, setScheduledFor] = useState('');
  const [passcode, setPasscode] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let scheduledTimestamp = null;
    if (scheduledFor) {
      scheduledTimestamp = new Date(scheduledFor).toISOString();
    }

    const { data: newRoom, error: roomError } = await supabase
      .from('focus_groups')
      .insert({ 
        name, 
        description, 
        topic, 
        is_public: isPublic,
        scheduled_for: scheduledTimestamp,
        creator_id: user.id,
        passcode: passcode.trim() !== '' ? passcode.trim() : null // Save the passcode if provided
      })
      .select('id')
      .single();

    if (newRoom && !roomError) {
      await supabase
        .from('group_members')
        .insert({ user_id: user.id, group_id: newRoom.id });
      
      setIsOpen(false);
      setName('');
      setDescription('');
      setTopic('');
      setScheduledFor('');
      setPasscode('');
      onRoomCreated();
    }
    
    setIsCreating(false);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition shadow-sm"
      >
        + Create Focus Room
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 font-bold"
            >
              ✕
            </button>
            
            <h2 className="text-2xl font-black text-gray-900 mb-6">New Focus Room</h2>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Room Name</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                  placeholder="e.g., Deep Work Sprint"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Topic / Goal</label>
                <input 
                  type="text" 
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                  placeholder="e.g., Physics, DSA, Writing"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Description</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 h-24 resize-none"
                  placeholder="What's the plan for this session?"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Schedule For (Optional)</label>
                <input 
                  type="datetime-local" 
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                />
              </div>

              {/* NEW: Passcode Field */}
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                <label className="block text-xs font-bold text-red-700 uppercase tracking-widest mb-2">Room Passcode (Optional)</label>
                <input 
                  type="text" 
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full p-3 bg-white border border-red-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-gray-900"
                  placeholder="Leave blank for an open room"
                />
                <p className="text-[10px] text-red-600 font-medium mt-2 leading-relaxed">
                  If you set a passcode, users will be required to enter it before they can join the session.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="public" 
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="public" className="text-sm font-bold text-gray-700">List publicly on Explore page</label>
              </div>

              <button 
                type="submit" 
                disabled={isCreating}
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-lg hover:bg-blue-700 transition shadow-md disabled:opacity-50 mt-4"
              >
                {isCreating ? 'Creating Room...' : 'Launch Room'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}