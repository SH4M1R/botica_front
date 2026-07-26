import { delay, nextId } from './_mockUtils';

export interface Proveedor {
  id: number; tipoDocumento: string; numeroDocumento: string; nombres: string;
  departamento?: string; provincia?: string; distrito?: string; direccion?: string;
  telefono?: string; correo?: string; contactoNombres?: string; contactoCelular?: string; contactoCorreo?: string;
}

export type ProveedorRequestDTO = Omit<Proveedor, 'id'>;

export interface Empleado { id: number; nombre: string; rol?: string; }

export interface Producto {
  id: number; nombre: string; codigoBarra?: string; unidadMedida: string; gravada: boolean;
  precioUnitario: number; precioMayorista: number; costoUnitario?: number; stockActual?: number; unidadesPorPresentacion?: number;
}

export type AfectacionIgv = "GRAVADO_ONEROSO" | "EXONERADO" | "INAFECTO";

export const AFECTACION_IGV_OPTIONS: { value: AfectacionIgv; label: string }[] = [
  { value: "GRAVADO_ONEROSO", label: "Gravado - Operación Onerosa" },
  { value: "EXONERADO", label: "Exonerado" },
  { value: "INAFECTO", label: "Inafecto" },
];

export type TipoPrecio = "UNITARIO" | "MAYORISTA";

export interface DetalleCompraItem {
  key: string; idProducto: number; nombreProducto: string; tipoPrecio: TipoPrecio; afectacionIgv: AfectacionIgv;
  lote?: string; fechaVencimiento?: string; unidadMedida: string; cantidad: number; precioUnitario: number; importe: number;
}

export interface ItemCompraRequestDTO {
  idProducto: number; lote?: string; fechaVencimiento?: string; unidadMedida: string; cantidad: number; precioUnitario: number;
}

export interface CompraRequestDTO {
  comprobante: string; serie: string; numero: string; fechaEmision: string; regularizar: boolean;
  idProveedor: number; idEmpleado: number; precioIncluyeIgv: boolean; descripcion?: string; percepcion?: number;
  tipoPago: string; medioPago: string; items: ItemCompraRequestDTO[];
}

export interface DetalleCompraResponse {
  id: number; producto: Producto; lote?: string; fechaVencimiento?: string; unidadMedida: string;
  cantidad: number; precioUnitario: number; importe: number;
}

export interface Compra {
  id: number; comprobante: string; serie: string; numero: string; fechaEmision: string; fechaRegistro: string;
  regularizar: boolean; proveedor: Proveedor; empleado: Empleado; precioIncluyeIgv: boolean; descripcion?: string;
  subtotal: number; igv: number; total: number; percepcion?: number; pagar: number; tipoPago: string; medioPago: string;
  estado: boolean; estadoPago: boolean; detalles: DetalleCompraResponse[];
}

export const IGV_RATE = 0.18;

let proveedores: Proveedor[] = [
  { id: 1, tipoDocumento: 'RUC', numeroDocumento: '20456789123', nombres: 'Distribuidora Farmacéutica del Perú S.A.C.', departamento: 'Lima', provincia: 'Lima', distrito: 'Ate', direccion: 'Av. Industrial 456', telefono: '014567890', correo: 'ventas@disfarma.pe', contactoNombres: 'Pedro Salas', contactoCelular: '987112233', contactoCorreo: 'pedro.salas@disfarma.pe' },
  { id: 2, tipoDocumento: 'RUC', numeroDocumento: '20567891234', nombres: 'Química Suiza Perú S.A.', departamento: 'Lima', provincia: 'Lima', distrito: 'Callao', direccion: 'Av. Argentina 789', telefono: '014123456', correo: 'contacto@quimicasuiza.pe' },
];

const productosCompra: Producto[] = [
  { id: 1, nombre: 'Paracetamol 500mg', codigoBarra: '7751271000019', unidadMedida: 'CAJA', gravada: true, precioUnitario: 2.5, precioMayorista: 2.1, costoUnitario: 1.2, stockActual: 320, unidadesPorPresentacion: 100 },
  { id: 2, nombre: 'Amoxicilina 500mg', codigoBarra: '7751271000026', unidadMedida: 'CAJA', gravada: true, precioUnitario: 6.0, precioMayorista: 5.2, costoUnitario: 4.5, stockActual: 18, unidadesPorPresentacion: 50 },
  { id: 3, nombre: 'Ibuprofeno 400mg', codigoBarra: '7751271000033', unidadMedida: 'CAJA', gravada: true, precioUnitario: 2.8, precioMayorista: 2.3, costoUnitario: 1.5, stockActual: 150, unidadesPorPresentacion: 100 },
];

