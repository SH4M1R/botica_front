import { delay } from './_mockUtils';
import { ventasApi } from './ventas';
import { comprasApi } from './compra';
import { productos as productosSeed } from './productos';
import { asistenciaApi } from './asistencia';

const IGV = 0.18;

/* ============ VENTAS ============ */
export interface VentaDiaria { fecha: string; cantidadVentas: number; subtotal: number; igv: number; total: number; }
export interface ReporteVentasPeriodo { fechaInicio: string; fechaFin: string; totalVentas: number; subtotalGeneral: number; igvGeneral: number; totalGeneral: number; detallePorDia: VentaDiaria[]; }
export interface VentaPorEmpleado { idEmpleado: number; nombreEmpleado: string; cantidadVentas: number; totalVendido: number; }
export interface ProductoMasVendido { idProducto: number; nombreProducto: string; unidadesVendidas: number; montoVendido: number; }

export async function obtenerReporteVentasPeriodo(fechaInicio: string, fechaFin: string): Promise<ReporteVentasPeriodo> {
  await delay();
  const ventas = (await ventasApi.listar()).filter((v) => v.estado && v.fecha.slice(0, 10) >= fechaInicio && v.fecha.slice(0, 10) <= fechaFin);
  const porDia = new Map<string, VentaDiaria>();
  ventas.forEach((v) => {
    const fecha = v.fecha.slice(0, 10);
    const actual = porDia.get(fecha) ?? { fecha, cantidadVentas: 0, subtotal: 0, igv: 0, total: 0 };
    actual.cantidadVentas += 1; actual.total += v.total;
    actual.subtotal += v.total / (1 + IGV); actual.igv += v.total - v.total / (1 + IGV);
    porDia.set(fecha, actual);
  });
  const detallePorDia = Array.from(porDia.values()).map((d) => ({ ...d, subtotal: Number(d.subtotal.toFixed(2)), igv: Number(d.igv.toFixed(2)), total: Number(d.total.toFixed(2)) }));
  return {
    fechaInicio, fechaFin, totalVentas: ventas.length,
    subtotalGeneral: Number(detallePorDia.reduce((s, d) => s + d.subtotal, 0).toFixed(2)),
    igvGeneral: Number(detallePorDia.reduce((s, d) => s + d.igv, 0).toFixed(2)),
    totalGeneral: Number(detallePorDia.reduce((s, d) => s + d.total, 0).toFixed(2)),
    detallePorDia,
  };
}

export async function obtenerVentasPorEmpleado(fechaInicio: string, fechaFin: string): Promise<VentaPorEmpleado[]> {
  await delay();
  const ventas = (await ventasApi.listar()).filter((v) => v.estado && v.fecha.slice(0, 10) >= fechaInicio && v.fecha.slice(0, 10) <= fechaFin);
  const acumulado = new Map<number, VentaPorEmpleado>();
  ventas.forEach((v) => {
    const actual = acumulado.get(v.empleado.id) ?? { idEmpleado: v.empleado.id, nombreEmpleado: v.empleado.nombre, cantidadVentas: 0, totalVendido: 0 };
    actual.cantidadVentas += 1; actual.totalVendido += v.total;
    acumulado.set(v.empleado.id, actual);
  });
  return Array.from(acumulado.values()).map((a) => ({ ...a, totalVendido: Number(a.totalVendido.toFixed(2)) }));
}

