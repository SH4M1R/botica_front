import { delay, nextId } from './_mockUtils';
import { empleadosCrudApi, _validarCredenciales } from './empleados';
import { productos as productosSeed } from './productos';

export type TipoVenta = 'unidad' | 'blister' | 'caja';

export interface Producto { id: number; nombre: string; precio_venta: number; stock: number; }
export interface Cliente { id: number; nombre: string; dni?: string; telefono?: string; saldo?: number; }
export interface Empleado { id: number; nombre: string; username: string; rol: string; estado: boolean; }

export interface DetalleVenta {
  id: number;
  producto: Producto;
  cantidad: number;
  tipoVenta: TipoVenta;
  precioUnitario: number;
  subtotal: number;
}

export interface Venta {
  id: number;
  fecha: string;
  total: number;
  estado: boolean;
  metodoPago: string;
  empleado: Empleado;
  cliente: Cliente | null;
  detalles: DetalleVenta[];
}

export interface ItemVentaRequest { idProducto: number; cantidad: number; tipoVenta: TipoVenta; precioUnitario: number; }
export interface VentaRequest { idEmpleado: number; idCliente?: number | null; metodoPago: string; items: ItemVentaRequest[]; }

export const METODOS_PAGO = ['Efectivo', 'Izipay', 'Transferencia', 'Yape/Plin'];

let clientes: Cliente[] = [
  { id: 1, nombre: 'María López', dni: '45678912', telefono: '987654321', saldo: 0 },
  { id: 2, nombre: 'Carlos Ramírez', dni: '41234567', telefono: '956123478', saldo: 45.5 },
  { id: 3, nombre: 'Rosa Fernández', dni: '48889977', telefono: '', saldo: 0 },
  { id: 4, nombre: 'Juan Pérez', dni: '47123899', telefono: '912345678', saldo: 0 },
  { id: 5, nombre: 'Lucía Gómez', dni: '40987654', telefono: '934567891', saldo: 12.0 },
  { id: 6, nombre: 'Jorge Mendoza', dni: '43567123', telefono: '923456789', saldo: 0 },
  { id: 7, nombre: 'Elena Castillo', dni: '46781234', telefono: '', saldo: 25.0 },
];

function productoSimple(id: number): Producto {
  const p = productosSeed.find((x) => x.id === id);
  return p ? { id: p.id, nombre: p.nombre, precio_venta: p.precio_venta, stock: p.stock } : { id, nombre: `Producto #${id}`, precio_venta: 0, stock: 0 };
}

const empleadoDemo1: Empleado = { id: 1, nombre: 'Administrador', username: 'admin', rol: 'Administrador', estado: true };
const empleadoDemo2: Empleado = { id: 2, nombre: 'Ana Torres', username: 'atorres', rol: 'Cajero', estado: true };

