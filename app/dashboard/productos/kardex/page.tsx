'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, FileDown, FileSpreadsheet, X as XIcon } from 'lucide-react';
import { productosApi } from '@/api/productos';
import type { Producto } from '@/api/productos';
import { comprasApi } from '@/api/compra';
import type { Compra } from '@/api/compra';
import { ventasApi } from '@/api/ventas';
import type { Venta } from '@/api/ventas';
import { trasladosApi } from '@/api/traslados';
import type { Traslado } from '@/api/traslados';
import { generarKardexPdf } from '@/utils/generarKardexPdf';
import { exportarKardexExcel } from '@/utils/excel/exportarKardexExcel';

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function haceUnMesISO() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}

function unidadesBasePorTipo(producto: Producto, unidad: string): number {
  const u = unidad.toLowerCase();
  if (u === 'blister') return producto.unidades_blister ?? 1;
  if (u === 'caja') return producto.unidades_caja ?? 1;
  return 1;
}

/**
 * Determina si un producto está activo, soportando ambas formas comunes
 * que usan tus otras entidades:
 *   - estado: boolean (true = activo) — como Venta/Compra
 *   - estado: string 'Activo' | 'Inactivo'
 * Si no existe el campo `estado` en absoluto, lo trata como activo por
 * defecto para no ocultar productos por error si el backend no lo envía.
 */
function esProductoActivo(p: any): boolean {
  if (p.estado === undefined || p.estado === null) return true;
  if (typeof p.estado === 'boolean') return p.estado;
  return String(p.estado).toLowerCase() !== 'inactivo';
}

export interface FilaKardex {
  fecha: Date;
  descripcion: string;
  entradaUnidades: number;
  entradaCostoUnit: number;
  entradaValorTotal: number;
  salidaUnidades: number;
  salidaCostoUnit: number;
  salidaValorTotal: number;
  existenciaUnidades: number;
  existenciaCostoUnit: number;
  existenciaValorTotal: number;
}

interface Movimiento {
  fecha: Date;
  descripcion: string;
  tipo: 'entrada' | 'salida';
  unidades: number;
  costoUnit: number;
  valorTotal: number;
}

function construirMovimientos(
  producto: Producto,
  compras: Compra[],
  ventas: Venta[],
  traslados: Traslado[]
): Movimiento[] {
  const movimientos: Movimiento[] = [];

  compras.forEach((compra) => {
    if (!compra.estado) return;
    compra.detalles.forEach((d) => {
      if (d.producto.id !== producto.id) return;
      const factor = unidadesBasePorTipo(producto, d.unidadMedida);
      const unidades = d.cantidad * factor;
      movimientos.push({
        fecha: new Date(compra.fechaEmision),
        descripcion: `Compra ${compra.serie}-${compra.numero} · ${compra.proveedor.nombres}`,
        tipo: 'entrada',
        unidades,
        costoUnit: unidades > 0 ? d.importe / unidades : 0,
        valorTotal: d.importe,
      });
    });
  });

  traslados.forEach((traslado) => {
    traslado.detalles.forEach((d) => {
      if (d.idProducto !== producto.id) return;
      movimientos.push({
        fecha: new Date(traslado.fecha),
        descripcion: `Traslado (${traslado.tipo === 'INGRESO' ? 'Ingreso' : 'Egreso'}) · ${traslado.nombreSucursal}`,
        tipo: traslado.tipo === 'INGRESO' ? 'entrada' : 'salida',
        unidades: d.cantidad,
        costoUnit: d.precioUnitario,
        valorTotal: d.subtotal,
      });
    });
  });

  ventas.forEach((venta) => {
    if (!venta.estado) return;
    venta.detalles.forEach((d) => {
      if (d.producto.id !== producto.id) return;
      const factor = unidadesBasePorTipo(producto, d.tipoVenta);
      const unidades = d.cantidad * factor;
      movimientos.push({
        fecha: new Date(venta.fecha),
        descripcion: `Venta · ${venta.cliente?.nombres ?? 'Clientes Varios'}`,
        tipo: 'salida',
        unidades,
        costoUnit: producto.precio_costo,
        valorTotal: unidades * producto.precio_costo,
      });
    });
  });

  return movimientos.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
}

