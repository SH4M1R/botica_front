'use client';

import { useState } from 'react';
import { Lock, X } from 'lucide-react';

interface Props {
  open: boolean;
  numeroArqueo?: string;
  onClose: () => void;
  onConfirm: (montoDejado: number) => Promise<void>;
}

export default function CerrarCajaModal({ open, numeroArqueo, onClose, onConfirm }: Props) {
  const [montoDejado, setMontoDejado] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleConfirmar = async () => {
    const monto = Number(montoDejado);
    if (montoDejado.trim() === '' || Number.isNaN(monto) || monto < 0) {
      setError('Ingresa un monto válido.');
      return;
    }
    setEnviando(true);
    setError('');
    try {
      await onConfirm(monto);
      setMontoDejado('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cerrar la caja.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-zinc-200">
        <div className="flex items-center justify-between px-5 py-4 text-white">
          <div className="flex items-center gap-2">
            <Lock size={18} className="text-primary" />
            <h3 className="font-semibold text-sm text-zinc-900">Cerrar {numeroArqueo ?? 'caja'}</h3>
          </div>
          <button onClick={onClose} className="text-zinc-300 hover:text-zinc-500 transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-zinc-500">
            Indica cuánto dinero en efectivo estás dejando en la caja.
          </p>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-600">Monto dejado en caja (S/)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={montoDejado}
              onChange={(e) => setMontoDejado(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 rounded-lg border border-primary/10 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              autoFocus
            />
          </div>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              disabled={enviando}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-zinc-500 hover:bg-zinc-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmar}
              disabled={enviando}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary/80 transition-colors cursor-pointer disabled:opacity-50"
            >
              {enviando ? 'Cerrando...' : 'Cerrar caja'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}