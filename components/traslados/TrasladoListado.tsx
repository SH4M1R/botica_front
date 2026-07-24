'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, ChevronDown, ChevronUp, Plus, Printer } from 'lucide-react';
import { trasladosApi } from '@/api/traslados';
import type { Traslado, TipoTraslado } from '@/api/traslados';
import { obtenerEmpresa } from '@/api/empresa';
import { generarReporteTrasladoPos80, generarReporteTrasladoA4 } from '@/utils/reporteTraslado';

interface Props {
  tipo: TipoTraslado;
}

export default function TrasladoListado({ tipo }: Props) {
  const [traslados, setTraslados] = useState<Traslado[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandidoId, setExpandidoId] = useState<number | null>(null);
  const [menuImprimirId, setMenuImprimirId] = useState<number | null>(null);

  useEffect(() => {
    trasladosApi.listar().then((data) => {
      setTraslados(data.filter((t) => t.tipo === tipo));
      setLoading(false);
    });
  }, [tipo]);

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return traslados;
    return traslados.filter((t) =>
      t.nombreSucursal.toLowerCase().includes(q) ||
      t.detalles.some((d) => d.nombreProducto.toLowerCase().includes(q))
    );
  }, [traslados, search]);

  const handleImprimir = async (traslado: Traslado, formato: 'pos80' | 'a4') => {
    setMenuImprimirId(null);
    const empresa = await obtenerEmpresa();
    const logoUrl = empresa.logo || undefined;
    const blob = formato === 'pos80'
      ? await generarReporteTrasladoPos80(traslado, logoUrl)
      : await generarReporteTrasladoA4(traslado, logoUrl);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const titulo = tipo === 'INGRESO' ? 'Ingresos' : 'Egresos';
  const rutaRegistro = tipo === 'INGRESO' ? '/dashboard/ingresos/registrar' : '/dashboard/egresos/registrar';  

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">{titulo}</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {tipo === 'INGRESO' ? 'Historial de productos ingresados desde otra sucursal.' : 'Historial de productos egresados hacia otra sucursal.'}
          </p>
        </div>
        <Link
          href={rutaRegistro}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} /> Registrar {tipo === 'INGRESO' ? 'ingreso' : 'egreso'}
        </Link>
      </div>

      <div className="relative max-w-sm">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400"><Search size={16} /></span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por sucursal o producto..."
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        />
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-zinc-400">Cargando {titulo.toLowerCase()}...</div>
        ) : filtrados.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-400">No se encontraron {titulo.toLowerCase()}.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider">
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Sucursal</th>
                <th className="px-5 py-3">Productos</th>
                <th className="px-5 py-3">Total</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtrados.map((t) => (
                <Fragment key={t.id}>
                  <tr className="hover:bg-zinc-50/60 transition-colors">
                    <td className="px-5 py-3 text-zinc-600">{new Date(t.fecha).toLocaleString('es-PE')}</td>
                    <td className="px-5 py-3 font-semibold text-zinc-800">{t.nombreSucursal}</td>
                    <td className="px-5 py-3 text-zinc-600">{t.detalles.length} producto(s)</td>
                    <td className="px-5 py-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                        S/ {t.total.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1 relative">
                        <button
                          onClick={() => setMenuImprimirId(menuImprimirId === t.id ? null : t.id)}
                          title="Imprimir reporte"
                          className="p-2 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Printer size={16} />
                        </button>
                        {menuImprimirId === t.id && (
                          <div className="absolute right-0 top-10 z-10 w-40 bg-white border border-zinc-200 rounded-lg shadow-md overflow-hidden">
                            <button
                              onClick={() => handleImprimir(t, 'pos80')}
                              className="w-full text-left px-4 py-2.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors"
                            >
                              Ticket (80mm)
                            </button>
                            <button
                              onClick={() => handleImprimir(t, 'a4')}
                              className="w-full text-left px-4 py-2.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors border-t border-zinc-100"
                            >
                              Formato A4
                            </button>
                          </div>
                        )}
                        <button
                          onClick={() => setExpandidoId(expandidoId === t.id ? null : t.id)}
                          className="p-2 text-zinc-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        >
                          {expandidoId === t.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandidoId === t.id && (
                    <tr>
                      <td colSpan={5} className="px-5 py-4 bg-zinc-50/60">
                        {t.observacion && (
                          <p className="text-xs text-zinc-500 mb-3"><span className="font-semibold text-zinc-600">Observación:</span> {t.observacion}</p>
                        )}
                        <div className="rounded-lg border border-zinc-200 overflow-hidden bg-white">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-zinc-50 border-b border-zinc-200 text-left font-bold text-zinc-400 uppercase tracking-wider">
                                <th className="px-4 py-2">Producto</th>
                                <th className="px-4 py-2">Cantidad</th>
                                <th className="px-4 py-2">Precio unitario</th>
                                <th className="px-4 py-2">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                              {t.detalles.map((d) => (
                                <tr key={d.id}>
                                  <td className="px-4 py-2 font-semibold text-zinc-700">{d.nombreProducto}</td>
                                  <td className="px-4 py-2 text-zinc-600">{d.cantidad}</td>
                                  <td className="px-4 py-2 text-zinc-600">S/ {d.precioUnitario.toFixed(2)}</td>
                                  <td className="px-4 py-2 text-zinc-600">S/ {d.subtotal.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}