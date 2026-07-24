const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type TipoTraslado = 'INGRESO' | 'EGRESO';

export interface Sucursal {
  id: number;
  nombre: string;
}

export interface TrasladoDetalle {
  id: number;
  idProducto: number;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Traslado {
  id: number;
  tipo: TipoTraslado;
  idSucursal: number;
  nombreSucursal: string;
  fecha: string;
  total: number;
  observacion?: string;
  detalles: TrasladoDetalle[];
}

export interface TrasladoDetalleInput {
  idProducto: number;
  cantidad: number;
  precioUnitario: number;
}

export interface TrasladoInput {
  tipo: TipoTraslado;
  idSucursal: number;
  observacion?: string;
  detalles: TrasladoDetalleInput[];
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`Error ${res.status} en ${path}`);
  const text = await res.text();
  return text ? JSON.parse(text) : (undefined as T);
}

export const trasladosApi = {
  listar: () => request<Traslado[]>('/traslados'),
  obtenerPorId: (id: number) => request<Traslado>(`/traslados/${id}`),
  crear: (data: TrasladoInput) => request<Traslado>('/traslados', { method: 'POST', body: JSON.stringify(data) }),
};

export const sucursalesApi = {
  listar: () => request<Sucursal[]>('/sucursales'),
  crear: (data: { nombre: string }) => request<Sucursal>('/sucursales', { method: 'POST', body: JSON.stringify(data) }),
  actualizar: (id: number, data: { nombre: string }) => request<Sucursal>(`/sucursales/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  eliminar: (id: number) => request<void>(`/sucursales/${id}`, { method: 'DELETE' }),
};