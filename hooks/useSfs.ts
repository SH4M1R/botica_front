'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { sfsApi } from '@/api/sfs';

/**
 * Estado del SFS para el Navbar: consulta cada 10 s (solo con la pestaña visible)
 * y expone `encender()`, que lanza el SFS y espera a que responda.
 */
export function useSfs() {
  const [activo, setActivo] = useState(false);
  const [url, setUrl] = useState<string | undefined>(undefined);
  const [encendiendo, setEncendiendo] = useState(false);
  const [apagando, setApagando] = useState(false);
  const [error, setError] = useState('');
  const montado = useRef(true);

  const verificar = useCallback(async () => {
    const e = await sfsApi.estado();
    if (!montado.current) return e.activo;
    setActivo(e.activo);
    setUrl(e.url);
    if (e.iniciando && !e.activo) setEncendiendo(true);
    return e.activo;
  }, []);

  useEffect(() => {
    montado.current = true;
    verificar();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') verificar();
    }, 10_000);
    return () => {
      montado.current = false;
      clearInterval(id);
    };
  }, [verificar]);

  const encender = useCallback(async (): Promise<boolean> => {
    setError('');
    setEncendiendo(true);
    try {
      await sfsApi.iniciar();
      const ok = await sfsApi.esperarActivo();
      if (!ok) setError('El SFS no respondió a tiempo. Revisa la ventana del SFS o intenta nuevamente.');
      await verificar();
      return ok;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo encender el SFS.');
      return false;
    } finally {
      if (montado.current) setEncendiendo(false);
    }
  }, [verificar]);

  const apagar = useCallback(async (): Promise<boolean> => {
    setError('');
    setApagando(true);
    try {
      await sfsApi.detener();
      const activo = await verificar();
      return !activo;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo apagar el SFS.');
      return false;
    } finally {
      if (montado.current) setApagando(false);
    }
  }, [verificar]);

  return { activo, url, encendiendo, apagando, apagar, error, limpiarError: () => setError(''), verificar, encender };
}
