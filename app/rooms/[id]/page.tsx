'use client';

import PomodoroTimer from '../../../components/PomodoroTimer';
import { useState, useEffect, useRef, use, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';


export default function FocusRoom({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const resolvedParams = use(params);
  const roomId = resolvedParams.id;
  const [roomBgTheme, setRoomBgTheme] = useState('bg-gray-900');

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [groupName, setGroupName] = useState('Loading Room...');
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('Developer');
  
  // 1. New State for the Invite System
  const [incomingInvite, setIncomingInvite] = useState<{from: string, show: boolean}>({ from: '', show: false });
  const currentUserIdRef = useRef<string | null>(null);
  const channelRef = useRef<any>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchInitialData();
    
    // 2. Configure the Realtime Channel for Database and Broadcast
    const channel = supabase.channel(`room_${roomId}`, {
      config: { broadcast: { ack: false } }
    });

    channelRef.current = channel;

    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${roomId}` },
        () => { fetchMessages(); }
      )
      .on(
        'broadcast',
        { event: 'audio_invite' },
        ({ payload }) => {
          // 3. The Receiver: Check if this broadcast was meant for you
          if (payload.to === currentUserIdRef.current) {
            setIncomingInvite({ from: payload.fromName, show: true });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, supabase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchInitialData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      currentUserIdRef.current = user.id; // Save to ref for WebSocket access
      
      const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
      if (profile) setCurrentUserName(profile.username);
    }

    const { data: groupData } = await supabase.from('focus_groups').select('name').eq('id', roomId).single();
    if (groupData) setGroupName(groupData.name);
    
    fetchMessages();
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*, profiles(username)')
      .eq('group_id', roomId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUserId) return;
    const messageText = newMessage;
    setNewMessage(''); 
    await supabase.from('messages').insert({ group_id: roomId, user_id: currentUserId, content: messageText });
  };

  // 4. The Transmitter: Fire the invite payload
  const handleInviteToSpeak = async (targetUserId: string) => {
    if (channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'audio_invite',
        payload: { to: targetUserId, fromName: currentUserName },
      });
    }
  };

  const setupVideoGrid = useCallback(async (element: HTMLDivElement | null) => {
    if (!element || !currentUserId) return;
    const appID = Number(process.env.NEXT_PUBLIC_ZEGO_APP_ID);
    const serverSecret = process.env.NEXT_PUBLIC_ZEGO_SERVER_SECRET!;
    const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(appID, serverSecret, roomId, currentUserId, currentUserName);

    const zp = ZegoUIKitPrebuilt.create(kitToken);
    zp.joinRoom({
      container: element,
      showPreJoinView: true, // Bypasses the white holding screen
      turnOnMicrophoneWhenJoining: false, 
      turnOnCameraWhenJoining: false,
      showMyCameraToggleButton: true,
      showMyMicrophoneToggleButton: true,
      showAudioVideoSettingsButton: true,
      showScreenSharingButton: true,
      showTextChat: false, 
      showUserList: true,
      maxUsers: 50,
      layout: "Grid",
      showLayoutButton: true,
      scenario: { mode: "VideoConference" },
    });
  }, [currentUserId, currentUserName, roomId]);

  return (
    <main className={`h-screen ${roomBgTheme} flex flex-col overflow-hidden relative transition-colors duration-300`}>
      
      {/* Invite Modal Pop-up */}
      {incomingInvite.show && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-2xl max-w-sm w-full text-center space-y-4">
            <h3 className="text-xl font-black text-gray-900">Audio Request</h3>
            <p className="text-sm text-gray-600">
              <span className="font-bold text-blue-600">{incomingInvite.from}</span> has invited you to speak! Accept this request, then click the microphone button on your video feed to unmute.
            </p>
            <div className="flex space-x-3 justify-center pt-2">
              <button 
                onClick={() => setIncomingInvite({ show: false, from: '' })}
                className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition"
              >
                Decline
              </button>
              <button 
                onClick={() => setIncomingInvite({ show: false, from: '' })}
                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition shadow-lg shadow-blue-500/30"
              >
                Accept & Unmute
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE Header */}
      <div className="bg-gray-900 border-b border-gray-800 p-4 text-white flex justify-between items-center z-10 shrink-0">
        <div>
          <h1 className="text-xl font-bold">{groupName}</h1>
          <p className="text-xs text-gray-400">Live Co-Working Space</p>
        </div>
        <button 
          onClick={() => router.push('/dashboard')}
          className="text-sm bg-red-600 hover:bg-red-700 px-4 py-2 rounded transition font-semibold"
        >
          Leave Room
        </button>
      </div>

      {/* Synchronized Pomodoro Bar */}
      <div className="px-4 py-2 bg-gray-950 border-b border-gray-800 z-10 shrink-0">
        <PomodoroTimer 
          channel={channelRef.current} 
          onThemeChange={(theme) => setRoomBgTheme(theme)} 
        />
      </div>

      {/* Main Content Split: Video (Left) & Chat (Right) */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        
        {/* ... (Keep the rest of your video area and chat sidebar exactly as it is) ... */}
        
        {/* Video Area */}
        <div className="flex-1 bg-black relative" ref={currentUserId ? setupVideoGrid : null}>
          {!currentUserId && (
            <div className="absolute inset-0 flex items-center justify-center text-white font-medium">
              Loading secure video feed...
            </div>
          )}
        </div>

        {/* Chat Sidebar */}
        <div className="w-full md:w-96 bg-white flex flex-col border-l border-gray-200 shrink-0 h-[40vh] md:h-full">
          <div className="bg-gray-50 border-b border-gray-200 p-3 text-center font-bold text-gray-700 text-sm">
            Accountability Chat
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 mt-10 text-sm">
                No messages yet. Share what you are working on!
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.user_id === currentUserId;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    
                    {/* Username and Invite Button Header */}
                    <div className="flex items-center space-x-2 mb-1 px-1">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wide font-bold">
                        {isMe ? 'You' : msg.profiles?.username || 'Anonymous'}
                      </span>
                      
                      {!isMe && (
                        <button 
                          onClick={() => handleInviteToSpeak(msg.user_id)}
                          className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 px-2 py-0.5 rounded shadow-sm transition"
                        >
                          + Invite to Speak
                        </button>
                      )}
                    </div>

                    <div className={`px-4 py-2 rounded-2xl text-sm max-w-[85%] ${isMe ? 'bg-blue-600 text-white rounded-br-none shadow-md shadow-blue-500/20' : 'bg-gray-100 border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'}`}>
                      {msg.content}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-white border-t border-gray-200">
            <form onSubmit={handleSendMessage} className="flex space-x-2">
              <input 
                type="text" 
                placeholder="Type a message..."
                className="flex-1 border border-gray-300 p-2 text-sm rounded-full text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button 
                type="submit" 
                disabled={!newMessage.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition"
              >
                Send
              </button>
            </form>
          </div>
        </div>

      </div>
    </main>
  );
}