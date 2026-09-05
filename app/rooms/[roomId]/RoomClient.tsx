'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function RoomClient({ roomId }: { roomId: string }) {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [messages, setMessages] = useState<{ user: string; text: string }[]>([]);
  const [input, setInput] = useState('');
  
  // NEW: State for current user and live participants
  const [username, setUsername] = useState('Focus Hacker');
  const [participants, setParticipants] = useState<any[]>([]);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    let roomChannel: any;

    async function setupRoom() {
      // 1. Fetch current user to identify them in chat and presence
      const { data: { user } } = await supabase.auth.getUser();
      let currentUsername = 'Focus Hacker';
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
        if (profile?.username) currentUsername = profile.username;
      }
      setUsername(currentUsername);

      // 2. Initialize Realtime Presence Channel
      roomChannel = supabase.channel(`room_${roomId}`, {
        config: {
          presence: { key: user?.id || Math.random().toString() },
        },
      });

      roomChannel
        .on('broadcast', { event: 'timer_sync' }, (payload: any) => setTimeLeft(payload.time))
        .on('broadcast', { event: 'new_message' }, (payload: any) => setMessages((prev) => [...prev, payload.message]))
        // Listen for anyone joining or leaving
        .on('presence', { event: 'sync' }, () => {
          const newState = roomChannel.presenceState();
          // Flatten the presence state object into a simple array of active users
          const activeUsers = Object.values(newState).map((userPresence: any) => userPresence[0]);
          setParticipants(activeUsers);
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            // Broadcast to everyone else that we have entered the room
            await roomChannel.track({
              user: currentUsername,
              onlineAt: new Date().toISOString(),
            });
          }
        });
    }

    setupRoom();

    return () => {
      if (roomChannel) supabase.removeChannel(roomChannel);
    };
  }, [roomId, supabase]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Use the actual fetched username
    const newMessage = { user: username, text: input };
    
    await supabase.channel(`room_${roomId}`).send({
      type: 'broadcast',
      event: 'new_message',
      message: newMessage,
    });

    setMessages((prev) => [...prev, newMessage]);
    setInput('');
  };

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* 1. Live Video Conference */}
      <div className="lg:col-span-2 bg-black rounded-xl overflow-hidden shadow-sm border border-gray-100 h-[600px]">
        <iframe
          src={`https://meet.jit.si/ProductivholicRoom_${roomId}`}
          allow="camera; microphone; fullscreen; display-capture"
          className="w-full h-full border-0"
        />
      </div>

      {/* 2. Right Sidebar: Timer & Chat */}
      <div className="flex flex-col gap-6 h-[600px]">
        
        {/* Pomodoro Timer & Header */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center flex-shrink-0 relative">
          
          {/* NEW: Live Presence Indicator */}
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-bold border border-green-100 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            {participants.length} {participants.length === 1 ? 'Person' : 'People'} Online
          </div>

          <button 
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert("Invite link copied to clipboard!");
            }}
            className="absolute top-4 right-4 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition border border-blue-100"
          >
            Copy Link
          </button>

          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-6 mb-2">Focus Room</h2>
          <div className="text-6xl font-black text-gray-900 tracking-tighter">
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
        </div>

        {/* Accountability Chat */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col flex-1 overflow-hidden">
          <div className="p-4 border-b border-gray-100 font-bold text-sm bg-gray-50">Accountability Chat</div>
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className="bg-blue-50/50 p-3 rounded-lg text-sm border border-blue-100/50">
                <span className="font-bold text-blue-600 mr-2">{msg.user}:</span>
                <span className="text-gray-700">{msg.text}</span>
              </div>
            ))}
          </div>
          <form onSubmit={sendMessage} className="p-3 border-t border-gray-100 bg-gray-50">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Encourage the room..."
              className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white outline-none"
            />
          </form>
        </div>

      </div>
    </div>
  );
}