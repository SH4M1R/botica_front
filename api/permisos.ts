import { delay } from './_mockUtils';

let permisosPorEmpleado: Record<number, string[]> = {
  2: ['/dashboard/ventas', '/dashboard/ventas/generar', '/dashboard/clientes'],
  3: ['/dashboard/productos', '/dashboard/ingresos', '/dashboard/egresos'],
  4: ['/dashboard/asistencia'],
};

export const permisosApi = {
  obtener: async (idEmpleado: number) => { await delay(); return permisosPorEmpleado[idEmpleado] ?? []; },
  guardar: async (idEmpleado: number, rutas: string[]) => { await delay(); permisosPorEmpleado[idEmpleado] = rutas; return rutas; },
};