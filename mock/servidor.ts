/* eslint-disable @typescript-eslint/no-explicit-any */
// Servidor falso que corre dentro del navegador (modo demo, sin backend).
// Responde a las mismas rutas /api que usa el front y guarda los cambios en localStorage.
import { DB, DB_VERSION, generarDB } from './seed';
import { R, ymd, isoLocal, redondear, aFecha } from './util';

const CLAVE = 'botica-demo-db';

/* ---------------- estado ---------------- */
let db: DB | null = null;
const recetas = new Map<number, string>(); // dataURL de recetas subidas (solo memoria)

export function cargarDB(): DB {
  if (db) return db;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(CLAVE) : null;
    if (raw) {
      const d = JSON.parse(raw) as DB;
      // Se regenera si cambió la versión o pasó el día (para que "hoy" siempre tenga datos recientes)
      if (d.version === DB_VERSION && d.creadoEn === ymd(new Date())) {
        db = d;
        return db;
      }
    }
  } catch { /* se regenera */ }
  db = generarDB();
  guardar();
  return db;
}

let tGuardar: ReturnType<typeof setTimeout> | null = null;
export function guardar() {
  if (tGuardar) clearTimeout(tGuardar);
  tGuardar = setTimeout(() => {
    try { localStorage.setItem(CLAVE, JSON.stringify(db)); } catch { /* sin espacio: se ignora */ }
  }, 300);
}

export function reiniciarDemo() {
  try { localStorage.removeItem(CLAVE); } catch { /* */ }
  db = null;
  cargarDB();
}

/* ---------------- utilidades de respuesta ---------------- */
export class HttpError extends Error {
  constructor(public status: number, msg: string) { super(msg); }
}
export function bad(msg: string, status = 400): never { throw new HttpError(status, msg); }

export class Resp {
  constructor(public data: unknown, public headers: Record<string, string> = {}, public tipo = 'application/json') {}
}

export function limpiar(v: any): any {
  if (Array.isArray(v)) return v.map(limpiar);
  if (v && typeof v === 'object') {
    const o: R = {};
    for (const k of Object.keys(v)) if (!k.startsWith('_')) o[k] = limpiar(v[k]);
    return o;
  }
  return v;
}

export function paginar<T>(arr: T[], q: URLSearchParams): Resp {
  const size = Number(q.get('size') || 0);
  const page = Number(q.get('page') || 0);
  const total = arr.length;
  if (!size) return new Resp(arr, { 'X-Total-Count': String(total), 'X-Total-Pages': '1', 'X-Page': '0', 'X-Size': String(total) });
  const totalPages = Math.max(1, Math.ceil(total / size));
  return new Resp(arr.slice(page * size, page * size + size), {
    'X-Total-Count': String(total), 'X-Total-Pages': String(totalPages), 'X-Page': String(page), 'X-Size': String(size),
  });
}

export const norm = (s: any) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const nombreCliente = (c: R) => [c.nombres, c.apellidoPaterno, c.apellidoMaterno].filter(Boolean).join(' ');
export const nid = (k: string) => { const d = cargarDB(); d.seq[k] = (d.seq[k] ?? 0) + 1; return d.seq[k]; };
export const enRango = (fecha: string, desde?: string | null, hasta?: string | null) => {
  const f = String(fecha).slice(0, 10);
  return (!desde || f >= desde) && (!hasta || f <= hasta);
};
export const hoyStr = () => ymd(new Date());

/* ---------------- stock por lotes ---------------- */
export const lotesDe = (idProd: number) => cargarDB().lotes.filter((l) => l.idProducto === idProd);
export const stockDe = (idProd: number) => lotesDe(idProd).reduce((s, l) => s + (l.stock || 0), 0);
export function proximoVenc(idProd: number): string | null {
  const f = lotesDe(idProd).filter((l) => l.stock > 0 && l.fechaVencimiento).map((l) => l.fechaVencimiento as string).sort();
  return f[0] ?? null;
}
export function descontarFefo(idProd: number, unidades: number): { loteId: number; cantidad: number }[] {
  const lotes = lotesDe(idProd).filter((l) => l.stock > 0)
    .sort((a, b) => String(a.fechaVencimiento ?? '9999').localeCompare(String(b.fechaVencimiento ?? '9999')) || a.id - b.id);
  const consumos: { loteId: number; cantidad: number }[] = [];
  let falta = unidades;
  for (const l of lotes) {
    if (falta <= 0) break;
    const t = Math.min(l.stock, falta);
    l.stock -= t; falta -= t;
    consumos.push({ loteId: l.id, cantidad: t });
  }
  return consumos;
}
export function agregarLote(idProd: number, lote: string | null, fv: string | null, stock: number) {
  const l = { id: nid('lote'), idProducto: idProd, lote, fechaVencimiento: fv, stock, fechaIngreso: hoyStr() };
  cargarDB().lotes.push(l);
  return l;
}
export const conStock = (p: R) => ({ ...p, stock: stockDe(p.id), fecha_vencimiento: proximoVenc(p.id) });

