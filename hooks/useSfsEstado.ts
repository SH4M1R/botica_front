// src/hooks/useSfsEstado.ts
//
// Hook compartido para saber si el SFS está activo, "encenderlo" y abrir
// su Bandeja desde la UI (botones en el Navbar, etc). Centraliza el
// polling para no duplicar setInterval en cada componente.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { sfsApi } from '@/api/sfs';

// Cada cuánto se vuelve a consultar si el SFS sigue activo (ms).
const INTERVALO_VERIFICACION_SFS = 15000;

// Tras pedir "iniciar", el .jar tarda unos segundos en levantar su
// servidor embebido. Reintentamos la verificación varias veces en ese
// rango en vez de esperar al próximo tick del intervalo normal.
const REINTENTOS_TRAS_INICIAR_MS = [4000, 9000, 15000, 25000];

// Cuánto tiempo se mantiene visible cada mensaje de resultado (ms).
const DURACION_MENSAJE_MS = 6000;

export function useSfsEstado() {
  const [sfsDisponible, setSfsDisponible] = useState(false);

  const [iniciando, setIniciando] = useState(false);
  const [mensajeIniciar, setMensajeIniciar] = useState('');

  const [abriendoBandeja, setAbriendoBandeja] = useState(false);
  const [mensajeBandeja, setMensajeBandeja] = useState('');

  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const programarTimeout = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timeoutsRef.current.push(id);
  };

  const verificarSfs = useCallback(async () => {
    try {
      const activo = await sfsApi.verificarEstado();
      setSfsDisponible(activo);
    } catch {
      setSfsDisponible(false);
    }
  }, []);

  useEffect(() => {
    verificarSfs();
    const intervalo = setInterval(verificarSfs, INTERVALO_VERIFICACION_SFS);
    return () => clearInterval(intervalo);
  }, [verificarSfs]);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  const iniciarSfs = useCallback(async () => {
    if (sfsDisponible || iniciando) return;

    setIniciando(true);
    setMensajeIniciar('');

    try {
      const resultado = await sfsApi.iniciar();
      setMensajeIniciar(
        resultado.mensaje ?? (resultado.ok ? 'Iniciando el SFS, espera unos segundos...' : 'No se pudo iniciar el SFS.')
      );

      if (resultado.ok) {
        // Reintenta el chequeo de estado varias veces mientras el .jar
        // termina de levantar, en vez de esperar al próximo tick normal.
        REINTENTOS_TRAS_INICIAR_MS.forEach((ms) => programarTimeout(verificarSfs, ms));
      }
    } catch {
      setMensajeIniciar('Error de conexión al intentar iniciar el SFS.');
    } finally {
      setIniciando(false);
      programarTimeout(() => setMensajeIniciar(''), DURACION_MENSAJE_MS);
    }
  }, [sfsDisponible, iniciando, verificarSfs]);

  const abrirBandeja = useCallback(async () => {
    if (abriendoBandeja) return;

    setAbriendoBandeja(true);
    setMensajeBandeja('');

    try {
      const resultado = await sfsApi.abrirBandeja();
      setMensajeBandeja(
        resultado.mensaje ?? (resultado.ok ? 'Abriendo la Bandeja del SFS...' : 'No se pudo abrir la Bandeja.')
      );
    } catch {
      setMensajeBandeja('Error de conexión al intentar abrir la Bandeja.');
    } finally {
      setAbriendoBandeja(false);
      programarTimeout(() => setMensajeBandeja(''), DURACION_MENSAJE_MS);
    }
  }, [abriendoBandeja]);

  return {
    sfsDisponible,
    verificarSfs,
    iniciando,
    mensajeIniciar,
    iniciarSfs,
    abriendoBandeja,
    mensajeBandeja,
    abrirBandeja,
  };
}