"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { 
  Users, Activity, UserPlus, Megaphone, Calendar, MapPin, 
  Video, Trash2, X, Send, Link as LinkIcon, ExternalLink, 
  FileText, Instagram, Linkedin, Plus, AlertTriangle 
} from "lucide-react";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({ total: 0, active: 0, new: 0 });
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Modal States
  const [showPostModal, setShowPostModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  
  // NEW: State for deleting a link confirmation
  const [linkToDelete, setLinkToDelete] = useState<number | null>(null); 

  // Post Form Data
  const [postType, setPostType] = useState<'General' | 'Meeting'>('General');
  const [postData, setPostData] = useState({ title: "", content: "", meetingDate: "", location: "" });

  // Link Form Data
  const [newLink, setNewLink] = useState({ title: "", url: "", platform: "Generic" });

  useEffect(() => {
    const init = async () => {
      const storedUser = localStorage.getItem("ets_user");
      if (!storedUser) { router.push("/"); return; }
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);

      await Promise.all([
        fetchAnnouncements(),
        fetchLinks(),
        parsedUser.role !== "Member" ? fetchStats() : Promise.resolve()
      ]);
      setLoading(false);
    };
    init();
  }, [router]);

  // --- DATA FETCHING ---
  const fetchAnnouncements = async () => {
    const { data } = await supabase.from("announcements").select("*, users(full_name, role)").order("created_at", { ascending: false });
    if (data) setAnnouncements(data);
  };

  const fetchLinks = async () => {
    const { data } = await supabase.from("quick_links").select("*").order("created_at", { ascending: true });
    if (data) setLinks(data);
  };

  const fetchStats = async () => {
    const { count: total } = await supabase.from("users").select("*", { count: 'exact', head: true });
    const { count: active } = await supabase.from("users").select("*", { count: 'exact', head: true }).eq("is_active", true);
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { count: newMembers } = await supabase.from("users").select("*", { count: 'exact', head: true }).gte("created_at", firstDay);
    setStats({ total: total || 0, active: active || 0, new: newMembers || 0 });
  };

  // --- ACTIONS: ANNOUNCEMENTS ---
  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    let finalContent = postData.content;
    if (postType === 'Meeting') {
      finalContent += `\n\n📅 Date: ${new Date(postData.meetingDate).toLocaleString()}\n📍 Location/Link: ${postData.location}`;
    }
    const { error } = await supabase.from("announcements").insert([{
      author_id: user.id, title: postData.title, content: finalContent, is_meeting: postType === 'Meeting'
    }]);
    if (!error) {
      setShowPostModal(false);
      setPostData({ title: "", content: "", meetingDate: "", location: "" });
      fetchAnnouncements();
    }
  };

  const handleDeletePost = async (id: number) => {
    if (!confirm("Delete this announcement?")) return;
    await supabase.from("announcements").delete().eq("id", id);
    fetchAnnouncements();
  };

  // --- ACTIONS: LINKS ---
  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("quick_links").insert([newLink]);
    if (!error) {
      setNewLink({ title: "", url: "", platform: "Generic" });
      fetchLinks();
    }
  };

  // UPDATED: Just opens the confirmation modal
  const promptDeleteLink = (id: number) => {
    setLinkToDelete(id);
  };

  // NEW: Actually deletes the link
  const confirmDeleteLink = async () => {
    if (!linkToDelete) return;
    await supabase.from("quick_links").delete().eq("id", linkToDelete);
    setLinkToDelete(null); // Close modal
    fetchLinks(); // Refresh list
  };

  // --- HELPER: GET ICON & COLOR ---
  const getLinkStyle = (platform: string) => {
    switch (platform) {
      case "Telegram": return { icon: Send, color: "bg-[#229ED9] hover:bg-[#1e8ab0]" };
      case "Zoom": return { icon: Video, color: "bg-[#2D8CFF] hover:bg-[#2679db]" };
      case "Drive": return { icon: FileText, color: "bg-[#1FA463] hover:bg-[#1b8c54]" };
      case "Instagram": return { icon: Instagram, color: "bg-pink-600 hover:bg-pink-700" };
      case "LinkedIn": return { icon: Linkedin, color: "bg-[#0077B5] hover:bg-[#00669c]" };
      default: return { icon: ExternalLink, color: "bg-gray-700 hover:bg-gray-600" };
    }
  };

  if (!user) return null;
  const isAdmin = user.role !== "Member";

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400">Welcome back, <span className="text-brand-accent">{user.full_name}</span></p>
        </div>
        
        {isAdmin && (
          <button 
            onClick={() => setShowPostModal(true)}
            className="bg-brand-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition shadow-lg shadow-brand-primary/20"
          >
            <Megaphone size={18} />
            Post Announcement
          </button>
        )}
      </div>

      {/* --- STATS CARDS (Admins Only) --- */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 text-sm font-medium">Total Database</h3>
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Users size={20} /></div>
            </div>
            <p className="text-3xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 text-sm font-medium">Active Members</h3>
              <div className="p-2 bg-green-500/10 rounded-lg text-green-400"><Activity size={20} /></div>
            </div>
            <p className="text-3xl font-bold text-white">{stats.active}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 text-sm font-medium">New This Month</h3>
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><UserPlus size={20} /></div>
            </div>
            <p className="text-3xl font-bold text-white">{stats.new}</p>
          </div>
        </div>
      )}

      {/* --- MAIN CONTENT AREA --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* FEED (Left Side) */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-white mb-4">Latest Updates</h2>
          {loading && <div className="text-gray-500">Loading feed...</div>}
          {!loading && announcements.length === 0 && (
            <div className="p-8 bg-gray-800/50 rounded-xl border border-gray-700 text-center text-gray-500">No announcements yet.</div>
          )}
          {announcements.map((post) => (
            <div key={post.id} className="bg-gray-800/50 p-5 rounded-xl border border-gray-700 hover:border-brand-primary/30 transition group">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${post.is_meeting ? 'bg-orange-500/10 text-orange-400' : 'bg-brand-accent/10 text-brand-accent'}`}>
                    {post.is_meeting ? 'Meeting' : 'General'}
                  </span>
                  <span className="text-gray-500 text-xs">{new Date(post.created_at).toLocaleDateString()} • {post.users?.full_name}</span>
                </div>
                {isAdmin && (
                  <button onClick={() => handleDeletePost(post.id)} className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{post.title}</h3>
              <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{post.content}</p>
            </div>
          ))}
        </div>

        {/* QUICK LINKS (Right Side) */}
        <div className="space-y-6">
          <div className="bg-gray-800 p-5 rounded-xl border border-gray-700">
            <div className="flex items-center justify-between mb-4">
               <h2 className="text-lg font-bold text-white">Quick Links</h2>
               {isAdmin && (
                 <button onClick={() => setShowLinkModal(true)} className="text-xs text-brand-accent hover:text-white transition flex items-center gap-1">
                   <LinkIcon size={12} /> Edit
                 </button>
               )}
            </div>
            
            <div className="space-y-3">
              {links.map(link => {
                 const style = getLinkStyle(link.platform);
                 const IconComponent = style.icon; // Corrected way to render icon
                 return (
                  <a key={link.id} href={link.url} target="_blank" className={`flex items-center justify-center gap-2 w-full ${style.color} text-white py-2.5 rounded-lg transition font-medium`}>
                    <IconComponent size={18} /> {link.title}
                  </a>
                 )
              })}
              {links.length === 0 && <p className="text-center text-gray-500 text-sm py-2">No links added.</p>}
            </div>
          </div>
        </div>
      </div>

      {/* --- POST ANNOUNCEMENT MODAL --- */}
      {showPostModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-full max-w-lg shadow-2xl relative animate-fade-in">
            <button onClick={() => setShowPostModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={24} /></button>
            <h2 className="text-2xl font-bold text-white mb-6">New Announcement</h2>
            <div className="flex bg-gray-800 p-1 rounded-lg mb-4">
              <button onClick={() => setPostType('General')} className={`flex-1 py-2 text-sm font-bold rounded-md transition ${postType === 'General' ? 'bg-brand-primary text-white' : 'text-gray-400 hover:text-white'}`}>General Post</button>
              <button onClick={() => setPostType('Meeting')} className={`flex-1 py-2 text-sm font-bold rounded-md transition ${postType === 'Meeting' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}`}>Schedule Meeting</button>
            </div>
            <form onSubmit={handlePost} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1">Title</label>
                <input required value={postData.title} onChange={e => setPostData({...postData, title: e.target.value})} className="w-full bg-gray-800 p-3 rounded text-white border border-gray-700 focus:border-brand-accent outline-none" />
              </div>
              {postType === 'Meeting' && (
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs text-gray-500 uppercase mb-1">Date & Time</label><div className="relative"><Calendar className="absolute left-3 top-3 text-gray-500" size={16} /><input required type="datetime-local" value={postData.meetingDate} onChange={e => setPostData({...postData, meetingDate: e.target.value})} className="w-full bg-gray-800 p-3 pl-10 rounded text-white border border-gray-700 focus:border-orange-500 outline-none text-sm" /></div></div>
                  <div><label className="block text-xs text-gray-500 uppercase mb-1">Location</label><div className="relative"><MapPin className="absolute left-3 top-3 text-gray-500" size={16} /><input required value={postData.location} onChange={e => setPostData({...postData, location: e.target.value})} className="w-full bg-gray-800 p-3 pl-10 rounded text-white border border-gray-700 focus:border-orange-500 outline-none text-sm" placeholder="Room 101" /></div></div>
                </div>
              )}
              <div><label className="block text-xs text-gray-500 uppercase mb-1">Details</label><textarea required value={postData.content} onChange={e => setPostData({...postData, content: e.target.value})} className="w-full bg-gray-800 p-3 rounded text-white border border-gray-700 focus:border-brand-accent outline-none min-h-[100px]" /></div>
              <button type="submit" className={`w-full font-bold py-4 rounded-xl mt-4 transition text-white ${postType === 'Meeting' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-brand-primary hover:bg-blue-600'}`}>{postType === 'Meeting' ? 'Schedule Meeting' : 'Post Update'}</button>
            </form>
          </div>
        </div>
      )}

      {/* --- MANAGE LINKS MODAL --- */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-full max-w-md shadow-2xl relative animate-fade-in">
            <button onClick={() => setShowLinkModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={24} /></button>
            <h2 className="text-2xl font-bold text-white mb-6">Manage Quick Links</h2>
            
            <form onSubmit={handleAddLink} className="space-y-3 mb-6 pb-6 border-b border-gray-800">
               <p className="text-xs text-gray-500 uppercase font-bold">Add New Link</p>
               <input required placeholder="Title (e.g. Instagram)" value={newLink.title} onChange={e => setNewLink({...newLink, title: e.target.value})} className="w-full bg-gray-800 p-3 rounded text-white border border-gray-700 focus:border-brand-accent outline-none text-sm" />
               <input required placeholder="URL (https://...)" value={newLink.url} onChange={e => setNewLink({...newLink, url: e.target.value})} className="w-full bg-gray-800 p-3 rounded text-white border border-gray-700 focus:border-brand-accent outline-none text-sm" />
               <select value={newLink.platform} onChange={e => setNewLink({...newLink, platform: e.target.value})} className="w-full bg-gray-800 p-3 rounded text-white border border-gray-700 focus:border-brand-accent outline-none text-sm">
                 <option value="Generic">Generic Link</option>
                 <option value="Telegram">Telegram</option>
                 <option value="Zoom">Zoom</option>
                 <option value="Drive">Google Drive</option>
                 <option value="Instagram">Instagram</option>
                 <option value="LinkedIn">LinkedIn</option>
               </select>
               <button type="submit" className="w-full bg-brand-accent hover:bg-cyan-500 text-black font-bold py-2 rounded-lg flex items-center justify-center gap-2"><Plus size={16} /> Add Link</button>
            </form>

            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              <p className="text-xs text-gray-500 uppercase font-bold mb-2">Current Links</p>
              {links.map(link => {
                 const IconComponent = getLinkStyle(link.platform).icon;
                 return (
                  <div key={link.id} className="flex items-center justify-between bg-black/30 p-3 rounded border border-gray-800">
                     <span className="text-sm text-white flex items-center gap-2">
                       <IconComponent size={14} /> {link.title}
                     </span>
                     <button onClick={() => promptDeleteLink(link.id)} className="text-gray-600 hover:text-red-500 transition"><Trash2 size={16} /></button>
                  </div>
                 )
              })}
              {links.length === 0 && <p className="text-sm text-gray-500 italic">No links yet.</p>}
            </div>
          </div>
        </div>
      )}

      {/* --- LINK DELETE CONFIRMATION MODAL (NEW) --- */}
      {linkToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-full max-w-sm shadow-2xl text-center">
             <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
               <AlertTriangle size={32} />
             </div>
             <h2 className="text-xl font-bold text-white mb-2">Remove Link?</h2>
             <p className="text-gray-400 text-sm mb-6">Are you sure you want to delete this link?</p>
             <div className="flex gap-3">
               <button 
                 onClick={() => setLinkToDelete(null)}
                 className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 font-medium transition"
               >
                 Cancel
               </button>
               <button 
                 onClick={confirmDeleteLink}
                 className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition"
               >
                 Delete
               </button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}