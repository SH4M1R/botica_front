'use client';

import { useRouter } from 'next/navigation';
import { UserCircle, LogOut } from 'lucide-react';
import { useCompanyName } from '@/hooks/useCompanyName';
import { useSession } from '@/hooks/useSession';

export default function Navbar() {
  const router = useRouter();
  // Asegúrate de que useCompanyName devuelva `companyLogo` o ajusta según retorne tu hook
  const { companyName, companyIcon } = useCompanyName(); 
  const { empleado, cerrarSesion } = useSession();

  const handleLogout = () => {
    cerrarSesion();
    router.push('/');
  };

  return (
    <header className="h-16 w-full bg-white border-b border-zinc-200 flex items-center justify-between px-6 pl-72 gap-4 shadow-sm">
      
      {/* Sección con Logo/Ícono y Nombre */}
      <div className="flex items-center gap-3">
        {companyIcon ? (
          <img 
            src={companyIcon} 
            alt="Logo Empresa" 
            className="w-9 h-9 object-contain rounded-md"
          />
        ) : (
          /* Fallback en caso de que no haya logo cargado */
          <div className="w-9 h-9 rounded-md bg-zinc-100 flex items-center justify-center text-zinc-400">
            <UserCircle size={24} />
          </div>
        )}

        <span className="text-primary font-bold tracking-tight text-lg">
          {companyName}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center transition-colors duration-300">
            <UserCircle size={20} />
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-zinc-800 leading-tight">{empleado?.nombre ?? 'Usuario'}</p>
            <p className="text-xs text-primary uppercase tracking-wide">{empleado?.rol ?? '—'}</p>
          </div>
        </div>

        <div className="w-px h-8 bg-zinc-200" />

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-zinc-500 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
        >
          <LogOut size={16} />
          Salir
        </button>
      </div>
    </header>
  );
}