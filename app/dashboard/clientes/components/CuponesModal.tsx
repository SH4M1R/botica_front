'use client';

import { useCallback, useEffect, useState } from 'react';
import { X, Gift, Loader2 } from 'lucide-react';
import type { Cliente } from '@/api/ventas';
import { getNombreCompleto } from '@/api/ventas';
import { cuponesApi } from '@/api/cupones';
import type { Cupon, CuponTipo } from '@/api/cupones';

interface Props {
  open: boolean;
  cliente: Cliente | null;
  onClose: () => void;
  onCambio: () => void;
}

export default function CuponesModal({ open, cliente, onClose, onCambio }: Props) {
  const [tipos, setTipos] = useState<CuponTipo[]>([]);
  const [cupones, setCupones] = useState<Cupon[]>([]);
  const [puntos, setPuntos] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [procesando, setProcesando] = useState<number | null>(null);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    if (!cliente) return;
    setCargando(true);
    try {
      const [t, c] = await Promise.all([cuponesApi.listarTipos(), cuponesApi.listarPorCliente(cliente.id)]);
      setTipos(t.filter((x) => x.activo !== false));
      setCupones(c);
    } catch {
      setError('No se pudieron cargar los cupones.');
    } finally {
      setCargando(false);
    }
  }, [cliente]);

  useEffect(() => {
    if (open && cliente) {
      setPuntos(cliente.puntos ?? 0);
      setError('');
      cargar();
    }
  }, [open, cliente, cargar]);

  if (!open || !cliente) return null;

  const canjear = async (t: CuponTipo) => {
    setProcesando(t.id);
    setError('');
    try {
      await cuponesApi.canjear(cliente.id, t.id);
      setPuntos((p) => p - t.puntosRequeridos);
      await cargar();
      onCambio();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'No se pudo canjear el cupón.');
    } finally {
      setProcesando(null);
    }
  };

  const usar = async (c: Cupon) => {
    setProcesando(-c.id);
    try {
      await cuponesApi.usar(c.id);
      await cargar();
    } catch {
      setError('No se pudo marcar el cupón como usado.');
    } finally {
      setProcesando(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
          <div className="flex items-center gap-2">
            <Gift size={16} className="text-primary" />
            <h2 className="text-sm font-bold text-zinc-800">Puntos y cupones — {getNombreCompleto(cliente)}</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-5">
          <div className="rounded-xl bg-primary/10 px-4 py-3 text-center">
            <p className="text-xs font-semibold text-primary uppercase">Puntos disponibles</p>
            <p className="text-3xl font-bold text-primary">{puntos}</p>
          </div>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          <div className="space-y-2">
            <h3 className="text-xs font-bold text-zinc-600 uppercase">Canjear cupón</h3>
            {cargando ? (
              <Loader2 size={16} className="animate-spin text-zinc-400" />
            ) : tipos.length === 0 ? (
              <p className="text-sm text-zinc-400">La empresa aún no configuró cupones.</p>
            ) : tipos.map((t) => {
              const alcanza = puntos >= t.puntosRequeridos;
              return (
                <div key={t.id} className="flex items-center justify-between border border-zinc-200 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-zinc-800">{t.nombre} — S/ {t.valor.toFixed(2)}</p>
                    <p className="text-xs text-zinc-500">{t.puntosRequeridos} puntos</p>
                  </div>
                  <button
                    onClick={() => canjear(t)}
                    disabled={!alcanza || procesando !== null}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-primary rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {procesando === t.id ? '...' : 'Canjear'}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold text-zinc-600 uppercase">Cupones generados</h3>
            {cupones.length === 0 ? (
              <p className="text-sm text-zinc-400">Sin cupones.</p>
            ) : cupones.map((c) => (
              <div key={c.id} className="flex items-center justify-between border border-zinc-200 rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-mono font-semibold text-zinc-800">{c.codigo}</p>
                  <p className="text-xs text-zinc-500">{c.nombre} · S/ {c.valor.toFixed(2)} · {c.estado}</p>
                </div>
                {c.estado === 'ACTIVO' && (
                  <button
                    onClick={() => usar(c)}
                    disabled={procesando !== null}
                    className="px-3 py-1.5 text-xs font-semibold text-amber-700 border-2 border-amber-200 rounded-lg hover:bg-amber-50 disabled:opacity-40"
                  >
                    Marcar usado
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
