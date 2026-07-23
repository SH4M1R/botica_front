import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      <div className="absolute top-0 left-0 h-full z-10">
        <Sidebar />
      </div>

      <div className="absolute top-0 left-0 right-0 z-20">
        <Navbar />
      </div>

      <main className="absolute top-16 left-64 right-0 bottom-0 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}