export async function obtenerTopProductos(fechaInicio: string, fechaFin: string, limite = 20): Promise<ProductoMasVendido[]> {
  await delay();
  const ventas = (await ventasApi.listar()).filter((v) => v.estado && v.fecha.slice(0, 10) >= fechaInicio && v.fecha.slice(0, 10) <= fechaFin);
  const acumulado = new Map<number, ProductoMasVendido>();
  ventas.forEach((v) => v.detalles.forEach((d) => {
    const actual = acumulado.get(d.producto.id) ?? { idProducto: d.producto.id, nombreProducto: d.producto.nombre, unidadesVendidas: 0, montoVendido: 0 };
    actual.unidadesVendidas += d.cantidad; actual.montoVendido += d.subtotal;
    acumulado.set(d.producto.id, actual);
  }));
  return Array.from(acumulado.values()).map((a) => ({ ...a, montoVendido: Number(a.montoVendido.toFixed(2)) })).sort((a, b) => b.montoVendido - a.montoVendido).slice(0, limite);
}

export async function obtenerReporteAsistencia(fechaInicio: string, fechaFin: string) {
  return asistenciaApi.reporte(fechaInicio, fechaFin);
}

/* ============ CAJA ============ */
export interface ArqueoCierre { idArqueo: number; nombreEmpleado: string; fechaInicio: string; fechaFin: string | null; montoInicial: number; montoFinal: number | null; totalVentasEfectivo: number; totalIngresosCaja: number; totalEgresosCaja: number; saldoEsperado: number; diferencia: number | null; estadoArqueo: 'ABIERTO' | 'CERRADO'; }
export interface MovimientoCaja { fecha: string; tipo: 'INGRESO' | 'EGRESO'; categoria: string; numero: string; descripcion: string; monto: number; medioPago: string; empleado: string; }
export interface FlujoCaja { fechaInicio: string; fechaFin: string; totalIngresos: number; totalEgresos: number; saldoNeto: number; movimientos: MovimientoCaja[]; }

export async function obtenerReporteArqueo(idArqueo: number): Promise<ArqueoCierre> {
  await delay();
  return { idArqueo, nombreEmpleado: 'Administrador', fechaInicio: new Date(new Date().setHours(8, 0, 0, 0)).toISOString(), fechaFin: null, montoInicial: 100, montoFinal: null, totalVentasEfectivo: 245.5, totalIngresosCaja: 200, totalEgresosCaja: 85.5, saldoEsperado: 460, diferencia: null, estadoArqueo: 'ABIERTO' };
}

export async function obtenerFlujoCaja(fechaInicio: string, fechaFin: string): Promise<FlujoCaja> {
  await delay();
  const movimientos: MovimientoCaja[] = [
    { fecha: fechaInicio, tipo: 'INGRESO', categoria: 'APORTE_CAPITAL', numero: 'MOV-0002', descripcion: 'Aporte de capital para caja chica', monto: 200, medioPago: 'EFECTIVO', empleado: 'Ana Torres' },
    { fecha: fechaFin, tipo: 'EGRESO', categoria: 'PAGO_SERVICIOS', numero: 'MOV-0001', descripcion: 'Pago de recibo de luz', monto: 85.5, medioPago: 'EFECTIVO', empleado: 'Administrador' },
  ];
  const totalIngresos = movimientos.filter((m) => m.tipo === 'INGRESO').reduce((s, m) => s + m.monto, 0);
  const totalEgresos = movimientos.filter((m) => m.tipo === 'EGRESO').reduce((s, m) => s + m.monto, 0);
  return { fechaInicio, fechaFin, totalIngresos, totalEgresos, saldoNeto: totalIngresos - totalEgresos, movimientos };
}

/* ============ COMPRAS ============ */
export interface CompraPorProveedor { idProveedor: number; nombreProveedor: string; cantidadCompras: number; totalComprado: number; }
export interface PrecioEntrada { fecha: string; proveedor: string; cantidad: number; precioUnitario: number; }
export interface AnalisisCostos { idProducto: number; nombreProducto: string; precioMinimo: number | null; precioMaximo: number | null; precioPromedio: number | null; precioVentaActual: number | null; historico: PrecioEntrada[]; }
export interface CompraDetalle { id: number; comprobante: string; serie: string; numero: string; fechaEmision: string; proveedor: string; total: number; pagar: number; tipoPago: string; medioPago: string; estadoPago: boolean; }
export interface CuentasPorPagar { fechaInicio: string; fechaFin: string; totalComprado: number; totalPendiente: number; totalPagado: number; compras: CompraDetalle[]; }

