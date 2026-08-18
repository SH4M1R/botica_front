'use client';

import { useEffect, useState } from 'react';
import { X, Wallet } from 'lucide-react';
import type { Cliente } from '@/api/ventas';
import { getNombreCompleto } from '@/api/ventas';

interface SaldoModalProps {
  open: boolean;
  cliente: Cliente | null;
  onClose: () => void;
  onSave: (id: number, saldo: number) => Promise<void>;
}

export default function SaldoModal({ open, cliente, onClose, onSave }: SaldoModalProps) {
  const [saldo, setSaldo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSaldo(cliente?.saldo != null ? String(cliente.saldo) : '0');
    setError('');
  }, [cliente, open]);

  if (!open || !cliente) return null;

  const handleClose = () => {
    setSaldo(''); setError('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const monto = Number(saldo);

    if (saldo.trim() === '' || Number.isNaN(monto)) return setError('Ingresa un monto válido.');
    if (monto < 0) return setError('El saldo no puede ser negativo.');

    setSaving(true);
    setError('');
    try {
      await onSave(cliente.id, monto);
      handleClose();
    } catch {
      setError('No se pudo actualizar el saldo.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all";
  const labelClass = "text-xs font-semibold text-zinc-600";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
          <div className="flex items-center gap-2">
            <Wallet size={16} className="text-primary" />
            <h2 className="text-sm font-bold text-zinc-800">Modificar saldo</h2>
          </div>
          <button onClick={handleClose} className="text-zinc-400 hover:text-zinc-600"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3">
            <p className="text-sm text-zinc-600">
                Cliente: <span className="font-semibold text-zinc-800">{getNombreCompleto(cliente)}</span>
            </p>

          <div className="space-y-1">
            <label className={labelClass}>Nuevo monto que debe (S/)</label>
            <input
              autoFocus
              type="number"
              step="0.01"
              min="0"
              value={saldo}
              onChange={(e) => setSaldo(e.target.value)}
              className={inputClass}
            />
          </div>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={handleClose} className="px-3 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-xs transition-all disabled:opacity-60">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}