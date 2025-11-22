import Navbar from "@/components/Navbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-[100dvh] bg-brand-dark flex flex-col overflow-hidden">
      {/* Fixed Navbar */}
      <Navbar />

      {/* Main container - NOW SCROLLABLE */}
      {/* Changed 'overflow-hidden' to 'overflow-y-auto' so you can scroll down on phone */}
      <main className="flex-1 min-h-0 overflow-y-auto w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {children}
      </main>
    </div>
  );
}