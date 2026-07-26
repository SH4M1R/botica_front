import { delay, nextId } from './_mockUtils';

export interface Laboratorio { id: number; nombre: string; }
export interface Categoria { id: number; nombre: string; }
export interface PrincipioActivo { id: number; nombre: string; }
export interface AccionTerapeutica { id: number; nombre: string; }

export interface Producto {
  id: number;
  nombre: string;
  codigo_digemid?: string;
  precio_costo: number;
  precio_venta: number;
  stock: number;
  stock_minimo?: number;
  barras?: string;
  estado: boolean;
  requiere_receta: boolean;
  fecha_vencimiento?: string;
  lote?: string;
  laboratorio: Laboratorio;
  categoria: Categoria;
  principioActivo?: PrincipioActivo | null;
  accionTerapeutica?: AccionTerapeutica | null;
  vende_por_presentaciones: boolean;
  blister_habilitado: boolean;
  unidades_blister: number | null;
  precio_blister: number | null;
  caja_habilitado: boolean;
  unidades_caja: number | null;
  precio_caja: number | null;
  factor?: number | null;
  registro_sanitario?: number | null;
}

export type ProductoPayload = Omit<Producto, 'id' | 'laboratorio' | 'categoria' | 'principioActivo' | 'accionTerapeutica'> & {
  laboratorio: { id: number };
  categoria: { id: number };
  principioActivo?: { id: number } | null;
  accionTerapeutica?: { id: number } | null;
};

export let laboratorios: Laboratorio[] = [
  { id: 1, nombre: 'Laboratorios Bagó' },
  { id: 2, nombre: 'Genfar' },
  { id: 3, nombre: 'Farmindustria' },
  { id: 4, nombre: 'Medifarma' },
  { id: 5, nombre: 'Bayer' },
  { id: 6, nombre: 'Hersil' },
  { id: 7, nombre: 'Sanofi' },
  { id: 8, nombre: 'Pfizer' },
  { id: 9, nombre: 'Laboratorios Portugal' },
  { id: 10, nombre: 'Induquímica' },
];

export let categorias: Categoria[] = [
  { id: 1, nombre: 'Analgésicos' },
  { id: 2, nombre: 'Antibióticos' },
  { id: 3, nombre: 'Vitaminas' },
  { id: 4, nombre: 'Antigripales' },
  { id: 5, nombre: 'Gastrointestinales' },
  { id: 6, nombre: 'Antihistamínicos' },
  { id: 7, nombre: 'Cuidado Dermatológico' },
  { id: 8, nombre: 'Cardiovascular' },
  { id: 9, nombre: 'Pediátricos' },
];

export let principiosActivos: PrincipioActivo[] = [
  { id: 1, nombre: 'Paracetamol' },
  { id: 2, nombre: 'Amoxicilina' },
  { id: 3, nombre: 'Ibuprofeno' },
  { id: 4, nombre: 'Loratadina' },
  { id: 5, nombre: 'Omeprazol' },
  { id: 6, nombre: 'Azitromicina' },
  { id: 7, nombre: 'Naproxeno' },
  { id: 8, nombre: 'Cetirizina' },
  { id: 9, nombre: 'Ciprofloxacino' },
  { id: 10, nombre: 'Losartán' },
  { id: 11, nombre: 'Clorfenamina' },
  { id: 12, nombre: 'Diosmectita' },
  { id: 13, nombre: 'Salbutamol' },
];

export let accionesTerapeuticas: AccionTerapeutica[] = [
  { id: 1, nombre: 'Analgésico' },
  { id: 2, nombre: 'Antiinflamatorio' },
  { id: 3, nombre: 'Antibiótico' },
  { id: 4, nombre: 'Antihistamínico' },
  { id: 5, nombre: 'Antiácido' },
  { id: 6, nombre: 'Antipirético' },
  { id: 7, nombre: 'Antihipertensivo' },
  { id: 8, nombre: 'Broncodilatador' },
  { id: 9, nombre: 'Antidiarreico' },
];