/* ---------------- tipos ---------------- */
export interface Ctx { q: URLSearchParams; body: any; form: FormData | null; }
type Handler = (c: Ctx, ...p: string[]) => unknown;
const rutas: { m: string; re: RegExp; h: Handler }[] = [];
export const ruta = (m: string, patron: string, h: Handler) => {
  rutas.push({ m, re: new RegExp('^' + patron.replace(/:n/g, '(\\d+)').replace(/:s/g, '([^/]+)') + '/?$'), h });
};

export const porId = (arr: R[], id: string | number, msg = 'No encontrado.') =>
  arr.find((x) => x.id === Number(id)) ?? bad(msg, 404);

/* ============================================================
   CATÁLOGOS (laboratorios, categorías, principios, acciones, sucursales)
   ============================================================ */
function crud(base: string, clave: 'laboratorios' | 'categorias' | 'principios' | 'acciones' | 'sucursales', seq: string, campoProd?: string) {
  ruta('GET', base, () => cargarDB()[clave]);
  ruta('POST', base, (c) => {
    const nombre = String(c.body?.nombre ?? '').trim();
    if (!nombre) bad('El nombre es obligatorio.');
    const x = { id: nid(seq), nombre };
    cargarDB()[clave].push(x);
    return x;
  });
  ruta('PUT', `${base}/:n`, (c, id) => {
    const x = porId(cargarDB()[clave], id);
    x.nombre = String(c.body?.nombre ?? x.nombre).trim();
    if (campoProd) cargarDB().productos.forEach((p) => { if (p[campoProd]?.id === x.id) p[campoProd] = x; });
    return x;
  });
  ruta('DELETE', `${base}/:n`, (_c, id) => {
    const d = cargarDB();
    if (campoProd && d.productos.some((p) => p[campoProd]?.id === Number(id))) bad('No se puede eliminar: hay productos que lo usan.', 409);
    if (clave === 'sucursales' && d.traslados.some((t) => t.idSucursal === Number(id))) bad('No se puede eliminar: tiene traslados registrados.', 409);
    d[clave] = d[clave].filter((x: R) => x.id !== Number(id)) as any;
    return undefined;
  });
}
crud('/laboratorios', 'laboratorios', 'lab', 'laboratorio');
crud('/categorias', 'categorias', 'cat', 'categoria');
crud('/principios-activos', 'principios', 'pa', 'principioActivo');
crud('/acciones-terapeuticas', 'acciones', 'at', 'accionTerapeutica');
crud('/sucursales', 'sucursales', 'suc');

/* ============================================================
   PRODUCTOS Y LOTES
   ============================================================ */