let ventas: Venta[] = [
  { 
    id: 1, 
    fecha: new Date(Date.now() - 3 * 3600000).toISOString(), 
    total: 21.6, 
    estado: true, 
    metodoPago: 'Efectivo', 
    empleado: empleadoDemo2, 
    cliente: clientes[0], 
    detalles: [
      { id: 1, producto: productoSimple(1), cantidad: 2, tipoVenta: 'unidad', precioUnitario: 2.5, subtotal: 5.0 },
      { id: 2, producto: productoSimple(3), cantidad: 2, tipoVenta: 'unidad', precioUnitario: 2.8, subtotal: 5.6 },
      { id: 3, producto: productoSimple(6), cantidad: 1, tipoVenta: 'unidad', precioUnitario: 11.0, subtotal: 11.0 },
    ] 
  },
  { 
    id: 2, 
    fecha: new Date(Date.now() - 26 * 3600000).toISOString(), 
    total: 60.0, 
    estado: true, 
    metodoPago: 'Yape/Plin', 
    empleado: empleadoDemo1, 
    cliente: null, 
    detalles: [
      { id: 4, producto: productoSimple(4), cantidad: 3, tipoVenta: 'unidad', precioUnitario: 14.0, subtotal: 42.0 },
      { id: 5, producto: productoSimple(2), cantidad: 3, tipoVenta: 'unidad', precioUnitario: 6.0, subtotal: 18.0 },
    ] 
  },
  { 
    id: 3, 
    fecha: new Date(Date.now() - 2 * 3600000).toISOString(), 
    total: 28.0, 
    estado: true, 
    metodoPago: 'Tarjetas', 
    empleado: empleadoDemo2, 
    cliente: clientes[1], 
    detalles: [
      { id: 6, producto: productoSimple(11), cantidad: 1, tipoVenta: 'blister', precioUnitario: 28.0, subtotal: 28.0 },
    ] 
  },
  { 
    id: 4, 
    fecha: new Date(Date.now() - 5 * 3600000).toISOString(), 
    total: 16.5, 
    estado: true, 
    metodoPago: 'Efectivo', 
    empleado: empleadoDemo2, 
    cliente: clientes[3], 
    detalles: [
      { id: 7, producto: productoSimple(5), cantidad: 3, tipoVenta: 'unidad', precioUnitario: 5.5, subtotal: 16.5 },
    ] 
  },
  { 
    id: 5, 
    fecha: new Date(Date.now() - 12 * 3600000).toISOString(), 
    total: 45.0, 
    estado: true, 
    metodoPago: 'Yape/Plin', 
    empleado: empleadoDemo1, 
    cliente: clientes[4], 
    detalles: [
      { id: 8, producto: productoSimple(8), cantidad: 1, tipoVenta: 'blister', precioUnitario: 40.0, subtotal: 40.0 },
      { id: 9, producto: productoSimple(1), cantidad: 2, tipoVenta: 'unidad', precioUnitario: 2.5, subtotal: 5.0 },
    ] 
  },
  { 
    id: 6, 
    fecha: new Date(Date.now() - 18 * 3600000).toISOString(), 
    total: 12.0, 
    estado: true, 
    metodoPago: 'Efectivo', 
    empleado: empleadoDemo2, 
    cliente: null, 
    detalles: [
      { id: 10, producto: productoSimple(9), cantidad: 1, tipoVenta: 'unidad', precioUnitario: 12.0, subtotal: 12.0 },
    ] 
  },
  { 
    id: 7, 
    fecha: new Date(Date.now() - 22 * 3600000).toISOString(), 
    total: 35.5, 
    estado: true, 
    metodoPago: 'Yape/Plin', 
    empleado: empleadoDemo2, 
    cliente: clientes[5], 
    detalles: [
      { id: 11, producto: productoSimple(10), cantidad: 1, tipoVenta: 'blister', precioUnitario: 30.0, subtotal: 30.0 },
      { id: 12, producto: productoSimple(20), cantidad: 1, tipoVenta: 'unidad', precioUnitario: 8.5, subtotal: 5.5 },
    ] 
  },
  { 
    id: 8, 
    fecha: new Date(Date.now() - 30 * 3600000).toISOString(), 
    total: 22.0, 
    estado: true, 
    metodoPago: 'Efectivo', 
    empleado: empleadoDemo1, 
    cliente: null, 
    detalles: [
      { id: 13, producto: productoSimple(15), cantidad: 1, tipoVenta: 'unidad', precioUnitario: 22.0, subtotal: 22.0 },
    ] 
  },
  { 
    id: 9, 
    fecha: new Date(Date.now() - 36 * 3600000).toISOString(), 
    total: 200.0, 
    estado: true, 
    metodoPago: 'Tarjetas', 
    empleado: empleadoDemo1, 
    cliente: clientes[2], 
    detalles: [
      { id: 14, producto: productoSimple(1), cantidad: 1, tipoVenta: 'caja', precioUnitario: 200.0, subtotal: 200.0 },
    ] 
  },
  { 
    id: 10, 
    fecha: new Date(Date.now() - 42 * 3600000).toISOString(), 
    total: 18.0, 
    estado: true, 
    metodoPago: 'Efectivo', 
    empleado: empleadoDemo2, 
    cliente: null, 
    detalles: [
      { id: 15, producto: productoSimple(17), cantidad: 1, tipoVenta: 'unidad', precioUnitario: 18.0, subtotal: 18.0 },
    ] 
  },
  { 
    id: 11, 
    fecha: new Date(Date.now() - 48 * 3600000).toISOString(), 
    total: 58.0, 
    estado: true, 
    metodoPago: 'Yape/Plin', 
    empleado: empleadoDemo2, 
    cliente: clientes[6], 
    detalles: [
      { id: 16, producto: productoSimple(26), cantidad: 1, tipoVenta: 'unidad', precioUnitario: 58.0, subtotal: 58.0 },
    ] 
  },
  { 
    id: 12, 
    fecha: new Date(Date.now() - 52 * 3600000).toISOString(), 
    total: 18.0, 
    estado: true, 
    metodoPago: 'Efectivo', 
    empleado: empleadoDemo1, 
    cliente: null, 
    detalles: [
      { id: 17, producto: productoSimple(7), cantidad: 1, tipoVenta: 'blister', precioUnitario: 18.0, subtotal: 18.0 },
    ] 
  },
  { 
    id: 13, 
    fecha: new Date(Date.now() - 60 * 3600000).toISOString(), 
    total: 49.8, 
    estado: true, 
    metodoPago: 'Tarjetas', 
    empleado: empleadoDemo2, 
    cliente: clientes[0], 
    detalles: [
      { id: 18, producto: productoSimple(23), cantidad: 1, tipoVenta: 'blister', precioUnitario: 45.0, subtotal: 45.0 },
      { id: 19, producto: productoSimple(23), cantidad: 1, tipoVenta: 'unidad', precioUnitario: 4.8, subtotal: 4.8 },
    ] 
  },
  { 
    id: 14, 
    fecha: new Date(Date.now() - 65 * 3600000).toISOString(), 
    total: 15.0, 
    estado: true, 
    metodoPago: 'Efectivo', 
    empleado: empleadoDemo2, 
    cliente: null, 
    detalles: [
      { id: 20, producto: productoSimple(19), cantidad: 1, tipoVenta: 'unidad', precioUnitario: 15.0, subtotal: 15.0 },
    ] 
  },
  { 
    id: 15, 
    fecha: new Date(Date.now() - 72 * 3600000).toISOString(), 
    total: 25.0, 
    estado: true, 
    metodoPago: 'Yape/Plin', 
    empleado: empleadoDemo1, 
    cliente: clientes[3], 
    detalles: [
      { id: 21, producto: productoSimple(24), cantidad: 1, tipoVenta: 'unidad', precioUnitario: 25.0, subtotal: 25.0 },
    ] 
  },
  { 
    id: 16, 
    fecha: new Date(Date.now() - 78 * 3600000).toISOString(), 
    total: 18.5, 
    estado: true, 
    metodoPago: 'Efectivo', 
    empleado: empleadoDemo2, 
    cliente: null, 
    detalles: [
      { id: 22, producto: productoSimple(22), cantidad: 1, tipoVenta: 'unidad', precioUnitario: 18.5, subtotal: 18.5 },
    ] 
  },
  { 
    id: 17, 
    fecha: new Date(Date.now() - 84 * 3600000).toISOString(), 
    total: 32.0, 
    estado: true, 
    metodoPago: 'Tarjetas', 
    empleado: empleadoDemo2, 
    cliente: clientes[1], 
    detalles: [
      { id: 23, producto: productoSimple(9), cantidad: 1, tipoVenta: 'blister', precioUnitario: 32.0, subtotal: 32.0 },
    ] 
  },
  { 
    id: 18, 
    fecha: new Date(Date.now() - 90 * 3600000).toISOString(), 
    total: 12.0, 
    estado: true, 
    metodoPago: 'Efectivo', 
    empleado: empleadoDemo1, 
    cliente: null, 
    detalles: [
      { id: 24, producto: productoSimple(28), cantidad: 1, tipoVenta: 'unidad', precioUnitario: 12.0, subtotal: 12.0 },
    ] 
  },
  { 
    id: 19, 
    fecha: new Date(Date.now() - 96 * 3600000).toISOString(), 
    total: 45.0, 
    estado: true, 
    metodoPago: 'Yape/Plin', 
    empleado: empleadoDemo2, 
    cliente: clientes[4], 
    detalles: [
      { id: 25, producto: productoSimple(14), cantidad: 1, tipoVenta: 'blister', precioUnitario: 45.0, subtotal: 45.0 },
    ] 
  },
  { 
    id: 20, 
    fecha: new Date(Date.now() - 100 * 3600000).toISOString(), 
    total: 8.0, 
    estado: true, 
    metodoPago: 'Efectivo', 
    empleado: empleadoDemo2, 
    cliente: null, 
    detalles: [
      { id: 26, producto: productoSimple(29), cantidad: 1, tipoVenta: 'unidad', precioUnitario: 8.0, subtotal: 8.0 },
    ] 
  },
  { 
    id: 21, 
    fecha: new Date(Date.now() - 108 * 3600000).toISOString(), 
    total: 16.0, 
    estado: true, 
    metodoPago: 'Yape/Plin', 
    empleado: empleadoDemo1, 
    cliente: clientes[5], 
    detalles: [
      { id: 27, producto: productoSimple(18), cantidad: 2, tipoVenta: 'blister', precioUnitario: 8.0, subtotal: 16.0 },
    ] 
  },
  { 
    id: 22, 
    fecha: new Date(Date.now() - 115 * 3600000).toISOString(), 
    total: 13.0, 
    estado: true, 
    metodoPago: 'Efectivo', 
    empleado: empleadoDemo2, 
    cliente: null, 
    detalles: [
      { id: 28, producto: productoSimple(16), cantidad: 1, tipoVenta: 'unidad', precioUnitario: 9.5, subtotal: 9.5 },
      { id: 29, producto: productoSimple(21), cantidad: 1, tipoVenta: 'unidad', precioUnitario: 3.0, subtotal: 3.0 },
      { id: 30, producto: productoSimple(27), cantidad: 1, tipoVenta: 'unidad', precioUnitario: 1.0, subtotal: 1.0 },
    ] 
  },
];

