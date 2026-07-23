const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type TipoVenta = 'unidad' | 'blister' | 'caja';

export interface Producto {
  id: number;
  nombre: string;
  precio_venta: number;
  stock: number;
}

export interface Cliente {
  id: number;
  nombre: string;
  dni?: string;
  telefono?: string;
  saldo?: number;
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
  items: ItemVentaRequest[];
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
  crear: (data: VentaRequest) => request<Venta>('/ventas', { method: 'POST', body: JSON.stringify(data) }),
  anular: (id: number) => request<void>(`/ventas/${id}/anular`, { method: 'PUT' }),
};

export const clientesApi = {
  listar: () => request<Cliente[]>('/clientes'),
  crear: (data: { nombre: string; dni?: string; telefono?: string }) =>
    request<Cliente>('/clientes', { method: 'POST', body: JSON.stringify(data) }),
  actualizar: (id: number, data: { nombre: string; dni?: string; telefono?: string }) =>
    request<Cliente>(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  registrarPago: (id: number, monto: number) =>
    request<Cliente>(`/clientes/${id}/pago`, { method: 'PUT', body: JSON.stringify({ monto }) }),
};

export const empleadosApi = {
  listarActivos: () => request<Empleado[]>('/empleados/activos'),
  login: (username: string, password: string) =>
    request<Empleado>('/empleados/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
};

export const METODOS_PAGO = ['Efectivo', 'Izipay', 'Transferencia', 'Yape/Plin'];