function resolverProducto(body: R, base: R = {}): R {
  const d = cargarDB();
  const lab = body.laboratorio?.id ? d.laboratorios.find((x) => x.id === body.laboratorio.id) ?? null : null;
  const cat = d.categorias.find((x) => x.id === body.categoria?.id) ?? base.categoria ?? d.categorias[0];
  const pa = body.principioActivo?.id ? d.principios.find((x) => x.id === body.principioActivo.id) ?? null : null;
  const at = body.accionTerapeutica?.id ? d.acciones.find((x) => x.id === body.accionTerapeutica.id) ?? null : null;
  return { ...base, ...body, laboratorio: lab, categoria: cat, principioActivo: pa, accionTerapeutica: at, id: base.id };
}
ruta('GET', '/productos', () => cargarDB().productos.map(conStock));
ruta('GET', '/productos/activos', () => cargarDB().productos.filter((p) => p.estado).map(conStock));
ruta('GET', '/productos/buscar', (c) => {
  const q = norm(c.q.get('q')).trim();
  const size = Number(c.q.get('size') || 15);
  if (!q) return [];
  return cargarDB().productos
    .filter((p) => p.estado && [p.nombre, p.laboratorio?.nombre, p.codigo_digemid, p.barras].some((x) => norm(x).includes(q)))
    .slice(0, size).map(conStock);
});
ruta('POST', '/productos', (c) => {
  const p = resolverProducto(c.body);
  p.id = nid('prod');
  cargarDB().productos.push(p);
  return conStock(p);
});
ruta('PUT', '/productos/:n', (c, id) => {
  const d = cargarDB();
  const i = d.productos.findIndex((x) => x.id === Number(id));
  if (i < 0) bad('Producto no encontrado.', 404);
  d.productos[i] = resolverProducto(c.body, d.productos[i]);
  d.productos[i].id = Number(id);
  return conStock(d.productos[i]);
});
ruta('DELETE', '/productos/:n', (_c, id) => {
  const d = cargarDB();
  if (d.ventas.some((v) => v.detalles.some((x: R) => x.producto.id === Number(id)))) {
    const p = porId(d.productos, id); p.estado = false; // con historial: se desactiva
    return undefined;
  }
  d.productos = d.productos.filter((x) => x.id !== Number(id));
  d.lotes = d.lotes.filter((l) => l.idProducto !== Number(id));
  return undefined;
});

const resumen = (p: R) => ({ idProducto: p.id, stockTotal: stockDe(p.id), proximoVencimiento: proximoVenc(p.id) });
ruta('GET', '/lotes/resumen-stock', () => cargarDB().productos.map(resumen));
ruta('GET', '/lotes/resumen-stock/:n', (_c, id) => resumen(porId(cargarDB().productos, id)));
ruta('GET', '/lotes/producto/:n', (_c, id) =>
  lotesDe(Number(id)).sort((a, b) => String(a.fechaVencimiento ?? '9999').localeCompare(String(b.fechaVencimiento ?? '9999'))));
ruta('POST', '/lotes', (c) => {
  porId(cargarDB().productos, c.body.idProducto, 'Producto no encontrado.');
  return agregarLote(c.body.idProducto, c.body.lote ?? null, c.body.fechaVencimiento ?? null, Number(c.body.stock) || 0);
});
ruta('PUT', '/lotes/:n/stock', (c, id) => {
  const l = porId(cargarDB().lotes, id, 'Lote no encontrado.');
  l.stock = Math.max(0, Number(c.body.stock) || 0);
  return l;
});

/* ============================================================
   CLIENTES
   ============================================================ */
