'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Eye, Ban, Receipt, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { ventasApi, getNombreCompleto } from '@/api/ventas';
import type { Venta } from '@/api/ventas';
import { useSession } from '@/hooks/useSession';
import VentaDetalleModal from './components/VentaDetalleModal';
import Paginacion from '@/components/Paginacion';
import AnularModal from '@/components/AnularModal';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

function claveDia(fecha: string) {
  return fecha.slice(0, 10); // YYYY-MM-DD
}

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
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [ventaDetalle, setVentaDetalle] = useState<Venta | null>(null);
  const [ventaAAnular, setVentaAAnular] = useState<Venta | null>(null);

  // Paginación por días
  const [paginaDia, setPaginaDia] = useState(0);

  // Paginación de tabla por día
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);

  const cargarVentas = async () => {
    setLoading(true);
    try {
      const data = await ventasApi.listar();
      setVentas(data.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarVentas(); }, []);

  const handleAnular = (venta: Venta) => {
    setVentaAAnular(venta);
  };

  const confirmarAnulacion = async () => {
    if (!ventaAAnular) return;
    await ventasApi.anular(ventaAAnular.id);
    await cargarVentas();
  };

  const esAdministrador = empleado?.rol === 'Administrador';

  const ventasVisibles = useMemo(() => {
    if (cargandoSesion || !empleado) return [];
    if (esAdministrador) return ventas;
    return ventas.filter((v) => v.empleado?.id === empleado.id);
  }, [ventas, empleado, cargandoSesion, esAdministrador]);

  // Agrupar ventas por días (orden descendente por fecha)
  const gruposPorDia = useMemo(() => {
    const mapa = new Map<string, Venta[]>();
    for (const v of ventasVisibles) {
      const clave = claveDia(v.fecha);
      if (!mapa.has(clave)) mapa.set(clave, []);
      mapa.get(clave)!.push(v);
    }
    return Array.from(mapa.entries());
  }, [ventasVisibles]);

  // Validar índice de la página de días
  const totalPaginasDias = gruposPorDia.length;
  const paginaValida = Math.min(Math.max(0, paginaDia), Math.max(0, totalPaginasDias - 1));
  const grupoActual = gruposPorDia[paginaValida];

  // Resetear la paginación interna de la tabla cuando cambia el día seleccionado
  useEffect(() => {
    setCurrentPage(1);
  }, [paginaValida]);

  // Buscar índice de día por fecha seleccionada desde el input date
  const handleSeleccionarFecha = (fechaInput: string) => {
    if (!fechaInput) return;
    const index = gruposPorDia.findIndex(([clave]) => clave === fechaInput);
    if (index !== -1) {
      setPaginaDia(index);
    } else {
      alert('No se encontraron ventas registradas para la fecha seleccionada.');
    }
  };

  // Cálculos de paginación dentro del día actual
  const ventasDelDiaActual = useMemo(() => {
    return grupoActual ? grupoActual[1] : [];
  }, [grupoActual]);

  const totalItemsDia = ventasDelDiaActual.length;
  const totalPaginasTabla = Math.ceil(totalItemsDia / pageSize) || 1;
  const paginaSeguraTabla = Math.min(Math.max(currentPage, 1), totalPaginasTabla);

  const itemsPaginados = useMemo(() => {
    return ventasDelDiaActual.slice(
      (paginaSeguraTabla - 1) * pageSize,
      paginaSeguraTabla * pageSize
    );
  }, [ventasDelDiaActual, paginaSeguraTabla, pageSize]);

  // Ancho porcentual uniforme según el número de columnas visibles
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

      {loading || cargandoSesion ? (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs py-16 text-center text-sm text-zinc-400">
          Cargando ventas...
        </div>
      ) : ventasVisibles.length === 0 ? (
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
                  value={grupoActual ? grupoActual[0] : ''}
                  onChange={(e) => handleSeleccionarFecha(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-800">
                  {grupoActual ? formatFechaLarga(grupoActual[0]) : ''}
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
          {grupoActual && (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-zinc-50 border-b border-zinc-200">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                  Resumen del día
                </span>
              </div>

              <table className="w-full text-sm">
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
                  {itemsPaginados.map((v) => (
                    <tr key={v.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="px-5 py-3 font-mono text-zinc-600">#{String(v.id).padStart(6, '0')}</td>
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

              {ventasDelDiaActual.length > 0 && (
                <Paginacion
                  currentPage={paginaSeguraTabla}
                  totalPages={totalPaginasTabla}
                  pageSize={pageSize}
                  totalItems={totalItemsDia}
                  itemLabel="ventas"
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
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
        mensaje={`¿Anular la venta #${String(ventaAAnular?.id ?? '').padStart(6, '0')}? El stock se devolverá.`}
        errorMensajeDefault="Ocurrió un error al intentar anular esta venta."
      />
    </div>
  );
}