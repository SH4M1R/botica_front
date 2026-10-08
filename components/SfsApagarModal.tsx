'use client';

import { Power, Loader2, AlertTriangle } from 'lucide-react';

interface SfsApagarModalProps {
  open: boolean;
  apagando: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export default function SfsApagarModal({ open, apagando, onConfirmar, onCancelar }: SfsApagarModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xl max-w-md w-full p-6 flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-900">¿Apagar el SFS?</h3>
            <p className="text-sm text-zinc-600 mt-1">
              Mientras esté apagado no se podrán emitir boletas ni facturas electrónicas, y los comprobantes que aún no
              se hayan enviado a SUNAT quedarán pendientes hasta que lo vuelvas a encender. SUNAT exige enviarlos dentro
              de un plazo, así que no lo dejes apagado por mucho tiempo.
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancelar}
            disabled={apagando}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-100 disabled:opacity-50 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={apagando}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 transition-colors cursor-pointer"
          >
            {apagando ? <Loader2 size={16} className="animate-spin" /> : <Power size={16} />}
            {apagando ? 'Apagando…' : 'Sí, apagar SFS'}
          </button>
        </div>
      </div>
    </div>
  );
}