const hidratarCliente = (c: R) => c;
ruta('GET', '/clientes', (c) => {
  const q = norm(c.q.get('q')).trim();
  let arr = [...cargarDB().clientes].sort((a, b) => b.id - a.id);
  if (q) arr = arr.filter((x) => norm(nombreCliente(x)).includes(q) || norm(x.dni).includes(q) || norm(x.telefono).includes(q));
  return paginar(arr.map(hidratarCliente), c.q);
});
ruta('POST', '/clientes', (c) => {
  const b = c.body ?? {};
  if (!String(b.nombres ?? '').trim()) bad('El nombre es obligatorio.');
  const x = {
    id: nid('cli'), nombres: b.nombres, apellidoPaterno: b.apellidoPaterno ?? null, apellidoMaterno: b.apellidoMaterno ?? null,
    dni: b.dni ?? null, telefono: b.telefono ?? null, direccion: b.direccion ?? null, saldo: 0, puntos: 0,
  };
  cargarDB().clientes.push(x);
  return x;
});
ruta('PUT', '/clientes/:n', (c, id) => {
  const x = porId(cargarDB().clientes, id, 'Cliente no encontrado.');
  const b = c.body ?? {};
  Object.assign(x, {
    nombres: b.nombres ?? x.nombres, apellidoPaterno: b.apellidoPaterno ?? null, apellidoMaterno: b.apellidoMaterno ?? null,
    dni: b.dni ?? null, telefono: b.telefono ?? null, direccion: b.direccion ?? null,
  });
  return x;
});
ruta('PUT', '/clientes/:n/pago', (c, id) => {
  const x = porId(cargarDB().clientes, id, 'Cliente no encontrado.');
  const m = Number(c.body?.monto) || 0;
  if (m <= 0) bad('El monto debe ser mayor a 0.');
  x.saldo = redondear(Math.max(0, (x.saldo ?? 0) - m));
  return x;
});
ruta('PUT', '/clientes/:n/saldo', (c, id) => {
  const x = porId(cargarDB().clientes, id, 'Cliente no encontrado.');
  x.saldo = redondear(Math.max(0, Number(c.body?.saldo) || 0));
  return x;
});
const NOM_DEMO = ['Rosa Elvira', 'Carlos Alberto', 'Mónica Beatriz', 'Julio César', 'Nelly Paola', 'Hugo Enrique'];
const AP_DEMO = ['Salinas', 'Cordero', 'Zevallos', 'Bustamante', 'Palomino', 'Arias', 'Tapia', 'Orellana'];
ruta('GET', '/clientes/reniec/:s', (_c, dni) => {
  if (!/^\d{8}$/.test(dni)) bad('DNI inválido.');
  const conocido = cargarDB().clientes.find((c) => c.dni === dni && c.apellidoPaterno);
  if (conocido) return { success: true, dni, nombres: conocido.nombres, apellidoPaterno: conocido.apellidoPaterno, apellidoMaterno: conocido.apellidoMaterno ?? '' };
  const n = Number(dni.slice(-4));
  return { success: true, dni, nombres: NOM_DEMO[n % NOM_DEMO.length], apellidoPaterno: AP_DEMO[n % AP_DEMO.length], apellidoMaterno: AP_DEMO[(n + 3) % AP_DEMO.length], codVerifica: String(n % 10) };
});
ruta('GET', '/clientes/ruc/:s', (_c, ruc) => {
  if (!/^\d{11}$/.test(ruc)) bad('RUC inválido.');
  const conocido = cargarDB().clientes.find((c) => c.dni === ruc);
  if (conocido) return { success: true, ruc, razonSocial: conocido.nombres, direccion: conocido.direccion ?? '', estado: 'ACTIVO', condicion: 'HABIDO', telefonos: conocido.telefono ? [conocido.telefono] : [] };
  const n = Number(ruc.slice(-3));
  return {
    success: true, ruc, razonSocial: `COMERCIAL ${AP_DEMO[n % AP_DEMO.length].toUpperCase()} E HIJOS S.A.C.`, nombreComercial: '',
    direccion: `AV. LOS ANDES ${100 + n}`, departamento: 'JUNIN', provincia: 'HUANCAYO', distrito: 'HUANCAYO',
    estado: 'ACTIVO', condicion: 'HABIDO', telefonos: [`064${String(200000 + n * 37).slice(0, 6)}`],
  };
});

/* ============================================================
   EMPLEADOS, PERMISOS, ASISTENCIA
   ============================================================ */