let compras: Compra[] = [
  { id: 1, comprobante: 'FACTURA', serie: 'F001', numero: '000123', fechaEmision: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10), fechaRegistro: new Date(Date.now() - 5 * 86400000).toISOString(), regularizar: false, proveedor: proveedores[0], empleado: { id: 1, nombre: 'Administrador', rol: 'Administrador' }, precioIncluyeIgv: true, descripcion: 'Compra mensual de antibióticos y analgésicos', subtotal: 1200, igv: 216, total: 1416, percepcion: 0, pagar: 1416, tipoPago: 'CONTADO', medioPago: 'TRANSFERENCIA', estado: true, estadoPago: true, detalles: [
    { id: 1, producto: productosCompra[0], lote: 'L2301', fechaVencimiento: '2027-05-01', unidadMedida: 'CAJA', cantidad: 5, precioUnitario: 120, importe: 600 },
    { id: 2, producto: productosCompra[1], lote: 'L2288', fechaVencimiento: '2026-11-01', unidadMedida: 'CAJA', cantidad: 2, precioUnitario: 300, importe: 600 },
  ] },
];

export const comprasApi = {
  listar: async () => { await delay(); return [...compras]; },
  obtener: async (id: number) => {
    await delay();
    const compra = compras.find((c) => c.id === id);
    if (!compra) throw new Error('Compra no encontrada');
    return compra;
  },
  crear: async (payload: CompraRequestDTO) => {
    await delay();
    const proveedor = proveedores.find((p) => p.id === payload.idProveedor) ?? proveedores[0];
    const detalles: DetalleCompraResponse[] = payload.items.map((item, i) => {
      const producto = productosCompra.find((p) => p.id === item.idProducto) ?? productosCompra[0];
      return { id: i + 1, producto, lote: item.lote, fechaVencimiento: item.fechaVencimiento, unidadMedida: item.unidadMedida, cantidad: item.cantidad, precioUnitario: item.precioUnitario, importe: item.cantidad * item.precioUnitario };
    });
    const subtotalBase = detalles.reduce((sum, d) => sum + d.importe, 0);
    const igv = payload.precioIncluyeIgv ? subtotalBase - subtotalBase / (1 + IGV_RATE) : subtotalBase * IGV_RATE;
    const total = payload.precioIncluyeIgv ? subtotalBase : subtotalBase + igv;
    const nueva: Compra = {
      id: nextId(compras), comprobante: payload.comprobante, serie: payload.serie, numero: payload.numero, fechaEmision: payload.fechaEmision,
      fechaRegistro: new Date().toISOString(), regularizar: payload.regularizar, proveedor, empleado: { id: payload.idEmpleado, nombre: 'Empleado Demo' },
      precioIncluyeIgv: payload.precioIncluyeIgv, descripcion: payload.descripcion, subtotal: Number((total - igv).toFixed(2)), igv: Number(igv.toFixed(2)),
      total: Number(total.toFixed(2)), percepcion: payload.percepcion ?? 0, pagar: Number((total + (payload.percepcion ?? 0)).toFixed(2)),
      tipoPago: payload.tipoPago, medioPago: payload.medioPago, estado: true, estadoPago: payload.tipoPago === 'CONTADO', detalles,
    };
    compras.push(nueva);
    return nueva;
  },
  anular: async (id: number) => {
    await delay();
    const compra = compras.find((c) => c.id === id);
    if (!compra) throw new Error('Compra no encontrada');
    compra.estado = false;
  },
};

export const proveedorApi = {
  listar: async () => { await delay(); return [...proveedores]; },
  obtener: async (id: number) => {
    await delay();
    const proveedor = proveedores.find((p) => p.id === id);
    if (!proveedor) throw new Error('Proveedor no encontrado');
    return proveedor;
  },
  crear: async (data: ProveedorRequestDTO) => { await delay(); const n: Proveedor = { id: nextId(proveedores), ...data }; proveedores.push(n); return n; },
  actualizar: async (id: number, data: Partial<ProveedorRequestDTO>) => {
    await delay();
    const proveedor = proveedores.find((p) => p.id === id);
    if (!proveedor) throw new Error('Proveedor no encontrado');
    Object.assign(proveedor, data);
    return proveedor;
  },
};