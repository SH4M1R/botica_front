'use client';

import { useEffect, useMemo, useState } from 'react';
import { Lock, Printer, Wallet, ArrowRightLeft } from 'lucide-react';
import { arqueoApi } from '@/api/arqueo';
import type { ArqueoCaja } from '@/api/arqueo';
import { movimientoCajaApi } from '@/api/movimientoCaja';
import type { TipoMovimiento, CategoriaMovimiento } from '@/api/movimientoCaja';
import { ventasApi } from '@/api/ventas'; // NUEVO: para traer las ventas reales
import { useSession } from '@/hooks/useSession';
import AbrirCajaModal from './components/AbrirCajaModal';
import RegistrarMovimientoModal from './components/RegistrarMovimientoModal';
import CerrarCajaModal from './components/CerrarCajaModal';
import { generarReporteCajaPdf } from '@/utils/generarReporteCajaPdf';

function formatFecha(fecha: string | null) {
  if (!fecha) return '';
  return fecha.replace('T', ' ').slice(0, 19);
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function haceUnaSemanaISO() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

type Tab = 'generales' | 'pendientes';

export default function ArqueoPage() {
  const { empleado, cargando: cargandoSesion } = useSession();
  const empleadoId = empleado?.id ?? null;

  const [tab, setTab] = useState<Tab>('generales');
  const [arqueos, setArqueos] = useState<ArqueoCaja[]>([]);
  const [cargando, setCargando] = useState(false);

  const [desde, setDesde] = useState(haceUnaSemanaISO());
  const [hasta, setHasta] = useState(hoyISO());
  const [busqueda, setBusqueda] = useState('');
  const [registrosPorPagina, setRegistrosPorPagina] = useState(10);
  const [paginaActual, setPaginaActual] = useState(1);

  const [cajaAbiertaPropia, setCajaAbiertaPropia] = useState<ArqueoCaja | null | undefined>(undefined);
  const [modalAbrirOpen, setModalAbrirOpen] = useState(false);
  const [modalMovimientoOpen, setModalMovimientoOpen] = useState(false);
  const [modalCerrarOpen, setModalCerrarOpen] = useState(false);
  const [arqueoACerrar, setArqueoACerrar] = useState<ArqueoCaja | null>(null);
  const [error, setError] = useState('');
  const [imprimiendoId, setImprimiendoId] = useState<number | null>(null); // feedback visual por fila

  const cargarDatos = async () => {
    setCargando(true);
    setError('');
    try {
      const data = tab === 'generales'
        ? await arqueoApi.listar(desde, hasta)
        : await arqueoApi.pendientes();
      setArqueos(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los arqueos.');
      setArqueos([]);
    } finally {
      setCargando(false);
    }
  };

  const cargarCajaPropia = async () => {
    if (!empleadoId) return;
    try {
      const actual = await arqueoApi.cajaActual(empleadoId);
      setCajaAbiertaPropia(actual ?? null);
    } catch {
      setCajaAbiertaPropia(null);
    }
  };

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (!cargandoSesion) cargarCajaPropia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empleadoId, cargandoSesion]);

  const handleAbrirCaja = async (montoInicial: number) => {
    if (!empleadoId) throw new Error('No se pudo identificar al empleado actual.');
    await arqueoApi.abrir({ empleadoId, montoInicial });
    await cargarCajaPropia();
    await cargarDatos();
  };

  const handleCerrarCaja = (arqueo: ArqueoCaja) => {
    setArqueoACerrar(arqueo);
    setModalCerrarOpen(true);
  };

  const handleConfirmarCierre = async (montoDejado: number) => {
    if (!arqueoACerrar || !empleadoId) throw new Error('No se pudo identificar al empleado actual.');
    setError('');
    try {
      await arqueoApi.cerrar(arqueoACerrar.id, { empleadoId, montoDejado });
      await cargarCajaPropia();
      await cargarDatos();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'No se pudo cerrar la caja.';
      setError(mensaje);
      throw new Error(mensaje);
    }
  };

  const handleRegistrarMovimiento = async (data: {
    tipo: TipoMovimiento;
    categoria: CategoriaMovimiento;
    descripcion: string;
    monto: number;
  }) => {
    if (!cajaAbiertaPropia || !empleadoId) throw new Error('No tienes una caja abierta.');

    await movimientoCajaApi.registrar({
      arqueoCajaId: cajaAbiertaPropia.id,
      empleadoId,
      numero: `MOV-${Date.now()}`,
      fechaEmision: new Date().toISOString(),
      medioPago: 'EFECTIVO',
      ...data,
    });
  };

  /**
   * ANTES: `(arqueo as any).ventas ?? []` — ArqueoCaja NUNCA trae un campo
   * `ventas` (revisa la interfaz en api/arqueo.ts), así que esto siempre
   * devolvía un array vacío y el PDF salía sin ventas sin importar qué caja
   * imprimieras.
   *
   * AHORA: traemos TODAS las ventas y filtramos por empleado + rango de
   * fechas del arqueo (mismo patrón que en la página de Medios de Pago).
   * Como este botón solo aparece para arqueos YA CERRADOS (!a.estado),
   * fechaFin siempre viene definida.
   */
  const handleImprimir = async (arqueo: ArqueoCaja) => {
    setImprimiendoId(arqueo.id);
    try {
      setError('');

      const todasVentas = await ventasApi.listar();
      const inicio = new Date(arqueo.fechaInicio);
      const fin = arqueo.fechaFin ? new Date(arqueo.fechaFin) : new Date();

      const ventasDeLaCaja = todasVentas.filter((v) => {
        const fechaVenta = new Date(v.fecha);
        return (
          v.estado &&
          v.empleado.id === arqueo.empleadoId &&
          fechaVenta >= inicio &&
          fechaVenta <= fin
        );
      });

      const pdfBlob = await generarReporteCajaPdf(arqueo, ventasDeLaCaja);
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar el reporte en PDF.');
    } finally {
      setImprimiendoId(null);
    }
  };

  const filtrados = useMemo(() => {
    const lista = Array.isArray(arqueos) ? arqueos : [];
    if (!busqueda.trim()) return lista;
    const q = busqueda.toLowerCase();
    return lista.filter((a) =>
      (a.numero?.toLowerCase() ?? '').includes(q) ||
      (a.empleadoNombre?.toLowerCase() ?? '').includes(q)
    );
  }, [arqueos, busqueda]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / registrosPorPagina));
  const paginaSegura = Math.min(paginaActual, totalPaginas);
  const paginados = filtrados.slice(
    (paginaSegura - 1) * registrosPorPagina,
    paginaSegura * registrosPorPagina
  );

  const tabClass = (active: boolean) =>
    `px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
      active ? 'bg-primary text-white' : 'bg-primary/10 text-primary hover:bg-primary/20'
    }`;

  const inputClass = "px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Arqueo de Caja</h1>
        </div>

        <div className="flex items-center gap-3">
          {cajaAbiertaPropia === null && (
            <button
              onClick={() => setModalAbrirOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <Wallet size={16} />
              Abrir Caja
            </button>
          )}

          {cajaAbiertaPropia && (
            <>
              <span className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-lg">
                Tienes abierta: {cajaAbiertaPropia.numero}
              </span>
              <button
                onClick={() => setModalMovimientoOpen(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                <ArrowRightLeft size={16} />
                Registrar Movimiento
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xs border border-zinc-200 p-5 space-y-4">
        <div className="flex gap-2">
          <button onClick={() => { setTab('generales'); setPaginaActual(1); }} className={tabClass(tab === 'generales')}>Generales</button>
          <button onClick={() => { setTab('pendientes'); setPaginaActual(1); }} className={tabClass(tab === 'pendientes')}>Pendientes</button>
        </div>

        {tab === 'generales' && (
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-600">Desde</label>
              <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-600">Hasta</label>
              <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={inputClass} />
            </div>
            <button
              onClick={() => { setPaginaActual(1); cargarDatos(); }}
              className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/80 rounded-lg shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              Mostrar
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-zinc-600">
            Mostrar
            <select
              value={registrosPorPagina}
              onChange={(e) => { setRegistrosPorPagina(Number(e.target.value)); setPaginaActual(1); }}
              className={inputClass}
            >
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            registros
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-600">Buscar:</label>
            <input
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1); }}
              className={inputClass}
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primary/10 border-b border-zinc-200 text-left text-xs font-bold text-primary uppercase tracking-wider">
                <th className="py-2 px-2">Numero</th>
                <th className="py-2 px-2">Empleado</th>
                <th className="py-2 px-2">Fecha Inicial</th>
                <th className="py-2 px-2">Monto Inicial</th>
                <th className="py-2 px-2">Fecha Final</th>
                <th className="py-2 px-2">Monto Final</th>
                <th className="py-2 px-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando && (
                <tr><td colSpan={7} className="py-6 text-center text-zinc-400">Cargando...</td></tr>
              )}
              {!cargando && paginados.length === 0 && (
                <tr><td colSpan={7} className="py-6 text-center text-zinc-400">Sin registros.</td></tr>
              )}
              {!cargando && paginados.map((a) => (
                <tr key={a.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                  <td className="py-2 px-2 font-semibold text-primary">{a.numero}</td>
                  <td className="py-2 px-2 font-semibold text-primary">{a.empleadoNombre}</td>
                  <td className="py-2 px-2">{formatFecha(a.fechaInicio)}</td>
                  <td className="py-2 px-2">{a.montoInicial?.toFixed(2) ?? '0.00'}</td>
                  <td className="py-2 px-2">{formatFecha(a.fechaFin)}</td>
                  <td className="py-2 px-2">{a.montoFinal !== null && a.montoFinal !== undefined ? a.montoFinal.toFixed(2) : ''}</td>
                  <td className="py-2 px-2">
                    {a.estado ? (
                      a.empleadoId === empleadoId ? (
                        <button
                          onClick={() => handleCerrarCaja(a)}
                          title="Cerrar caja"
                          className="p-2 text-red-500 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors border-2"
                        >
                          <Lock size={14} />
                        </button>
                      ) : (
                        <span
                          className="text-xs text-zinc-400"
                          title="Solo el empleado que abrió esta caja puede cerrarla"
                        >
                          —
                        </span>
                      )
                    ) : (
                      <button
                        onClick={() => handleImprimir(a)}
                        disabled={imprimiendoId === a.id}
                        title="Imprimir"
                        className="p-2 text-green-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors border-2 disabled:opacity-40"
                      >
                        <Printer size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-zinc-500">
            Mostrando registros del {filtrados.length === 0 ? 0 : (paginaSegura - 1) * registrosPorPagina + 1} al{' '}
            {Math.min(paginaSegura * registrosPorPagina, filtrados.length)} de un total de {filtrados.length} registros
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={paginaSegura <= 1}
              onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Anterior
            </button>
            <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-primary text-white text-xs font-semibold">{paginaSegura}</span>
            <button
              disabled={paginaSegura >= totalPaginas}
              onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
              className="px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      <AbrirCajaModal
        open={modalAbrirOpen}
        onClose={() => setModalAbrirOpen(false)}
        onConfirm={handleAbrirCaja}
      />

      <RegistrarMovimientoModal
        open={modalMovimientoOpen}
        onClose={() => setModalMovimientoOpen(false)}
        onConfirm={handleRegistrarMovimiento}
      />

      <CerrarCajaModal
        open={modalCerrarOpen}
        numeroArqueo={arqueoACerrar?.numero}
        onClose={() => setModalCerrarOpen(false)}
        onConfirm={handleConfirmarCierre}
      />
    </div>
  );
}