const pubEmp = (e: R) => { const { _password, ...r } = e; void _password; return r; };
ruta('POST', '/empleados/login', (c) => {
  const u = String(c.body?.username ?? '').trim().toLowerCase();
  const e = cargarDB().empleados.find((x) => x.username.toLowerCase() === u && x._password === c.body?.password);
  if (!e) bad('Usuario o contraseña incorrectos.', 401);
  if (!e.estado) bad('El usuario está inactivo.', 403);
  return pubEmp(e);
});
ruta('GET', '/empleados', () => cargarDB().empleados.map(pubEmp));
ruta('GET', '/empleados/activos', () => cargarDB().empleados.filter((e) => e.estado).map(pubEmp));
ruta('GET', '/empleados/metas', (c) => {
  const mes = c.q.get('mes') || hoyStr().slice(0, 7);
  return cargarDB().empleados.filter((e) => e.estado).map((e) => {
    const vendido = redondear(cargarDB().ventas.filter((v) => v.estado && v.empleado.id === e.id && v.fecha.startsWith(mes)).reduce((s, v) => s + v.total, 0));
    const meta = e.metaVenta ?? null;
    return { idEmpleado: e.id, nombre: e.nombre, metaVenta: meta, vendidoMes: vendido, porcentaje: meta ? redondear((vendido / meta) * 100) : 0, cumple: meta ? vendido >= meta : false };
  });
});
ruta('GET', '/empleados/:n', (_c, id) => pubEmp(porId(cargarDB().empleados, id, 'Empleado no encontrado.')));
ruta('POST', '/empleados', (c) => {
  const b = c.body ?? {};
  if (cargarDB().empleados.some((e) => e.username.toLowerCase() === String(b.username).toLowerCase())) bad('El nombre de usuario ya existe.', 409);
  const e = {
    id: nid('emp'), nombre: b.nombre, username: b.username, _password: b.password || '123456', rol: b.rol, estado: b.estado ?? true,
    horaEntrada: b.horaEntrada ?? null, horaSalida: b.horaSalida ?? null, diaDescanso: b.diaDescanso ?? null, metaVenta: b.metaVenta ?? null,
  };
  cargarDB().empleados.push(e);
  cargarDB().permisos[e.id] = ['/dashboard/ventas', '/dashboard/ventas/generar', '/dashboard/clientes'];
  return pubEmp(e);
});
ruta('PUT', '/empleados/:n', (c, id) => {
  const e = porId(cargarDB().empleados, id, 'Empleado no encontrado.');
  const b = c.body ?? {};
  Object.assign(e, {
    nombre: b.nombre ?? e.nombre, username: b.username ?? e.username, rol: b.rol ?? e.rol, estado: b.estado ?? e.estado,
    horaEntrada: b.horaEntrada ?? null, horaSalida: b.horaSalida ?? null, diaDescanso: b.diaDescanso ?? null, metaVenta: b.metaVenta ?? null,
  });
  if (b.password) e._password = b.password;
  return pubEmp(e);
});
ruta('DELETE', '/empleados/:n', (_c, id) => {
  const d = cargarDB();
  if (d.ventas.some((v) => v.empleado.id === Number(id))) bad('No se puede eliminar: tiene ventas registradas. Desactívalo.', 409);
  d.empleados = d.empleados.filter((e) => e.id !== Number(id));
  return undefined;
});
ruta('PATCH', '/empleados/:n/estado', (c, id) => {
  const e = porId(cargarDB().empleados, id, 'Empleado no encontrado.');
  e.estado = c.q.get('activo') === 'true';
  return pubEmp(e);
});
ruta('GET', '/empleados/:n/permisos', (_c, id) => cargarDB().permisos[Number(id)] ?? []);
ruta('PUT', '/empleados/:n/permisos', (c, id) => {
  cargarDB().permisos[Number(id)] = Array.isArray(c.body?.rutas) ? c.body.rutas : [];
  return cargarDB().permisos[Number(id)];
});

const credenciales = (b: R) => {
  const e = cargarDB().empleados.find((x) => x.username.toLowerCase() === String(b?.username ?? '').toLowerCase() && x._password === b?.password);
  return e ?? bad('Usuario o contraseña incorrectos.', 401);
};
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
ruta('GET', '/asistencias', () => [...cargarDB().asistencias].sort((a, b) => (a.fecha + (a.horaEntrada ?? '')) < (b.fecha + (b.horaEntrada ?? '')) ? 1 : -1));
ruta('GET', '/asistencias/reporte', (c) =>
  cargarDB().asistencias.filter((a) => enRango(a.fecha, c.q.get('fechaInicio'), c.q.get('fechaFin'))).sort((a, b) => (a.fecha < b.fecha ? 1 : -1)));
ruta('POST', '/asistencias/entrada', (c) => {
  const e = credenciales(c.body);
  const hoy = hoyStr();
  if (cargarDB().asistencias.some((a) => a.idEmpleado === e.id && a.fecha === hoy)) bad('Ya registraste tu entrada hoy.', 409);
  const ahora = new Date();
  let min = 0;
  if (e.horaEntrada) {
    const [h, m] = String(e.horaEntrada).split(':').map(Number);
    const tol = cargarDB().empresa.toleranciaMinutos ?? 10;
    const dif = Math.round((ahora.getTime() - new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), h, m).getTime()) / 60000);
    if (dif > tol) min = dif;
  }
  const a = { id: nid('asi'), idEmpleado: e.id, nombreEmpleado: e.nombre, fecha: hoy, horaEntrada: hhmm(ahora), horaSalida: null, tardanza: min > 0, minutosTardanza: min };
  cargarDB().asistencias.push(a);
  return a;
});
ruta('POST', '/asistencias/salida', (c) => {
  const e = credenciales(c.body);
  const a = cargarDB().asistencias.find((x) => x.idEmpleado === e.id && x.fecha === hoyStr());
  if (!a) bad('No registraste tu entrada hoy.', 409);
  if (a!.horaSalida) bad('Ya registraste tu salida hoy.', 409);
  a!.horaSalida = hhmm(new Date());
  return a;
});

/* ============================================================
   CUPONES
   ============================================================ */