export async function obtenerComprasPorProveedor(fechaInicio: string, fechaFin: string): Promise<CompraPorProveedor[]> {
  await delay();
  const compras = (await comprasApi.listar()).filter((c) => c.estado && c.fechaEmision >= fechaInicio && c.fechaEmision <= fechaFin);
  const acumulado = new Map<number, CompraPorProveedor>();
  compras.forEach((c) => {
    const actual = acumulado.get(c.proveedor.id) ?? { idProveedor: c.proveedor.id, nombreProveedor: c.proveedor.nombres, cantidadCompras: 0, totalComprado: 0 };
    actual.cantidadCompras += 1; actual.totalComprado += c.total;
    acumulado.set(c.proveedor.id, actual);
  });
  return Array.from(acumulado.values());
}

export async function obtenerAnalisisCostos(idProducto: number): Promise<AnalisisCostos> {
  await delay();
  const producto = productosSeed.find((p) => p.id === idProducto);
  return {
    idProducto, nombreProducto: producto?.nombre ?? `Producto #${idProducto}`,
    precioMinimo: producto ? Number((producto.precio_costo * 0.9).toFixed(2)) : null,
    precioMaximo: producto ? Number((producto.precio_costo * 1.15).toFixed(2)) : null,
    precioPromedio: producto ? producto.precio_costo : null,
    precioVentaActual: producto?.precio_venta ?? null,
    historico: producto ? [
      { fecha: '2026-05-01', proveedor: 'Distribuidora Farmacéutica del Perú S.A.C.', cantidad: 100, precioUnitario: Number((producto.precio_costo * 0.95).toFixed(2)) },
      { fecha: '2026-06-15', proveedor: 'Química Suiza Perú S.A.', cantidad: 50, precioUnitario: producto.precio_costo },
      { fecha: '2026-07-10', proveedor: 'Distribuidora Farmacéutica del Perú S.A.C.', cantidad: 80, precioUnitario: Number((producto.precio_costo * 1.05).toFixed(2)) },
    ] : [],
  };
}

export async function obtenerCuentasPorPagar(fechaInicio: string, fechaFin: string): Promise<CuentasPorPagar> {
  await delay();
  const compras = (await comprasApi.listar()).filter((c) => c.estado && c.fechaEmision >= fechaInicio && c.fechaEmision <= fechaFin);
  const detalle: CompraDetalle[] = compras.map((c) => ({ id: c.id, comprobante: c.comprobante, serie: c.serie, numero: c.numero, fechaEmision: c.fechaEmision, proveedor: c.proveedor.nombres, total: c.total, pagar: c.pagar, tipoPago: c.tipoPago, medioPago: c.medioPago, estadoPago: c.estadoPago }));
  return {
    fechaInicio, fechaFin, totalComprado: detalle.reduce((s, d) => s + d.total, 0),
    totalPendiente: detalle.filter((d) => !d.estadoPago).reduce((s, d) => s + d.pagar, 0),
    totalPagado: detalle.filter((d) => d.estadoPago).reduce((s, d) => s + d.pagar, 0),
    compras: detalle,
  };
}

/* ============ INVENTARIO ============ */
export interface InventarioValoradoItem { idProducto: number; nombreProducto: string; categoria: string; laboratorio: string; stock: number; precioCosto: number; precioVenta: number; valorCosto: number; valorVenta: number; }
export interface ReporteInventarioValorado { totalProductos: number; valorTotalCosto: number; valorTotalVenta: number; productos: InventarioValoradoItem[]; }
export interface AlertaStock { idProducto: number; nombreProducto: string; stock: number; stockMinimo: number; diferencia: number; }
export interface CatalogoTerapeutico { idProducto: number; nombreProducto: string; principioActivo: string | null; accionTerapeutica: string | null; stock: number; precioVenta: number; }