export const ventasApi = {
  listar: async () => { await delay(); return [...ventas]; },
  obtener: async (id: number) => {
    await delay();
    const venta = ventas.find((v) => v.id === id);
    if (!venta) throw new Error('Venta no encontrada');
    return venta;
  },
  crear: async (data: VentaRequest) => {
    await delay();
    const empleado = data.idEmpleado === 1 ? empleadoDemo1 : empleadoDemo2;
    const cliente = data.idCliente ? clientes.find((c) => c.id === data.idCliente) ?? null : null;
    const detalles: DetalleVenta[] = data.items.map((item, i) => ({
      id: i + 1, producto: productoSimple(item.idProducto), cantidad: item.cantidad, tipoVenta: item.tipoVenta,
      precioUnitario: item.precioUnitario, subtotal: item.cantidad * item.precioUnitario,
    }));
    const nueva: Venta = { id: nextId(ventas), fecha: new Date().toISOString(), total: detalles.reduce((sum, d) => sum + d.subtotal, 0), estado: true, metodoPago: data.metodoPago, empleado, cliente, detalles };
    ventas.push(nueva);
    return nueva;
  },
  anular: async (id: number) => {
    await delay();
    const venta = ventas.find((v) => v.id === id);
    if (!venta) throw new Error('Venta no encontrada');
    venta.estado = false;
  },
};

export const clientesApi = {
  listar: async () => { await delay(); return [...clientes]; },
  crear: async (data: { nombre: string; dni?: string; telefono?: string }) => { await delay(); const n: Cliente = { id: nextId(clientes), saldo: 0, ...data }; clientes.push(n); return n; },
  actualizar: async (id: number, data: { nombre: string; dni?: string; telefono?: string }) => {
    await delay();
    const cliente = clientes.find((c) => c.id === id);
    if (!cliente) throw new Error('Cliente no encontrado');
    Object.assign(cliente, data);
    return cliente;
  },
  registrarPago: async (id: number, monto: number) => {
    await delay();
    const cliente = clientes.find((c) => c.id === id);
    if (!cliente) throw new Error('Cliente no encontrado');
    cliente.saldo = Math.max(0, (cliente.saldo ?? 0) - monto);
    return cliente;
  },
};

export const empleadosApi = {
  listarActivos: async () => empleadosCrudApi.listarActivos(),
  login: async (username: string, password: string) => {
    await delay();
    const empleado = _validarCredenciales(username, password);
    if (!empleado) throw new Error('Usuario o contraseña incorrectos.');
    return empleado;
  },
};