const cuponDTO = (c: R) => ({ ...c });
ruta('GET', '/cupones/tipos', () => cargarDB().cuponTipos);
ruta('POST', '/cupones/tipos', (c) => {
  const b = c.body ?? {};
  if (!(b.puntosRequeridos > 0) || !(b.valor > 0)) bad('Puntos y valor deben ser mayores a 0.');
  const t = { id: nid('ctipo'), nombre: b.nombre, puntosRequeridos: b.puntosRequeridos, valor: b.valor, activo: b.activo ?? true };
  cargarDB().cuponTipos.push(t);
  return t;
});
ruta('PUT', '/cupones/tipos/:n', (c, id) => Object.assign(porId(cargarDB().cuponTipos, id), c.body, { id: Number(id) }));
ruta('DELETE', '/cupones/tipos/:n', (_c, id) => { cargarDB().cuponTipos = cargarDB().cuponTipos.filter((t) => t.id !== Number(id)); return undefined; });
ruta('POST', '/cupones/canjear', (c) => {
  const cli = porId(cargarDB().clientes, c.body?.idCliente, 'Cliente no encontrado.');
  const t = porId(cargarDB().cuponTipos, c.body?.idTipo, 'Tipo de cupón no encontrado.');
  if (t.activo === false) bad('Este tipo de cupón no está disponible.');
  if ((cli.puntos ?? 0) < t.puntosRequeridos) bad('Puntos insuficientes.');
  cli.puntos -= t.puntosRequeridos;
  let codigo = '';
  do { codigo = `CP${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}`; } while (cargarDB().cupones.some((x) => x.codigo === codigo));
  const cup = {
    id: nid('cupon'), codigo, idCliente: cli.id, clienteNombre: nombreCliente(cli), nombre: t.nombre, valor: t.valor,
    puntosUsados: t.puntosRequeridos, fechaCreacion: isoLocal(new Date()), fechaUso: null, estado: 'ACTIVO',
  };
  cargarDB().cupones.push(cup);
  return cuponDTO(cup);
});
ruta('GET', '/cupones/cliente/:n', (_c, id) => cargarDB().cupones.filter((x) => x.idCliente === Number(id)).sort((a, b) => b.id - a.id).map(cuponDTO));
ruta('GET', '/cupones/codigo/:s', (_c, cod) => cuponDTO(cargarDB().cupones.find((x) => x.codigo === cod.toUpperCase()) ?? bad('Cupón no encontrado.', 404)));
ruta('PUT', '/cupones/:n/usar', (_c, id) => {
  const x = porId(cargarDB().cupones, id, 'Cupón no encontrado.');
  if (x.estado !== 'ACTIVO') bad('Este cupón ya fue utilizado.', 409);
  x.estado = 'USADO'; x.fechaUso = isoLocal(new Date());
  return cuponDTO(x);
});

/* ============================================================
   ARQUEOS Y MOVIMIENTOS DE CAJA
   ============================================================ */
export const arqueoAbierto = (idEmp: number) => cargarDB().arqueos.find((a) => a.estado && a.empleadoId === idEmp);
export const ventasDeArqueo = (a: R) => {
  const ini = aFecha(a.fechaInicio).getTime();
  const fin = a.fechaFin ? aFecha(a.fechaFin).getTime() : Date.now() + 60_000;
  return cargarDB().ventas.filter((v) => v.estado && v.empleado.id === a.empleadoId && aFecha(v.fecha).getTime() >= ini && aFecha(v.fecha).getTime() <= fin);
};
const efectivoDe = (a: R) => ventasDeArqueo(a).filter((v) => String(v.metodoPago).startsWith('Efectivo')).reduce((s, v) => s + v.total, 0);
const movsDeArqueo = (a: R) => cargarDB().movimientos.filter((m) => m._arqueoId === a.id && !m.anulado);
const sumMov = (arr: R[], tipo: string) => arr.filter((m) => m.tipo === tipo).reduce((s, m) => s + m.monto, 0);
export const esperadoArqueo = (a: R) => redondear(a.montoInicial + efectivoDe(a) + sumMov(movsDeArqueo(a), 'INGRESO') - sumMov(movsDeArqueo(a), 'EGRESO'));

ruta('GET', '/arqueos', (c) =>
  paginar(cargarDB().arqueos.filter((a) => enRango(a.fechaInicio, c.q.get('desde'), c.q.get('hasta'))).sort((a, b) => b.id - a.id), c.q));
