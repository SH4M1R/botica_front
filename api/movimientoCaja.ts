import { delay, nextId } from './_mockUtils';

export type TipoMovimiento = 'INGRESO' | 'EGRESO';
export type CategoriaMovimiento = 'RETIRO_EFECTIVO' | 'PAGO_PROVEEDOR' | 'PAGO_SERVICIOS' | 'GASTO_VARIO' | 'APORTE_CAPITAL' | 'DEVOLUCION' | 'OTRO';
export type MedioPago = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'YAPE_PLIN';

export interface MovimientoCaja {
  id: number;
  empleadoNombre: string;
  tipo: TipoMovimiento;
  categoria: CategoriaMovimiento;
  numero: string;
  fechaEmision: string;
  descripcion: string;
  monto: number;
  medioPago: MedioPago;
  fechaRegistro: string;
  anulado: boolean;
}

export interface RegistrarMovimientoPayload {
  arqueoCajaId: number;
  empleadoId: number;
  tipo: TipoMovimiento;
  categoria: CategoriaMovimiento;
  numero: string;
  fechaEmision: string;
  descripcion: string;
  monto: number;
  medioPago: MedioPago;
}

let movimientos: MovimientoCaja[] = [
  { id: 1, empleadoNombre: 'Administrador', tipo: 'EGRESO', categoria: 'PAGO_SERVICIOS', numero: 'MOV-0001', fechaEmision: new Date().toISOString().slice(0, 10), descripcion: 'Pago de recibo de luz', monto: 85.5, medioPago: 'EFECTIVO', fechaRegistro: new Date().toISOString(), anulado: false },
  { id: 2, empleadoNombre: 'Ana Torres', tipo: 'INGRESO', categoria: 'APORTE_CAPITAL', numero: 'MOV-0002', fechaEmision: new Date().toISOString().slice(0, 10), descripcion: 'Aporte de capital para caja chica', monto: 200, medioPago: 'EFECTIVO', fechaRegistro: new Date().toISOString(), anulado: false },
];

export const movimientoCajaApi = {
  listar: async (desde?: string, hasta?: string) => {
    await delay();
    let resultado = [...movimientos];
    if (desde) resultado = resultado.filter((m) => m.fechaEmision >= desde);
    if (hasta) resultado = resultado.filter((m) => m.fechaEmision <= hasta);
    return resultado;
  },
  listarPorArqueo: async (_arqueoId: number) => { await delay(); return [...movimientos]; },
  registrar: async (data: RegistrarMovimientoPayload) => {
    await delay();
    const nuevo: MovimientoCaja = { id: nextId(movimientos), empleadoNombre: 'Empleado Demo', tipo: data.tipo, categoria: data.categoria, numero: data.numero, fechaEmision: data.fechaEmision, descripcion: data.descripcion, monto: data.monto, medioPago: data.medioPago, fechaRegistro: new Date().toISOString(), anulado: false };
    movimientos.push(nuevo);
    return nuevo;
  },
  anular: async (id: number) => {
    await delay();
    const mov = movimientos.find((m) => m.id === id);
    if (!mov) throw new Error('Movimiento no encontrado');
    mov.anulado = true;
    return mov;
  },
};