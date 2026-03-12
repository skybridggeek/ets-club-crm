"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { notifyAll } from "@/lib/notify";
import { Send, Trash2, AlertCircle, AlertTriangle } from "lucide-react";

export default function FeedbackPage() {
  const [user, setUser] = useState<any>(null);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [newContent, setNewContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("ets_user");
    if (!storedUser) return;
    setUser(JSON.parse(storedUser));
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    const { data } = await supabase
      .from("feedback")
      .select("*, users(full_name, role, club_id)")
      .order("created_at", { ascending: false });
    
    if (data) setFeedbacks(data);
    setLoading(false);
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    const { error } = await supabase.from("feedback").insert([
      { user_id: user.id, content: newContent }
    ]);

    if (!error) {
      setNewContent("");
      fetchFeedbacks();
      await notifyAll({
        title: "💬 New Feedback",
        body: `${user.full_name}: ${newContent.slice(0, 80)}${newContent.length > 80 ? "..." : ""}`,
        url: "/dashboard/feedback",
        exclude_user_id: user.id,
      });
    }
  };

  const promptDelete = (id: number) => setDeleteId(id);

  const confirmDelete = async () => {
    if (!deleteId) return;
    await supabase.from("feedback").delete().eq("id", deleteId);
    setDeleteId(null);
    fetchFeedbacks();
  };

  const canDelete = (item: any) => {
    if (!user) return false;
    if (user.role === "Developer") return true;
    if (user.role === "Admin") return true;
    if (item.user_id === user.id) {
      const postTime = new Date(item.created_at).getTime();
      const currentTime = new Date().getTime();
      return (currentTime - postTime) / 1000 / 60 <= 10;
    }
    return false;
  };

  if (loading) return <div className="text-white p-10">Loading Wall...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 relative pb-20">
      
      <div className="text-center space-y-2 mt-4">
        <h1 className="text-3xl font-bold text-white">Community Feedback</h1>
        <p className="text-gray-400 text-sm px-4">Voices of the ETS Club. Open and Transparent.</p>
      </div>

      {/* INPUT FORM */}
      <div className="bg-gray-800 p-4 md:p-6 rounded-xl border border-gray-700 shadow-lg">
        <form onSubmit={handlePost} className="flex flex-col md:flex-row gap-4">
          {/* Avatar - Centered on mobile, Left on Desktop */}
          <div className="flex justify-center md:justify-start">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-md">
              {user?.full_name[0]}
            </div>
          </div>
          
          <div className="flex-1 space-y-3">
             <textarea
               value={newContent}
               onChange={(e) => setNewContent(e.target.value)}
               placeholder="Share your thoughts..."
               className="w-full bg-gray-900 border border-gray-700 rounded-lg p-4 text-white focus:outline-none focus:border-brand-accent min-h-[100px] text-sm md:text-base"
             />
             
             {/* Footer Actions - Stacked on mobile for space */}
             <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <AlertCircle size={12} />
                  Publicly visible with your name.
                </p>
                <button 
                  type="submit" 
                  disabled={!newContent.trim()}
                  className="w-full sm:w-auto bg-brand-primary hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={16} /> Post Feedback
                </button>
             </div>
          </div>
        </form>
      </div>

      {/* FEEDBACK LIST */}
      <div className="space-y-4">
        {feedbacks.map((item) => (
          <div key={item.id} className="bg-gray-800/50 p-5 rounded-xl border border-gray-700/50 hover:border-gray-600 transition relative group">
             <div className="flex justify-between items-start mb-3">
               <div className="flex items-center gap-3">
                 <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${item.users?.role === 'Member' ? 'bg-gray-700' : 'bg-brand-primary'}`}>
                   {item.users?.full_name[0]}
                 </div>
                 <div>
                   <div className="flex items-center gap-2">
                     <p className="text-white font-bold text-sm">{item.users?.full_name}</p>
                     {item.users?.role !== 'Member' && <span className="text-[10px] bg-blue-900/50 text-blue-200 px-1.5 py-0.5 rounded">{item.users?.role}</span>}
                   </div>
                   <p className="text-xs text-gray-500">
                     {new Date(item.created_at).toLocaleString()}
                   </p>
                 </div>
               </div>

               {canDelete(item) && (
                 <button 
                   onClick={() => promptDelete(item.id)}
                   className="text-gray-500 hover:text-red-500 transition p-2 hover:bg-red-500/10 rounded-full"
                   title="Delete"
                 >
                   <Trash2 size={16} />
                 </button>
               )}
             </div>
             
             {/* Message Content - Better spacing */}
             <p className="text-gray-300 leading-relaxed text-sm md:text-base pl-0 md:pl-[52px]">
               {item.content}
             </p>
          </div>
        ))}
        {feedbacks.length === 0 && <div className="text-center py-10 text-gray-500 text-sm">No feedback yet.</div>}
      </div>

      {/* DELETE MODAL */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-full max-w-sm shadow-2xl text-center">
             <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32} /></div>
             <h2 className="text-xl font-bold text-white mb-2">Delete Feedback?</h2>
             <p className="text-gray-400 text-sm mb-6">This action cannot be undone.</p>
             <div className="flex gap-3">
               <button onClick={() => setDeleteId(null)} className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 font-medium transition">Cancel</button>
               <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition">Delete</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}