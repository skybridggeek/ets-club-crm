"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Send, Hash, Globe, Menu, X, RefreshCw, Ghost, MessageSquare, Trash2, AlertTriangle, User, Mail, Phone, Shield, Key, Copy } from "lucide-react";

export default function ChatPage() {
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [activeChannel, setActiveChannel] = useState<string>("Global");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const isFetching = useRef(false);
  const router = useRouter();

  // Modal States
  const [deleteMsgId, setDeleteMsgId] = useState<number | null>(null);
  const [viewingUser, setViewingUser] = useState<any>(null);
  
  // Long Press / Options Modal State
  const [optionsModal, setOptionsModal] = useState<{isOpen: boolean, msg: any} | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

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
        const { data: userData } = await supabase.from("users").select("id, full_name, role, club_id, email, phone, department, password_hash").in("id", senderIds);

        const combinedData = msgData.map((msg: any) => {
          const sender = userData?.find((u: any) => u.id === msg.sender_id);
          return { ...msg, users: sender || { full_name: "Unknown", role: "Member", club_id: "Unknown" } };
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

  // --- LONG PRESS LOGIC ---
  const handleTouchStart = (msg: any) => {
    longPressTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(50);
      setOptionsModal({ isOpen: true, msg });
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const promptDeleteMessage = (msgId: number) => {
    setOptionsModal(null);
    setDeleteMsgId(msgId);
  };

  const confirmDeleteMessage = async () => {
    if (!deleteMsgId) return;
    setMessages(prev => prev.filter(m => m.id !== deleteMsgId));
    await supabase.from("chats").delete().eq("id", deleteMsgId);
    setDeleteMsgId(null);
  };

  const handleAvatarClick = (clickedUser: any) => {
    setViewingUser(clickedUser);
  };

  const handleCopyText = () => {
    if (optionsModal?.msg) {
      navigator.clipboard.writeText(optionsModal.msg.message_text);
      setOptionsModal(null);
    }
  };

  if (!user) return <div className="flex h-screen items-center justify-center bg-gray-900 text-white">Loading...</div>;

  return (
    <div className="flex h-full bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-2xl relative">
      
      {/* SIDEBAR */}
      <div className={`absolute inset-y-0 left-0 transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 w-72 bg-gray-950 border-r border-gray-800 flex flex-col transition-transform duration-200 z-50 shadow-2xl md:shadow-none`}>
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-950">
          <h2 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Text Channels</h2>
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

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col bg-gray-900 relative w-full">
        
        {/* HEADER */}
        <div className="h-16 flex items-center px-4 bg-gray-800 border-b border-gray-700 shadow-md z-30 justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 rounded text-gray-300 hover:bg-gray-700 hover:text-white active:scale-95 transition"><Menu size={24} /></button>
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
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-4 bg-gray-900/50">
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
              
              // PERMISSION CHECK: Am I the sender OR am I a Developer?
              const canDelete = isMe || user.role === 'Developer';

              return (
                <div key={index} className={`flex gap-2 sm:gap-3 ${isMe ? "flex-row-reverse" : "flex-row"} group`}>
                  <button 
                    onClick={() => handleAvatarClick(msg.users)}
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0 flex items-center justify-center text-xs sm:text-sm font-bold text-white mt-1 transition hover:scale-110 ${showHeader ? (role === 'Member' ? 'bg-gray-700' : 'bg-brand-primary') : 'invisible'}`}
                  >
                    {senderName[0]}
                  </button>
                  
                  <div className={`flex flex-col max-w-[90%] sm:max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                    {showHeader && (
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-xs font-bold text-gray-300">{senderName}</span>
                        <span className="text-[10px] text-gray-600">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                    <div 
                      className={`px-4 py-2 rounded-2xl text-sm leading-relaxed break-words relative group ${isMe ? "bg-brand-primary text-white rounded-tr-none" : "bg-gray-800 text-gray-200 rounded-tl-none"}`}
                      onTouchStart={() => handleTouchStart(msg)}
                      onTouchEnd={handleTouchEnd}
                      onTouchMove={handleTouchEnd}
                    >
                      {msg.message_text}
                      {/* DESKTOP HOVER DELETE (For Sender OR Developer) */}
                      {canDelete && (
                        <button 
                          onClick={() => promptDeleteMessage(msg.id)}
                          className={`absolute top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-500 p-1 opacity-0 hidden md:block md:group-hover:opacity-100 transition ${isMe ? "-left-8" : "-right-8"}`}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
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
            <div className="p-2 bg-gray-800 rounded-full mr-2 text-gray-500 hidden sm:block"><MessageSquare size={16} /></div>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Message #${activeChannel}...`}
              className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none py-1 text-sm sm:text-base"
            />
            <button type="submit" disabled={!newMessage.trim()} className="p-2 text-brand-accent hover:text-white transition disabled:opacity-50"><Send size={18} /></button>
          </form>
        </div>
      </div>

      {/* --- MOBILE OPTIONS MODAL (Long Press) --- */}
      {optionsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-4 animate-fade-in" onClick={() => setOptionsModal(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl mb-4 sm:mb-0" onClick={e => e.stopPropagation()}>
             <div className="p-4 border-b border-gray-800 bg-gray-800/50">
               <p className="text-xs text-gray-400 font-bold uppercase">Message Options</p>
               <p className="text-white text-sm truncate mt-1 opacity-80">"{optionsModal.msg.message_text}"</p>
             </div>
             <div className="p-2 space-y-1">
               <button onClick={handleCopyText} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 text-white transition">
                 <div className="p-2 bg-gray-800 rounded-full"><Copy size={16}/></div> Copy Text
               </button>
               {/* Show Delete if Sender OR Developer */}
               {(optionsModal.msg.sender_id === user.id || user.role === 'Developer') && (
                 <button onClick={() => promptDeleteMessage(optionsModal.msg.id)} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-900/20 text-red-400 transition">
                   <div className="p-2 bg-red-900/30 rounded-full"><Trash2 size={16}/></div> 
                   {optionsModal.msg.sender_id === user.id ? "Unsend Message" : "Delete (Dev)"}
                 </button>
               )}
             </div>
             <div className="p-2 border-t border-gray-800"><button onClick={() => setOptionsModal(null)} className="w-full p-3 rounded-lg bg-gray-800 text-white font-bold">Cancel</button></div>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {deleteMsgId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-full max-w-sm shadow-2xl text-center">
             <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32} /></div>
             <h2 className="text-xl font-bold text-white mb-2">Delete Message?</h2>
             <p className="text-gray-400 text-sm mb-6">It will be removed for everyone.</p>
             <div className="flex gap-3">
               <button onClick={() => setDeleteMsgId(null)} className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 font-medium transition">Cancel</button>
               <button onClick={confirmDeleteMessage} className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition">Delete</button>
             </div>
          </div>
        </div>
      )}

      {/* --- PROFILE MODAL --- */}
      {viewingUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="h-24 bg-gradient-to-r from-brand-primary to-brand-accent relative">
               <button onClick={() => setViewingUser(null)} className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 rounded-full p-1"><X size={20} /></button>
            </div>
            <div className="px-6 pb-6 relative">
               <div className="-mt-12 mb-4"><div className="w-24 h-24 rounded-full bg-gray-900 p-1 mx-auto"><div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center text-4xl font-bold text-white border-2 border-brand-accent">{viewingUser.full_name?.[0]}</div></div></div>
               <div className="text-center mb-6"><h2 className="text-2xl font-bold text-white">{viewingUser.full_name}</h2><p className="text-brand-accent font-mono text-sm">{viewingUser.club_id}</p><span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${viewingUser.role === 'Admin' || viewingUser.role === 'Developer' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>{viewingUser.role}</span></div>
               <div className="bg-black/20 rounded-xl p-4 space-y-3 mb-4 border border-gray-800">
                 <div className="flex items-center gap-3 text-gray-300"><div className="p-2 bg-gray-800 rounded-lg text-brand-primary"><Mail size={16} /></div><div className="flex-1"><p className="text-xs text-gray-500 uppercase">Email</p><p className="text-sm font-medium select-all">{viewingUser.email || "Not Shared"}</p></div></div>
                 <div className="flex items-center gap-3 text-gray-300"><div className="p-2 bg-gray-800 rounded-lg text-green-500"><Phone size={16} /></div><div className="flex-1"><p className="text-xs text-gray-500 uppercase">Phone</p><p className="text-sm font-medium select-all">{viewingUser.phone || "Not Shared"}</p></div></div>
                 <div className="flex items-center gap-3 text-gray-300"><div className="p-2 bg-gray-800 rounded-lg text-orange-500"><Shield size={16} /></div><div className="flex-1"><p className="text-xs text-gray-500 uppercase">Department</p><p className="text-sm font-medium">{viewingUser.department || "General"}</p></div></div>
               </div>
               {user?.role === "Developer" && (<div className="bg-red-900/10 border border-red-900/30 rounded-xl p-4"><div className="flex items-center gap-2 text-red-400 mb-2"><Key size={16} /><p className="text-xs font-bold uppercase tracking-widest">Developer Access</p></div><div className="flex items-center justify-between"><p className="text-white font-mono text-lg select-all">{viewingUser.password_hash}</p><span className="text-[10px] text-gray-500">Password</span></div></div>)}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}