export async function obtenerInventarioValorado(): Promise<ReporteInventarioValorado> {
  await delay();
  const productos: InventarioValoradoItem[] = productosSeed.map((p) => ({
    idProducto: p.id, nombreProducto: p.nombre, categoria: p.categoria.nombre, laboratorio: p.laboratorio.nombre,
    stock: p.stock, precioCosto: p.precio_costo, precioVenta: p.precio_venta,
    valorCosto: Number((p.stock * p.precio_costo).toFixed(2)), valorVenta: Number((p.stock * p.precio_venta).toFixed(2)),
  }));
  return { totalProductos: productos.length, valorTotalCosto: Number(productos.reduce((s, p) => s + p.valorCosto, 0).toFixed(2)), valorTotalVenta: Number(productos.reduce((s, p) => s + p.valorVenta, 0).toFixed(2)), productos };
}

export async function obtenerAlertaStockMinimo(): Promise<AlertaStock[]> {
  await delay();
  return productosSeed.filter((p) => p.stock_minimo != null && p.stock <= p.stock_minimo)
    .map((p) => ({ idProducto: p.id, nombreProducto: p.nombre, stock: p.stock, stockMinimo: p.stock_minimo ?? 0, diferencia: p.stock - (p.stock_minimo ?? 0) }));
}

export async function obtenerCatalogoTerapeutico(): Promise<CatalogoTerapeutico[]> {
  await delay();
  return productosSeed.map((p) => ({ idProducto: p.id, nombreProducto: p.nombre, principioActivo: p.principioActivo?.nombre ?? null, accionTerapeutica: p.accionTerapeutica?.nombre ?? null, stock: p.stock, precioVenta: p.precio_venta }));
}

export async function obtenerSustitutos(idPrincipioActivo: number, idProductoExcluir: number): Promise<CatalogoTerapeutico[]> {
  await delay();
  return productosSeed.filter((p) => p.principioActivo?.id === idPrincipioActivo && p.id !== idProductoExcluir)
    .map((p) => ({ idProducto: p.id, nombreProducto: p.nombre, principioActivo: p.principioActivo?.nombre ?? null, accionTerapeutica: p.accionTerapeutica?.nombre ?? null, stock: p.stock, precioVenta: p.precio_venta }));
}

/* ============ GESTION ============ */
export interface ConsolidadoGeneral { fechaInicio: string; fechaFin: string; totalVentas: number; totalCompras: number; totalIngresosCaja: number; totalEgresosCaja: number; utilidadBruta: number; utilidadNeta: number; }

export async function obtenerConsolidadoGeneral(fechaInicio: string, fechaFin: string): Promise<ConsolidadoGeneral> {
  await delay();
  const ventas = (await ventasApi.listar()).filter((v) => v.estado && v.fecha.slice(0, 10) >= fechaInicio && v.fecha.slice(0, 10) <= fechaFin);
  const compras = (await comprasApi.listar()).filter((c) => c.estado && c.fechaEmision >= fechaInicio && c.fechaEmision <= fechaFin);
  const totalVentas = ventas.reduce((s, v) => s + v.total, 0);
  const totalCompras = compras.reduce((s, c) => s + c.total, 0);
  const totalIngresosCaja = 200, totalEgresosCaja = 85.5;
  const utilidadBruta = totalVentas - totalCompras;
  return { fechaInicio, fechaFin, totalVentas: Number(totalVentas.toFixed(2)), totalCompras: Number(totalCompras.toFixed(2)), totalIngresosCaja, totalEgresosCaja, utilidadBruta: Number(utilidadBruta.toFixed(2)), utilidadNeta: Number((utilidadBruta + totalIngresosCaja - totalEgresosCaja).toFixed(2)) };
}