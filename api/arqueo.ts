import { fetchPagina } from "./paginacion";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface ArqueoCaja {
  id: number;
  numero: string;
  empleadoId: number;
  empleadoNombre: string;
  fechaInicio: string;
  montoInicial: number;
  fechaFin: string | null;
  montoFinal: number | null;
  montoDejado: number | null;
  estado: boolean;
}

export interface AbrirCajaPayload {
  empleadoId: number;
  montoInicial: number;
}

export interface CerrarCajaPayload {
  empleadoId: number;
  montoDejado: number;
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

export const arqueoApi = {
  listar: (desde?: string, hasta?: string) => {
    const params = new URLSearchParams();
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    const qs = params.toString();
    return request<ArqueoCaja[]>(`/arqueos${qs ? `?${qs}` : ''}`);
  },
  listarPaginado: (page = 0, size = 50, desde?: string, hasta?: string) =>
    fetchPagina<ArqueoCaja>('/arqueos', page, size, { desde, hasta }),
  pendientes: () => request<ArqueoCaja[]>('/arqueos/pendientes'),
  abrir: (data: AbrirCajaPayload) =>
    request<ArqueoCaja>('/arqueos/abrir', { method: 'POST', body: JSON.stringify(data) }),
  cerrar: (id: number, data: CerrarCajaPayload) =>
    request<ArqueoCaja>(`/arqueos/${id}/cerrar`, { method: 'PUT', body: JSON.stringify(data) }),
  cajaActual: (empleadoId: number) =>
    request<ArqueoCaja | undefined>(`/arqueos/empleado/${empleadoId}/actual`),
};