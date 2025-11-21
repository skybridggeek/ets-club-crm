"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { Menu, X, Home, Users, MessageCircle, DollarSign, LogOut, MessageSquare, User } from "lucide-react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const storedUser = localStorage.getItem("ets_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const confirmLogout = () => {
    localStorage.removeItem("ets_user");
    router.push("/");
  };

  // Base Links
  const navLinks = [
    { name: "Home", href: "/dashboard", icon: Home },
    { name: "Chats", href: "/dashboard/chats", icon: MessageCircle },
    { name: "Feedback", href: "/dashboard/feedback", icon: MessageSquare },
  ];

  // Admin Links
  if (user && (user.role === "Admin" || user.role === "Developer")) {
    // Insert Directory after Home
    navLinks.splice(1, 0, { name: "Directory", href: "/dashboard/portal", icon: Users });
    // Add Sponsors at end
    navLinks.push({ name: "Sponsors", href: "/dashboard/sponsors", icon: DollarSign });
  }

  return (
    <>
      <nav className="bg-brand-dark border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* 1. LOGO */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 relative">
                <Image src="/logo.png" alt="Logo" fill className="object-contain" />
              </div>
              <span className="font-bold text-xl tracking-wider text-white hidden sm:block">
                ETS <span className="text-brand-accent">CRM</span>
              </span>
            </div>

            {/* 2. DESKTOP MENU */}
            <div className="hidden sm:flex items-center space-x-4">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive ? "bg-brand-primary text-white" : "text-gray-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <link.icon size={16} />
                    {link.name}
                  </Link>
                );
              })}

              <div className="h-6 w-px bg-gray-700 mx-2"></div>

              <Link href="/dashboard/profile" className="p-2 rounded-full bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 transition" title="My Profile">
                <User size={20} />
              </Link>
              
              <button onClick={() => setShowLogoutModal(true)} className="p-2 rounded-full bg-gray-800 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition" title="Logout">
                <LogOut size={20} />
              </button>
            </div>

            {/* 3. MOBILE MENU BUTTON */}
            <div className="flex md:hidden">
              <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-white/10">
                {isOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* MOBILE DROPDOWN */}
        {isOpen && (
          <div className="md:hidden bg-gray-900 border-t border-gray-800 p-2 space-y-1">
            {navLinks.map((link) => (
              <Link key={link.name} href={link.href} onClick={() => setIsOpen(false)} className="block px-3 py-3 rounded-md text-base font-medium text-gray-300 hover:bg-white/10 hover:text-white flex items-center gap-3">
                <link.icon size={20} /> {link.name}
              </Link>
            ))}
            <div className="border-t border-gray-800 my-2"></div>
            <Link href="/dashboard/profile" onClick={() => setIsOpen(false)} className="block px-3 py-3 rounded-md text-base font-medium text-gray-300 hover:bg-white/10 hover:text-white flex items-center gap-3">
               <User size={20} /> My Profile
            </Link>
            <button onClick={() => setShowLogoutModal(true)} className="w-full text-left block px-3 py-3 rounded-md text-base font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-3">
              <LogOut size={20} /> Logout
            </button>
          </div>
        )}
      </nav>

      {/* LOGOUT MODAL */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-full max-w-sm shadow-2xl text-center">
             <h2 className="text-xl font-bold text-white mb-4">Log Out?</h2>
             <div className="flex gap-3">
               <button onClick={() => setShowLogoutModal(false)} className="flex-1 py-3 rounded-xl bg-gray-800 text-white hover:bg-gray-700">Cancel</button>
               <button onClick={confirmLogout} className="flex-1 py-3 rounded-xl bg-red-600 text-white hover:bg-red-700">Yes</button>
             </div>
          </div>
        </div>
      )}
    </>
  );
}