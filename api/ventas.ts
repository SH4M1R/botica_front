const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type TipoVenta = 'unidad' | 'blister' | 'caja';

// Tipo de comprobante emitido por el backend (Venta.tipoVenta en el modelo Java).
// No confundir con el TipoVenta de arriba, que es el tipo de venta de cada
// DetalleVenta (unidad/blister/caja).
export type TipoComprobanteVenta = 'nota_venta' | 'boleta' | 'factura';

export interface Producto {
  id: number;
  nombre: string;
  precio_venta: number;
  stock: number;
}

export interface Cliente {
  id: number;
  nombres: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  dni?: string;
  telefono?: string;
  saldo?: number;
}

export interface ReniecResponse {
  success: boolean;
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  codVerifica?: string;
}

// --- NUEVO: helpers de nombre completo ---
export function getNombreCompleto(c: Pick<Cliente, 'nombres' | 'apellidoPaterno' | 'apellidoMaterno'>): string {
  return [c.nombres, c.apellidoPaterno, c.apellidoMaterno].filter(Boolean).join(' ');
}

// Divide "Juan Carlos Pérez García" en { nombres, apellidoPaterno, apellidoMaterno }
export function splitNombreCompleto(nombreCompleto: string): {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
} {
  const partes = nombreCompleto.trim().split(/\s+/).filter(Boolean);

  if (partes.length >= 3) {
    return {
      nombres: partes.slice(0, partes.length - 2).join(' '),
      apellidoPaterno: partes[partes.length - 2],
      apellidoMaterno: partes[partes.length - 1],
    };
  }
  if (partes.length === 2) {
    return { nombres: partes[0], apellidoPaterno: partes[1], apellidoMaterno: '' };
  }
  return { nombres: partes[0] ?? '', apellidoPaterno: '', apellidoMaterno: '' };
}

interface ClientePayload {
  nombres: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  dni?: string;
  telefono?: string;
}

export interface Empleado {
  id: number;
  nombre: string;
  username: string;
  rol: string;
  estado: boolean;
}

export interface DetalleVenta {
  id: number;
  producto: Producto;
  cantidad: number;
  tipoVenta: TipoVenta;
  precioUnitario: number;
  subtotal: number;
}

export interface Venta {
  id: number;
  fecha: string;
  total: number;
  estado: boolean;
  metodoPago: string;
  // --- NUEVO: reflejan las columnas agregadas en el backend (Venta.java) ---
  tipoVenta: TipoComprobanteVenta;
  serie?: string;
  numeroComprobante?: number;
  vuelto?: number;
  codigoIzipay?: string;
  empleado: Empleado;
  cliente: Cliente | null;
  detalles: DetalleVenta[];
}

export interface ItemVentaRequest {
  idProducto: number;
  cantidad: number;
  tipoVenta: TipoVenta;
  precioUnitario: number;
}

export interface VentaRequest {
  idEmpleado: number;
  idCliente?: number | null;
  metodoPago: string;
  // --- NUEVO: coinciden con los campos que ahora espera VentaRequest.java ---
  tipoVenta: TipoComprobanteVenta;
  montoPagado?: number;
  codigoIzipay?: string;
  items: ItemVentaRequest[];
}

export interface VentaResponse {
  venta: Venta;
  comprobanteEstado?: 'GENERADO' | 'ERROR_GENERACION';
  comprobanteMensaje?: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(msg || `Error ${res.status} en ${path}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : (undefined as T);
}

export const ventasApi = {
  listar: () => request<Venta[]>('/ventas'),
  obtener: (id: number) => request<Venta>(`/ventas/${id}`),
  crear: (data: VentaRequest) => request<VentaResponse>('/ventas', { method: 'POST', body: JSON.stringify(data) }),
  anular: (id: number) => request<void>(`/ventas/${id}/anular`, { method: 'PUT' }),
};

export const clientesApi = {
  listar: () => request<Cliente[]>('/clientes'),
  crear: (data: ClientePayload) =>
    request<Cliente>('/clientes', { method: 'POST', body: JSON.stringify(data) }),
  actualizar: (id: number, data: ClientePayload) =>
    request<Cliente>(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  registrarPago: (id: number, monto: number) =>
    request<Cliente>(`/clientes/${id}/pago`, { method: 'PUT', body: JSON.stringify({ monto }) }),
  consultarDni: (dni: string) => request<ReniecResponse>(`/clientes/reniec/${dni}`),
  actualizarSaldo: (id: number, saldo: number) =>
    request<Cliente>(`/clientes/${id}/saldo`, { method: 'PUT', body: JSON.stringify({ saldo }) }),
};

export const empleadosApi = {
  listarActivos: () => request<Empleado[]>('/empleados/activos'),
  login: (username: string, password: string) =>
    request<Empleado>('/empleados/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
};

export const METODOS_PAGO = ['Efectivo', 'Izipay', 'Transferencia', 'Yape/Plin'];