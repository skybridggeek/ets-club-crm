"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { notifyAll } from "@/lib/notify";
import { DollarSign, Plus, ArrowUpDown, Trash2, AlertTriangle } from "lucide-react";

export default function SponsorsPage() {
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [sortDesc, setSortDesc] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const router = useRouter();

  const [newSponsor, setNewSponsor] = useState({
    company_name: "", rep_name: "", rep_contact: "", amount: "", status: "Active"
  });

  useEffect(() => {
    const checkAccess = async () => {
      const storedUser = localStorage.getItem("ets_user");
      if (!storedUser) return router.push("/");
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      if (parsed.role === "Member") { router.push("/dashboard"); return; }
      fetchSponsors();
    };
    checkAccess();
  }, [router]);

  const fetchSponsors = async () => {
    const { data } = await supabase.from("sponsors").select("*").order("date_added", { ascending: false });
    if (data) setSponsors(data);
    setLoading(false);
  };

  const handleAddSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("sponsors").insert([{ company_name: newSponsor.company_name, rep_name: newSponsor.rep_name, rep_contact: newSponsor.rep_contact, amount: parseFloat(newSponsor.amount), status: newSponsor.status }]);
    if (!error) {
      setShowAddForm(false);
      fetchSponsors();
      setNewSponsor({ company_name: "", rep_name: "", rep_contact: "", amount: "", status: "Active" });
      await notifyAll({
        title: "🤝 New Sponsor Added",
        body: `${newSponsor.company_name} — DZD${Number(newSponsor.amount).toLocaleString()}`,
        url: "/dashboard/sponsors",
        exclude_user_id: user?.id,
      });
    }
  };

  const toggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "Active" ? "Non-Active" : "Active";
    await supabase.from("sponsors").update({ status: newStatus }).eq("id", id);
    fetchSponsors();
  };

  const handleDelete = async () => {
    if(!deleteId) return;
    await supabase.from("sponsors").delete().eq("id", deleteId);
    setDeleteId(null);
    fetchSponsors();
  };

  const totalRevenue = sponsors.reduce((sum, s) => sum + (s.amount || 0), 0);
  const activeSponsors = sponsors.filter(s => s.status === "Active");
  const inactiveSponsors = sponsors.filter(s => s.status !== "Active");
  const sortedActive = [...activeSponsors].sort((a, b) => sortDesc ? b.amount - a.amount : a.amount - b.amount);

  if (loading) return <div className="text-white p-10">Loading Financial Data...</div>;

  return (
    <div className="space-y-8 animate-fade-in relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h1 className="text-3xl font-bold text-white">Sponsorships</h1><p className="text-gray-400">Financial Overview & Partners</p></div>
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex items-center gap-4"><div className="p-3 bg-green-500/20 rounded-lg text-green-400"><DollarSign size={32} /></div><div><p className="text-sm text-gray-400">Total Revenue</p><p className="text-2xl font-bold text-white">DZD{totalRevenue.toLocaleString()}</p></div></div>
      </div>

      <button onClick={() => setShowAddForm(!showAddForm)} className="bg-brand-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition w-full md:w-auto justify-center"><Plus size={18} /> Add New Sponsor</button>

      {showAddForm && (
        <div className="bg-gray-800 p-6 rounded-xl border border-brand-primary/50 shadow-lg">
          <h3 className="text-white font-bold mb-4">Register Partnership</h3>
          <form onSubmit={handleAddSponsor} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input required placeholder="Company Name" className="bg-gray-900 p-3 rounded text-white border border-gray-700" onChange={e => setNewSponsor({...newSponsor, company_name: e.target.value})} />
            <input required placeholder="Representative Name" className="bg-gray-900 p-3 rounded text-white border border-gray-700" onChange={e => setNewSponsor({...newSponsor, rep_name: e.target.value})} />
            <input required placeholder="Contact (Email/Phone)" className="bg-gray-900 p-3 rounded text-white border border-gray-700" onChange={e => setNewSponsor({...newSponsor, rep_contact: e.target.value})} />
            <input required type="number" placeholder="Amount (DZD)" className="bg-gray-900 p-3 rounded text-white border border-gray-700" onChange={e => setNewSponsor({...newSponsor, amount: e.target.value})} />
            <button type="submit" className="md:col-span-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded">Save Sponsor</button>
          </form>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between"><h2 className="text-xl font-bold text-white flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span> Active Partners</h2><button onClick={() => setSortDesc(!sortDesc)} className="text-sm text-brand-accent flex items-center gap-1 hover:underline"><ArrowUpDown size={14} /> Sort by Amount</button></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedActive.map((sponsor) => (
            <div key={sponsor.id} className="bg-gray-800 p-5 rounded-xl border border-gray-700 hover:border-brand-accent/50 transition group relative">
              <div className="flex justify-between items-start mb-4"><h3 className="font-bold text-lg text-white">{sponsor.company_name}</h3><span className="text-xl font-bold text-green-400">DZD{sponsor.amount.toLocaleString()}</span></div>
              <div className="text-sm text-gray-400 space-y-1 mb-4"><p><span className="text-gray-500">Rep:</span> {sponsor.rep_name}</p><p><span className="text-gray-500">Contact:</span> {sponsor.rep_contact}</p></div>
              <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden mb-4"><div className="bg-brand-accent h-full" style={{ width: `${Math.min((sponsor.amount / totalRevenue) * 100, 100)}%` }}></div></div>
              <div className="flex gap-2">
                <button onClick={() => toggleStatus(sponsor.id, sponsor.status)} className="flex-1 py-2 rounded bg-gray-700 text-gray-300 text-sm hover:bg-gray-600 transition">Mark Non-Active</button>
                {user.role === 'Developer' && <button onClick={() => setDeleteId(sponsor.id)} className="p-2 rounded bg-red-900/20 text-red-400 hover:bg-red-900/40 transition"><Trash2 size={18} /></button>}
              </div>
            </div>
          ))}
          {sortedActive.length === 0 && <p className="text-gray-500 italic">No active sponsors yet.</p>}
        </div>
      </div>

      {inactiveSponsors.length > 0 && (
        <div className="pt-8 border-t border-gray-800">
          <h2 className="text-xl font-bold text-gray-400 mb-4 flex items-center gap-2"><span className="w-2 h-2 bg-gray-500 rounded-full"></span> Past Sponsors</h2>
          <div className="opacity-60 hover:opacity-100 transition duration-300"><div className="grid grid-cols-1 md:grid-cols-3 gap-4">{inactiveSponsors.map((sponsor) => (
            <div key={sponsor.id} className="bg-gray-900 p-4 rounded-lg border border-gray-800 relative">
              <div className="flex justify-between"><h3 className="font-bold text-gray-300">{sponsor.company_name}</h3><span className="text-gray-500">DZD{sponsor.amount}</span></div>
              <div className="flex justify-between items-center mt-3">
                <button onClick={() => toggleStatus(sponsor.id, sponsor.status)} className="text-xs text-brand-primary hover:underline">Re-activate</button>
                {user.role === 'Developer' && <button onClick={() => setDeleteId(sponsor.id)} className="text-red-500 hover:text-red-400"><Trash2 size={14} /></button>}
              </div>
            </div>
          ))}</div></div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-full max-w-sm shadow-2xl text-center">
             <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32} /></div>
             <h2 className="text-xl font-bold text-white mb-2">Delete Sponsor?</h2>
             <p className="text-gray-400 text-sm mb-6">This cannot be undone.</p>
             <div className="flex gap-3"><button onClick={() => setDeleteId(null)} className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 font-medium transition">Cancel</button><button onClick={handleDelete} className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition">Delete</button></div>
          </div>
        </div>
      )}
    </div>
  );
}