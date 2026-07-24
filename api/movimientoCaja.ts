const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type TipoMovimiento = 'INGRESO' | 'EGRESO';

export type CategoriaMovimiento =
  | 'RETIRO_EFECTIVO'
  | 'PAGO_PROVEEDOR'
  | 'PAGO_SERVICIOS'
  | 'GASTO_VARIO'
  | 'APORTE_CAPITAL'
  | 'DEVOLUCION'
  | 'OTRO';

export interface MovimientoCaja {
  id: number;
  empleadoNombre: string;
  tipo: TipoMovimiento;
  categoria: CategoriaMovimiento;
  descripcion: string;
  monto: number;
  fecha: string;
  anulado: boolean;
}

export interface RegistrarMovimientoPayload {
  arqueoCajaId: number;
  empleadoId: number;
  tipo: TipoMovimiento;
  categoria: CategoriaMovimiento;
  descripcion: string;
  monto: number;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Error ${res.status} en ${path}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : (undefined as T);
}

export const movimientoCajaApi = {
  listarPorArqueo: (arqueoId: number) =>
    request<MovimientoCaja[]>(`/movimientos/arqueo/${arqueoId}`),
  registrar: (data: RegistrarMovimientoPayload) =>
    request<MovimientoCaja>('/movimientos', { method: 'POST', body: JSON.stringify(data) }),
  anular: (id: number) =>
    request<MovimientoCaja>(`/movimientos/${id}/anular`, { method: 'PUT' }),
};