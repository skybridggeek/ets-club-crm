import "./globals.css";

export const metadata = {
  title: "ETS CRM",
  description: "Club Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-brand-dark text-white">
        {children}
      </body>
    </html>
  );
}