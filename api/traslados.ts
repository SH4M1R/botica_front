import { delay, nextId } from './_mockUtils';
import { productos as productosSeed } from './productos';

export type TipoTraslado = 'INGRESO' | 'EGRESO';

export interface Sucursal { id: number; nombre: string; }

export interface TrasladoDetalle {
  id: number;
  idProducto: number;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Traslado {
  id: number;
  tipo: TipoTraslado;
  idSucursal: number;
  nombreSucursal: string;
  fecha: string;
  total: number;
  observacion?: string;
  detalles: TrasladoDetalle[];
}

export interface TrasladoDetalleInput { idProducto: number; cantidad: number; precioUnitario: number; }

export interface TrasladoInput {
  tipo: TipoTraslado;
  idSucursal: number;
  observacion?: string;
  detalles: TrasladoDetalleInput[];
}

let sucursales: Sucursal[] = [
  { id: 1, nombre: 'Sucursal Miraflores' },
  { id: 2, nombre: 'Sucursal San Isidro' },
];

let traslados: Traslado[] = [
  { id: 1, tipo: 'INGRESO', idSucursal: 1, nombreSucursal: 'Sucursal Miraflores', fecha: new Date(Date.now() - 2 * 86400000).toISOString(), total: 245.5, observacion: 'Reposición de stock semanal', detalles: [
    { id: 1, idProducto: 1, nombreProducto: 'Paracetamol 500mg', cantidad: 50, precioUnitario: 2.5, subtotal: 125 },
    { id: 2, idProducto: 2, nombreProducto: 'Amoxicilina 500mg', cantidad: 20, precioUnitario: 6.025, subtotal: 120.5 },
  ] },
  { id: 2, tipo: 'EGRESO', idSucursal: 2, nombreSucursal: 'Sucursal San Isidro', fecha: new Date(Date.now() - 86400000).toISOString(), total: 60, observacion: '', detalles: [
    { id: 3, idProducto: 3, nombreProducto: 'Ibuprofeno 400mg', cantidad: 30, precioUnitario: 2, subtotal: 60 },
  ] },
];

export const trasladosApi = {
  listar: async () => { await delay(); return [...traslados]; },
  obtenerPorId: async (id: number) => {
    await delay();
    const traslado = traslados.find((t) => t.id === id);
    if (!traslado) throw new Error('Traslado no encontrado');
    return traslado;
  },
  crear: async (data: TrasladoInput) => {
    await delay();
    const sucursal = sucursales.find((s) => s.id === data.idSucursal);
    const detalles: TrasladoDetalle[] = data.detalles.map((d, i) => ({
      id: i + 1, idProducto: d.idProducto,
      nombreProducto: productosSeed.find((p) => p.id === d.idProducto)?.nombre ?? `Producto #${d.idProducto}`,
      cantidad: d.cantidad, precioUnitario: d.precioUnitario, subtotal: d.cantidad * d.precioUnitario,
    }));
    const nuevo: Traslado = {
      id: nextId(traslados), tipo: data.tipo, idSucursal: data.idSucursal, nombreSucursal: sucursal?.nombre ?? 'Sucursal',
      fecha: new Date().toISOString(), total: detalles.reduce((sum, d) => sum + d.subtotal, 0), observacion: data.observacion, detalles,
    };
    traslados.push(nuevo);
    return nuevo;
  },
};

export const sucursalesApi = {
  listar: async () => { await delay(); return [...sucursales]; },
  crear: async (data: { nombre: string }) => { await delay(); const n = { id: nextId(sucursales), nombre: data.nombre }; sucursales.push(n); return n; },
  actualizar: async (id: number, data: { nombre: string }) => { await delay(); const s = sucursales.find((x) => x.id === id); if (!s) throw new Error('No encontrada'); s.nombre = data.nombre; return s; },
  eliminar: async (id: number) => { await delay(); sucursales = sucursales.filter((s) => s.id !== id); },
};