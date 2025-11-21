"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Edit2, ShieldAlert, Check, Mail, Phone, Lock, Save, Shield, Key, X } from "lucide-react";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Edit States
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [profileForm, setProfileForm] = useState({ email: "", phone: "", currentPassword: "" });
  const [passForm, setPassForm] = useState({ current: "", new: "", confirm: "" });
  
  // Messages
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const loadData = async () => {
      const storedUser = localStorage.getItem("ets_user");
      if (!storedUser) return;
      const parsed = JSON.parse(storedUser);
      
      // Fetch fresh data
      const { data } = await supabase.from("users").select("*").eq("id", parsed.id).single();
      const finalUser = data || parsed;
      
      setUser(finalUser);
      setProfileForm({ 
        email: finalUser.email || "", 
        phone: finalUser.phone || "", 
        currentPassword: "" 
      });
      setLoading(false);
    };
    loadData();
  }, []);

  const verifyPassword = async (inputPass: string) => {
    const { data } = await supabase.from("users").select("password_hash").eq("id", user.id).single();
    return data?.password_hash === inputPass;
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(""); setSuccessMsg("");
    
    const isValid = await verifyPassword(profileForm.currentPassword);
    if (!isValid) { setErrorMsg("Incorrect Password."); return; }

    const { error } = await supabase.from("users").update({ 
      email: profileForm.email, 
      phone: profileForm.phone 
    }).eq("id", user.id);

    if (error) setErrorMsg(error.message);
    else {
      setSuccessMsg("Profile updated successfully!");
      setIsEditing(false);
      // Update local state
      setUser({ ...user, email: profileForm.email, phone: profileForm.phone });
      localStorage.setItem("ets_user", JSON.stringify({ ...user, email: profileForm.email, phone: profileForm.phone }));
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(""); setSuccessMsg("");

    if (passForm.new !== passForm.confirm) { setErrorMsg("New passwords do not match."); return; }
    
    const isValid = await verifyPassword(passForm.current);
    if (!isValid) { setErrorMsg("Current password is incorrect."); return; }

    const { error } = await supabase.from("users").update({ password_hash: passForm.new }).eq("id", user.id);
    
    if (error) setErrorMsg(error.message);
    else {
      setSuccessMsg("Password changed!");
      setIsChangingPass(false);
      setPassForm({ current: "", new: "", confirm: "" });
    }
  };

  if (loading) return <div className="text-white p-10">Loading Profile...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold text-white">My Profile</h1>
      
      <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl relative">
        <div className="h-32 bg-gradient-to-r from-brand-primary via-blue-600 to-brand-accent"></div>
        <div className="px-8 pb-8 relative">
           
           {/* Avatar */}
           <div className="-mt-16 mb-6 flex justify-between items-end">
              <div className="w-32 h-32 rounded-full bg-gray-900 p-1">
                 <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center text-5xl font-bold text-white border-4 border-brand-accent shadow-lg">
                   {user.full_name[0]}
                 </div>
              </div>
              {!isEditing && (
                <button onClick={() => setIsEditing(true)} className="mb-4 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-700 flex items-center gap-2 transition shadow-lg">
                  <Edit2 size={16} /> Edit Info
                </button>
              )}
           </div>

           {/* Info Block */}
           <div>
             <h1 className="text-3xl font-bold text-white">{user.full_name}</h1>
             <p className="text-brand-accent font-mono mt-1">{user.club_id}</p>
             <div className="flex gap-2 mt-3">
               <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${user.role === 'Member' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>{user.role}</span>
               <span className="px-3 py-1 rounded-full bg-gray-700 text-gray-300 text-xs font-bold uppercase tracking-wider">{user.department || "General"}</span>
             </div>
           </div>

           {/* Notifications */}
           {errorMsg && <div className="mt-6 p-3 bg-red-500/10 border border-red-500/50 text-red-400 text-sm rounded-lg flex items-center gap-2"><ShieldAlert size={16}/> {errorMsg}</div>}
           {successMsg && <div className="mt-6 p-3 bg-green-500/10 border border-green-500/50 text-green-400 text-sm rounded-lg flex items-center gap-2"><Check size={16}/> {successMsg}</div>}

           {/* VIEW MODE */}
           {!isEditing ? (
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700 hover:border-gray-600 transition">
                    <div className="flex items-center gap-3 mb-2 text-gray-400"><Mail size={18} /><span className="text-xs uppercase font-bold">Email Address</span></div>
                    <p className="text-white font-medium pl-8">{user.email || "Not set"}</p>
                 </div>
                 <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700 hover:border-gray-600 transition">
                    <div className="flex items-center gap-3 mb-2 text-gray-400"><Phone size={18} /><span className="text-xs uppercase font-bold">Phone Number</span></div>
                    <p className="text-white font-medium pl-8">{user.phone || "Not set"}</p>
                 </div>
                 <button onClick={() => setIsChangingPass(true)} className="md:col-span-2 mt-2 w-full py-3 rounded-xl bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 border border-dashed border-gray-600 hover:border-gray-500 flex items-center justify-center gap-2 transition">
                    <Lock size={16} /> Change Security Password
                 </button>
              </div>
           ) : (
              /* EDIT MODE FORM */
              <form onSubmit={handleUpdateProfile} className="mt-8 space-y-4 bg-gray-800/50 p-6 rounded-xl border border-brand-primary/30">
                 <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Edit2 size={18} /> Update Contact Info</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-xs text-gray-500 uppercase mb-1">Email</label><input className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white focus:border-brand-accent outline-none" value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} /></div>
                    <div><label className="block text-xs text-gray-500 uppercase mb-1">Phone</label><input className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white focus:border-brand-accent outline-none" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} /></div>
                 </div>
                 <div className="pt-4 border-t border-gray-700 mt-4">
                    <label className="block text-xs text-orange-400 uppercase mb-2 font-bold flex items-center gap-1"><Shield size={12} /> Verify Identity to Save</label>
                    <input type="password" required placeholder="Enter Current Password" className="w-full bg-gray-900 border border-orange-500/30 rounded p-3 text-white focus:border-orange-500 outline-none" value={profileForm.currentPassword} onChange={e => setProfileForm({...profileForm, currentPassword: e.target.value})} />
                 </div>
                 <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => { setIsEditing(false); setErrorMsg(""); }} className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold">Cancel</button>
                    <button type="submit" className="flex-1 py-3 bg-brand-primary hover:bg-blue-600 text-white rounded-lg font-bold flex items-center justify-center gap-2"><Save size={18} /> Save Changes</button>
                 </div>
              </form>
           )}
        </div>
      </div>

      {/* PASSWORD MODAL */}
      {isChangingPass && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
           <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-white flex items-center gap-2"><Key size={20} /> Change Password</h2><button onClick={() => setIsChangingPass(false)} className="text-gray-500 hover:text-white"><X size={24}/></button></div>
              <form onSubmit={handleChangePassword} className="space-y-4">
                 <div><label className="block text-xs text-gray-500 uppercase mb-1">Current Password</label><input type="password" required className="w-full bg-black border border-gray-700 rounded p-3 text-white focus:border-brand-accent outline-none" value={passForm.current} onChange={e => setPassForm({...passForm, current: e.target.value})} /></div>
                 <div className="w-full h-px bg-gray-800 my-2"></div>
                 <div><label className="block text-xs text-gray-500 uppercase mb-1">New Password</label><input type="password" required className="w-full bg-black border border-gray-700 rounded p-3 text-white focus:border-brand-accent outline-none" value={passForm.new} onChange={e => setPassForm({...passForm, new: e.target.value})} /></div>
                 <div><label className="block text-xs text-gray-500 uppercase mb-1">Confirm New Password</label><input type="password" required className="w-full bg-black border border-gray-700 rounded p-3 text-white focus:border-brand-accent outline-none" value={passForm.confirm} onChange={e => setPassForm({...passForm, confirm: e.target.value})} /></div>
                 <button type="submit" className="w-full py-3 bg-brand-primary hover:bg-blue-600 text-white rounded-lg font-bold mt-4">Update Password</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}