export let productos: Producto[] = [
  { id: 1, nombre: 'Paracetamol 500mg', codigo_digemid: 'DIG-001', precio_costo: 1.2, precio_venta: 2.5, stock: 320, stock_minimo: 50, barras: '7751271000019', estado: true, requiere_receta: false, fecha_vencimiento: '2027-05-01', lote: 'L2301', laboratorio: laboratorios[0], categoria: categorias[0], principioActivo: principiosActivos[0], accionTerapeutica: accionesTerapeuticas[0], vende_por_presentaciones: true, blister_habilitado: true, unidades_blister: 10, precio_blister: 22, caja_habilitado: true, unidades_caja: 100, precio_caja: 200, factor: 1, registro_sanitario: 12345 },
  { id: 2, nombre: 'Amoxicilina 500mg', codigo_digemid: 'DIG-002', precio_costo: 4.5, precio_venta: 6.0, stock: 18, stock_minimo: 20, barras: '7751271000026', estado: true, requiere_receta: true, fecha_vencimiento: '2026-11-01', lote: 'L2288', laboratorio: laboratorios[1], categoria: categorias[1], principioActivo: principiosActivos[1], accionTerapeutica: accionesTerapeuticas[2], vende_por_presentaciones: true, blister_habilitado: true, unidades_blister: 12, precio_blister: 65, caja_habilitado: false, unidades_caja: null, precio_caja: null, factor: 1, registro_sanitario: 12346 },
  { id: 3, nombre: 'Ibuprofeno 400mg', codigo_digemid: 'DIG-003', precio_costo: 1.5, precio_venta: 2.8, stock: 150, stock_minimo: 30, barras: '7751271000033', estado: true, requiere_receta: false, fecha_vencimiento: '2027-02-15', lote: 'L2299', laboratorio: laboratorios[2], categoria: categorias[0], principioActivo: principiosActivos[2], accionTerapeutica: accionesTerapeuticas[1], vende_por_presentaciones: false, blister_habilitado: false, unidades_blister: null, precio_blister: null, caja_habilitado: false, unidades_caja: null, precio_caja: null, factor: 1, registro_sanitario: 12347 },
  { id: 4, nombre: 'Complejo B x30', codigo_digemid: 'DIG-004', precio_costo: 8.0, precio_venta: 14.0, stock: 60, stock_minimo: 10, barras: '7751271000040', estado: true, requiere_receta: false, fecha_vencimiento: '2027-09-01', lote: 'L2310', laboratorio: laboratorios[0], categoria: categorias[2], principioActivo: null, accionTerapeutica: null, vende_por_presentaciones: false, blister_habilitado: false, unidades_blister: null, precio_blister: null, caja_habilitado: false, unidades_caja: null, precio_caja: null, factor: 1, registro_sanitario: 12348 },
  { id: 5, nombre: 'Antigripal Compuesto', codigo_digemid: 'DIG-005', precio_costo: 3.0, precio_venta: 5.5, stock: 5, stock_minimo: 15, barras: '7751271000057', estado: true, requiere_receta: false, fecha_vencimiento: '2026-12-01', lote: 'L2275', laboratorio: laboratorios[1], categoria: categorias[3], principioActivo: null, accionTerapeutica: null, vende_por_presentaciones: false, blister_habilitado: false, unidades_blister: null, precio_blister: null, caja_habilitado: false, unidades_caja: null, precio_caja: null, factor: 1, registro_sanitario: 12349 },
  { id: 6, nombre: 'Vitamina C 1g Efervescente', codigo_digemid: 'DIG-006', precio_costo: 6.5, precio_venta: 11.0, stock: 90, stock_minimo: 20, barras: '7751271000064', estado: true, requiere_receta: false, fecha_vencimiento: '2027-07-01', lote: 'L2320', laboratorio: laboratorios[2], categoria: categorias[2], principioActivo: null, accionTerapeutica: null, vende_por_presentaciones: false, blister_habilitado: false, unidades_blister: null, precio_blister: null, caja_habilitado: false, unidades_caja: null, precio_caja: null, factor: 1, registro_sanitario: 12350 },
  { id: 7, nombre: 'Loratadina 10mg', codigo_digemid: 'DIG-007', precio_costo: 1.0, precio_venta: 2.0, stock: 200, stock_minimo: 40, barras: '7751271000071', estado: true, requiere_receta: false, fecha_vencimiento: '2027-08-10', lote: 'L2331', laboratorio: laboratorios[3], categoria: categorias[5], principioActivo: principiosActivos[3], accionTerapeutica: accionesTerapeuticas[3], vende_por_presentaciones: true, blister_habilitado: true, unidades_blister: 10, precio_blister: 18, caja_habilitado: true, unidades_caja: 100, precio_caja: 160, factor: 1, registro_sanitario: 12351 },
  { id: 8, nombre: 'Omeprazol 20mg', codigo_digemid: 'DIG-008', precio_costo: 2.2, precio_venta: 4.5, stock: 110, stock_minimo: 25, barras: '7751271000088', estado: true, requiere_receta: false, fecha_vencimiento: '2027-11-20', lote: 'L2342', laboratorio: laboratorios[4], categoria: categorias[4], principioActivo: principiosActivos[4], accionTerapeutica: accionesTerapeuticas[4], vende_por_presentaciones: true, blister_habilitado: true, unidades_blister: 10, precio_blister: 40, caja_habilitado: true, unidades_caja: 50, precio_caja: 180, factor: 1, registro_sanitario: 12352 },
  { id: 9, nombre: 'Azitromicina 500mg', codigo_digemid: 'DIG-009', precio_costo: 7.0, precio_venta: 12.0, stock: 45, stock_minimo: 15, barras: '7751271000095', estado: true, requiere_receta: true, fecha_vencimiento: '2026-10-05', lote: 'L2353', laboratorio: laboratorios[5], categoria: categorias[1], principioActivo: principiosActivos[5], accionTerapeutica: accionesTerapeuticas[2], vende_por_presentaciones: true, blister_habilitado: true, unidades_blister: 3, precio_blister: 32, caja_habilitado: false, unidades_caja: null, precio_caja: null, factor: 1, registro_sanitario: 12353 },
  { id: 10, nombre: 'Panadol Forte', codigo_digemid: 'DIG-010', precio_costo: 2.0, precio_venta: 3.5, stock: 140, stock_minimo: 30, barras: '7751271000101', estado: true, requiere_receta: false, fecha_vencimiento: '2027-04-12', lote: 'L2364', laboratorio: laboratorios[4], categoria: categorias[0], principioActivo: principiosActivos[0], accionTerapeutica: accionesTerapeuticas[5], vende_por_presentaciones: true, blister_habilitado: true, unidades_blister: 10, precio_blister: 30, caja_habilitado: true, unidades_caja: 100, precio_caja: 280, factor: 1, registro_sanitario: 12354 },
  { id: 11, nombre: 'Naproxeno 500mg', codigo_digemid: 'DIG-011', precio_costo: 1.8, precio_venta: 3.2, stock: 95, stock_minimo: 20, barras: '7751271000118', estado: true, requiere_receta: false, fecha_vencimiento: '2027-06-15', lote: 'L2375', laboratorio: laboratorios[2], categoria: categorias[0], principioActivo: principiosActivos[6], accionTerapeutica: accionesTerapeuticas[1], vende_por_presentaciones: true, blister_habilitado: true, unidades_blister: 10, precio_blister: 28, caja_habilitado: true, unidades_caja: 100, precio_caja: 250, factor: 1, registro_sanitario: 12355 },
  { id: 12, nombre: 'Cetirizina 10mg', codigo_digemid: 'DIG-012', precio_costo: 1.1, precio_venta: 2.2, stock: 180, stock_minimo: 35, barras: '7751271000125', estado: true, requiere_receta: false, fecha_vencimiento: '2028-01-10', lote: 'L2386', laboratorio: laboratorios[1], categoria: categorias[5], principioActivo: principiosActivos[7], accionTerapeutica: accionesTerapeuticas[3], vende_por_presentaciones: true, blister_habilitado: true, unidades_blister: 10, precio_blister: 20, caja_habilitado: true, unidades_caja: 100, precio_caja: 180, factor: 1, registro_sanitario: 12356 },
  { id: 13, nombre: 'Ciprofloxacino 500mg', codigo_digemid: 'DIG-013', precio_costo: 3.8, precio_venta: 6.5, stock: 40, stock_minimo: 15, barras: '7751271000132', estado: true, requiere_receta: true, fecha_vencimiento: '2026-09-30', lote: 'L2397', laboratorio: laboratorios[3], categoria: categorias[1], principioActivo: principiosActivos[8], accionTerapeutica: accionesTerapeuticas[2], vende_por_presentaciones: true, blister_habilitado: true, unidades_blister: 10, precio_blister: 60, caja_habilitado: true, unidades_caja: 100, precio_caja: 550, factor: 1, registro_sanitario: 12357 },
  { id: 14, nombre: 'Losartán Potásico 50mg', codigo_digemid: 'DIG-014', precio_costo: 2.5, precio_venta: 5.0, stock: 130, stock_minimo: 30, barras: '7751271000149', estado: true, requiere_receta: true, fecha_vencimiento: '2027-12-01', lote: 'L2408', laboratorio: laboratorios[6], categoria: categorias[7], principioActivo: principiosActivos[9], accionTerapeutica: accionesTerapeuticas[6], vende_por_presentaciones: true, blister_habilitado: true, unidades_blister: 10, precio_blister: 45, caja_habilitado: true, unidades_caja: 30, precio_caja: 130, factor: 1, registro_sanitario: 12358 },
  { id: 15, nombre: 'Salbutamol 100mcg Inhalador', codigo_digemid: 'DIG-015', precio_costo: 12.0, precio_venta: 22.0, stock: 25, stock_minimo: 10, barras: '7751271000156', estado: true, requiere_receta: true, fecha_vencimiento: '2027-03-20', lote: 'L2419', laboratorio: laboratorios[7], categoria: categorias[3], principioActivo: principiosActivos[12], accionTerapeutica: accionesTerapeuticas[7], vende_por_presentaciones: false, blister_habilitado: false, unidades_blister: null, precio_blister: null, caja_habilitado: false, unidades_caja: null, precio_caja: null, factor: 1, registro_sanitario: 12359 },
  { id: 16, nombre: 'Alcohol En Gel 500ml', codigo_digemid: 'DIG-016', precio_costo: 5.0, precio_venta: 9.5, stock: 80, stock_minimo: 15, barras: '7751271000163', estado: true, requiere_receta: false, fecha_vencimiento: '2028-05-10', lote: 'L2420', laboratorio: laboratorios[8], categoria: categorias[6], principioActivo: null, accionTerapeutica: null, vende_por_presentaciones: false, blister_habilitado: false, unidades_blister: null, precio_blister: null, caja_habilitado: false, unidades_caja: null, precio_caja: null, factor: 1, registro_sanitario: 12360 },
  { id: 17, nombre: 'Bismutol Jarabe 150ml', codigo_digemid: 'DIG-017', precio_costo: 10.5, precio_venta: 18.0, stock: 35, stock_minimo: 10, barras: '7751271000170', estado: true, requiere_receta: false, fecha_vencimiento: '2027-08-01', lote: 'L2431', laboratorio: laboratorios[5], categoria: categorias[4], principioActivo: null, accionTerapeutica: accionesTerapeuticas[4], vende_por_presentaciones: false, blister_habilitado: false, unidades_blister: null, precio_blister: null, caja_habilitado: false, unidades_caja: null, precio_caja: null, factor: 1, registro_sanitario: 12361 },
  { id: 18, nombre: 'Clorfenamina 4mg', codigo_digemid: 'DIG-018', precio_costo: 0.5, precio_venta: 1.0, stock: 250, stock_minimo: 50, barras: '7751271000187', estado: true, requiere_receta: false, fecha_vencimiento: '2027-10-15', lote: 'L2442', laboratorio: laboratorios[9], categoria: categorias[5], principioActivo: principiosActivos[10], accionTerapeutica: accionesTerapeuticas[3], vende_por_presentaciones: true, blister_habilitado: true, unidades_blister: 10, precio_blister: 8, caja_habilitado: true, unidades_caja: 100, precio_caja: 70, factor: 1, registro_sanitario: 12362 },
  { id: 19, nombre: 'Panadol Niños Jarabe 60ml', codigo_digemid: 'DIG-019', precio_costo: 8.5, precio_venta: 15.0, stock: 45, stock_minimo: 12, barras: '7751271000194', estado: true, requiere_receta: false, fecha_vencimiento: '2027-04-18', lote: 'L2453', laboratorio: laboratorios[4], categoria: categorias[8], principioActivo: principiosActivos[0], accionTerapeutica: accionesTerapeuticas[5], vende_por_presentaciones: false, blister_habilitado: false, unidades_blister: null, precio_blister: null, caja_habilitado: false, unidades_caja: null, precio_caja: null, factor: 1, registro_sanitario: 12363 },
  { id: 20, nombre: 'Electrolit Suero Oral 625ml', codigo_digemid: 'DIG-020', precio_costo: 4.8, precio_venta: 8.5, stock: 120, stock_minimo: 25, barras: '7751271000200', estado: true, requiere_receta: false, fecha_vencimiento: '2027-01-20', lote: 'L2464', laboratorio: laboratorios[0], categoria: categorias[4], principioActivo: null, accionTerapeutica: null, vende_por_presentaciones: false, blister_habilitado: false, unidades_blister: null, precio_blister: null, caja_habilitado: false, unidades_caja: null, precio_caja: null, factor: 1, registro_sanitario: 12364 },
  { id: 21, nombre: 'Agua Oxigenada 120ml', codigo_digemid: 'DIG-021', precio_costo: 1.5, precio_venta: 3.0, stock: 85, stock_minimo: 15, barras: '7751271000217', estado: true, requiere_receta: false, fecha_vencimiento: '2028-03-30', lote: 'L2475', laboratorio: laboratorios[8], categoria: categorias[6], principioActivo: null, accionTerapeutica: null, vende_por_presentaciones: false, blister_habilitado: false, unidades_blister: null, precio_blister: null, caja_habilitado: false, unidades_caja: null, precio_caja: null, factor: 1, registro_sanitario: 12365 },
  { id: 22, nombre: 'Dentrífico Sensodyne 90g', codigo_digemid: 'DIG-022', precio_costo: 11.0, precio_venta: 18.5, stock: 30, stock_minimo: 10, barras: '7751271000224', estado: true, requiere_receta: false, fecha_vencimiento: '2028-02-15', lote: 'L2486', laboratorio: laboratorios[4], categoria: categorias[6], principioActivo: null, accionTerapeutica: null, vende_por_presentaciones: false, blister_habilitado: false, unidades_blister: null, precio_blister: null, caja_habilitado: false, unidades_caja: null, precio_caja: null, factor: 1, registro_sanitario: 12366 },
  { id: 23, nombre: 'Apronax 550mg', codigo_digemid: 'DIG-023', precio_costo: 2.8, precio_venta: 4.8, stock: 160, stock_minimo: 35, barras: '7751271000231', estado: true, requiere_receta: false, fecha_vencimiento: '2027-09-12', lote: 'L2497', laboratorio: laboratorios[4], categoria: categorias[0], principioActivo: principiosActivos[6], accionTerapeutica: accionesTerapeuticas[1], vende_por_presentaciones: true, blister_habilitado: true, unidades_blister: 10, precio_blister: 45, caja_habilitado: true, unidades_caja: 80, precio_caja: 340, factor: 1, registro_sanitario: 12367 },
  { id: 24, nombre: 'Smecta 3g Sobres x10', codigo_digemid: 'DIG-024', precio_costo: 15.0, precio_venta: 25.0, stock: 40, stock_minimo: 10, barras: '7751271000248', estado: true, requiere_receta: false, fecha_vencimiento: '2027-06-01', lote: 'L2508', laboratorio: laboratorios[6], categoria: categorias[4], principioActivo: principiosActivos[11], accionTerapeutica: accionesTerapeuticas[8], vende_por_presentaciones: false, blister_habilitado: false, unidades_blister: null, precio_blister: null, caja_habilitado: false, unidades_caja: null, precio_caja: null, factor: 1, registro_sanitario: 12368 },
  { id: 25, nombre: 'Aspirina 100mg', codigo_digemid: 'DIG-025', precio_costo: 0.8, precio_venta: 1.5, stock: 220, stock_minimo: 40, barras: '7751271000255', estado: true, requiere_receta: false, fecha_vencimiento: '2027-11-10', lote: 'L2519', laboratorio: laboratorios[4], categoria: categorias[0], principioActivo: null, accionTerapeutica: accionesTerapeuticas[0], vende_por_presentaciones: true, blister_habilitado: true, unidades_blister: 10, precio_blister: 12, caja_habilitado: true, unidades_caja: 100, precio_caja: 110, factor: 1, registro_sanitario: 12369 },
  { id: 26, nombre: 'Multivitamínico Pharmaton x30', codigo_digemid: 'DIG-026', precio_costo: 35.0, precio_venta: 58.0, stock: 20, stock_minimo: 5, barras: '7751271000262', estado: true, requiere_receta: false, fecha_vencimiento: '2027-12-31', lote: 'L2520', laboratorio: laboratorios[6], categoria: categorias[2], principioActivo: null, accionTerapeutica: null, vende_por_presentaciones: false, blister_habilitado: false, unidades_blister: null, precio_blister: null, caja_habilitado: false, unidades_caja: null, precio_caja: null, factor: 1, registro_sanitario: 12370 },
  { id: 27, nombre: 'Gasa Estéril 10cm x 10cm', codigo_digemid: 'DIG-027', precio_costo: 0.4, precio_venta: 1.0, stock: 500, stock_minimo: 100, barras: '7751271000279', estado: true, requiere_receta: false, fecha_vencimiento: '2029-01-01', lote: 'L2531', laboratorio: laboratorios[8], categoria: categorias[6], principioActivo: null, accionTerapeutica: null, vende_por_presentaciones: false, blister_habilitado: false, unidades_blister: null, precio_blister: null, caja_habilitado: false, unidades_caja: null, precio_caja: null, factor: 1, registro_sanitario: 12371 },
  { id: 28, nombre: 'Curitas Adhesivas C x100', codigo_digemid: 'DIG-028', precio_costo: 6.0, precio_venta: 12.0, stock: 50, stock_minimo: 10, barras: '7751271000286', estado: true, requiere_receta: false, fecha_vencimiento: '2029-05-15', lote: 'L2542', laboratorio: laboratorios[8], categoria: categorias[6], principioActivo: null, accionTerapeutica: null, vende_por_presentaciones: false, blister_habilitado: false, unidades_blister: null, precio_blister: null, caja_habilitado: false, unidades_caja: null, precio_caja: null, factor: 1, registro_sanitario: 12372 },
  { id: 29, nombre: 'Mentholatum Ungüento 30g', codigo_digemid: 'DIG-029', precio_costo: 4.5, precio_venta: 8.0, stock: 75, stock_minimo: 15, barras: '7751271000293', estado: true, requiere_receta: false, fecha_vencimiento: '2028-08-20', lote: 'L2553', laboratorio: laboratorios[5], categoria: categorias[3], principioActivo: null, accionTerapeutica: null, vende_por_presentaciones: false, blister_habilitado: false, unidades_blister: null, precio_blister: null, caja_habilitado: false, unidades_caja: null, precio_caja: null, factor: 1, registro_sanitario: 12373 },
  { id: 30, nombre: 'Dexametasona 4mg Inyectable', codigo_digemid: 'DIG-030', precio_costo: 2.0, precio_venta: 4.2, stock: 65, stock_minimo: 20, barras: '7751271000309', estado: true, requiere_receta: true, fecha_vencimiento: '2026-12-15', lote: 'L2564', laboratorio: laboratorios[3], categoria: categorias[0], principioActivo: null, accionTerapeutica: accionesTerapeuticas[1], vende_por_presentaciones: false, blister_habilitado: false, unidades_blister: null, precio_blister: null, caja_habilitado: false, unidades_caja: null, precio_caja: null, factor: 1, registro_sanitario: 12374 },
];

