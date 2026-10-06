const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface Asistencia {
  id: number;
  idEmpleado: number;
  nombreEmpleado: string;
  fecha: string;
  horaEntrada: string | null;
  horaSalida: string | null;
  tardanza: boolean;
  minutosTardanza: number;
}

export interface AsistenciaCredenciales {
  username: string;
  password: string;
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

export const asistenciaApi = {
  listar: () => request<Asistencia[]>('/asistencias'),
  marcarEntrada: (data: AsistenciaCredenciales) =>
    request<Asistencia>('/asistencias/entrada', { method: 'POST', body: JSON.stringify(data) }),
  marcarSalida: (data: AsistenciaCredenciales) =>
    request<Asistencia>('/asistencias/salida', { method: 'POST', body: JSON.stringify(data) }),
  reporte: (fechaInicio: string, fechaFin: string) =>
    request<Asistencia[]>(`/asistencias/reporte?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`),
};