'use client';

import { useState } from 'react';
import { FileText, Printer, Loader2 } from 'lucide-react';

import * as api from '@/api/reportes';
import { generarReporteAsistenciaPos80, generarReporteAsistenciaA4 } from '@/utils/reportes/reporteAsistencia';
import { obtenerEmpresa } from '@/api/empresa';
import { descargarPdf, abrirPdfEnNuevaPestana } from '@/utils/reportes/pdfBase';

import { generarReporteVentasPeriodoPos80, generarReporteVentasPeriodoA4 } from '@/utils/reportes/reporteVentasPeriodo';
import { generarVentasPorEmpleadoPos80, generarVentasPorEmpleadoA4 } from '@/utils/reportes/reporteVentasEmpleado';
import { generarTopProductosPos80, generarTopProductosA4 } from '@/utils/reportes/reporteTopProductos';
import { generarArqueoCajaPos80, generarArqueoCajaA4 } from '@/utils/reportes/reporteArqueoCaja';
import { generarFlujoCajaPos80, generarFlujoCajaA4 } from '@/utils/reportes/reporteFlujoCaja';
import { generarComprasPorProveedorPos80, generarComprasPorProveedorA4 } from '@/utils/reportes/reporteComprasProveedor';
import { generarAnalisisCostosPos80, generarAnalisisCostosA4 } from '@/utils/reportes/reporteAnalisisCostos';
import { generarCuentasPorPagarPos80, generarCuentasPorPagarA4 } from '@/utils/reportes/reporteCuentasPorPagar';
import { generarInventarioValoradoPos80, generarInventarioValoradoA4 } from '@/utils/reportes/reporteInventarioValorado';
import { generarAlertaStockPos80, generarAlertaStockA4 } from '@/utils/reportes/reporteAlertaStock';
import { generarCatalogoTerapeuticoPos80, generarCatalogoTerapeuticoA4 } from '@/utils/reportes/reporteCatalogoTerapeutico';
import { generarConsolidadoGeneralPos80, generarConsolidadoGeneralA4 } from '@/utils/reportes/reporteConsolidadoGeneral';

type Modulo = 'ventas' | 'caja' | 'compras' | 'inventario' | 'gestion';

const MODULOS: { id: Modulo; label: string }[] = [
  { id: 'ventas', label: 'Ventas' },
  { id: 'caja', label: 'Caja' },
  { id: 'compras', label: 'Compras' },
  { id: 'inventario', label: 'Inventario' },
  { id: 'gestion', label: 'Gestión' },
];

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function inicioDeMes() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}


