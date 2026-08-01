'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import RouteGuard from '@/components/RouteGuard';
import { CajaCerradaModal } from '@/components/CajaCerradaModal';

const RUTAS_PANTALLA_COMPLETA = ['/dashboard/ventas/generar', '/dashboard/compras/generar'];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const esPopup = searchParams.get('popup') === 'true';

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [modalCajaOpen, setModalCajaOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);
  const toggleCollapse = () => setIsSidebarCollapsed((prev) => !prev);

  const irAArqueo = () => {
    setModalCajaOpen(false);
    closeSidebar();
    router.push('/dashboard/caja');
  };

  const esPantallaCompleta = RUTAS_PANTALLA_COMPLETA.some((ruta) => pathname?.startsWith(ruta));

  // Ventana emergente (popup): mostramos SOLO el contenido de la página,
  // sin Navbar, sin Sidebar y sin footer. RouteGuard se mantiene para no
  // perder la protección de la ruta.
  if (esPopup) {
    return (
      <div className="h-dvh w-full overflow-hidden bg-background">
        <RouteGuard>
          <div className="h-full w-full">{children}</div>
        </RouteGuard>
      </div>
    );
  }

  return (
    /* Usamos h-dvh o h-screen, min-w-full en vez de w-screen para evitar desbordamientos de scrollbar horizontal */
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-background">
      {/* Navbar superior */}
      <header className="z-40 h-16 w-full shrink-0 border-b bg-background">
        <Navbar onToggleSidebar={toggleSidebar} />
      </header>

      {/* Sidebar + Contenido */}
      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50 md:hidden"
            onClick={closeSidebar}
          />
        )}

        <aside
          className={`
            fixed top-16 bottom-0 left-0 z-30 w-64 bg-background transition-all duration-300 ease-in-out
            md:static md:translate-x-0 shrink-0
            ${isSidebarCollapsed ? 'md:w-20' : 'md:w-64'}
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <Sidebar
            onClose={closeSidebar}
            collapsed={isSidebarCollapsed}
            onToggleCollapse={toggleCollapse}
            onCajaCerrada={() => setModalCajaOpen(true)}
          />
        </aside>

        {/*
          CLAVE: min-w-0 para evitar que tablas/elementos anchos empujen el layout fuera de pantalla.
          Para rutas normales, el <main> es quien scrollea y trae padding + footer.
          Para rutas "pantalla completa" (ej. POS), el <main> no scrollea ni tiene padding:
          el propio contenido (children) se encarga de llenar el 100% y manejar su scroll interno.
        */}
        <main
          className={`flex flex-1 flex-col min-w-0 min-h-0 relative transition-all duration-300 ease-in-out ${
            esPantallaCompleta ? 'overflow-hidden' : 'overflow-y-auto p-4 md:p-8'
          }`}
        >
          <RouteGuard>
            <div className={esPantallaCompleta ? 'flex-1 w-full min-h-0 overflow-hidden' : 'flex-1 w-full'}>
              {children}
            </div>
          </RouteGuard>

          {!esPantallaCompleta && (
            <footer className="pt-8 pb-2 text-center text-xs text-zinc-400 shrink-0">
              © {new Date().getFullYear()} JP Sistems (Boticas y Farmacias) -
              Todos los derechos reservados.
            </footer>
          )}

          <CajaCerradaModal
            open={modalCajaOpen}
            onClose={() => setModalCajaOpen(false)}
            onIrAArqueo={irAArqueo}
          />
        </main>
      </div>
    </div>
  );
}