export const productosApi = {
  listar: async () => { await delay(); return [...productos]; },
  listarActivos: async () => { await delay(); return productos.filter((p) => p.estado); },
  crear: async (data: ProductoPayload) => {
    await delay();
    const laboratorio = laboratorios.find((l) => l.id === data.laboratorio.id) ?? laboratorios[0];
    const categoria = categorias.find((c) => c.id === data.categoria.id) ?? categorias[0];
    const principioActivo = data.principioActivo ? principiosActivos.find((p) => p.id === data.principioActivo!.id) ?? null : null;
    const accionTerapeutica = data.accionTerapeutica ? accionesTerapeuticas.find((a) => a.id === data.accionTerapeutica!.id) ?? null : null;
    const nuevo: Producto = { ...data, id: nextId(productos), laboratorio, categoria, principioActivo, accionTerapeutica };
    productos.push(nuevo);
    return nuevo;
  },
  actualizar: async (id: number, data: ProductoPayload) => {
    await delay();
    const index = productos.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Producto no encontrado');
    const laboratorio = laboratorios.find((l) => l.id === data.laboratorio.id) ?? productos[index].laboratorio;
    const categoria = categorias.find((c) => c.id === data.categoria.id) ?? productos[index].categoria;
    const principioActivo = data.principioActivo ? principiosActivos.find((p) => p.id === data.principioActivo!.id) ?? null : null;
    const accionTerapeutica = data.accionTerapeutica ? accionesTerapeuticas.find((a) => a.id === data.accionTerapeutica!.id) ?? null : null;
    productos[index] = { ...data, id, laboratorio, categoria, principioActivo, accionTerapeutica };
    return productos[index];
  },
  eliminar: async (id: number) => { await delay(); productos = productos.filter((p) => p.id !== id); },
};

