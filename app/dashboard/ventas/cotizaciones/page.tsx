'use client';

import { useEffect, useState } from 'react';
import { usePaginaServidor } from '@/hooks/usePaginaServidor';
import { paginaVacia } from '@/api/paginacion';
import Link from 'next/link';
import { Plus, Eye, Ban, Calendar, ChevronLeft, ChevronRight, ShoppingCart, X, FileText } from 'lucide-react';
import { cotizacionesApi } from '@/api/cotizaciones';
import type { Cotizacion } from '@/api/cotizaciones';
import { useSession } from '@/hooks/useSession';
import Paginacion from '@/components/Paginacion';
import AnularModal from '@/components/AnularModal';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

const labelTipo: Record<string, string> = {
  unidad: '',
  blister: 'Blister',
  caja: 'Caja',
};

function formatFechaLarga(claveDiaStr: string) {
  const [anio, mes, dia] = claveDiaStr.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  const texto = fecha.toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function formatFolio(id: number) {
  return `#${String(id).padStart(6, '0')}`;
}

export default function CotizacionesPage() {
  const { empleado, cargando: cargandoSesion } = useSession();
  const [cotizacionDetalle, setCotizacionDetalle] = useState<Cotizacion | null>(null);
  const [cotizacionAAnular, setCotizacionAAnular] = useState<Cotizacion | null>(null);

  const esAdministrador = empleado?.rol === 'Administrador';
  const sesionLista = !cargandoSesion && !!empleado;
  const idEmpleadoFiltro = sesionLista && !esAdministrador ? empleado!.id : undefined;

  const [dias, setDias] = useState<string[]>([]);
  const [cargandoDias, setCargandoDias] = useState(true);
  const [paginaDia, setPaginaDia] = useState(0);

  useEffect(() => {
    if (!sesionLista) return;
    let cancelado = false;
    setCargandoDias(true);
    cotizacionesApi.dias(idEmpleadoFiltro)
      .then((d) => { if (!cancelado) setDias(d); })
      .catch(() => { if (!cancelado) setDias([]); })
      .finally(() => { if (!cancelado) setCargandoDias(false); });
    return () => { cancelado = true; };
  }, [sesionLista, idEmpleadoFiltro]);

  const totalPaginasDias = dias.length;
  const paginaValida = Math.min(Math.max(0, paginaDia), Math.max(0, totalPaginasDias - 1));
  const fechaActual: string | undefined = dias[paginaValida];

  const {
    items: cotizaciones, total: totalItemsDia, totalPages: totalPaginasTabla, page: paginaSeguraTabla, size: pageSize,
    loading, setPage: setCurrentPage, cambiarTamano, recargar,
  } = usePaginaServidor<Cotizacion>(
    (p, sz) =>
      fechaActual
        ? cotizacionesApi.listarPorDia(fechaActual, p, sz, idEmpleadoFiltro)
        : Promise.resolve(paginaVacia<Cotizacion>(p, sz)),
    [fechaActual, idEmpleadoFiltro],
    PAGE_SIZE_OPTIONS[0]
  );

  const handleAnular = (cotizacion: Cotizacion) => {
    setCotizacionAAnular(cotizacion);
  };

  const confirmarAnulacion = async () => {
    if (!cotizacionAAnular) return;
    await cotizacionesApi.anular(cotizacionAAnular.id);
    recargar();
  };

  const handleSeleccionarFecha = (fechaInput: string) => {
    if (!fechaInput) return;
    const index = dias.indexOf(fechaInput);
    if (index !== -1) {
      setPaginaDia(index);
    } else {
      alert('No se encontraron cotizaciones registradas para la fecha seleccionada.');
    }
  };

return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Cotizaciones</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {esAdministrador
              ? 'Historial de cotizaciones registradas.'
              : 'Historial de tus cotizaciones registradas.'}
          </p>
        </div>
        <Link
          href="/dashboard/ventas/cotizacion"
          className="flex items-center gap-2 px-3 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-semibold rounded-lg shadow-xs transition-all"
        >
          <Plus size={14} /> Generar cotización
        </Link>
      </div>

      {cargandoDias || cargandoSesion ? (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs py-16 text-center text-sm text-zinc-400">
          Cargando cotizaciones...
        </div>
      ) : dias.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs py-16 text-center text-sm text-zinc-400">
          {esAdministrador ? 'Aún no hay cotizaciones registradas.' : 'Aún no has registrado cotizaciones.'}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Navegador de días */}
          <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-zinc-200 shadow-xs">
            <button
              onClick={() => setPaginaDia((prev) => Math.min(totalPaginasDias - 1, prev + 1))}
              disabled={paginaValida >= totalPaginasDias - 1}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              title="Día anterior"
            >
              <ChevronLeft size={16} />
              <span className="hidden sm:inline">Día anterior</span>
            </button>

            <div className="flex items-center gap-2 text-center">
              <div
                className="relative flex items-center justify-center p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer group"
                title="Seleccionar fecha"
              >
                <Calendar size={18} />
                <input
                  type="date"
                  value={fechaActual ?? ''}
                  onChange={(e) => handleSeleccionarFecha(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-800">
                  {fechaActual ? formatFechaLarga(fechaActual) : ''}
                </p>
              </div>
            </div>

            <button
              onClick={() => setPaginaDia((prev) => Math.max(0, prev - 1))}
              disabled={paginaValida === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              title="Día siguiente / más reciente"
            >
              <span className="hidden sm:inline">Día siguiente</span>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Tabla de cotizaciones del día */}
          {fechaActual && (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-zinc-50 border-b border-zinc-200">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                  Resumen del día
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className={`w-full text-sm transition-opacity ${loading ? 'opacity-60' : ''}`}>
                  <colgroup>
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '20%' }} />
                    {esAdministrador && <col style={{ width: '15%' }} />}
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '15%' }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-primary/10 border-b border-zinc-200 text-left text-xs font-bold text-primary uppercase tracking-wider">
                      <th className="px-5 py-3">N° COTIZACIÓN</th>
                      <th className="px-5 py-3">CLIENTE</th>
                      {esAdministrador && <th className="px-5 py-3">REGISTRADO POR</th>}
                      <th className="px-5 py-3">HORA</th>
                      <th className="px-5 py-3 text-right">TOTAL</th>
                      <th className="px-5 py-3">ESTADO</th>
                      <th className="px-5 py-3 text-right">ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {cotizaciones.map((c) => {
                      const puedeCargar = c.estado && !c.convertida;
                      return (
                        <tr key={c.id} className="hover:bg-zinc-50/60 transition-colors">
                          <td className="px-5 py-3 font-mono text-zinc-600">{formatFolio(c.id)}</td>
                          <td className="px-5 py-3 font-medium text-zinc-800">
                            {c.clienteNombre || 'Clientes Varios'}
                          </td>
                          {esAdministrador && (
                            <td className="px-5 py-3 text-zinc-600">{c.empleado?.nombre ?? '—'}</td>
                          )}
                          <td className="px-5 py-3 text-zinc-600">
                            {new Date(c.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-5 py-3 text-right font-medium text-zinc-800">
                            S/ {c.total.toFixed(2)}
                          </td>
                          <td className="px-5 py-3">
                            {!c.estado ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-400">
                                Anulada
                              </span>
                            ) : c.convertida ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600">
                                Convertida a venta
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                                Vigente
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => setCotizacionDetalle(c)}
                                className="p-2 text-green-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors border-2"
                                title="Ver detalle"
                              >
                                <Eye size={16} />
                              </button>

                              <Link
                                href={puedeCargar ? `/dashboard/ventas/generar?cotizacionId=${c.id}` : '#'}
                                onClick={(e) => { if (!puedeCargar) e.preventDefault(); }}
                                className={`p-2 rounded-lg transition-colors border-2 flex items-center ${
                                  puedeCargar
                                    ? 'text-primary hover:text-primary hover:bg-primary/10 cursor-pointer'
                                    : 'text-zinc-300 border-zinc-200 cursor-not-allowed'
                                }`}
                                title={
                                  !c.estado
                                    ? 'Esta cotización está anulada'
                                    : c.convertida
                                    ? 'Esta cotización ya fue convertida a venta'
                                    : 'Cargar esta cotización en Generar venta'
                                }
                              >
                                <ShoppingCart size={16} />
                              </Link>

                              <button
                                onClick={() => handleAnular(c)}
                                disabled={!c.estado || c.convertida}
                                className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border-2 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400"
                                title="Anular cotización"
                              >
                                <Ban size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalItemsDia > 0 && (
                <Paginacion
                  currentPage={paginaSeguraTabla}
                  totalPages={totalPaginasTabla}
                  pageSize={pageSize}
                  totalItems={totalItemsDia}
                  itemLabel="cotizaciones"
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={cambiarTamano}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Detalle de la cotización */}
      {cotizacionDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 shrink-0">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-primary" />
                <h2 className="text-sm font-bold text-zinc-800">
                  Cotización {formatFolio(cotizacionDetalle.id)}
                </h2>
              </div>
              <button
                onClick={() => setCotizacionDetalle(null)}
                className="text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-zinc-400 font-semibold uppercase tracking-wide">Cliente</p>
                  <p className="text-zinc-800 font-medium">{cotizacionDetalle.clienteNombre || 'Clientes Varios'}</p>
                  {cotizacionDetalle.clienteDni && (
                    <p className="text-zinc-400 font-mono">{cotizacionDetalle.clienteDni}</p>
                  )}
                </div>
                <div>
                  <p className="text-zinc-400 font-semibold uppercase tracking-wide">Atendido por</p>
                  <p className="text-zinc-800 font-medium">{cotizacionDetalle.empleado?.nombre ?? '—'}</p>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 overflow-hidden">
                <table className={`w-full text-sm transition-opacity ${loading ? 'opacity-60' : ''}`}>
                  <thead className="bg-zinc-50">
                    <tr className="text-left text-xs font-bold text-zinc-400 uppercase tracking-wide">
                      <th className="px-3 py-2">Producto</th>
                      <th className="px-3 py-2 text-right">Cant.</th>
                      <th className="px-3 py-2 text-right">P.Unit</th>
                      <th className="px-3 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {cotizacionDetalle.detalles.map((d) => (
                      <tr key={d.id}>
                        <td className="px-3 py-2 text-zinc-700">
                          {d.producto.nombre}
                          {labelTipo[d.tipoVenta] && (
                            <span className="text-zinc-400"> ({labelTipo[d.tipoVenta]})</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-zinc-600">{d.cantidad}</td>
                        <td className="px-3 py-2 text-right text-zinc-600">S/ {d.precioUnitario.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-zinc-800">S/ {d.subtotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end items-center gap-2 pt-1">
                <span className="text-xs font-semibold text-zinc-500">TOTAL</span>
                <span className="text-lg font-bold text-zinc-800">S/ {cotizacionDetalle.total.toFixed(2)}</span>
              </div>

              {cotizacionDetalle.estado && !cotizacionDetalle.convertida && (
                <Link
                  href={`/dashboard/ventas/generar?cotizacionId=${cotizacionDetalle.id}`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-xs transition-all"
                >
                  <ShoppingCart size={16} /> Cargar en Generar venta
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <AnularModal
        isOpen={!!cotizacionAAnular}
        onClose={() => setCotizacionAAnular(null)}
        onConfirm={confirmarAnulacion}
        titulo="Anular cotización"
        mensaje={`¿Anular la cotización ${cotizacionAAnular ? formatFolio(cotizacionAAnular.id) : ''}? Ya no podrá cargarse en Generar venta.`}
        errorMensajeDefault="Ocurrió un error al intentar anular esta cotización."
      />
    </div>
  );
}