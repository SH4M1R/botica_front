const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    throw new Error(`Error al obtener el reporte (${res.status}): ${path}`);
  }
  return res.json() as Promise<T>;
}

/* ============================================================
   VENTAS
   ============================================================ */

export interface VentaDiaria {
  fecha: string;
  cantidadVentas: number;
  subtotal: number;
  igv: number;
  total: number;
}

export interface ReporteVentasPeriodo {
  fechaInicio: string;
  fechaFin: string;
  totalVentas: number;
  subtotalGeneral: number;
  igvGeneral: number;
  totalGeneral: number;
  detallePorDia: VentaDiaria[];
}

export interface VentaPorEmpleado {
  idEmpleado: number;
  nombreEmpleado: string;
  cantidadVentas: number;
  totalVendido: number;
}

export interface ProductoMasVendido {
  idProducto: number;
  nombreProducto: string;
  unidadesVendidas: number;
  montoVendido: number;
}

export function obtenerReporteVentasPeriodo(fechaInicio: string, fechaFin: string) {
  return getJson<ReporteVentasPeriodo>(`/reportes/ventas/periodo?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
}

export function obtenerVentasPorEmpleado(fechaInicio: string, fechaFin: string) {
  return getJson<VentaPorEmpleado[]>(`/reportes/ventas/por-empleado?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
}

export function obtenerTopProductos(fechaInicio: string, fechaFin: string, limite = 20) {
  return getJson<ProductoMasVendido[]>(
    `/reportes/ventas/top-productos?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&limite=${limite}`
  );
}

export async function obtenerReporteAsistencia(fechaInicio: string, fechaFin: string) {
  const { asistenciaApi } = await import('@/api/asistencia');
  return asistenciaApi.reporte(fechaInicio, fechaFin);
}

/* ============================================================
   CAJA
   ============================================================ */

export interface ArqueoCierre {
  idArqueo: number;
  nombreEmpleado: string;
  fechaInicio: string;
  fechaFin: string | null;
  montoInicial: number;
  montoFinal: number | null;
  totalVentasEfectivo: number;
  totalIngresosCaja: number;
  totalEgresosCaja: number;
  saldoEsperado: number;
  diferencia: number | null;
  estadoArqueo: 'ABIERTO' | 'CERRADO';
}

export interface MovimientoCaja {
  fecha: string;
  tipo: 'INGRESO' | 'EGRESO';
  categoria: string;
  numero: string;
  descripcion: string;
  monto: number;
  medioPago: string;
  empleado: string;
}

export interface FlujoCaja {
  fechaInicio: string;
  fechaFin: string;
  totalIngresos: number;
  totalEgresos: number;
  saldoNeto: number;
  movimientos: MovimientoCaja[];
}

export function obtenerReporteArqueo(idArqueo: number) {
  return getJson<ArqueoCierre>(`/reportes/caja/arqueo/${idArqueo}`);
}

export function obtenerFlujoCaja(fechaInicio: string, fechaFin: string) {
  return getJson<FlujoCaja>(`/reportes/caja/flujo?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
}

/* ============================================================
   COMPRAS
   ============================================================ */

export interface CompraPorProveedor {
  idProveedor: number;
  nombreProveedor: string;
  cantidadCompras: number;
  totalComprado: number;
}

export interface PrecioEntrada {
  fecha: string;
  proveedor: string;
  cantidad: number;
  precioUnitario: number;
}

export interface AnalisisCostos {
  idProducto: number;
  nombreProducto: string;
  precioMinimo: number | null;
  precioMaximo: number | null;
  precioPromedio: number | null;
  precioVentaActual: number | null;
  historico: PrecioEntrada[];
}

export interface CompraDetalle {
  id: number;
  comprobante: string;
  serie: string;
  numero: string;
  fechaEmision: string;
  proveedor: string;
  total: number;
  pagar: number;
  tipoPago: string;
  medioPago: string;
  estadoPago: boolean;
}

export interface CuentasPorPagar {
  fechaInicio: string;
  fechaFin: string;
  totalComprado: number;
  totalPendiente: number;
  totalPagado: number;
  compras: CompraDetalle[];
}

export function obtenerComprasPorProveedor(fechaInicio: string, fechaFin: string) {
  return getJson<CompraPorProveedor[]>(`/reportes/compras/por-proveedor?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
}

export function obtenerAnalisisCostos(idProducto: number) {
  return getJson<AnalisisCostos>(`/reportes/compras/analisis-costos/${idProducto}`);
}

export function obtenerCuentasPorPagar(fechaInicio: string, fechaFin: string) {
  return getJson<CuentasPorPagar>(`/reportes/compras/cuentas-por-pagar?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
}

/* ============================================================
   INVENTARIO
   ============================================================ */

export interface InventarioValoradoItem {
  idProducto: number;
  nombreProducto: string;
  categoria: string;
  laboratorio: string;
  stock: number;
  precioCosto: number;
  precioVenta: number;
  valorCosto: number;
  valorVenta: number;
}

export interface ReporteInventarioValorado {
  totalProductos: number;
  valorTotalCosto: number;
  valorTotalVenta: number;
  productos: InventarioValoradoItem[];
}

export interface AlertaStock {
  idProducto: number;
  nombreProducto: string;
  laboratorio: { idLaboratorio: number; nombre: string } | null;
  stock: number;
  stockMinimo: number;
  diferencia: number;
}

export interface CatalogoTerapeutico {
  idProducto: number;
  nombreProducto: string;
  principioActivo: string | null;
  accionTerapeutica: string | null;
  stock: number;
  precioVenta: number;
}

export function obtenerInventarioValorado() {
  return getJson<ReporteInventarioValorado>(`/reportes/inventario/valorado`);
}

export function obtenerAlertaStockMinimo() {
  return getJson<AlertaStock[]>(`/reportes/inventario/alerta-stock-minimo`);
}

export function obtenerCatalogoTerapeutico() {
  return getJson<CatalogoTerapeutico[]>(`/reportes/inventario/catalogo-terapeutico`);
}

export function obtenerSustitutos(idPrincipioActivo: number, idProductoExcluir: number) {
  return getJson<CatalogoTerapeutico[]>(
    `/reportes/inventario/sustitutos?idPrincipioActivo=${idPrincipioActivo}&idProductoExcluir=${idProductoExcluir}`
  );
}

/* ============================================================
   GESTION
   ============================================================ */

export interface ConsolidadoGeneral {
  fechaInicio: string;
  fechaFin: string;
  totalVentas: number;
  totalCompras: number;
  totalIngresosCaja: number;
  totalEgresosCaja: number;
  utilidadBruta: number;
  utilidadNeta: number;
}

export function obtenerConsolidadoGeneral(fechaInicio: string, fechaFin: string) {
  return getJson<ConsolidadoGeneral>(`/reportes/gestion/consolidado?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
}

/* ============================================================
   VENTAS POR PRODUCTO
   ============================================================ */

export interface VentaDetalleProducto {
  fecha: string;
  cliente: string;
  empleado: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  tipoVenta: string;
}

export interface ReporteVentasPorProducto {
  idProducto: number;
  nombreProducto: string;
  fechaInicio: string;
  fechaFin: string;
  totalUnidades: number;
  totalVendido: number;
  detalle: VentaDetalleProducto[];
}

export function obtenerVentasPorProducto(idProducto: number, fechaInicio: string, fechaFin: string) {
  return getJson<ReporteVentasPorProducto>(
    `/reportes/ventas/por-producto/${idProducto}?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`
  );
}

/* ============================================================
   PRODUCTOS POR VENCER
   ============================================================ */

export interface ProductoPorVencer {
  idProducto: number;
  nombreProducto: string;
  lote: string | null;
  fechaVencimiento: string;
  stock: number;
  diasRestantes: number;
}

export function obtenerProductosPorVencer(dias = 90) {
  return getJson<ProductoPorVencer[]>(`/reportes/inventario/por-vencer?dias=${dias}`);
}

/* ============================================================
   PRODUCTOS POR LABORATORIO
   ============================================================ */

export interface LaboratorioResumen {
  idLaboratorio: number;
  nombreLaboratorio: string;
  cantidadProductos: number;
}

export interface ProductoPorLaboratorio {
  idProducto: number;
  nombreProducto: string;
  stock: number;
  precioVenta: number;
  fechaVencimiento: string | null;
}

export interface ReporteProductosPorLaboratorio {
  idLaboratorio: number;
  nombreLaboratorio: string;
  totalProductos: number;
  productos: ProductoPorLaboratorio[];
}

export function listarLaboratorios() {
  return getJson<LaboratorioResumen[]>(`/reportes/inventario/laboratorios`);
}

export function obtenerProductosPorLaboratorio(idLaboratorio: number) {
  return getJson<ReporteProductosPorLaboratorio>(`/reportes/inventario/por-laboratorio/${idLaboratorio}`);
}