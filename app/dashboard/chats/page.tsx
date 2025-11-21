"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Send, Hash, Globe, Menu, X, RefreshCw, Ghost, MessageSquare } from "lucide-react";

export default function ChatPage() {
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [activeChannel, setActiveChannel] = useState<string>("Global");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const isFetching = useRef(false);

  const departments = [
    "Project Management", "Marketing", "Content Creation", "IT", 
    "AI", "HR", "SG", "External Relations"
  ];

  useEffect(() => {
    const storedUser = localStorage.getItem("ets_user");
    if (!storedUser) return;
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);

    // 1. Initial Fetch
    fetchMessages(activeChannel);

    // 2. Polling Fallback (Every 2s)
    const intervalId = setInterval(() => fetchMessages(activeChannel, true), 2000);

    // 3. Realtime Listener
    const channel = supabase
      .channel('chat_room')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chats' },
        () => fetchMessages(activeChannel, true) // Just trigger a refresh
      )
      .subscribe();

    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [activeChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // --- THE FIX: DECOUPLED FETCHING ---
  // This fetches messages first, THEN finds the usernames. It cannot crash.
  const fetchMessages = async (channelName: string, isBackground = false) => {
    if (isFetching.current) return;
    isFetching.current = true;

    try {
      // A. Get Messages ONLY (No Join)
      let query = supabase.from("chats").select("*").order("created_at", { ascending: true });

      if (channelName === "Global") {
        query = query.eq("scope", "Global");
      } else {
        query = query.eq("scope", "Department").eq("target_dept", channelName);
      }

      const { data: msgData, error: msgError } = await query;
      
      if (msgError) {
        if (!isBackground) console.error("Msg Fetch Error:", msgError);
        return;
      }

      // B. Get User Names for these messages
      if (msgData && msgData.length > 0) {
        // Extract unique sender IDs
        const senderIds = [...new Set(msgData.map((m: any) => m.sender_id))];
        
        // Fetch user details
        const { data: userData } = await supabase
          .from("users")
          .select("id, full_name, role")
          .in("id", senderIds);

        // C. Combine them manually
        const combinedData = msgData.map((msg: any) => {
          const sender = userData?.find((u: any) => u.id === msg.sender_id);
          return {
            ...msg,
            users: sender || { full_name: "Unknown Member", role: "Member" }
          };
        });

        // Update State (Avoid flicker)
        setMessages(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(combinedData)) return combinedData;
          return prev;
        });
      } else {
        setMessages([]);
      }

    } finally {
      isFetching.current = false;
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msgPayload = {
      sender_id: user.id,
      scope: activeChannel === "Global" ? "Global" : "Department",
      target_dept: activeChannel === "Global" ? null : activeChannel,
      message_text: newMessage,
    };

    setNewMessage("");
    await supabase.from("chats").insert([msgPayload]);
    setTimeout(() => fetchMessages(activeChannel), 100);
  };

  if (!user) return <div className="flex h-screen items-center justify-center bg-gray-900 text-white">Loading...</div>;

  return (
    <div className="h-[calc(100vh-100px)] flex bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-2xl relative">
      
      {/* SIDEBAR */}
      <div className={`absolute inset-y-0 left-0 transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 w-64 bg-gray-950 border-r border-gray-800 flex flex-col transition-transform duration-200 z-20`}>
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Text Channels</h2>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400"><X size={20}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <button onClick={() => { setActiveChannel("Global"); setIsSidebarOpen(false); }} className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 transition ${activeChannel === "Global" ? "bg-brand-primary text-white" : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"}`}>
            <Globe size={18} /> Global Chat
          </button>
          {departments.map(dept => (
            <button key={dept} onClick={() => { setActiveChannel(dept); setIsSidebarOpen(false); }} className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 transition ${activeChannel === dept ? "bg-gray-800 text-white border-l-2 border-brand-accent" : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"}`}>
              <Hash size={18} className="opacity-50" /> {dept}
            </button>
          ))}
        </div>
        <div className="p-3 bg-black/20 border-t border-gray-800 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-xs font-bold text-white">{user.full_name[0]}</div>
          <div className="overflow-hidden"><p className="text-xs text-white font-bold truncate">{user.full_name}</p><p className="text-[10px] text-gray-500 truncate">{user.role}</p></div>
        </div>
      </div>

      {/* MAIN CHAT */}
      <div className="flex-1 flex flex-col bg-gray-900 relative">
        <button onClick={() => setIsSidebarOpen(true)} className="md:hidden absolute top-4 left-4 z-10 bg-gray-800 p-2 rounded text-white"><Menu size={20} /></button>
        
        {/* Header */}
        <div className="h-16 border-b border-gray-800 flex items-center px-6 md:px-6 pl-16 bg-gray-900 shadow-sm z-0 justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            {activeChannel === "Global" ? <Globe size={24} className="text-brand-primary" /> : <Hash size={24} className="text-gray-400" />}
            {activeChannel}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-green-500 uppercase font-bold tracking-wider bg-green-500/10 px-2 py-1 rounded-full">
             <RefreshCw size={12} className="animate-spin" /> Live Sync
          </div>
        </div>

        {/* MESSAGES LIST */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 relative">
          {messages.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 opacity-50">
               <Ghost size={64} strokeWidth={1} className="mb-4" />
               <p className="text-lg font-medium">It's quiet here...</p>
               <p className="text-sm">Be the first to say hello!</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isMe = msg.sender_id === user.id;
              const senderName = msg.users?.full_name || "Unknown User";
              const role = msg.users?.role || "Member";
              const showHeader = index === 0 || messages[index - 1].sender_id !== msg.sender_id;

              return (
                <div key={index} className={`flex gap-4 ${isMe ? "flex-row-reverse" : "flex-row"} group`}>
                  <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-white mt-1 ${showHeader ? (role === 'Member' ? 'bg-gray-700' : 'bg-brand-primary') : 'invisible'}`}>
                    {senderName[0]}
                  </div>
                  <div className={`flex flex-col max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                    {showHeader && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-white hover:underline cursor-pointer">{senderName}</span>
                        <span className="text-[10px] text-gray-500">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {role !== "Member" && <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${role === 'Developer' ? 'bg-red-500/20 text-red-400' : 'bg-brand-primary/20 text-blue-400'}`}>{role}</span>}
                      </div>
                    )}
                    <div className={`px-4 py-2 rounded-2xl ${isMe ? "bg-brand-primary text-white rounded-tr-none" : "bg-gray-800 text-gray-100 rounded-tl-none"}`}>
                      <p className="text-sm leading-relaxed">{msg.message_text}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT AREA */}
        <div className="p-4 bg-gray-900">
          <form onSubmit={handleSendMessage} className="bg-gray-800 rounded-xl flex items-center px-4 py-2 border border-gray-700 focus-within:border-brand-accent transition shadow-lg">
            <div className="p-2 bg-gray-700/50 rounded-full mr-3 text-gray-400">
              <MessageSquare size={18} />
            </div>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Message #${activeChannel}...`}
              className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none py-2"
            />
            <button 
              type="submit" 
              disabled={!newMessage.trim()}
              className="p-2 text-brand-accent hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}