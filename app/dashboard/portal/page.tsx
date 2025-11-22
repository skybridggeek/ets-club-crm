"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Search, UserPlus, Trash2, Edit2, Copy, Check, X, ShieldAlert, RefreshCcw, Info, Phone, Mail, Key, Shield } from "lucide-react";

export default function DirectoryPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'active' | 'banned'>('active');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [viewingUser, setViewingUser] = useState<any>(null);
  const [successCredential, setSuccessCredential] = useState<any>(null);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, type: 'ban'|'restore'|null, userId: number|null}>({ isOpen: false, type: null, userId: null });
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({ fullName: "", email: "", phone: "", role: "Member", department: "" });

  useEffect(() => {
    const init = async () => {
      const storedUser = localStorage.getItem("ets_user");
      if (!storedUser) return;
      const parsed = JSON.parse(storedUser);
      setCurrentUser(parsed);

      if (parsed.role === "Member") {
        router.push("/dashboard/profile");
        return;
      }

      const { data } = await supabase.from("users").select("*").order("created_at", { ascending: false });
      if (data) setUsers(data);
      setLoading(false);
    };
    init();
  }, [router]);

  // --- HANDLERS ---
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const year = new Date().getFullYear();
    const count = users.length + 1;
    let prefix = "MEM";
    if (formData.role === "Admin") prefix = "ADM";
    if (formData.role === "Developer") prefix = "DEV";
    const generatedId = `${prefix}-ETS-${year}-${count.toString().padStart(3, "0")}`;
    const generatedPassword = Math.random().toString(36).slice(-6);
    const { error } = await supabase.from("users").insert([{ full_name: formData.fullName, email: formData.email, phone: formData.phone, role: formData.role, department: formData.department, club_id: generatedId, password_hash: generatedPassword, is_active: true }]);
    if (!error) { setShowAddForm(false); setSuccessCredential({ id: generatedId, pass: generatedPassword, name: formData.fullName }); const { data } = await supabase.from("users").select("*").order("created_at", { ascending: false }); if(data) setUsers(data); setFormData({ fullName: "", email: "", phone: "", role: "Member", department: "" }); } else { alert(error.message); }
  };

  const startEdit = (user: any) => { setEditingUser(user); setFormData({ fullName: user.full_name || "", email: user.email || "", phone: user.phone || "", role: user.role || "Member", department: user.department || "" }); };
  const handleUpdateMember = async (e: React.FormEvent) => { e.preventDefault(); await supabase.from("users").update({ full_name: formData.fullName, email: formData.email, phone: formData.phone, department: formData.department, role: formData.role }).eq("id", editingUser.id); setEditingUser(null); const { data } = await supabase.from("users").select("*").order("created_at", { ascending: false }); if(data) setUsers(data); };
  const executeAction = async () => { if (!confirmModal.userId) return; await supabase.from("users").update({ is_active: confirmModal.type === 'restore' }).eq("id", confirmModal.userId); const { data } = await supabase.from("users").select("*").order("created_at", { ascending: false }); if(data) setUsers(data); setConfirmModal({ isOpen: false, type: null, userId: null }); };
  const canModify = (targetUser: any) => { if (currentUser.role === "Developer") return targetUser.role !== "Developer"; if (currentUser.role === "Admin") return targetUser.role === "Member"; return false; };
  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  if (loading) return <div className="text-white p-10">Loading Directory...</div>;

  const displayedUsers = users.filter(u => {
    const matchesSearch = JSON.stringify(u).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMode = viewMode === 'active' ? u.is_active === true : u.is_active === false;
    return matchesSearch && matchesMode;
  });

  return (
    <div className="space-y-6 relative pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div><h1 className="text-3xl font-bold text-white">{viewMode === 'active' ? 'Club Directory' : 'Banned Members'}</h1></div>
        <div className="flex gap-3 w-full md:w-auto">
          <button onClick={() => setViewMode(viewMode === 'active' ? 'banned' : 'active')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition border ${viewMode === 'banned' ? "bg-red-500/20 text-red-400 border-red-500/50" : "bg-gray-800 text-gray-400 border-gray-700"}`}>{viewMode === 'active' ? <ShieldAlert size={18} /> : <Check size={18} />}{viewMode === 'active' ? 'View Banned' : 'View Active'}</button>
          {viewMode === 'active' && (<button onClick={() => setShowAddForm(true)} className="flex-1 md:flex-none bg-brand-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition"><UserPlus size={18} /> Add</button>)}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-3 text-gray-500" size={20} />
        <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-800 border border-gray-700 text-white pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:border-brand-accent" />
      </div>

      {/* --- DESKTOP VIEW: TABLE (Hidden on Mobile) --- */}
      <div className={`hidden md:block rounded-xl border overflow-hidden ${viewMode === 'active' ? 'bg-gray-800 border-gray-700' : 'bg-red-950/10 border-red-900/30'}`}>
        <table className="w-full text-left">
          <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
            <tr><th className="px-6 py-3">Member</th><th className="px-6 py-3">Department</th><th className="px-6 py-3">Role</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Action</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {displayedUsers.map((u) => (
              <tr key={u.id} className="hover:bg-gray-700/50 transition group">
                <td className="px-6 py-4"><div className="flex items-center gap-3"><button onClick={() => setViewingUser(u)} className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white transition transform hover:scale-110 hover:ring-2 hover:ring-brand-accent cursor-pointer ${viewMode === 'active' ? 'bg-gradient-to-br from-brand-primary to-brand-dark' : 'bg-red-900'}`}>{u.full_name[0]}</button><div><button onClick={() => setViewingUser(u)} className="font-medium text-white hover:text-brand-accent text-left block">{u.full_name}</button><p className="text-xs text-gray-500">{u.club_id}</p></div></div></td>
                <td className="px-6 py-4 text-gray-300 text-sm">{u.department || "-"}</td>
                <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-bold ${u.role === 'Member' ? 'bg-blue-500/10 text-blue-400' : u.role === 'Developer' ? 'bg-red-500/10 text-red-400' : 'bg-purple-500/10 text-purple-400'}`}>{u.role}</span></td>
                <td className="px-6 py-4">{u.is_active ? <span className="text-green-400 text-xs font-bold">Active</span> : <span className="text-red-400 text-xs font-bold">Banned</span>}</td>
                <td className="px-6 py-4 flex items-center gap-3 opacity-60 group-hover:opacity-100 transition">
                  <button onClick={() => setViewingUser(u)} className="text-gray-400 hover:text-white transition" title="Details"><Info size={18} /></button>
                  {viewMode === 'active' && canModify(u) && (<><button onClick={() => startEdit(u)} className="text-gray-400 hover:text-blue-400 transition" title="Edit"><Edit2 size={18} /></button><button onClick={() => setConfirmModal({isOpen: true, type: 'ban', userId: u.id})} className="text-gray-400 hover:text-red-500 transition" title="Ban"><Trash2 size={18} /></button></>)}
                  {viewMode === 'banned' && canModify(u) && (<button onClick={() => setConfirmModal({isOpen: true, type: 'restore', userId: u.id})} className="text-gray-400 hover:text-green-400 transition" title="Restore"><RefreshCcw size={18} /></button>)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- MOBILE VIEW: CARDS (Hidden on Desktop) --- */}
      <div className="md:hidden space-y-4">
        {displayedUsers.map((u) => (
          <div key={u.id} className={`p-4 rounded-xl border shadow-lg ${viewMode === 'active' ? 'bg-gray-800 border-gray-700' : 'bg-red-950/20 border-red-900/50'}`}>
             {/* Header: Avatar, Name, Status */}
             <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                   <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-md ${viewMode === 'active' ? 'bg-gradient-to-br from-brand-primary to-brand-dark' : 'bg-red-900'}`}>
                      {u.full_name[0]}
                   </div>
                   <div>
                      <h3 className="font-bold text-white text-lg">{u.full_name}</h3>
                      <p className="text-xs text-brand-accent font-mono">{u.club_id}</p>
                   </div>
                </div>
                {u.is_active 
                  ? <span className="text-[10px] font-bold uppercase tracking-wider text-green-400 bg-green-900/20 px-2 py-1 rounded">Active</span>
                  : <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-900/20 px-2 py-1 rounded">Banned</span>
                }
             </div>

             {/* Body: Dept & Role */}
             <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-xs font-medium text-gray-300 bg-gray-700/50 px-2 py-1 rounded border border-gray-600">{u.department || "General"}</span>
                <span className={`text-xs font-medium px-2 py-1 rounded border ${u.role === 'Member' ? 'bg-blue-900/20 text-blue-300 border-blue-800' : 'bg-purple-900/20 text-purple-300 border-purple-800'}`}>{u.role}</span>
             </div>

             {/* Footer: Actions */}
             <div className="flex justify-end gap-4 border-t border-gray-700 pt-3">
                <button onClick={() => setViewingUser(u)} className="text-gray-400 hover:text-white p-2 rounded-full bg-gray-700/30" title="Details"><Info size={20} /></button>
                
                {viewMode === 'active' && canModify(u) && (
                  <>
                    <button onClick={() => startEdit(u)} className="text-blue-400 hover:text-white p-2 rounded-full bg-blue-900/20" title="Edit"><Edit2 size={20} /></button>
                    <button onClick={() => setConfirmModal({isOpen: true, type: 'ban', userId: u.id})} className="text-red-400 hover:text-white p-2 rounded-full bg-red-900/20" title="Ban"><Trash2 size={20} /></button>
                  </>
                )}
                
                {viewMode === 'banned' && canModify(u) && (
                   <button onClick={() => setConfirmModal({isOpen: true, type: 'restore', userId: u.id})} className="text-green-400 hover:text-white p-2 rounded-full bg-green-900/20" title="Restore"><RefreshCcw size={20} /></button>
                )}
             </div>
          </div>
        ))}
      </div>

      {/* --- MODALS (Same as before) --- */}
      {viewingUser && (<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4"><div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in"><div className="h-24 bg-gradient-to-r from-brand-primary to-brand-accent relative"><button onClick={() => setViewingUser(null)} className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 rounded-full p-1"><X size={20} /></button></div><div className="px-6 pb-6 relative"><div className="-mt-12 mb-4"><div className="w-24 h-24 rounded-full bg-gray-900 p-1 mx-auto"><div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center text-4xl font-bold text-white border-2 border-brand-accent">{viewingUser.full_name[0]}</div></div></div><div className="text-center mb-6"><h2 className="text-2xl font-bold text-white">{viewingUser.full_name}</h2><p className="text-brand-accent font-mono text-sm">{viewingUser.club_id}</p><span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${viewingUser.role === 'Admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>{viewingUser.role}</span></div><div className="bg-black/20 rounded-xl p-4 space-y-3 mb-4 border border-gray-800"><div className="flex items-center gap-3 text-gray-300"><div className="p-2 bg-gray-800 rounded-lg text-brand-primary"><Mail size={16} /></div><div className="flex-1"><p className="text-xs text-gray-500 uppercase">Email</p><p className="text-sm font-medium select-all">{viewingUser.email || "No email"}</p></div></div><div className="flex items-center gap-3 text-gray-300"><div className="p-2 bg-gray-800 rounded-lg text-green-500"><Phone size={16} /></div><div className="flex-1"><p className="text-xs text-gray-500 uppercase">Phone</p><p className="text-sm font-medium select-all">{viewingUser.phone || "No phone"}</p></div></div><div className="flex items-center gap-3 text-gray-300"><div className="p-2 bg-gray-800 rounded-lg text-orange-500"><Shield size={16} /></div><div className="flex-1"><p className="text-xs text-gray-500 uppercase">Department</p><p className="text-sm font-medium">{viewingUser.department || "General"}</p></div></div></div>{currentUser?.role === "Developer" && (<div className="bg-red-900/10 border border-red-900/30 rounded-xl p-4"><div className="flex items-center gap-2 text-red-400 mb-2"><Key size={16} /><p className="text-xs font-bold uppercase tracking-widest">Developer Access</p></div><div className="flex items-center justify-between"><p className="text-white font-mono text-lg select-all">{viewingUser.password_hash}</p><span className="text-[10px] text-gray-500">Password</span></div></div>)}</div></div></div>)}
      {confirmModal.isOpen && (<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[80] p-4"><div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-full max-w-sm shadow-2xl text-center animate-fade-in"><div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${confirmModal.type === 'ban' ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>{confirmModal.type === 'ban' ? <ShieldAlert size={32} /> : <RefreshCcw size={32} />}</div><h2 className="text-xl font-bold text-white mb-2">{confirmModal.type === 'ban' ? 'Ban this Member?' : 'Restore Member?'}</h2><p className="text-gray-400 text-sm mb-6">{confirmModal.type === 'ban' ? 'They will be moved to the restricted list.' : 'They will be moved back to the Active Directory.'}</p><div className="flex gap-3"><button onClick={() => setConfirmModal({ isOpen: false, type: null, userId: null })} className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 font-medium transition">Cancel</button><button onClick={executeAction} className={`flex-1 py-3 rounded-xl text-white font-bold transition ${confirmModal.type === 'ban' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>{confirmModal.type === 'ban' ? 'Ban User' : 'Restore'}</button></div></div></div>)}
      {(showAddForm || editingUser) && (<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"><div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-full max-w-lg shadow-2xl relative"><button onClick={() => { setShowAddForm(false); setEditingUser(null); }} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={24} /></button><h2 className="text-2xl font-bold text-white mb-6">{editingUser ? "Edit Member Data" : "Register New Member"}</h2><form onSubmit={editingUser ? handleUpdateMember : handleAddMember} className="space-y-4"><input required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} placeholder="Full Name" className="w-full bg-gray-800 p-3 rounded text-white border border-gray-700 focus:border-brand-accent outline-none" /><div className="grid grid-cols-2 gap-4"><input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="Email" className="bg-gray-800 p-3 rounded text-white border border-gray-700 focus:border-brand-accent outline-none" /><input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="Phone" className="bg-gray-800 p-3 rounded text-white border border-gray-700 focus:border-brand-accent outline-none" /></div><div className="grid grid-cols-2 gap-4"><select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="bg-gray-800 p-3 rounded text-white border border-gray-700 focus:border-brand-accent outline-none"><option value="Member">Member</option><option value="Admin">Admin</option>{currentUser?.role === "Developer" && <option value="Developer">Developer</option>}</select><select value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="bg-gray-800 p-3 rounded text-white border border-gray-700 focus:border-brand-accent outline-none"><option value="" disabled>Select Dept</option><option value="Project Management">Project Management</option><option value="Marketing">Marketing</option><option value="Content Creation">Content Creation</option><option value="IT">IT Department</option><option value="AI">AI Department</option><option value="HR">HR Department</option><option value="SG">SG Department</option><option value="External Relations">External Relations / Commercial</option></select></div><button type="submit" className="w-full bg-brand-primary hover:bg-blue-600 text-white font-bold py-4 rounded-xl mt-4 transition">{editingUser ? "Update Data" : "Generate ID & Save"}</button></form></div></div>)}
      {successCredential && (<div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4"><div className="bg-gray-900 border-2 border-green-500 p-8 rounded-2xl w-full max-w-md shadow-[0_0_50px_rgba(34,197,94,0.2)] text-center relative"><button onClick={() => setSuccessCredential(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X /></button><div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4"><Check size={32} strokeWidth={4} /></div><h2 className="text-2xl font-bold text-white mb-2">Member Registered!</h2><p className="text-gray-400 text-sm mb-6">Share these credentials securely.</p><div className="bg-black rounded-xl p-6 mb-6 border border-gray-800 space-y-4"><div><p className="text-gray-500 text-xs uppercase tracking-wider">Club ID</p><p className="text-white text-2xl font-mono font-bold tracking-widest">{successCredential.id}</p></div><div className="w-full h-px bg-gray-800"></div><div><p className="text-gray-500 text-xs uppercase tracking-wider">Password</p><p className="text-brand-accent text-xl font-mono">{successCredential.pass}</p></div></div><button onClick={() => copyToClipboard(`ID: ${successCredential.id}\nPass: ${successCredential.pass}`)} className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition ${copied ? "bg-green-500 text-white" : "bg-white text-black hover:bg-gray-200"}`}>{copied ? <Check size={20} /> : <Copy size={20} />}{copied ? "Copied!" : "Copy Credentials"}</button></div></div>)}
    </div>
  );
}