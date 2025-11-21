"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { DollarSign, TrendingUp, Plus, Filter, ArrowUpDown } from "lucide-react";

export default function SponsorsPage() {
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [sortDesc, setSortDesc] = useState(true); // Sort High to Low by default
  const router = useRouter();

  // Form State
  const [newSponsor, setNewSponsor] = useState({
    company_name: "",
    rep_name: "",
    rep_contact: "",
    amount: "",
    status: "Active"
  });

  useEffect(() => {
    const checkAccess = async () => {
      const storedUser = localStorage.getItem("ets_user");
      if (!storedUser) return router.push("/");
      
      const user = JSON.parse(storedUser);
      // Security Gate: Kick out regular members
      if (user.role === "Member") {
        alert("Access Denied: Admins Only");
        router.push("/dashboard");
        return;
      }

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
    const { error } = await supabase.from("sponsors").insert([{
      company_name: newSponsor.company_name,
      rep_name: newSponsor.rep_name,
      rep_contact: newSponsor.rep_contact,
      amount: parseFloat(newSponsor.amount),
      status: newSponsor.status
    }]);

    if (!error) {
      setShowAddForm(false);
      fetchSponsors(); // Refresh list
      // Reset form
      setNewSponsor({ company_name: "", rep_name: "", rep_contact: "", amount: "", status: "Active" });
    }
  };

  const toggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "Active" ? "Non-Active" : "Active";
    await supabase.from("sponsors").update({ status: newStatus }).eq("id", id);
    fetchSponsors();
  };

  // --- CALCULATIONS ---
  const totalRevenue = sponsors.reduce((sum, s) => sum + (s.amount || 0), 0);
  const activeSponsors = sponsors.filter(s => s.status === "Active");
  const inactiveSponsors = sponsors.filter(s => s.status !== "Active");
  
  // Sorting Logic
  const sortedActive = [...activeSponsors].sort((a, b) => sortDesc ? b.amount - a.amount : a.amount - b.amount);

  if (loading) return <div className="text-white p-10">Loading Financial Data...</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Sponsorships</h1>
          <p className="text-gray-400">Financial Overview & Partners</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex items-center gap-4">
          <div className="p-3 bg-green-500/20 rounded-lg text-green-400">
            <DollarSign size={32} />
          </div>
          <div>
            <p className="text-sm text-gray-400">Total Revenue</p>
            <p className="text-2xl font-bold text-white">${totalRevenue.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Add Button */}
      <button 
        onClick={() => setShowAddForm(!showAddForm)}
        className="bg-brand-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition w-full md:w-auto justify-center"
      >
        <Plus size={18} />
        Add New Sponsor
      </button>

      {/* ADD FORM */}
      {showAddForm && (
        <div className="bg-gray-800 p-6 rounded-xl border border-brand-primary/50 shadow-lg">
          <h3 className="text-white font-bold mb-4">Register Partnership</h3>
          <form onSubmit={handleAddSponsor} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input required placeholder="Company Name" className="bg-gray-900 p-3 rounded text-white border border-gray-700" onChange={e => setNewSponsor({...newSponsor, company_name: e.target.value})} />
            <input required placeholder="Representative Name" className="bg-gray-900 p-3 rounded text-white border border-gray-700" onChange={e => setNewSponsor({...newSponsor, rep_name: e.target.value})} />
            <input required placeholder="Contact (Email/Phone)" className="bg-gray-900 p-3 rounded text-white border border-gray-700" onChange={e => setNewSponsor({...newSponsor, rep_contact: e.target.value})} />
            <input required type="number" placeholder="Amount ($)" className="bg-gray-900 p-3 rounded text-white border border-gray-700" onChange={e => setNewSponsor({...newSponsor, amount: e.target.value})} />
            <button type="submit" className="md:col-span-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded">Save Sponsor</button>
          </form>
        </div>
      )}

      {/* ACTIVE SPONSORS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
           <h2 className="text-xl font-bold text-white flex items-center gap-2">
             <span className="w-2 h-2 bg-green-500 rounded-full"></span> Active Partners
           </h2>
           <button onClick={() => setSortDesc(!sortDesc)} className="text-sm text-brand-accent flex items-center gap-1 hover:underline">
             <ArrowUpDown size={14} /> Sort by Amount
           </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedActive.map((sponsor) => (
            <div key={sponsor.id} className="bg-gray-800 p-5 rounded-xl border border-gray-700 hover:border-brand-accent/50 transition group relative">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-lg text-white">{sponsor.company_name}</h3>
                <span className="text-xl font-bold text-green-400">${sponsor.amount.toLocaleString()}</span>
              </div>
              
              <div className="text-sm text-gray-400 space-y-1 mb-4">
                <p><span className="text-gray-500">Rep:</span> {sponsor.rep_name}</p>
                <p><span className="text-gray-500">Contact:</span> {sponsor.rep_contact}</p>
              </div>

              {/* Visual Bar Graph for this specific sponsor */}
              <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden mb-4">
                <div 
                  className="bg-brand-accent h-full" 
                  style={{ width: `${Math.min((sponsor.amount / totalRevenue) * 100, 100)}%` }}
                ></div>
              </div>

              <button 
                onClick={() => toggleStatus(sponsor.id, sponsor.status)}
                className="w-full py-2 rounded bg-gray-700 text-gray-300 text-sm hover:bg-red-900/30 hover:text-red-400 transition"
              >
                Mark as Non-Active
              </button>
            </div>
          ))}
          {sortedActive.length === 0 && <p className="text-gray-500 italic">No active sponsors yet.</p>}
        </div>
      </div>

      {/* NON-ACTIVE SPONSORS SECTION */}
      {inactiveSponsors.length > 0 && (
        <div className="pt-8 border-t border-gray-800">
          <h2 className="text-xl font-bold text-gray-400 mb-4 flex items-center gap-2">
             <span className="w-2 h-2 bg-gray-500 rounded-full"></span> Past Sponsors
          </h2>
          <div className="opacity-60 hover:opacity-100 transition duration-300">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {inactiveSponsors.map((sponsor) => (
                  <div key={sponsor.id} className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                    <div className="flex justify-between">
                       <h3 className="font-bold text-gray-300">{sponsor.company_name}</h3>
                       <span className="text-gray-500">${sponsor.amount}</span>
                    </div>
                    <button 
                      onClick={() => toggleStatus(sponsor.id, sponsor.status)}
                      className="mt-3 text-xs text-brand-primary hover:underline"
                    >
                      Re-activate
                    </button>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}