function ReporteCard({
  titulo,
  descripcion,
  children,
  cargando,
  onPos80,
  onA4,
}: {
  titulo: string;
  descripcion: string;
  children?: React.ReactNode;
  cargando: boolean;
  onPos80: () => void;
  onA4: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
          <FileText size={18} />
        </div>
        <div>
          <h3 className="font-semibold text-primary text-sm">{titulo}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">{descripcion}</p>
        </div>
      </div>

      {children && <div className="flex flex-wrap gap-3">{children}</div>}

      <div className="flex gap-2 mt-auto pt-2 border-t border-zinc-100">
        <button
          disabled={cargando}
          onClick={onPos80}
          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-zinc-300 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50"
        >
          {cargando ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
          Ticket (POS80)
        </button>
        <button
          disabled={cargando}
          onClick={onA4}
          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {cargando ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
          Documento (A4)
        </button>
      </div>
    </div>
  );
}

function InputFecha({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-zinc-500">
      {label}
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 rounded-lg border border-zinc-300 bg-white text-sm text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
      />
    </label>
  );
}

function InputNumero({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-zinc-500">
      {label}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-28 px-3 py-2 rounded-lg border border-zinc-300 bg-white text-sm text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
      />
    </label>
  );
}

/* ============================================================
   Pagina principal
   ============================================================ */

export default function ReportesPage() {
  const [moduloActivo, setModuloActivo] = useState<Modulo>('ventas');
  const [cargando, setCargando] = useState<string | null>(null);

  // Rango de fechas compartido por la mayoria de reportes
  const [fechaInicio, setFechaInicio] = useState(inicioDeMes());
  const [fechaFin, setFechaFin] = useState(hoy());

  // Parametros especificos
  const [idArqueo, setIdArqueo] = useState('');
  const [idProducto, setIdProducto] = useState('');
  const [limiteTop, setLimiteTop] = useState('20');

  async function ejecutar(key: string, accion: () => Promise<void>) {
    setCargando(key);
    try {
      await accion();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Ocurrió un error al generar el reporte.');
    } finally {
      setCargando(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary tracking-tight">Reportes</h1>
        <p className="text-sm text-zinc-500 mt-1">Genera y descarga los reportes del sistema en formato ticket o A4.</p>
      </div>

      {/* Tabs de modulos */}
      <div className="flex flex-wrap gap-2">
        {MODULOS.map((m) => (
          <button
            key={m.id}
            onClick={() => setModuloActivo(m.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              moduloActivo === m.id
                ? 'bg-primary text-white'
                : 'bg-white text-zinc-600 border border-zinc-300 hover:bg-zinc-50'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Rango de fechas compartido (aplica a casi todos los reportes) */}
      {moduloActivo !== 'inventario' && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs p-4 flex flex-wrap gap-4 items-end">
          <InputFecha label="Fecha inicio" value={fechaInicio} onChange={setFechaInicio} />
          <InputFecha label="Fecha fin" value={fechaFin} onChange={setFechaFin} />
        </div>
      )}

      {/* ===================== VENTAS ===================== */}
      {moduloActivo === 'ventas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <ReporteCard
            titulo="Ventas Diarias / Periódicas"
            descripcion="Resumen analítico de ventas con desglose de subtotal, IGV y total."
            cargando={cargando === 'ventas-periodo'}
            onPos80={() =>
              ejecutar('ventas-periodo', async () => {
                const data = await api.obtenerReporteVentasPeriodo(fechaInicio, fechaFin);
                abrirPdfEnNuevaPestana(generarReporteVentasPeriodoPos80(data));
              })
            }
            onA4={() =>
              ejecutar('ventas-periodo', async () => {
                const data = await api.obtenerReporteVentasPeriodo(fechaInicio, fechaFin);
                descargarPdf(generarReporteVentasPeriodoA4(data), `ventas-periodo-${fechaInicio}_${fechaFin}`);
              })
            }
          />

          <ReporteCard
            titulo="Ventas por Empleado"
            descripcion="Desempeño y volumen de ventas por vendedor."
            cargando={cargando === 'ventas-empleado'}
            onPos80={() =>
              ejecutar('ventas-empleado', async () => {
                const data = await api.obtenerVentasPorEmpleado(fechaInicio, fechaFin);
                abrirPdfEnNuevaPestana(generarVentasPorEmpleadoPos80(fechaInicio, fechaFin, data));
              })
            }
            onA4={() =>
              ejecutar('ventas-empleado', async () => {
                const data = await api.obtenerVentasPorEmpleado(fechaInicio, fechaFin);
                descargarPdf(
                  generarVentasPorEmpleadoA4(fechaInicio, fechaFin, data),
                  `ventas-por-empleado-${fechaInicio}_${fechaFin}`
                );
              })
            }
          />

          <ReporteCard
            titulo="Productos Más Vendidos"
            descripcion="Ranking Top / ABC por unidades y monto vendido."
            cargando={cargando === 'top-productos'}
            onPos80={() =>
              ejecutar('top-productos', async () => {
                const data = await api.obtenerTopProductos(fechaInicio, fechaFin, Number(limiteTop) || 20);
                abrirPdfEnNuevaPestana(generarTopProductosPos80(fechaInicio, fechaFin, data));
              })
            }
            onA4={() =>
              ejecutar('top-productos', async () => {
                const data = await api.obtenerTopProductos(fechaInicio, fechaFin, Number(limiteTop) || 20);
                descargarPdf(
                  generarTopProductosA4(fechaInicio, fechaFin, data),
                  `top-productos-${fechaInicio}_${fechaFin}`
                );
              })
            }
          >
            <InputNumero label="Límite (top N)" value={limiteTop} onChange={setLimiteTop} placeholder="20" />
          </ReporteCard>
        </div>
      )}

      {/* ===================== CAJA ===================== */}
      {moduloActivo === 'caja' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <ReporteCard
            titulo="Arqueo y Cierre de Caja"
            descripcion="Comparativo entre saldo esperado y saldo físico ingresado."
            cargando={cargando === 'arqueo'}
            onPos80={() =>
              ejecutar('arqueo', async () => {
                if (!idArqueo) return alert('Ingresa el N° de arqueo/caja.');
                const data = await api.obtenerReporteArqueo(Number(idArqueo));
                abrirPdfEnNuevaPestana(generarArqueoCajaPos80(data));
              })
            }
            onA4={() =>
              ejecutar('arqueo', async () => {
                if (!idArqueo) return alert('Ingresa el N° de arqueo/caja.');
                const data = await api.obtenerReporteArqueo(Number(idArqueo));
                descargarPdf(generarArqueoCajaA4(data), `arqueo-caja-${idArqueo}`);
              })
            }
          >
            <InputNumero label="N° de arqueo/caja" value={idArqueo} onChange={setIdArqueo} placeholder="Ej: 12" />
          </ReporteCard>

          <ReporteCard
            titulo="Flujo de Caja"
            descripcion="Ingresos y egresos discriminados por tipo y categoría."
            cargando={cargando === 'flujo-caja'}
            onPos80={() =>
              ejecutar('flujo-caja', async () => {
                const data = await api.obtenerFlujoCaja(fechaInicio, fechaFin);
                abrirPdfEnNuevaPestana(generarFlujoCajaPos80(data));
              })
            }
            onA4={() =>
              ejecutar('flujo-caja', async () => {
                const data = await api.obtenerFlujoCaja(fechaInicio, fechaFin);
                descargarPdf(generarFlujoCajaA4(data), `flujo-caja-${fechaInicio}_${fechaFin}`);
              })
            }
          />
        </div>
      )}

      {/* ===================== COMPRAS ===================== */}
      {moduloActivo === 'compras' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <ReporteCard
            titulo="Historial de Compras por Proveedor"
            descripcion="Resumen de órdenes de compra por proveedor/laboratorio."
            cargando={cargando === 'compras-proveedor'}
            onPos80={() =>
              ejecutar('compras-proveedor', async () => {
                const data = await api.obtenerComprasPorProveedor(fechaInicio, fechaFin);
                abrirPdfEnNuevaPestana(generarComprasPorProveedorPos80(fechaInicio, fechaFin, data));
              })
            }
            onA4={() =>
              ejecutar('compras-proveedor', async () => {
                const data = await api.obtenerComprasPorProveedor(fechaInicio, fechaFin);
                descargarPdf(
                  generarComprasPorProveedorA4(fechaInicio, fechaFin, data),
                  `compras-por-proveedor-${fechaInicio}_${fechaFin}`
                );
              })
            }
          />

          <ReporteCard
            titulo="Análisis de Costos"
            descripcion="Histórico de precios de entrada de un producto específico."
            cargando={cargando === 'analisis-costos'}
            onPos80={() =>
              ejecutar('analisis-costos', async () => {
                if (!idProducto) return alert('Ingresa el ID del producto.');
                const data = await api.obtenerAnalisisCostos(Number(idProducto));
                abrirPdfEnNuevaPestana(generarAnalisisCostosPos80(data));
              })
            }
            onA4={() =>
              ejecutar('analisis-costos', async () => {
                if (!idProducto) return alert('Ingresa el ID del producto.');
                const data = await api.obtenerAnalisisCostos(Number(idProducto));
                descargarPdf(generarAnalisisCostosA4(data), `analisis-costos-producto-${idProducto}`);
              })
            }
          >
            <InputNumero label="ID de producto" value={idProducto} onChange={setIdProducto} placeholder="Ej: 45" />
          </ReporteCard>

          <ReporteCard
            titulo="Cuentas por Pagar"
            descripcion="Registro detallado de facturas de compra procesadas."
            cargando={cargando === 'cuentas-por-pagar'}
            onPos80={() =>
              ejecutar('cuentas-por-pagar', async () => {
                const data = await api.obtenerCuentasPorPagar(fechaInicio, fechaFin);
                abrirPdfEnNuevaPestana(generarCuentasPorPagarPos80(data));
              })
            }
            onA4={() =>
              ejecutar('cuentas-por-pagar', async () => {
                const data = await api.obtenerCuentasPorPagar(fechaInicio, fechaFin);
                descargarPdf(generarCuentasPorPagarA4(data), `cuentas-por-pagar-${fechaInicio}_${fechaFin}`);
              })
            }
          />
        </div>
      )}

      {/* ===================== INVENTARIO ===================== */}
      {moduloActivo === 'inventario' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <ReporteCard
            titulo="Stock e Inventario Valorado"
            descripcion="Todos los productos en existencia valorados a costo y venta."
            cargando={cargando === 'inventario-valorado'}
            onPos80={() =>
              ejecutar('inventario-valorado', async () => {
                const data = await api.obtenerInventarioValorado();
                abrirPdfEnNuevaPestana(generarInventarioValoradoPos80(data));
              })
            }
            onA4={() =>
              ejecutar('inventario-valorado', async () => {
                const data = await api.obtenerInventarioValorado();
                descargarPdf(generarInventarioValoradoA4(data), 'inventario-valorado');
              })
            }
          />

          <ReporteCard
            titulo="Alerta de Stock Mínimo"
            descripcion="Productos con stock igual o menor al punto de reorden."
            cargando={cargando === 'alerta-stock'}
            onPos80={() =>
              ejecutar('alerta-stock', async () => {
                const data = await api.obtenerAlertaStockMinimo();
                abrirPdfEnNuevaPestana(generarAlertaStockPos80(data));
              })
            }
            onA4={() =>
              ejecutar('alerta-stock', async () => {
                const data = await api.obtenerAlertaStockMinimo();
                descargarPdf(generarAlertaStockA4(data), 'alerta-stock-minimo');
              })
            }
          />

          <ReporteCard
            titulo="Catálogo por Principio Activo"
            descripcion="Alternativas y sustitutos genéricos por acción terapéutica."
            cargando={cargando === 'catalogo-terapeutico'}
            onPos80={() =>
              ejecutar('catalogo-terapeutico', async () => {
                const data = await api.obtenerCatalogoTerapeutico();
                abrirPdfEnNuevaPestana(generarCatalogoTerapeuticoPos80(data));
              })
            }
            onA4={() =>
              ejecutar('catalogo-terapeutico', async () => {
                const data = await api.obtenerCatalogoTerapeutico();
                descargarPdf(generarCatalogoTerapeuticoA4(data), 'catalogo-terapeutico');
              })
            }
          />
        </div>
      )}

      {/* ===================== GESTION ===================== */}
      {moduloActivo === 'gestion' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <ReporteCard
            titulo="Consolidado General"
            descripcion="Ventas totales vs. compras totales vs. gastos de caja."
            cargando={cargando === 'consolidado'}
            onPos80={() =>
              ejecutar('consolidado', async () => {
                const data = await api.obtenerConsolidadoGeneral(fechaInicio, fechaFin);
                abrirPdfEnNuevaPestana(generarConsolidadoGeneralPos80(data));
              })
            }
            onA4={() =>
              ejecutar('consolidado', async () => {
                const data = await api.obtenerConsolidadoGeneral(fechaInicio, fechaFin);
                descargarPdf(generarConsolidadoGeneralA4(data), `consolidado-general-${fechaInicio}_${fechaFin}`);
              })
            }
          />

          <ReporteCard
            titulo="Reporte de Asistencia"
            descripcion="Marcaciones de entrada, salida y tardanzas del personal."
            cargando={cargando === 'asistencia'}
            onPos80={() =>
              ejecutar('asistencia', async () => {
                const [data, empresa] = await Promise.all([
                  api.obtenerReporteAsistencia(fechaInicio, fechaFin),
                  obtenerEmpresa(),
                ]);
                abrirPdfEnNuevaPestana(
                  await generarReporteAsistenciaPos80(fechaInicio, fechaFin, data, empresa.logo || undefined)
                );
              })
            }
            onA4={() =>
              ejecutar('asistencia', async () => {
                const [data, empresa] = await Promise.all([
                  api.obtenerReporteAsistencia(fechaInicio, fechaFin),
                  obtenerEmpresa(),
                ]);
                descargarPdf(
                  await generarReporteAsistenciaA4(fechaInicio, fechaFin, data, empresa.logo || undefined),
                  `reporte-asistencia-${fechaInicio}_${fechaFin}`
                );
              })
            }
          />
        </div>

        
      )}
    </div>
  );
}
