'use client';

import { useEffect, useState } from 'react';

export interface SesionEmpleado {
  id: number;
  nombre: string;
  rol: string;
}

const STORAGE_KEY = 'app-empleado';

export function useSession() {
  const [empleado, setEmpleadoState] = useState<SesionEmpleado | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setEmpleadoState(JSON.parse(stored));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setCargando(false);
  }, []);

  const iniciarSesion = (data: SesionEmpleado) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setEmpleadoState(data);
  };

  const cerrarSesion = () => {
    localStorage.removeItem(STORAGE_KEY);
    setEmpleadoState(null);
  };

  return { empleado, cargando, iniciarSesion, cerrarSesion };
}