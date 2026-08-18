import { delay, nextId } from './_mockUtils';

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

const NOMBRES_EMPLEADO: Record<number, string> = {
  1: 'Administrador',
  2: 'Ana Torres',
  3: 'Juan Pérez',
  4: 'Luis Gómez',
};

let arqueos: ArqueoCaja[] = [
  {
    id: 1,
    numero: 'ARQ-0001',
    empleadoId: 1,
    empleadoNombre: 'Administrador',
    fechaInicio: new Date(new Date().setHours(8, 0, 0, 0)).toISOString(),
    montoInicial: 100,
    fechaFin: null,
    montoFinal: null,
    montoDejado: null,
    estado: true,
  },
  {
    id: 2,
    numero: 'ARQ-0000',
    empleadoId: 2,
    empleadoNombre: 'Ana Torres',
    fechaInicio: new Date(Date.now() - 86400000).toISOString(),
    montoInicial: 100,
    fechaFin: new Date(Date.now() - 86400000 + 8 * 3600000).toISOString(),
    montoFinal: 345.5,
    montoDejado: 100,
    estado: false,
  },
];

export const arqueoApi = {
  listar: async (desde?: string, hasta?: string) => {
    await delay();
    let resultado = [...arqueos];
    if (desde) resultado = resultado.filter((a) => a.fechaInicio >= desde);
    if (hasta) resultado = resultado.filter((a) => a.fechaInicio <= hasta);
    return resultado;
  },

  pendientes: async () => {
    await delay();
    return arqueos.filter((a) => a.estado);
  },

  abrir: async (data: AbrirCajaPayload) => {
    await delay();
    const yaAbierto = arqueos.find((a) => a.empleadoId === data.empleadoId && a.estado);
    if (yaAbierto) throw new Error('Este empleado ya tiene una caja abierta.');

    const id = nextId(arqueos);
    const nuevo: ArqueoCaja = {
      id,
      numero: `ARQ-${String(id).padStart(4, '0')}`,
      empleadoId: data.empleadoId,
      empleadoNombre: NOMBRES_EMPLEADO[data.empleadoId] ?? 'Empleado Demo',
      fechaInicio: new Date().toISOString(),
      montoInicial: data.montoInicial,
      fechaFin: null,
      montoFinal: null,
      montoDejado: null,
      estado: true,
    };
    arqueos.push(nuevo);
    return nuevo;
  },

  cerrar: async (id: number, data: CerrarCajaPayload) => {
    await delay();
    const arqueo = arqueos.find((a) => a.id === id);
    if (!arqueo) throw new Error('Arqueo no encontrado');
    if (!arqueo.estado) throw new Error('Este arqueo ya fue cerrado.');
    if (arqueo.empleadoId !== data.empleadoId) throw new Error('Este arqueo no pertenece a este empleado.');

    arqueo.fechaFin = new Date().toISOString();
    arqueo.montoDejado = data.montoDejado;
    arqueo.montoFinal = arqueo.montoInicial + data.montoDejado;
    arqueo.estado = false;
    return arqueo;
  },

  cajaActual: async (empleadoId: number) => {
    await delay();
    return arqueos.find((a) => a.empleadoId === empleadoId && a.estado);
  },
};