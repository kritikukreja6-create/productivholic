'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function RoomClient({ roomId }: { roomId: string }) {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [messages, setMessages] = useState<{ user: string; text: string }[]>([]);
  const [input, setInput] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    // Initialize a real-time channel for this specific room
    const roomChannel = supabase.channel(`room_${roomId}`);

    roomChannel
      .on('broadcast', { event: 'timer_sync' }, (payload) => {
        setTimeLeft(payload.time);
      })
      .on('broadcast', { event: 'new_message' }, (payload) => {
        setMessages((prev) => [...prev, payload.message]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [roomId, supabase]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage = { user: 'User', text: input };
    
    // Broadcast message to all connected clients
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
      
      {/* 1. Live Video Conference (Jitsi Embedded) */}
      <div className="lg:col-span-2 bg-black rounded-xl overflow-hidden shadow-sm border border-gray-100 h-[600px]">
        <iframe
          src={`https://meet.jit.si/ProductivholicRoom_${roomId}`}
          allow="camera; microphone; fullscreen; display-capture"
          className="w-full h-full border-0"
        />
      </div>

      {/* 2. Right Sidebar: Timer & Chat */}
      <div className="flex flex-col gap-6 h-[600px]">
        
        {/* Pomodoro Timer */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center flex-shrink-0">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Focus Room</h2>
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
              className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm outline-none"
            />
          </form>
        </div>

      </div>
    </div>
  );
}