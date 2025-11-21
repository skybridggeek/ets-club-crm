"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image"; // Import the Image component

export default function LoginPage() {
  const router = useRouter();
  const [clubId, setClubId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: dbError } = await supabase
        .from("users")
        .select("*")
        .eq("club_id", clubId)
        .single();

      if (dbError || !data) {
        setError("Invalid Club ID.");
        setLoading(false);
        return;
      }

      if (data.password_hash !== password) {
        setError("Incorrect Password.");
        setLoading(false);
        return;
      }

      if (data.is_active === false) {
        setError("This account has been deactivated.");
        setLoading(false);
        return;
      }

      localStorage.setItem("ets_user", JSON.stringify(data));
      router.push("/dashboard");

    } catch (err) {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    // Used 'bg-brand-dark' to match your logo background
    <div className="min-h-screen flex items-center justify-center bg-brand-dark p-4">
      <div className="w-full max-w-md bg-white/5 p-8 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-sm">
        
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-32 h-32 relative mb-4">
             {/* Make sure logo.png is in the public folder */}
            <Image 
              src="/logo.png" 
              alt="ETS Club Logo" 
              fill 
              className="object-contain"
              priority
            />
          </div>
          {/* We can hide the text since the logo has text, or keep a small subtitle */}
          <p className="text-brand-accent text-sm font-medium tracking-widest uppercase">
            CRM Portal
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded mb-6 text-center text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">Club ID</label>
            <input
              type="text"
              value={clubId}
              onChange={(e) => setClubId(e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition"
              placeholder="e.g. ADM-ETS-2025-001"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition"
              placeholder="••••••••"
              required
            />
          </div>

          {/* The Button now uses your Brand Gradient */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-brand-primary to-brand-accent hover:from-blue-600 hover:to-cyan-400 text-white font-bold py-3 rounded-lg shadow-lg shadow-brand-primary/20 transition duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Verifying Identity..." : "Access Portal"}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-gray-600">
          <p>Economic Technological Synergy</p>
        </div>

      </div>
    </div>
  );
}