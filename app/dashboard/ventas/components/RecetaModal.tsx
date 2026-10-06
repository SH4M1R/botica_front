'use client';

import { useState } from 'react';
import { X, Upload, Loader2, FileImage } from 'lucide-react';
import { recetasApi } from '@/api/ventas';

interface RecetaModalProps {
  open: boolean;
  idVenta: number | null;
  tieneReceta: boolean;
  onClose: () => void;
  onSubido: () => void;
}

export default function RecetaModal({ open, idVenta, tieneReceta, onClose, onSubido }: RecetaModalProps) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');

  if (!open || !idVenta) return null;

  const handleSubir = async () => {
    if (!archivo) return setError('Selecciona una foto de la receta.');
    setSubiendo(true);
    setError('');
    try {
      await recetasApi.subir(idVenta, archivo);
      onSubido();
      onClose();
    } catch {
      setError('No se pudo subir la receta. Intenta nuevamente.');
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <h2 className="text-lg font-bold text-zinc-800">Receta médica</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-4">
          {tieneReceta && (
            <div className="rounded-xl border border-zinc-200 overflow-hidden">
              <img src={recetasApi.urlVer(idVenta)} alt="Receta actual" className="w-full max-h-64 object-contain bg-zinc-50" />
              <p className="text-[11px] text-zinc-400 px-3 py-1.5 bg-zinc-50 border-t border-zinc-100">Receta ya registrada. Puedes reemplazarla subiendo una nueva foto.</p>
            </div>
          )}

          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-zinc-300 rounded-xl p-6 cursor-pointer hover:bg-zinc-50 transition-colors">
            <FileImage size={24} className="text-zinc-400" />
            <span className="text-xs text-zinc-500 text-center">
              {archivo ? archivo.name : 'Selecciona o toma una foto de la receta'}
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            />
          </label>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors">Cancelar</button>
            <button
              type="button"
              onClick={handleSubir}
              disabled={subiendo}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-xs transition-all disabled:opacity-60"
            >
              {subiendo ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              {subiendo ? 'Subiendo...' : 'Subir foto'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}