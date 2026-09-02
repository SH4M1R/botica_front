import { apiFetch } from './compra';
import type { TipoVenta } from '@/components/ventaShared';

export interface ItemCotizacionRequestDTO {
  idProducto: number;
  tipoVenta: TipoVenta;
  cantidad: number;
  precioUnitario: number;
}

export interface CotizacionRequestDTO {
  idEmpleado: number;
  idCliente?: number | null;
  clienteNombre?: string;
  clienteDni?: string;
  items: ItemCotizacionRequestDTO[];
}

// Snapshot mínimo del producto tal como viene embebido en cada detalle de
// la cotización guardada (no necesariamente el producto completo/actual).
export interface ProductoCotizacionResponse {
  id: number;
  nombre: string;
}

export interface DetalleCotizacionResponse {
  id: number;
  producto: ProductoCotizacionResponse;
  tipoVenta: TipoVenta;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface EmpleadoCotizacion {
  id: number;
  nombre: string;
}

export interface Cotizacion {
  id: number;
  fecha: string;
  empleado: EmpleadoCotizacion;
  idCliente?: number | null;
  clienteNombre: string;
  clienteDni?: string;
  total: number;
  // false = anulada (ya no se puede cargar en Generar venta)
  estado: boolean;
  // true = ya se generó una venta real a partir de esta cotización
  convertida: boolean;
  detalles: DetalleCotizacionResponse[];
}

export const cotizacionesApi = {
  listar: () => apiFetch<Cotizacion[]>('/cotizaciones'),
  obtener: (id: number) => apiFetch<Cotizacion>(`/cotizaciones/${id}`),
  crear: (payload: CotizacionRequestDTO) =>
    apiFetch<Cotizacion>('/cotizaciones', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  anular: (id: number) =>
    apiFetch<void>(`/cotizaciones/${id}/anular`, { method: 'PUT' }),
  // Se llama automáticamente desde "Generar venta" cuando una venta se
  // confirma a partir de una cotización cargada, para que no pueda
  // volver a cargarse (evita duplicar la misma cotización en dos ventas).
  marcarConvertida: (id: number) =>
    apiFetch<void>(`/cotizaciones/${id}/convertir`, { method: 'PUT' }),
};