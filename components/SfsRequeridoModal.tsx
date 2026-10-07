'use client';

import { useState } from 'react';
import { Power, Loader2, FileText, AlertTriangle } from 'lucide-react';
import { sfsApi } from '@/api/sfs';

interface SfsRequeridoModalProps {
  open: boolean;
  /** 'boleta' | 'factura' — solo para el texto */
  comprobante: 'boleta' | 'factura';
  /** El SFS ya está encendido: el padre continúa con el comprobante electrónico. */
  onSfsActivo: () => void;
  /** El usuario prefiere no encender el SFS: el padre vuelve a Nota de Venta. */
  onUsarNotaVenta: () => void;
}

export default function SfsRequeridoModal({ open, comprobante, onSfsActivo, onUsarNotaVenta }: SfsRequeridoModalProps) {
  const [encendiendo, setEncendiendo] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const etiqueta = comprobante === 'factura' ? 'facturas electrónicas' : 'boletas electrónicas';

  const encender = async () => {
    setError('');
    setEncendiendo(true);
    try {
      await sfsApi.iniciar();
      const ok = await sfsApi.esperarActivo();
      if (ok) onSfsActivo();
      else setError('El SFS no respondió a tiempo. Revisa su ventana e inténtalo de nuevo.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo encender el SFS.');
    } finally {
      setEncendiendo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xl max-w-md w-full p-6 flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-900">El SFS está apagado</h3>
            <p className="text-sm text-zinc-600 mt-1">
              Para emitir {etiqueta} necesitas tener encendido el Sistema Facturador SUNAT. Puedes encenderlo ahora o
              continuar con una Nota de Venta.
            </p>
          </div>
        </div>

        {encendiendo && (
          <p className="text-xs text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2">
            Encendiendo el SFS… puede tardar cerca de 1 minuto. No cierres esta ventana.
          </p>
        )}
        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onUsarNotaVenta}
            disabled={encendiendo}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-100 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <FileText size={16} /> Usar Nota de Venta
          </button>
          <button
            type="button"
            onClick={encender}
            disabled={encendiendo}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 disabled:opacity-60 transition-colors cursor-pointer"
          >
            {encendiendo ? <Loader2 size={16} className="animate-spin" /> : <Power size={16} />}
            {encendiendo ? 'Encendiendo…' : 'Encender SFS'}
          </button>
        </div>
      </div>
    </div>
  );
}
