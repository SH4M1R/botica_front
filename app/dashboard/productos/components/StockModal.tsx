'use client';

import { useEffect, useState } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import type { Producto } from "@/api/productos";

interface StockModalProps {
  open: boolean;
  producto: Producto | null;
  onClose: () => void;
  onSave: (id: number, nuevoStock: number) => Promise<void>;
}

export default function StockModal({ open, producto, onClose, onSave }: StockModalProps) {
  const [stock, setStock] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !producto) return;
    setStock(producto.stock);
    setError('');
  }, [open, producto]);

  if (!open || !producto) return null;

  const inputClass = "w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm text-center font-semibold focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stock < 0) return setError('El stock no puede ser negativo.');

    setSaving(true);
    setError('');
    try {
      await onSave(producto.id, stock);
      onClose();
    } catch {
      setError('No se pudo actualizar el stock.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <h2 className="text-lg font-bold text-zinc-800">Modificar stock</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="text-center">
            <p className="text-sm font-semibold text-zinc-700">{producto.nombre}</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              Stock actual: <span className="font-semibold text-zinc-600">{producto.stock}</span>
              {typeof producto.stock_minimo === 'number' && (
                <> · Mínimo: <span className="font-semibold text-zinc-600">{producto.stock_minimo}</span></>
              )}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setStock((s) => Math.max(0, s - 1))}
              className="p-2 rounded-lg border border-zinc-300 text-zinc-500 hover:bg-zinc-100 transition-colors"
            >
              <Minus size={16} />
            </button>
            <input
              type="number"
              min="0"
              value={stock}
              onChange={(e) => setStock(Number(e.target.value))}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setStock((s) => s + 1)}
              className="p-2 rounded-lg border border-zinc-300 text-zinc-500 hover:bg-zinc-100 transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>

          {error && <p className="text-xs text-red-500 font-medium text-center">{error}</p>}

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-xs hover:shadow-md transition-all disabled:opacity-60">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}