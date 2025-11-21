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

    fetchMessages(activeChannel);
    const intervalId = setInterval(() => fetchMessages(activeChannel, true), 2000);

    const channel = supabase
      .channel('chat_room')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chats' },
        () => fetchMessages(activeChannel, true)
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

  const fetchMessages = async (channelName: string, isBackground = false) => {
    if (isFetching.current) return;
    isFetching.current = true;

    try {
      let query = supabase.from("chats").select("*").order("created_at", { ascending: true });

      if (channelName === "Global") {
        query = query.eq("scope", "Global");
      } else {
        query = query.eq("scope", "Department").eq("target_dept", channelName);
      }

      const { data: msgData, error } = await query;
      if (error && !isBackground) console.error(error);

      if (msgData && msgData.length > 0) {
        const senderIds = [...new Set(msgData.map((m: any) => m.sender_id))];
        const { data: userData } = await supabase.from("users").select("id, full_name, role").in("id", senderIds);

        const combinedData = msgData.map((msg: any) => {
          const sender = userData?.find((u: any) => u.id === msg.sender_id);
          return { ...msg, users: sender || { full_name: "Unknown", role: "Member" } };
        });

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
    <div className="h-[80vh] md:h-[calc(100vh-100px)] flex bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-2xl relative">
      
      {/* --- SIDEBAR --- */}
      <div className={`absolute inset-y-0 left-0 transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 w-72 bg-gray-950 border-r border-gray-800 flex flex-col transition-transform duration-200 z-50 shadow-2xl md:shadow-none`}>
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-950">
          <h2 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Channels</h2>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 p-2"><X size={24}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <button onClick={() => { setActiveChannel("Global"); setIsSidebarOpen(false); }} className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition ${activeChannel === "Global" ? "bg-brand-primary text-white font-bold" : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"}`}>
            <Globe size={20} /> Global Chat
          </button>
          {departments.map(dept => (
            <button key={dept} onClick={() => { setActiveChannel(dept); setIsSidebarOpen(false); }} className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition ${activeChannel === dept ? "bg-gray-800 text-white border-l-4 border-brand-accent" : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"}`}>
              <Hash size={20} className="opacity-50" /> {dept}
            </button>
          ))}
        </div>
        <div className="p-4 bg-black/40 border-t border-gray-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-primary flex items-center justify-center text-sm font-bold text-white">{user.full_name[0]}</div>
          <div className="overflow-hidden"><p className="text-sm text-white font-bold truncate">{user.full_name}</p><p className="text-xs text-gray-500 truncate">{user.role}</p></div>
        </div>
      </div>

      {/* OVERLAY */}
      {isSidebarOpen && <div className="absolute inset-0 bg-black/80 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

      {/* --- MAIN CHAT AREA --- */}
      <div className="flex-1 flex flex-col bg-gray-900 relative w-full">
        
        {/* HEADER */}
        <div className="h-16 flex items-center px-4 bg-gray-800 border-b border-gray-700 shadow-md z-30 justify-between shrink-0">
          <div className="flex items-center gap-4">
            {/* Bigger Menu Button for Mobile */}
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 -ml-2 rounded text-gray-300 hover:bg-gray-700 hover:text-white active:scale-95 transition">
              <Menu size={28} />
            </button>
            <div className="flex items-center gap-2 text-white font-bold text-lg">
              {activeChannel === "Global" ? <Globe size={20} className="text-brand-primary" /> : <Hash size={20} className="text-gray-400" />}
              <span className="truncate max-w-[180px]">{activeChannel}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-green-400 uppercase font-bold tracking-wider bg-green-900/20 px-2 py-1 rounded-full border border-green-900/50">
             <RefreshCw size={10} className="animate-spin" /> Live
          </div>
        </div>

        {/* MESSAGES */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 bg-gray-900/50">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-600 opacity-50">
               <Ghost size={48} strokeWidth={1} className="mb-2" />
               <p className="text-sm">No messages yet...</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isMe = msg.sender_id === user.id;
              const senderName = msg.users?.full_name || "Unknown";
              const role = msg.users?.role || "Member";
              const showHeader = index === 0 || messages[index - 1].sender_id !== msg.sender_id;

              return (
                <div key={index} className={`flex gap-2 sm:gap-3 ${isMe ? "flex-row-reverse" : "flex-row"} group`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0 flex items-center justify-center text-xs sm:text-sm font-bold text-white mt-1 ${showHeader ? (role === 'Member' ? 'bg-gray-700' : 'bg-brand-primary') : 'invisible'}`}>
                    {senderName[0]}
                  </div>
                  
                  {/* Bubble Container */}
                  <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                    {showHeader && (
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-xs font-bold text-gray-300">{senderName}</span>
                        <span className="text-[10px] text-gray-600">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                    {/* Message Bubble */}
                    <div className={`px-4 py-2 rounded-2xl text-sm leading-relaxed break-words ${isMe ? "bg-brand-primary text-white rounded-tr-none" : "bg-gray-800 text-gray-200 rounded-tl-none"}`}>
                      {msg.message_text}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT */}
        <div className="p-3 bg-gray-800 border-t border-gray-700 shrink-0">
          <form onSubmit={handleSendMessage} className="bg-gray-900 rounded-xl flex items-center px-3 py-2 border border-gray-700 focus-within:border-brand-accent transition">
            <div className="p-2 bg-gray-800 rounded-full mr-2 text-gray-500 hidden sm:block">
              <MessageSquare size={16} />
            </div>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Message #${activeChannel}...`}
              className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none py-2 text-sm sm:text-base"
            />
            <button type="submit" disabled={!newMessage.trim()} className="p-2 text-brand-accent hover:text-white transition disabled:opacity-50">
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}