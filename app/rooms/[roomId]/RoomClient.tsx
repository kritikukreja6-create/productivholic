'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Editor from '@monaco-editor/react';
import { analyzeCode } from '@/app/actions/analyzecode';
import toast from 'react-hot-toast';

export default function RoomClient({ roomId }: { roomId: string }) {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [messages, setMessages] = useState<{ user: string; text: string }[]>([]);
  const [input, setInput] = useState('');
  
  const [username, setUsername] = useState('Focus Hacker');
  const [participants, setParticipants] = useState<any[]>([]);

  // Editor State
  const [activeTab, setActiveTab] = useState<'chat' | 'code'>('code');
  const [language, setLanguage] = useState('c');
  const [code, setCode] = useState(
`// Write your DSA logic here...
#include <stdio.h>

int main() {
    printf("Hello, Hacker!\\n");
    return 0;
}`
  );

  // Gemini AI States
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // NEW: Auth & Lock States
  const [isHost, setIsHost] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [roomPasscode, setRoomPasscode] = useState<string | null>(null);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // EFFECT 1: Check Room Access & Passcode
  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser();
      let currentUsername = 'Focus Hacker';
      
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
        if (profile?.username) currentUsername = profile.username;

        const { data: roomData } = await supabase.from('focus_groups').select('creator_id, passcode').eq('id', roomId).single();
        
        if (roomData) {
          if (roomData.creator_id === user.id) {
            setIsHost(true);
            setIsAuthenticated(true); // Host always bypasses the lock
          } else if (roomData.passcode) {
            setRoomPasscode(roomData.passcode);
            setIsAuthenticated(false); // Lock the room
          } else {
            setIsAuthenticated(true); // No passcode required
          }
        }
      }
      setUsername(currentUsername);
      setIsCheckingAccess(false);
    }

    checkAccess();
  }, [roomId, supabase]);

  // EFFECT 2: Connect to Channel (Only runs if Authenticated)
  useEffect(() => {
    if (!isAuthenticated || isCheckingAccess) return;

    let roomChannel: any;

    async function setupChannel() {
      const { data: { user } } = await supabase.auth.getUser();
      
      roomChannel = supabase.channel(`room_${roomId}`, {
        config: { presence: { key: user?.id || Math.random().toString() } },
      });

      roomChannel
        .on('broadcast', { event: 'timer_sync' }, (payload: any) => setTimeLeft(payload.time))
        .on('broadcast', { event: 'new_message' }, (payload: any) => setMessages((prev) => [...prev, payload.message]))
        .on('broadcast', { event: 'code_sync' }, (payload: any) => {
          setCode((prev) => prev !== payload.code ? payload.code : prev);
          if (payload.language) setLanguage(payload.language);
        })
        .on('presence', { event: 'sync' }, () => {
          const newState = roomChannel.presenceState();
          const activeUsers = Object.values(newState).map((userPresence: any) => userPresence[0]);
          setParticipants(activeUsers);
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            await roomChannel.track({ user: username, onlineAt: new Date().toISOString() });
          }
        });
    }

    setupChannel();

    return () => {
      if (roomChannel) supabase.removeChannel(roomChannel);
    };
  }, [roomId, supabase, isAuthenticated, isCheckingAccess, username]);

  const handleAskAI = async (intent: 'explain' | 'debug' | 'optimize') => {
    setIsAnalyzing(true);
    setAiResponse("✨ Gemini is analyzing your code..."); 

    const result = await analyzeCode(code, language, intent);
    if (result.success) {
      setAiResponse(result.data || "No response generated.");
    } else {
      setAiResponse("Error: Could not reach the AI.");
    }
    setIsAnalyzing(false);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const newMessage = { user: username, text: input };
    await supabase.channel(`room_${roomId}`).send({ type: 'broadcast', event: 'new_message', message: newMessage });
    setMessages((prev) => [...prev, newMessage]);
    setInput('');
  };

  const handleCodeChange = async (value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    await supabase.channel(`room_${roomId}`).send({ type: 'broadcast', event: 'code_sync', code: newCode, language: language });
  };

  const handleLanguageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    await supabase.channel(`room_${roomId}`).send({ type: 'broadcast', event: 'code_sync', code: code, language: newLang });
  };

  const handleHostResetTimer = async () => {
    const newTime = 25 * 60;
    setTimeLeft(newTime);
    await supabase.channel(`room_${roomId}`).send({ type: 'broadcast', event: 'timer_sync', time: newTime });
  };

  const handleHostClearEditor = async () => {
    const clearedCode = '// Editor cleared by host';
    setCode(clearedCode);
    await supabase.channel(`room_${roomId}`).send({ type: 'broadcast', event: 'code_sync', code: clearedCode, language: language });
  };

  // NEW: Passcode Submit Handler
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcodeInput === roomPasscode) {
      setIsAuthenticated(true);
    } else {
      setPasscodeError(true);
      setPasscodeInput('');
    }
  };

  // --- RENDERING GUARDS ---

  if (isCheckingAccess) {
    return <div className="min-h-[600px] flex items-center justify-center text-gray-500 font-bold">Securing connection...</div>;
  }

  // NEW: Lock Screen UI
  if (!isAuthenticated) {
    return (
      <div className="min-h-[600px] flex flex-col items-center justify-center bg-gray-50 p-6 rounded-3xl">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center border border-gray-100">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">
            🔒
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Private Session</h2>
          <p className="text-gray-500 text-sm font-medium mb-6">Enter the host's passcode to join the room.</p>
          
          <form onSubmit={handleUnlock} className="space-y-4">
            <input 
              type="password" 
              value={passcodeInput}
              onChange={(e) => {
                setPasscodeInput(e.target.value);
                setPasscodeError(false);
              }}
              className={`w-full p-4 bg-gray-50 border ${passcodeError ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'} rounded-xl outline-none text-center font-black tracking-widest transition`}
              placeholder="••••••••" 
            />
            {passcodeError && <p className="text-xs text-red-500 font-bold">Incorrect passcode.</p>}
            
            <button 
              type="submit" 
              className="w-full py-4 bg-gray-900 text-white rounded-xl font-black hover:bg-black transition shadow-md"
            >
              Unlock Room
            </button>
          </form>
        </div>
      </div>
    );
  }

  // MAIN ROOM UI (Only rendered if authenticated)
  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* 1. Live Video Conference */}
      <div className="lg:col-span-2 bg-black rounded-xl overflow-hidden shadow-sm border border-gray-100 h-[600px] relative">
        <iframe
          src={`https://meet.jit.si/ProductivholicRoom_${roomId}`}
          allow="camera; microphone; fullscreen; display-capture"
          className="w-full h-full border-0"
        />
        {/* Host Indicator */}
        {isHost && (
          <div className="absolute top-4 left-4 bg-red-600/90 text-white px-3 py-1.5 rounded-lg text-xs font-black tracking-widest uppercase shadow-lg backdrop-blur-sm z-10">
            👑 Host
          </div>
        )}
      </div>

      {/* 2. Right Sidebar: Timer & Interactive Panel */}
      <div className="flex flex-col gap-6 h-[600px]">
        
        {/* Pomodoro Timer & Header */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center flex-shrink-0 relative">
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-bold border border-green-100 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            {participants.length} {participants.length === 1 ? 'Person' : 'People'} Online
          </div>

          <button 
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success("Invite link copied!");
            }}
            className="absolute top-4 right-4 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition border border-blue-100"
          >
            Copy Link
          </button>

          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-6 mb-2">Focus Room</h2>
          <div className="text-6xl font-black text-gray-900 tracking-tighter">
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>

          {/* Host Controls UI */}
          {isHost && (
            <div className="w-full mt-4 pt-4 border-t border-gray-100 flex gap-2">
              <button 
                onClick={handleHostResetTimer}
                className="flex-1 text-[10px] font-bold uppercase tracking-widest bg-red-50 text-red-600 py-2 rounded-lg hover:bg-red-100 transition"
              >
                Reset Timer
              </button>
              <button 
                onClick={handleHostClearEditor}
                className="flex-1 text-[10px] font-bold uppercase tracking-widest bg-gray-100 text-gray-600 py-2 rounded-lg hover:bg-gray-200 transition"
              >
                Clear Code
              </button>
            </div>
          )}
        </div>

        {/* Tabbed Panel: Chat vs Code */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col flex-1 overflow-hidden">
          <div className="flex border-b border-gray-100 bg-gray-50 text-sm font-bold">
            <button 
              onClick={() => setActiveTab('code')} 
              className={`flex-1 py-3 transition-colors ${activeTab === 'code' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Live Editor
            </button>
            <button 
              onClick={() => setActiveTab('chat')} 
              className={`flex-1 py-3 transition-colors ${activeTab === 'chat' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Chat
            </button>
          </div>

          {activeTab === 'chat' ? (
            <>
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
            </>
          ) : (
            <div className="flex-1 flex flex-col bg-[#1e1e1e]">
              <div className="flex justify-between items-center p-2 bg-[#252526] border-b border-[#333]">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 ml-2">Pair Programming</span>

                  {/* AI Assistant Buttons */}
                  <div className="flex gap-1.5 ml-4 border-l border-[#444] pl-4">
                    <button onClick={() => handleAskAI('explain')} disabled={isAnalyzing} className="text-[10px] font-bold uppercase tracking-wide bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 px-2 py-1 rounded transition disabled:opacity-50">Explain</button>
                    <button onClick={() => handleAskAI('debug')} disabled={isAnalyzing} className="text-[10px] font-bold uppercase tracking-wide bg-red-500/10 text-red-400 hover:bg-red-500/20 px-2 py-1 rounded transition disabled:opacity-50">Debug</button>
                    <button onClick={() => handleAskAI('optimize')} disabled={isAnalyzing} className="text-[10px] font-bold uppercase tracking-wide bg-green-500/10 text-green-400 hover:bg-green-500/20 px-2 py-1 rounded transition disabled:opacity-50">Optimize</button>
                  </div>
                </div>

                <select 
                  value={language}
                  onChange={handleLanguageChange}
                  className="bg-[#3c3c3c] text-xs text-white px-2 py-1 rounded border-none outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="c">C</option>
                  <option value="cpp">C++</option>
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                </select>
              </div>

              <div className="flex-1 w-full relative flex flex-col overflow-hidden">
                <div className={aiResponse ? "h-3/5 relative" : "h-full relative"}>
                  <Editor
                    height="100%"
                    language={language}
                    theme="vs-dark"
                    value={code}
                    onChange={handleCodeChange}
                    options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: 'on', padding: { top: 16 } }}
                  />
                </div>

                {/* Gemini Response Panel */}
                {aiResponse && (
                  <div className="h-2/5 bg-[#1e1e1e] border-t border-[#333] p-4 overflow-y-auto flex flex-col shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.3)] z-10">
                    <div className="flex justify-between items-center mb-4 sticky top-0 bg-[#1e1e1e] pb-2 border-b border-[#333]">
                      <span className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                        {isAnalyzing && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>}
                        Gemini AI Analysis
                      </span>
                      <button onClick={() => setAiResponse(null)} className="text-gray-500 hover:text-gray-300 text-xs font-bold transition">✕ Close</button>
                    </div>
                    <div className="text-[13px] text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                      {aiResponse}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}