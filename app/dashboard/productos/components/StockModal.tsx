'use client';

import { useEffect, useState } from 'react';
import { X, Plus, Loader2, PackagePlus } from 'lucide-react';
import type { Producto } from "@/api/productos";
import { lotesApi, LoteProducto } from "@/api/lotes";

interface StockModalProps {
  open: boolean;
  producto: Producto | null;
  onClose: () => void;
  // Se llama después de cualquier cambio exitoso, para que la página
  // recargue el resumen de stock (ProductosPage ya lo tiene como cargarProductos).
  onCambio: () => void;
}

export default function StockModal({ open, producto, onClose, onCambio }: StockModalProps) {
  const [lotes, setLotes] = useState<LoteProducto[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const [guardandoId, setGuardandoId] = useState<number | null>(null);
  const [valoresEditados, setValoresEditados] = useState<Record<number, number>>({});

  const [mostrarNuevoLote, setMostrarNuevoLote] = useState(false);
  const [nuevoLote, setNuevoLote] = useState('');
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [nuevoStock, setNuevoStock] = useState(0);
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);

  const cargarLotes = async () => {
    if (!producto) return;
    setCargando(true);
    setError('');
    try {
      const data = await lotesApi.lotesDeProducto(producto.id);
      setLotes(data);
      setValoresEditados(Object.fromEntries(data.map((l) => [l.id, l.stock])));
    } catch {
      setError('No se pudieron cargar los lotes de este producto.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (open && producto) {
      cargarLotes();
      setMostrarNuevoLote(false);
      setNuevoLote('');
      setNuevaFecha('');
      setNuevoStock(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, producto]);

  if (!open || !producto) return null;

  const stockTotal = lotes.reduce((sum, l) => sum + l.stock, 0);

  const handleGuardarLote = async (lote: LoteProducto) => {
    const nuevoValor = valoresEditados[lote.id];
    if (nuevoValor === lote.stock || nuevoValor < 0) return;

    setGuardandoId(lote.id);
    setError('');
    try {
      await lotesApi.ajustarStock(lote.id, nuevoValor);
      await cargarLotes();
      onCambio();
    } catch {
      setError('No se pudo ajustar el stock de ese lote.');
    } finally {
      setGuardandoId(null);
    }
  };

  const handleCrearLote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nuevoStock <= 0) return setError('El stock del nuevo lote debe ser mayor a 0.');

    setGuardandoNuevo(true);
    setError('');
    try {
      await lotesApi.crearLote({
        idProducto: producto.id,
        lote: nuevoLote || undefined,
        fechaVencimiento: nuevaFecha || undefined,
        stock: nuevoStock,
      });
      await cargarLotes();
      onCambio();
      setMostrarNuevoLote(false);
      setNuevoLote('');
      setNuevaFecha('');
      setNuevoStock(0);
    } catch {
      setError('No se pudo crear el lote.');
    } finally {
      setGuardandoNuevo(false);
    }
  };

  const inputClass = "px-2.5 py-1.5 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-zinc-800">Lotes de stock</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{producto.nombre}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X size={20} /></button>
        </div>

        <div className="px-6 py-3 bg-zinc-50 border-b border-zinc-200 shrink-0 flex items-center justify-between">
          <span className="text-sm text-zinc-600">
            Stock total: <span className="font-bold text-zinc-800">{stockTotal}</span>
            {typeof producto.stock_minimo === 'number' && (
              <span className="text-zinc-400"> · Mínimo: {producto.stock_minimo}</span>
            )}
          </span>
          <button
            type="button"
            onClick={() => setMostrarNuevoLote((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
          >
            <PackagePlus size={14} /> Agregar lote manual
          </button>
        </div>

        {mostrarNuevoLote && (
          <form onSubmit={handleCrearLote} className="px-6 py-4 border-b border-zinc-200 shrink-0 bg-primary/5 space-y-3">
            <p className="text-[11px] text-zinc-500">
              Para mercadería que SÍ tiene comprobante de compra, mejor regístrala desde
              Compras (queda asociada al proveedor). Usa esto solo para ajustes
              (conteo físico, donación, corrección).
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600">Lote (opcional)</label>
                <input value={nuevoLote} onChange={(e) => setNuevoLote(e.target.value)} className={`${inputClass} w-full`} placeholder="Ej. L-2024-001" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600">F. Vencimiento (opcional)</label>
                <input type="date" value={nuevaFecha} onChange={(e) => setNuevaFecha(e.target.value)} className={`${inputClass} w-full`} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600">Stock</label>
                <input type="number" min="1" value={nuevoStock} onChange={(e) => setNuevoStock(Number(e.target.value))} className={`${inputClass} w-full`} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setMostrarNuevoLote(false)} className="px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={guardandoNuevo} className="px-3 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg transition-all disabled:opacity-60 flex items-center gap-1.5">
                {guardandoNuevo ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                Crear lote
              </button>
            </div>
          </form>
        )}

        <div className="flex-1 overflow-y-auto">
          {cargando ? (
            <div className="py-10 text-center text-sm text-zinc-400">Cargando lotes...</div>
          ) : lotes.length === 0 ? (
            <div className="py-10 text-center text-sm text-zinc-400">
              Este producto no tiene lotes registrados todavía.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-zinc-100 text-left text-[11px] font-bold uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-2.5">Lote</th>
                  <th className="px-4 py-2.5">F. Vencimiento</th>
                  <th className="px-4 py-2.5 text-right">Stock</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {lotes.map((l) => (
                  <tr key={l.id} className="hover:bg-zinc-50/60">
                    <td className="px-4 py-2 text-zinc-700">{l.lote ?? <span className="text-zinc-400 italic">sin lote</span>}</td>
                    <td className="px-4 py-2 text-zinc-700">
                      {l.fechaVencimiento ? new Date(l.fechaVencimiento).toLocaleDateString('es-PE') : <span className="text-zinc-400 italic">sin fecha</span>}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        value={valoresEditados[l.id] ?? l.stock}
                        onChange={(e) => setValoresEditados((prev) => ({ ...prev, [l.id]: Number(e.target.value) }))}
                        className="w-20 px-2 py-1 rounded-lg border border-zinc-300 text-right text-sm"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        disabled={guardandoId === l.id || valoresEditados[l.id] === l.stock}
                        onClick={() => handleGuardarLote(l)}
                        className="px-2.5 py-1 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {guardandoId === l.id ? <Loader2 size={13} className="animate-spin" /> : 'Guardar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {error && <p className="px-6 py-2 text-xs text-red-500 font-medium shrink-0">{error}</p>}

        <div className="flex justify-end px-6 py-4 border-t border-zinc-100 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}