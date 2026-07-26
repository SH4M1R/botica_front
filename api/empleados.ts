import { delay, nextId } from './_mockUtils';

export const ROLES = ['Administrador', 'Cajero', 'Técnico Farmaceútico', 'Delivery', 'Otro'];
export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export interface Empleado {
  id: number;
  nombre: string;
  username: string;
  rol: string;
  estado: boolean;
  horaEntrada?: string | null;
  horaSalida?: string | null;
  diaDescanso?: string | null;
}

export interface EmpleadoPayload {
  nombre: string;
  username: string;
  password?: string;
  rol: string;
  estado: boolean;
  horaEntrada?: string | null;
  horaSalida?: string | null;
  diaDescanso?: string | null;
}

interface EmpleadoInterno extends Empleado { password: string; }

let empleados: EmpleadoInterno[] = [
  { id: 1, nombre: 'Administrador', username: 'admin', password: 'admin123', rol: 'Administrador', estado: true, horaEntrada: '08:00', horaSalida: '18:00', diaDescanso: 'Domingo' },
  { id: 2, nombre: 'Ana Torres', username: 'atorres', password: 'demo123', rol: 'Cajero', estado: true, horaEntrada: '08:00', horaSalida: '16:00', diaDescanso: 'Lunes' },
  { id: 3, nombre: 'Juan Pérez', username: 'jperez', password: 'demo123', rol: 'Técnico Farmaceútico', estado: true, horaEntrada: '09:00', horaSalida: '17:00', diaDescanso: 'Domingo' },
  { id: 4, nombre: 'Luis Gómez', username: 'lgomez', password: 'demo123', rol: 'Delivery', estado: false, horaEntrada: '10:00', horaSalida: '18:00', diaDescanso: 'Martes' },
];

function sinPassword(e: EmpleadoInterno): Empleado {
  const { password, ...rest } = e;
  return rest;
}

export const empleadosCrudApi = {
  listar: async () => { await delay(); return empleados.map(sinPassword); },
  listarActivos: async () => { await delay(); return empleados.filter((e) => e.estado).map(sinPassword); },
  obtener: async (id: number) => {
    await delay();
    const emp = empleados.find((e) => e.id === id);
    if (!emp) throw new Error('Empleado no encontrado');
    return sinPassword(emp);
  },
  crear: async (data: EmpleadoPayload) => {
    await delay();
    const nuevo: EmpleadoInterno = {
      id: nextId(empleados), nombre: data.nombre, username: data.username, password: data.password ?? '123456',
      rol: data.rol, estado: data.estado, horaEntrada: data.horaEntrada ?? null, horaSalida: data.horaSalida ?? null, diaDescanso: data.diaDescanso ?? null,
    };
    empleados.push(nuevo);
    return sinPassword(nuevo);
  },
  actualizar: async (id: number, data: EmpleadoPayload) => {
    await delay();
    const emp = empleados.find((e) => e.id === id);
    if (!emp) throw new Error('Empleado no encontrado');
    emp.nombre = data.nombre; emp.username = data.username; emp.rol = data.rol; emp.estado = data.estado;
    emp.horaEntrada = data.horaEntrada ?? null; emp.horaSalida = data.horaSalida ?? null; emp.diaDescanso = data.diaDescanso ?? null;
    if (data.password?.trim()) emp.password = data.password;
    return sinPassword(emp);
  },
  eliminar: async (id: number) => { await delay(); empleados = empleados.filter((e) => e.id !== id); },
  cambiarEstado: async (id: number, activo: boolean) => {
    await delay();
    const emp = empleados.find((e) => e.id === id);
    if (!emp) throw new Error('Empleado no encontrado');
    emp.estado = activo;
    return sinPassword(emp);
  },
};

// Reutilizado por asistencia.ts y ventas.ts para no duplicar credenciales de login
export function _validarCredenciales(username: string, password: string): Empleado | null {
  const emp = empleados.find((e) => e.username === username && e.password === password && e.estado);
  return emp ? sinPassword(emp) : null;
}