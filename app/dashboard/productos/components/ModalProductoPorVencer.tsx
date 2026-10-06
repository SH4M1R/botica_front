import React, { useState, useMemo } from 'react';
import { Calendar, FileText, Download, Printer, X, Loader2, Clock, Search, Package } from 'lucide-react';
import type { Producto } from '@/api/productos';
import { obtenerProductosPorVencer } from '@/api/reportes';
import {
  generarProductosPorVencerA4,
  generarProductosPorVencerPos80,
} from '@/utils/reportes/reporteProductosPorVencer';

interface ModalProductosPorVencerProps {
  isOpen: boolean;
  onClose: () => void;
  productos?: Producto[];
  logoUrl?: string;
}

export const ModalProductosPorVencer: React.FC<ModalProductosPorVencerProps> = ({
  isOpen,
  onClose,
  productos = [],
  logoUrl,
}) => {
  const [formato, setFormato] = useState<'A4' | 'POS80'>('A4');
  const [dias, setDias] = useState<number>(90);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Filtrar según el número de días seleccionado
  const productosPorVencer = useMemo(() => {
    const hoy = new Date();
    const limite = new Date();
    limite.setDate(hoy.getDate() + dias);

    return productos.filter((p) => {
      if (!p.fecha_vencimiento) return false;
      const fechaVenc = new Date(p.fecha_vencimiento);
      return fechaVenc >= hoy && fechaVenc <= limite;
    });
  }, [productos, dias]);

  const productosFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return productosPorVencer;
    return productosPorVencer.filter((p) => p.nombre.toLowerCase().includes(q));
  }, [productosPorVencer, search]);

  if (!isOpen) return null;

  const handleGenerarReporte = async (accion: 'descargar' | 'imprimir') => {
    try {
      setLoading(true);
      const datos = await obtenerProductosPorVencer(dias);

      const pdfBlob =
        formato === 'A4'
          ? await generarProductosPorVencerA4(datos, dias, logoUrl)
          : await generarProductosPorVencerPos80(datos, dias, logoUrl);

      const pdfUrl = URL.createObjectURL(pdfBlob);

      if (accion === 'descargar') {
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `Productos_Por_Vencer_${dias}dias_${formato}_${new Date().toISOString().slice(0, 10)}.pdf`;
        link.click();
      } else {
        window.open(pdfUrl, '_blank');
      }
      onClose();
    } catch (error) {
      console.error('Error al generar el reporte de vencimientos:', error);
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Productos por Vencer
              </h3>
              <p className="text-xs text-slate-500">
                {productosPorVencer.length} productos vencen en los próximos {dias} días
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

        {/* Filtros + Buscador + Formato */}
        <div className="px-6 pt-4 pb-2 space-y-3 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            {/* Período */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary shrink-0" />
              <select
                value={dias}
                onChange={(e) => setDias(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value={30}>Próximos 30 días</option>
                <option value={60}>Próximos 60 días</option>
                <option value={90}>Próximos 90 días</option>
                <option value={180}>Próximos 6 meses (180d)</option>
                <option value={365}>Próximo año (365d)</option>
              </select>
            </div>

            {/* Buscador */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400">
                <Search size={14} />
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar producto..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>

            {/* Formato PDF */}
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setFormato('A4')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
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
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
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

        {/* Tabla interactiva con Scroll */}
        <div className="p-6 pt-2 overflow-y-auto flex-1">
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            {productosFiltrados.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                <Package size={32} className="text-slate-300" />
                <span>No hay productos por vencer en este rango de tiempo.</span>
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-primary/10 text-primary font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">Producto</th>
                    <th className="px-4 py-2.5 text-right">Stock</th>
                    <th className="px-4 py-2.5 text-right">F. Vencimiento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {productosFiltrados.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-2.5 font-semibold text-slate-800">{p.nombre}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-700">{p.stock}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-red-500">
                        {p.fecha_vencimiento ? new Date(p.fecha_vencimiento).toLocaleDateString('es-PE') : '-'}
                      </td>
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