export const laboratoriosApi = {
  listar: async () => { await delay(); return [...laboratorios]; },
  crear: async (data: { nombre: string }) => { await delay(); const n = { id: nextId(laboratorios), nombre: data.nombre }; laboratorios.push(n); return n; },
  actualizar: async (id: number, data: { nombre: string }) => { await delay(); const l = laboratorios.find((x) => x.id === id); if (!l) throw new Error('No encontrado'); l.nombre = data.nombre; return l; },
  eliminar: async (id: number) => { await delay(); laboratorios = laboratorios.filter((x) => x.id !== id); },
};

export const categoriasApi = {
  listar: async () => { await delay(); return [...categorias]; },
  crear: async (data: { nombre: string }) => { await delay(); const n = { id: nextId(categorias), nombre: data.nombre }; categorias.push(n); return n; },
  actualizar: async (id: number, data: { nombre: string }) => { await delay(); const c = categorias.find((x) => x.id === id); if (!c) throw new Error('No encontrado'); c.nombre = data.nombre; return c; },
  eliminar: async (id: number) => { await delay(); categorias = categorias.filter((x) => x.id !== id); },
};

export const principiosActivosApi = {
  listar: async () => { await delay(); return [...principiosActivos]; },
  crear: async (data: { nombre: string }) => { await delay(); const n = { id: nextId(principiosActivos), nombre: data.nombre }; principiosActivos.push(n); return n; },
  actualizar: async (id: number, data: { nombre: string }) => { await delay(); const p = principiosActivos.find((x) => x.id === id); if (!p) throw new Error('No encontrado'); p.nombre = data.nombre; return p; },
  eliminar: async (id: number) => { await delay(); principiosActivos = principiosActivos.filter((x) => x.id !== id); },
};

export const accionesTerapeuticasApi = {
  listar: async () => { await delay(); return [...accionesTerapeuticas]; },
  crear: async (data: { nombre: string }) => { await delay(); const n = { id: nextId(accionesTerapeuticas), nombre: data.nombre }; accionesTerapeuticas.push(n); return n; },
  actualizar: async (id: number, data: { nombre: string }) => { await delay(); const a = accionesTerapeuticas.find((x) => x.id === id); if (!a) throw new Error('No encontrado'); a.nombre = data.nombre; return a; },
  eliminar: async (id: number) => { await delay(); accionesTerapeuticas = accionesTerapeuticas.filter((x) => x.id !== id); },
};