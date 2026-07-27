import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import RouteGuard from '@/components/RouteGuard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background flex">
      {/* Contenedor del Sidebar */}
      <div className="h-full z-30">
        <Sidebar />
      </div>

      {/* Contenedor principal (Navbar + Main) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 z-20">
          <Navbar />
        </div>

        <main className="absolute top-16 left-0 right-0 bottom-0 overflow-y-auto p-4 md:p-8 flex flex-col justify-between">
          <RouteGuard>
            <div className="flex-1">
              {children}
            </div>
          </RouteGuard>

          <footer className="text-center text-xs text-zinc-400 pt-8 pb-2">
            © {new Date().getFullYear()} JP Sistems (Boticas y Farmacias) - Todos los derechos reservados.
          </footer>
        </main>
      </div>
    </div>
  );
}