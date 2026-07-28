'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import RouteGuard from '@/components/RouteGuard';
import ModeloIA from '@/components/ModeloIA'; // <-- Importar el Chatbot

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      {/* Navbar superior */}
      <header className="z-40 h-16 w-full shrink-0 border-b bg-background">
        <Navbar onToggleSidebar={toggleSidebar} />
      </header>

      {/* Sidebar + Contenido */}
      <div className="relative flex flex-1 overflow-hidden">
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50 md:hidden"
            onClick={closeSidebar}
          />
        )}

        <aside
          className={`
            fixed top-16 bottom-0 left-0 z-30 w-64 bg-background transition-transform duration-300 ease-in-out
            md:static md:translate-x-0
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <Sidebar onClose={closeSidebar} />
        </aside>

        <main className="flex flex-1 flex-col overflow-y-auto p-4 md:p-8 relative">
          <RouteGuard>
            <div className="flex-1">{children}</div>
          </RouteGuard>

          <footer className="pt-8 pb-2 text-center text-xs text-zinc-400">
            © {new Date().getFullYear()} JP Sistems (Boticas y Farmacias) -
            Todos los derechos reservados.
          </footer>
        </main>
      </div>

      {/* Botón e interfaz del chatbot FarmaBot */}
      <ModeloIA />
    </div>
  );
}