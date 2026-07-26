'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { permisosApi } from '@/api/permisos';

const RUTAS_SIEMPRE_PERMITIDAS = ['/dashboard', '/dashboard/asistencia'];

interface Props {
  children: React.ReactNode;
}

export default function RouteGuard({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { empleado, cargando: cargandoSesion } = useSession();

  const esAdmin = empleado?.rol?.trim().toLowerCase() === 'administrador';

  const [permisos, setPermisos] = useState<Set<string> | null>(null);
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    if (cargandoSesion || !empleado?.id) return;

    if (esAdmin) {
      setPermisos(null);
      setVerificando(false);
      return;
    }

    setVerificando(true);
    permisosApi.obtener(empleado.id)
      .then((rutas) => setPermisos(new Set(rutas)))
      .catch(() => setPermisos(new Set()))
      .finally(() => setVerificando(false));
  }, [empleado?.id, esAdmin, cargandoSesion]);

  if (cargandoSesion || verificando) {
    return (
      <div className="flex items-center justify-center h-full py-20 text-sm text-zinc-400">
        Verificando acceso...
      </div>
    );
  }

  const tieneAcceso =
    esAdmin ||
    RUTAS_SIEMPRE_PERMITIDAS.includes(pathname) ||
    (permisos?.has(pathname) ?? false);

  if (!tieneAcceso) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 gap-3 text-center">
        <div className="p-4 bg-red-50 text-red-500 rounded-2xl">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-lg font-bold text-zinc-800">No tienes acceso a esta sección</h2>
        <p className="text-sm text-zinc-500 max-w-sm">
          Si crees que deberías tener acceso, solicita al administrador que revise tus permisos asignados.
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Volver al Panel
        </button>
      </div>
    );
  }

  return <>{children}</>;
}