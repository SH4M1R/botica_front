'use client';

import { useCallback, useEffect, useState } from 'react';
import { X, Settings2, Trash2 } from 'lucide-react';
import { cuponesApi } from '@/api/cupones';
import type { CuponTipo } from '@/api/cupones';

export default function CuponTiposModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tipos, setTipos] = useState<CuponTipo[]>([]);
  const [nombre, setNombre] = useState('');
  const [puntos, setPuntos] = useState('');
  const [valor, setValor] = useState('');
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try { setTipos(await cuponesApi.listarTipos()); } catch { setError('No se pudieron cargar los cupones.'); }
  }, []);

  useEffect(() => { if (open) { setError(''); cargar(); } }, [open, cargar]);

  if (!open) return null;

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(puntos, 10);
    const v = parseFloat(valor);
    if (!nombre.trim() || !(p > 0) || !(v > 0)) return setError('Completa nombre, puntos y valor (mayores a 0).');
    setError('');
    try {
      await cuponesApi.crearTipo({ nombre: nombre.trim(), puntosRequeridos: p, valor: v, activo: true });
      setNombre(''); setPuntos(''); setValor('');
      cargar();
    } catch { setError('No se pudo crear el cupón.'); }
  };

  const eliminar = async (id: number) => {
    try { await cuponesApi.eliminarTipo(id); cargar(); } catch { setError('No se pudo eliminar.'); }
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
          <div className="flex items-center gap-2">
            <Settings2 size={16} className="text-primary" />
            <h2 className="text-sm font-bold text-zinc-800">Configurar cupones</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-zinc-500">Define cuántos puntos cuesta cada cupón y su valor en soles. (S/ 1 de compra = 1 punto)</p>
          <form onSubmit={agregar} className="space-y-2">
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre (ej. Cupón S/ 10)" className={inputClass} />
            <div className="flex gap-2">
              <input value={puntos} onChange={(e) => setPuntos(e.target.value.replace(/\D/g, ''))} placeholder="Puntos" className={inputClass} />
              <input value={valor} onChange={(e) => setValor(e.target.value.replace(/[^\d.]/g, ''))} placeholder="Valor S/" className={inputClass} />
            </div>
            <button type="submit" className="w-full px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg">Agregar cupón</button>
          </form>
          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
          <div className="space-y-2">
            {tipos.map((t) => (
              <div key={t.id} className="flex items-center justify-between border border-zinc-200 rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-zinc-800">{t.nombre}</p>
                  <p className="text-xs text-zinc-500">{t.puntosRequeridos} puntos → S/ {t.valor.toFixed(2)}</p>
                </div>
                <button onClick={() => eliminar(t.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
