const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const ROLES = ['Administrador', 'Vendedor', 'Delivery'];

export interface Empleado {
  id: number;
  nombre: string;
  username: string;
  rol: string;
  estado: boolean;
}

export interface EmpleadoPayload {
  nombre: string;
  username: string;
  password?: string;
  rol: string;
  estado: boolean;
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

export const empleadosCrudApi = {
  listar: () => request<Empleado[]>('/empleados'),
  listarActivos: () => request<Empleado[]>('/empleados/activos'),
  obtener: (id: number) => request<Empleado>(`/empleados/${id}`),
  crear: (data: EmpleadoPayload) => request<Empleado>('/empleados', { method: 'POST', body: JSON.stringify(data) }),
  actualizar: (id: number, data: EmpleadoPayload) => request<Empleado>(`/empleados/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  eliminar: (id: number) => request<void>(`/empleados/${id}`, { method: 'DELETE' }),
  cambiarEstado: (id: number, activo: boolean) =>
    request<Empleado>(`/empleados/${id}/estado?activo=${activo}`, { method: 'PATCH' }),
};