export default function KardexPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [traslados, setTraslados] = useState<Traslado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [exportandoPdf, setExportandoPdf] = useState(false); // feedback visual mientras se genera el PDF

  const [busqueda, setBusqueda] = useState('');
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);

  const [desde, setDesde] = useState(haceUnMesISO());
  const [hasta, setHasta] = useState(hoyISO());

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      setError('');
      try {
        const [productosData, comprasData, ventasData, trasladosData] = await Promise.all([
          productosApi.listar(),
          comprasApi.listar(),
          ventasApi.listar(),
          trasladosApi.listar(),
        ]);
        setProductos(productosData);
        setCompras(comprasData);
        setVentas(ventasData);
        setTraslados(trasladosData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar la información para el kardex.');
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  const sugerenciasProducto = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return [];
    // NUEVO: se excluyen productos inactivos del buscador con esProductoActivo()
    return productos
      .filter((p) => esProductoActivo(p) && p.nombre.toLowerCase().includes(q))
      .slice(0, 8);
  }, [busqueda, productos]);

  const seleccionarProducto = (producto: Producto) => {
    setProductoSeleccionado(producto);
    setBusqueda(producto.nombre);
    setMostrarSugerencias(false);
  };

  const limpiarProducto = () => {
    setProductoSeleccionado(null);
    setBusqueda('');
  };

  const filasCompletas = useMemo<FilaKardex[]>(() => {
    if (!productoSeleccionado) return [];
    const movimientos = construirMovimientos(productoSeleccionado, compras, ventas, traslados);

    let saldoUnidades = 0;
    return movimientos.map((m) => {
      if (m.tipo === 'entrada') saldoUnidades += m.unidades;
      else saldoUnidades -= m.unidades;

      return {
        fecha: m.fecha,
        descripcion: m.descripcion,
        entradaUnidades: m.tipo === 'entrada' ? m.unidades : 0,
        entradaCostoUnit: m.tipo === 'entrada' ? m.costoUnit : 0,
        entradaValorTotal: m.tipo === 'entrada' ? m.valorTotal : 0,
        salidaUnidades: m.tipo === 'salida' ? m.unidades : 0,
        salidaCostoUnit: m.tipo === 'salida' ? m.costoUnit : 0,
        salidaValorTotal: m.tipo === 'salida' ? m.valorTotal : 0,
        existenciaUnidades: saldoUnidades,
        existenciaCostoUnit: productoSeleccionado.precio_costo,
        existenciaValorTotal: saldoUnidades * productoSeleccionado.precio_costo,
      };
    });
  }, [productoSeleccionado, compras, ventas, traslados]);

  const filasVisibles = useMemo(() => {
    const desdeDate = new Date(`${desde}T00:00:00`);
    const hastaDate = new Date(`${hasta}T23:59:59`);
    return filasCompletas.filter((f) => f.fecha >= desdeDate && f.fecha <= hastaDate);
  }, [filasCompletas, desde, hasta]);

  const inputClass =
    'px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all';

  /**
   * CAMBIO: generarKardexPdf ahora es async (carga el logo de la empresa
   * antes de dibujar), así que devuelve Promise<Blob> en vez de Blob.
   * Antes: `const blob = generarKardexPdf(...)` guardaba la Promise misma,
   * y createObjectURL(Promise) truena con el mismo TypeError que viste en
   * Medios de Pago. Ahora se hace `await` y se maneja el error si falla
   * la carga de datos/imagen.
   */
  const handleExportarPdf = async () => {
    if (!productoSeleccionado) return;
    setExportandoPdf(true);
    setError('');
    try {
      const blob = await generarKardexPdf(productoSeleccionado, filasVisibles, desde, hasta);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el PDF del kardex.');
    } finally {
      setExportandoPdf(false);
    }
  };

  const handleExportarExcel = () => {
    if (!productoSeleccionado) return;
    exportarKardexExcel(productoSeleccionado, filasVisibles, desde, hasta);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Kardex</h1>
          <p className="text-sm text-zinc-500 mt-1">Movimientos de entradas, salidas y existencias por producto.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportarPdf}
            disabled={!productoSeleccionado || filasVisibles.length === 0 || exportandoPdf}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-xs hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileDown size={16} />
            {exportandoPdf ? 'Generando...' : 'Exportar PDF'}
          </button>
          <button
            onClick={handleExportarExcel}
            disabled={!productoSeleccionado || filasVisibles.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet size={16} />
            Exportar Excel
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="relative w-full sm:w-[480px]">
            <label className="text-xs font-semibold text-zinc-600 block mb-1">Producto</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                <Search size={16} />
              </span>
              <input
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setProductoSeleccionado(null);
                  setMostrarSugerencias(true);
                }}
                onFocus={() => setMostrarSugerencias(true)}
                onBlur={() => setTimeout(() => setMostrarSugerencias(false), 200)}
                placeholder="Buscar por nombre, principio activo..."
                className="w-full pl-9 pr-9 py-2 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
              {productoSeleccionado && (
                <button
                  onClick={limpiarProducto}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-red-500 transition-colors"
                  title="Quitar producto"
                >
                  <XIcon size={16} />
                </button>
              )}
            </div>

            {mostrarSugerencias && sugerenciasProducto.length > 0 && (
              <div className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto bg-white border border-zinc-200 rounded-lg shadow-lg divide-y divide-zinc-100 min-w-full sm:min-w-[480px]">
                {sugerenciasProducto.map((p: any) => {
                  const paRaw = p.principio_activo || p.principioActivo;
                  const principioActivo = typeof paRaw === 'object' ? paRaw?.nombre : paRaw;

                  const labRaw = p.laboratorio;
                  const laboratorio = typeof labRaw === 'object' ? labRaw?.nombre : labRaw;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={() => seleccionarProducto(p)}
                      className="w-full flex items-start justify-between px-3 py-2 text-left hover:bg-zinc-50 transition-colors gap-3"
                    >
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="text-xs font-semibold text-zinc-800 truncate">{p.nombre}</p>

                        {(principioActivo || laboratorio) && (
                          <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-zinc-500">
                            {principioActivo && (
                              <span>
                                <strong className="font-medium text-zinc-600">P.A:</strong> {String(principioActivo)}
                              </span>
                            )}
                            {principioActivo && laboratorio && <span>•</span>}
                            {laboratorio && (
                              <span>
                                <strong className="font-medium text-zinc-600">Lab:</strong> {String(laboratorio)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-block text-[11px] font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200">
                          Stock: {p.stock}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-600">Desde</label>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-600">Hasta</label>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={inputClass} />
          </div>
        </div>

        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

        {cargando && <p className="text-center text-zinc-400 py-10">Cargando información...</p>}

        {!cargando && !productoSeleccionado && (
          <p className="text-center text-zinc-400 py-10">Busca y selecciona un producto para ver su kardex.</p>
        )}

        {!cargando && productoSeleccionado && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-zinc-200">
              <thead>
                <tr className="bg-primary/10 text-primary font-bold uppercase tracking-wide">
                  <th rowSpan={2} className="border border-zinc-200 px-2 py-2">Fecha</th>
                  <th rowSpan={2} className="border border-zinc-200 px-2 py-2 text-left">Descripción</th>
                  <th colSpan={3} className="border border-zinc-200 px-2 py-2">Entradas</th>
                  <th colSpan={3} className="border border-zinc-200 px-2 py-2">Salidas</th>
                  <th colSpan={3} className="border border-zinc-200 px-2 py-2">Existencias</th>
                </tr>
                <tr className="bg-primary/5 text-primary font-semibold uppercase text-[10px] tracking-wide">
                  <th className="border border-zinc-200 px-2 py-1">Unidades</th>
                  <th className="border border-zinc-200 px-2 py-1">Costo Unit</th>
                  <th className="border border-zinc-200 px-2 py-1">Valor Total</th>
                  <th className="border border-zinc-200 px-2 py-1">Unidades</th>
                  <th className="border border-zinc-200 px-2 py-1">Costo Unit</th>
                  <th className="border border-zinc-200 px-2 py-1">Valor Total</th>
                  <th className="border border-zinc-200 px-2 py-1">Unidades</th>
                  <th className="border border-zinc-200 px-2 py-1">Costo Unit</th>
                  <th className="border border-zinc-200 px-2 py-1">Valor Total</th>
                </tr>
              </thead>
              <tbody>
                {filasVisibles.length === 0 && (
                  <tr>
                    <td colSpan={11} className="border border-zinc-200 px-2 py-6 text-center text-zinc-400">
                      Sin movimientos en el rango de fechas seleccionado.
                    </td>
                  </tr>
                )}
                {filasVisibles.map((f, i) => (
                  <tr key={i} className="hover:bg-zinc-50 text-center">
                    <td className="border border-zinc-200 px-2 py-1.5 whitespace-nowrap">
                      {f.fecha.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                    <td className="border border-zinc-200 px-2 py-1.5 text-left">{f.descripcion}</td>
                    <td className="border border-zinc-200 px-2 py-1.5">{f.entradaUnidades || ''}</td>
                    <td className="border border-zinc-200 px-2 py-1.5">{f.entradaUnidades ? f.entradaCostoUnit.toFixed(2) : ''}</td>
                    <td className="border border-zinc-200 px-2 py-1.5">{f.entradaUnidades ? f.entradaValorTotal.toFixed(2) : ''}</td>
                    <td className="border border-zinc-200 px-2 py-1.5">{f.salidaUnidades || ''}</td>
                    <td className="border border-zinc-200 px-2 py-1.5">{f.salidaUnidades ? f.salidaCostoUnit.toFixed(2) : ''}</td>
                    <td className="border border-zinc-200 px-2 py-1.5">{f.salidaUnidades ? f.salidaValorTotal.toFixed(2) : ''}</td>
                    <td className="border border-zinc-200 px-2 py-1.5 font-semibold text-primary">{f.existenciaUnidades}</td>
                    <td className="border border-zinc-200 px-2 py-1.5">{f.existenciaCostoUnit.toFixed(2)}</td>
                    <td className="border border-zinc-200 px-2 py-1.5 font-semibold">{f.existenciaValorTotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}