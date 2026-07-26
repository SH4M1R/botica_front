const API_URL = process.env.NEXT_PUBLIC_API_URL;

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

export const permisosApi = {
  obtener: (idEmpleado: number) => request<string[]>(`/empleados/${idEmpleado}/permisos`),
  guardar: (idEmpleado: number, rutas: string[]) =>
    request<string[]>(`/empleados/${idEmpleado}/permisos`, { method: 'PUT', body: JSON.stringify({ rutas }) }),
};