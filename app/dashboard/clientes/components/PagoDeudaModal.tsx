'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Cliente } from '@/api/ventas';

interface PagoDeudaModalProps {
  open: boolean;
  cliente: Cliente | null;
  onClose: () => void;
  onSave: (id: number, monto: number) => Promise<void>;
}

export default function PagoDeudaModal({ open, cliente, onClose, onSave }: PagoDeudaModalProps) {
  const [monto, setMonto] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMonto('');
    setError('');
  }, [cliente, open]);

  if (!open || !cliente) return null;

  const saldoActual = cliente.saldo ?? 0;
  const montoNumero = parseFloat(monto.replace(',', '.'));
  const montoValido = !isNaN(montoNumero) && montoNumero > 0;
  const saldoRestante = montoValido ? Math.max(0, saldoActual - montoNumero) : saldoActual;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!montoValido) return setError('Ingresa un monto válido mayor a 0.');
    if (montoNumero > saldoActual) return setError('El monto no puede ser mayor a la deuda actual.');

    setSaving(true);
    setError('');
    try {
      await onSave(cliente.id, montoNumero);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el pago.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all";
  const labelClass = "text-xs font-semibold text-zinc-600";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <h2 className="text-lg font-bold text-zinc-800">Registrar pago</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <p className="text-sm text-zinc-500">Cliente</p>
            <p className="text-sm font-semibold text-zinc-800">{cliente.nombre}</p>
          </div>

          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-red-50">
            <span className="text-xs font-semibold text-red-600">Deuda actual</span>
            <span className="text-sm font-bold text-red-600">S/ {saldoActual.toFixed(2)}</span>
          </div>

          <div className="space-y-1">
            <label className={labelClass}>Monto a abonar</label>
            <input
              type="text"
              inputMode="decimal"
              autoFocus
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
          </div>

          {montoValido && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-200">
              <span className="text-xs font-semibold text-zinc-500">Saldo después del pago</span>
              <span className={`text-sm font-bold ${saldoRestante > 0 ? 'text-red-500' : 'text-primary'}`}>
                S/ {saldoRestante.toFixed(2)}
              </span>
            </div>
          )}

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !montoValido}
              className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-xs hover:shadow-md transition-all disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Registrar pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}