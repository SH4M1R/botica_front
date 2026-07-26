import { delay, nextId } from './_mockUtils';

export interface ArqueoCaja {
  id: number;
  numero: string;
  empleadoNombre: string;
  fechaInicio: string;
  montoInicial: number;
  fechaFin: string | null;
  montoFinal: number | null;
  estado: boolean;
}

export interface AbrirCajaPayload { empleadoId: number; montoInicial: number; }

let arqueos: (ArqueoCaja & { empleadoId: number })[] = [
  { id: 1, numero: 'ARQ-0001', empleadoNombre: 'Administrador', empleadoId: 1, fechaInicio: new Date(new Date().setHours(8, 0, 0, 0)).toISOString(), montoInicial: 100, fechaFin: null, montoFinal: null, estado: true },
  { id: 2, numero: 'ARQ-0000', empleadoNombre: 'Ana Torres', empleadoId: 2, fechaInicio: new Date(Date.now() - 86400000).toISOString(), montoInicial: 150, fechaFin: new Date(Date.now() - 86400000 + 8 * 3600000).toISOString(), montoFinal: 780.5, estado: false },
];

function sinEmpleadoId(a: ArqueoCaja & { empleadoId: number }): ArqueoCaja {
  const { empleadoId, ...rest } = a;
  return rest;
}

export const arqueoApi = {
  listar: async (desde?: string, hasta?: string) => {
    await delay();
    let resultado = [...arqueos];
    if (desde) resultado = resultado.filter((a) => a.fechaInicio >= desde);
    if (hasta) resultado = resultado.filter((a) => a.fechaInicio <= hasta);
    return resultado.map(sinEmpleadoId);
  },
  pendientes: async () => { await delay(); return arqueos.filter((a) => a.estado).map(sinEmpleadoId); },
  abrir: async (data: AbrirCajaPayload) => {
    await delay();
    const id = nextId(arqueos);
    const nuevo = { id, numero: `ARQ-${String(id).padStart(4, '0')}`, empleadoNombre: 'Empleado Demo', empleadoId: data.empleadoId, fechaInicio: new Date().toISOString(), montoInicial: data.montoInicial, fechaFin: null, montoFinal: null, estado: true };
    arqueos.push(nuevo);
    return sinEmpleadoId(nuevo);
  },
  cerrar: async (id: number) => {
    await delay();
    const arqueo = arqueos.find((a) => a.id === id);
    if (!arqueo) throw new Error('Arqueo no encontrado');
    arqueo.estado = false;
    arqueo.fechaFin = new Date().toISOString();
    arqueo.montoFinal = arqueo.montoInicial + 250;
    return sinEmpleadoId(arqueo);
  },
  cajaActual: async (empleadoId: number) => {
    await delay();
    const actual = arqueos.find((a) => a.empleadoId === empleadoId && a.estado);
    return actual ? sinEmpleadoId(actual) : undefined;
  },
};