ruta('GET', '/arqueos/pendientes', () => cargarDB().arqueos.filter((a) => a.estado).sort((a, b) => b.id - a.id));
ruta('GET', '/arqueos/empleado/:n/actual', (_c, id) => arqueoAbierto(Number(id)));
ruta('POST', '/arqueos/abrir', (c) => {
  const emp = porId(cargarDB().empleados, c.body?.empleadoId, 'Empleado no encontrado.');
  if (arqueoAbierto(emp.id)) bad('El empleado ya tiene una caja abierta.', 409);
  const id = nid('arq');
  const ahora = new Date();
  const a = {
    id, numero: `Arqueo Nro ${id}`, empleadoId: emp.id, empleadoNombre: emp.nombre, fechaInicio: isoLocal(ahora),
    montoInicial: Number(c.body?.montoInicial) || 0, fechaFin: null, montoFinal: null, montoDejado: null, estado: true,
  };
  cargarDB().arqueos.push(a);
  return a;
});
ruta('PUT', '/arqueos/:n/cerrar', (c, id) => {
  const a = porId(cargarDB().arqueos, id, 'Arqueo no encontrado.');
  if (!a.estado) bad('La caja ya está cerrada.', 409);
  a.fechaFin = isoLocal(new Date());
  a.montoFinal = esperadoArqueo(a);
  a.montoDejado = Number(c.body?.montoDejado) || 0;
  a.estado = false;
  return a;
});

const movOut = (m: R) => m;
ruta('GET', '/movimientos', (c) =>
  cargarDB().movimientos.filter((m) => enRango(m.fechaEmision, c.q.get('desde'), c.q.get('hasta'))).sort((a, b) => b.id - a.id).map(movOut));
ruta('GET', '/movimientos/arqueo/:n', (_c, id) => cargarDB().movimientos.filter((m) => m._arqueoId === Number(id)).sort((a, b) => b.id - a.id).map(movOut));
ruta('POST', '/movimientos', (c) => {
  const b = c.body ?? {};
  const emp = porId(cargarDB().empleados, b.empleadoId, 'Empleado no encontrado.');
  const arq = porId(cargarDB().arqueos, b.arqueoCajaId, 'Arqueo no encontrado.');
  if (!arq.estado) bad('La caja está cerrada.', 409);
  if (!(Number(b.monto) > 0)) bad('El monto debe ser mayor a 0.');
  const m = {
    id: nid('mov'), empleadoNombre: emp.nombre, tipo: b.tipo, categoria: b.categoria, numero: b.numero,
    fechaEmision: b.fechaEmision, descripcion: b.descripcion, monto: Number(b.monto), medioPago: b.medioPago,
    fechaRegistro: isoLocal(new Date()), anulado: false, _arqueoId: arq.id, _empleadoId: emp.id,
  };
  cargarDB().movimientos.push(m);
  return movOut(m);
});
ruta('PUT', '/movimientos/:n/anular', (_c, id) => {
  const m = porId(cargarDB().movimientos, id, 'Movimiento no encontrado.');
  m.anulado = true;
  return movOut(m);
});


/* ============================================================
   DESPACHADOR (lo usa instalar.ts para interceptar fetch)
   ============================================================ */
export function manejar(metodo: string, url: URL, body: unknown, form: FormData | null): Response | null {
  let path = url.pathname.replace(/^\/api(?=\/)/, '');
  path = path.replace(/\/+$/, '') || '/';
  const m = metodo.toUpperCase();
  for (const r of rutas) {
    if (r.m !== m) continue;
    const mt = r.re.exec(path);
    if (!mt) continue;
    try {
      const out = r.h({ q: url.searchParams, body, form }, ...mt.slice(1));
      if (out instanceof Resp) {
        const h = new Headers({ 'Content-Type': out.tipo, ...out.headers });
        const cuerpo = out.tipo === 'application/json' ? JSON.stringify(limpiar(out.data)) : (out.data as BodyInit);
        return new Response(cuerpo, { status: 200, headers: h });
      }
      if (m !== 'GET') guardar();
      if (out === undefined) return new Response(null, { status: 200 });
      return new Response(JSON.stringify(limpiar(out)), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      if (e instanceof HttpError) return new Response(e.message, { status: e.status });
      return new Response(String((e as Error)?.message ?? e), { status: 500 });
    }
  }
  return null;
}
