import React, { useState, useMemo } from 'react';
import { FileText, Download, Printer, AlertTriangle, X, Loader2, Search, Package } from 'lucide-react';
import type { Producto } from '@/api/productos';
import { obtenerAlertaStockMinimo } from '@/api/reportes';
import {
  generarAlertaStockA4,
  generarAlertaStockPos80,
} from '@/utils/reportes/reporteAlertaStock';

interface ModalAlertaStockProps {
  isOpen: boolean;
  onClose: () => void;
  productos?: Producto[];
  logoUrl?: string;
}

export const ModalAlertaStock: React.FC<ModalAlertaStockProps> = ({
  isOpen,
  onClose,
  productos = [],
  logoUrl,
}) => {
  const [formato, setFormato] = useState<'A4' | 'POS80'>('A4');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Filtrar productos que tienen stock bajo
  const productosStockBajo = useMemo(() => {
    return productos.filter((p) => p.stock <= (p.stock_minimo ?? 10));
  }, [productos]);

  const productosFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return productosStockBajo;
    return productosStockBajo.filter((p) => p.nombre.toLowerCase().includes(q));
  }, [productosStockBajo, search]);

  if (!isOpen) return null;

  const handleGenerarReporte = async (accion: 'descargar' | 'imprimir') => {
    try {
      setLoading(true);
      const datos = await obtenerAlertaStockMinimo();

      const pdfBlob =
        formato === 'A4'
          ? await generarAlertaStockA4(datos, logoUrl)
          : await generarAlertaStockPos80(datos, logoUrl);

      const pdfUrl = URL.createObjectURL(pdfBlob);

      if (accion === 'descargar') {
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `Alerta_Stock_${formato}_${new Date().toISOString().slice(0, 10)}.pdf`;
        link.click();
      } else {
        window.open(pdfUrl, '_blank');
      }
      onClose();
    } catch (error) {
      console.error('Error al generar el reporte de alerta de stock:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl transition-all border border-slate-200 flex flex-col max-h-[90vh]">
        
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Alerta de Stock Mínimo
              </h3>
              <p className="text-xs text-slate-500">
                {productosStockBajo.length} productos con existencias críticas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Buscador + Formato */}
        <div className="px-6 pt-4 pb-2 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:max-w-xs">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search size={16} />
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar en stock bajo..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-medium text-slate-500 shrink-0">Formato PDF:</span>
              <div className="grid grid-cols-2 gap-1.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setFormato('A4')}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                    formato === 'A4'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  A4
                </button>
                <button
                  type="button"
                  onClick={() => setFormato('POS80')}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                    formato === 'POS80'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Printer className="h-3.5 w-3.5" />
                  POS-80
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla interactiva con Scroll */}
        <div className="p-6 pt-2 overflow-y-auto flex-1">
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            {productosFiltrados.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                <Package size={32} className="text-slate-300" />
                <span>No se encontraron productos con stock bajo.</span>
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-primary/10 text-primary font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">Producto</th>
                    <th className="px-4 py-2.5">Categoría</th>
                    <th className="px-4 py-2.5 text-right">Stock Actual</th>
                    <th className="px-4 py-2.5 text-right">Stock Mín.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {productosFiltrados.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-2.5 font-semibold text-slate-800">{p.nombre}</td>
                      <td className="px-4 py-2.5 text-slate-600">{p.categoria?.nombre ?? '-'}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-red-500">{p.stock}</td>
                      <td className="px-4 py-2.5 text-right text-slate-500">{p.stock_minimo ?? 10}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Pie del Modal */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 bg-slate-50/50 rounded-b-xl shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Cerrar
          </button>
          
          <button
            type="button"
            onClick={() => handleGenerarReporte('imprimir')}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            Vista Previa
          </button>

          <button
            type="button"
            onClick={() => handleGenerarReporte('descargar')}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-primary/90 focus:outline-none transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Descargar
          </button>
        </div>
      </div>
    </div>
  );
};