const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface CuponTipo {
  id: number;
  nombre: string;
  puntosRequeridos: number;
  valor: number;
  activo?: boolean;
}

export interface Cupon {
  id: number;
  codigo: string;
  idCliente: number;
  clienteNombre?: string;
  nombre: string;
  valor: number;
  puntosUsados: number;
  fechaCreacion?: string;
  fechaUso?: string | null;
  estado: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/cupones${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(msg || `Error ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : (undefined as T);
}

export const cuponesApi = {
  listarTipos: () => request<CuponTipo[]>('/tipos'),
  crearTipo: (d: Omit<CuponTipo, 'id'>) =>
    request<CuponTipo>('/tipos', { method: 'POST', body: JSON.stringify(d) }),
  actualizarTipo: (id: number, d: Omit<CuponTipo, 'id'>) =>
    request<CuponTipo>(`/tipos/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  eliminarTipo: (id: number) => request<void>(`/tipos/${id}`, { method: 'DELETE' }),
  canjear: (idCliente: number, idTipo: number) =>
    request<Cupon>('/canjear', { method: 'POST', body: JSON.stringify({ idCliente, idTipo }) }),
  listarPorCliente: (idCliente: number) => request<Cupon[]>(`/cliente/${idCliente}`),
  usar: (id: number) => request<Cupon>(`/${id}/usar`, { method: 'PUT' }),
};
