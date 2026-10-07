'use client';

import { useEffect, useState } from 'react';
import { usePaginaServidor } from '@/hooks/usePaginaServidor';
import { paginaVacia } from '@/api/paginacion';
import Link from 'next/link';
import { Plus, Eye, Ban, Receipt, Calendar, ChevronLeft, ChevronRight, FileImage } from 'lucide-react';
import { ventasApi, getNombreCompleto } from '@/api/ventas';
import type { Venta } from '@/api/ventas';
import { useSession } from '@/hooks/useSession';
import VentaDetalleModal from './components/VentaDetalleModal';
import Paginacion from '@/components/Paginacion';
import AnularModal from '@/components/AnularModal';
import RecetaModal from './components/RecetaModal';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

function formatFechaLarga(claveDiaStr: string) {
  const [anio, mes, dia] = claveDiaStr.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  const texto = fecha.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Extrae solo los nombres de los métodos de pago ignorando montos o detalles
function obtenerSoloMetodos(metodoPagoCadena: string | undefined): string {
  if (!metodoPagoCadena) return '—';

  const metodosDisponibles = ['Efectivo', 'Izipay', 'Transferencia', 'Yape/Plin', 'Yape', 'Plin', 'Crédito'];
  const encontrados: string[] = [];

  for (const m of metodosDisponibles) {
    if (metodoPagoCadena.toLowerCase().includes(m.toLowerCase()) && !encontrados.includes(m)) {
      encontrados.push(m);
    }
  }

  return encontrados.length > 0 ? encontrados.join(' / ') : metodoPagoCadena.split(' ')[0];
}

export default function VentasPage() {
  const { empleado, cargando: cargandoSesion } = useSession();
  const [ventaDetalle, setVentaDetalle] = useState<Venta | null>(null);
  const [ventaAAnular, setVentaAAnular] = useState<Venta | null>(null);
  const [ventaReceta, setVentaReceta] = useState<Venta | null>(null);

  const esAdministrador = empleado?.rol === 'Administrador';
  const sesionLista = !cargandoSesion && !!empleado;
  // El vendedor solo ve sus ventas: el filtro lo aplica el backend
  const idEmpleadoFiltro = sesionLista && !esAdministrador ? empleado!.id : undefined;

  // Solo las fechas que tienen ventas (liviano), no las ventas
  const [dias, setDias] = useState<string[]>([]);
  const [cargandoDias, setCargandoDias] = useState(true);
  const [paginaDia, setPaginaDia] = useState(0);

  useEffect(() => {
    if (!sesionLista) return;
    let cancelado = false;
    setCargandoDias(true);
    ventasApi.dias(idEmpleadoFiltro)
      .then((d) => { if (!cancelado) setDias(d); })
      .catch(() => { if (!cancelado) setDias([]); })
      .finally(() => { if (!cancelado) setCargandoDias(false); });
    return () => { cancelado = true; };
  }, [sesionLista, idEmpleadoFiltro]);

  const totalPaginasDias = dias.length;
  const paginaValida = Math.min(Math.max(0, paginaDia), Math.max(0, totalPaginasDias - 1));
  const fechaActual: string | undefined = dias[paginaValida];

  // Solo se piden las ventas del día seleccionado, una página a la vez
  const {
    items: ventas, total: totalItemsDia, totalPages: totalPaginasTabla, page: paginaSeguraTabla, size: pageSize,
    loading, setPage: setCurrentPage, cambiarTamano, recargar,
  } = usePaginaServidor<Venta>(
    (p, sz) =>
      fechaActual
        ? ventasApi.listarPorDia(fechaActual, p, sz, idEmpleadoFiltro)
        : Promise.resolve(paginaVacia<Venta>(p, sz)),
    [fechaActual, idEmpleadoFiltro],
    PAGE_SIZE_OPTIONS[0]
  );

  const handleAnular = (venta: Venta) => {
    setVentaAAnular(venta);
  };

  const confirmarAnulacion = async () => {
    if (!ventaAAnular) return;
    await ventasApi.anular(ventaAAnular.id);
    recargar();
  };

  const handleSeleccionarFecha = (fechaInput: string) => {
    if (!fechaInput) return;
    const index = dias.indexOf(fechaInput);
    if (index !== -1) {
      setPaginaDia(index);
    } else {
      alert('No se encontraron ventas registradas para la fecha seleccionada.');
    }
  };

  const colWidth = esAdministrador ? '14.285%' : '16.666%';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Ventas</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {esAdministrador ? 'Historial de ventas registradas.' : 'Historial de tus ventas registradas.'}
          </p>
        </div>
        <Link
          href="/dashboard/ventas/generar"
          className="flex items-center gap-2 px-3 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-semibold rounded-lg shadow-xs transition-all"
        >
          <Plus size={14} /> Generar Venta
        </Link>
      </div>

      {cargandoDias || cargandoSesion ? (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs py-16 text-center text-sm text-zinc-400">
          Cargando ventas...
        </div>
      ) : dias.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs py-16 text-center text-sm text-zinc-400">
          {esAdministrador ? 'Aún no hay ventas registradas.' : 'Aún no has registrado ventas.'}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Barra de Paginación y Selector por Calendario */}
          <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-zinc-200 shadow-xs">
            {/* Botón Izquierda: Retroceder hacia Día Anterior */}
            <button
              onClick={() => setPaginaDia((prev) => Math.min(totalPaginasDias - 1, prev + 1))}
              disabled={paginaValida >= totalPaginasDias - 1}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              title="Día anterior"
            >
              <ChevronLeft size={16} />
              <span className="hidden sm:inline">Día anterior</span>
            </button>

            {/* Centro: Fecha Seleccionada + Input Calendario */}
            <div className="flex items-center gap-2 text-center">
              <div className="relative flex items-center justify-center p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer group" title="Seleccionar fecha">
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

            {/* Botón Derecha: Avanzar hacia Día Siguiente */}
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

          {/* Tabla del Día Seleccionado */}
          {fechaActual && (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-zinc-50 border-b border-zinc-200">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                  Resumen del día
                </span>
              </div>

              <table className={`w-full text-sm transition-opacity ${loading ? 'opacity-60' : ''}`}>
                <colgroup>
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '20%' }} />
                  {esAdministrador && <col style={{ width: '15%' }} />}
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '15%' }} />
                </colgroup>
                <thead>
                  <tr className="bg-primary/10 border-b border-zinc-200 text-left text-xs font-bold text-primary uppercase tracking-wider">
                    <th className="px-5 py-3">N° VENTA</th>
                    <th className="px-5 py-3">CLIENTE</th>
                    {esAdministrador && <th className="px-5 py-3">VENDEDOR</th>}
                    <th className="px-5 py-3">HORA</th>
                    <th className="px-5 py-3">MÉTODO DE PAGO</th>
                    <th className="px-5 py-3 text-right">TOTAL</th>
                    <th className="px-5 py-3">ESTADO</th>
                    <th className="px-5 py-3 text-right">ACCIONES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {ventas.map((v) => (
                    <tr key={v.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="px-5 py-3 font-mono text-zinc-600">
                        {v.serie && v.numeroComprobante
                          ? `${v.serie}-${v.numeroComprobante}`
                          : `#${String(v.id).padStart(6, '0')}`}
                      </td>
                      <td className="px-5 py-3 font-medium text-zinc-800">
                        {v.cliente ? getNombreCompleto(v.cliente) : 'No registrado'}
                      </td>
                      {esAdministrador && (
                        <td className="px-5 py-3 text-zinc-600">{v.empleado?.nombre ?? '—'}</td>
                      )}
                      <td className="px-5 py-3 text-zinc-600">
                        {new Date(v.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-5 py-3 font-medium text-zinc-700">
                        {obtenerSoloMetodos(v.metodoPago)}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-zinc-800">S/ {v.total.toFixed(2)}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${v.estado ? 'bg-primary/10 text-primary' : 'bg-zinc-100 text-zinc-400'}`}>
                          {v.estado ? 'Válida' : 'Anulada'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">

                        {v.requiereReceta && (
                          <button
                            onClick={() => setVentaReceta(v)}
                            className={`p-2 rounded-lg transition-colors border-2 ${
                              v.recetaPath ? 'text-amber-600 hover:bg-amber-50' : 'text-zinc-400 hover:bg-zinc-50'
                            }`}
                            title={v.recetaPath ? 'Ver/reemplazar receta' : 'Agregar receta'}
                          >
                            <FileImage size={16} />
                          </button>
                        )}

                          <button 
                            onClick={() => setVentaDetalle(v)} 
                            className="p-2 text-green-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors border-2" 
                            title="Ver detalle"
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            onClick={() => window.open(`/dashboard/ventas/boleta?id=${v.id}`, '_blank')}
                            className="p-2 text-primary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors border-2"
                            title="Ver boleta"
                          >
                            <Receipt size={16} />
                          </button>

                          <button
                            onClick={() => handleAnular(v)}
                            disabled={!v.estado}
                            className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border-2 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400"
                            title="Anular venta"
                          >
                            <Ban size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalItemsDia > 0 && (
                <Paginacion
                  currentPage={paginaSeguraTabla}
                  totalPages={totalPaginasTabla}
                  pageSize={pageSize}
                  totalItems={totalItemsDia}
                  itemLabel="ventas"
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={cambiarTamano}
                />
              )}
            </div>
          )}
        </div>
      )}

      <VentaDetalleModal venta={ventaDetalle} onClose={() => setVentaDetalle(null)} />

      <AnularModal
        isOpen={!!ventaAAnular}
        onClose={() => setVentaAAnular(null)}
        onConfirm={confirmarAnulacion}
        titulo="Anular venta"
        mensaje={`¿Anular la venta #${String(ventaAAnular?.id ?? '').padStart(6, '0')}? El stock se devolverá.` +
            (ventaAAnular?.tipoVenta === 'boleta' || ventaAAnular?.tipoVenta === 'factura'
              ? ' Este comprobante electrónico ya fue enviado a SUNAT: aquí solo se revierte el stock; la baja o nota de crédito se gestiona desde la bandeja del SFS.'
              : '')}
        errorMensajeDefault="Ocurrió un error al intentar anular esta venta."
      />

      <RecetaModal
        open={!!ventaReceta}
        idVenta={ventaReceta?.id ?? null}
        tieneReceta={!!ventaReceta?.recetaPath}
        onClose={() => setVentaReceta(null)}
        onSubido={recargar}
      />
    </div>
  );
}