/* eslint-disable @typescript-eslint/no-explicit-any */
// Datos semilla de la demo: 300 ventas, 80 productos, 20 clientes, 6 empleados,
// 30 compras, 10 proveedores, 50 traslados, 30 movimientos de caja y 20 arqueos.
import { crearRng, isoLocal, ymd, sumarDias, inicioDia, redondear, R } from './util';

export interface DB {
  version: number;
  creadoEn: string;
  seq: Record<string, number>;
  empresa: R;
  laboratorios: R[];
  categorias: R[];
  principios: R[];
  acciones: R[];
  productos: R[];
  lotes: R[];
  clientes: R[];
  empleados: R[];
  permisos: Record<string, string[]>;
  proveedores: R[];
  compras: R[];
  sucursales: R[];
  traslados: R[];
  ventas: R[];
  cotizaciones: R[];
  arqueos: R[];
  movimientos: R[];
  asistencias: R[];
  cuponTipos: R[];
  cupones: R[];
  correlativos: Record<string, number>;
}

export const DB_VERSION = 3;

export const RUTAS_TODAS = [
  '/dashboard/asistencia', '/dashboard/reportes',
  '/dashboard/caja', '/dashboard/caja/movimientos', '/dashboard/caja/medios-pago',
  '/dashboard/ventas', '/dashboard/ventas/generar', '/dashboard/clientes',
  '/dashboard/cotizaciones', '/dashboard/cotizaciones/generar',
  '/dashboard/compras', '/dashboard/compras/generar', '/dashboard/proveedores',
  '/dashboard/productos', '/dashboard/productos/atributos', '/dashboard/productos/kardex',
  '/dashboard/ingresos', '/dashboard/egresos', '/dashboard/empleados',
  'accion:editar-precio-venta',
];

const NOMBRES = ['Carlos', 'María', 'José', 'Lucía', 'Pedro', 'Ana', 'Luis', 'Rosa', 'Jorge', 'Carmen', 'Miguel', 'Elena', 'Juan', 'Sofía', 'Diego', 'Patricia', 'Raúl', 'Gabriela', 'Víctor', 'Milagros', 'Fernando', 'Katherine', 'Alberto', 'Yesenia'];
const APELLIDOS = ['Quispe', 'Flores', 'Rojas', 'Mamani', 'Huamán', 'Torres', 'Vargas', 'Castillo', 'Chávez', 'Ramos', 'Salazar', 'Gonzales', 'Paredes', 'Mendoza', 'Cárdenas', 'Rivera', 'Espinoza', 'Delgado', 'Ríos', 'Medina'];

// [nombre, principio, acción, categoría, costo, requiereReceta, presentaciones(tabletas)]
type Base = [string, number, number, number, number, boolean, boolean];
const BASE: Base[] = [
  ['Paracetamol 500 mg tableta', 0, 0, 0, 0.12, false, true],
  ['Paracetamol 120 mg/5 ml jarabe 60 ml', 0, 0, 0, 4.5, false, false],
  ['Paracetamol 1 g tableta', 0, 0, 0, 0.3, false, true],
  ['Ibuprofeno 400 mg tableta', 1, 1, 2, 0.18, false, true],
  ['Ibuprofeno 600 mg tableta', 1, 1, 2, 0.28, false, true],
  ['Ibuprofeno 100 mg/5 ml suspensión 120 ml', 1, 1, 2, 6.8, false, false],
  ['Naproxeno 550 mg tableta', 2, 1, 2, 0.4, false, true],
  ['Diclofenaco 50 mg tableta', 11, 1, 2, 0.15, false, true],
  ['Diclofenaco 75 mg/3 ml ampolla', 11, 1, 2, 1.8, true, false],
  ['Diclofenaco gel 1% 30 g', 11, 1, 7, 7.5, false, false],
  ['Amoxicilina 500 mg cápsula', 3, 2, 1, 0.35, true, true],
  ['Amoxicilina 250 mg/5 ml suspensión 60 ml', 3, 2, 1, 6.2, true, false],
  ['Amoxicilina + Ác. clavulánico 875/125 mg', 3, 2, 1, 2.4, true, true],
  ['Azitromicina 500 mg tableta', 4, 2, 1, 2.9, true, true],
  ['Azitromicina 200 mg/5 ml suspensión 15 ml', 4, 2, 1, 9.5, true, false],
  ['Ciprofloxacino 500 mg tableta', 4, 2, 1, 0.9, true, true],
  ['Loratadina 10 mg tableta', 5, 3, 3, 0.1, false, true],
  ['Loratadina 5 mg/5 ml jarabe 60 ml', 5, 3, 3, 5.0, false, false],
  ['Cetirizina 10 mg tableta', 6, 3, 3, 0.2, false, true],
  ['Clorfenamina 4 mg tableta', 6, 3, 3, 0.06, false, true],
  ['Omeprazol 20 mg cápsula', 7, 4, 4, 0.14, false, true],
  ['Omeprazol 40 mg cápsula', 7, 4, 4, 0.3, false, true],
  ['Ranitidina 150 mg tableta', 7, 4, 4, 0.12, false, true],
  ['Sales de rehidratación oral sobre', 15, 9, 4, 1.2, false, false],
  ['Losartán 50 mg tableta', 8, 5, 6, 0.16, true, true],
  ['Enalapril 10 mg tableta', 8, 5, 6, 0.1, true, true],
  ['Metformina 850 mg tableta', 9, 6, 6, 0.14, true, true],
  ['Glibenclamida 5 mg tableta', 9, 6, 6, 0.08, true, true],
  ['Salbutamol 100 mcg inhalador', 12, 7, 5, 11.5, false, false],
  ['Salbutamol 2 mg/5 ml jarabe 120 ml', 12, 7, 5, 5.8, false, false],
  ['Ambroxol 30 mg/5 ml jarabe 120 ml', 13, 8, 5, 5.5, false, false],
  ['Ambroxol 30 mg tableta', 13, 8, 5, 0.12, false, true],
  ['Bromhexina 8 mg tableta', 13, 8, 5, 0.1, false, true],
  ['Vitamina C 500 mg tableta', 14, 9, 5, 0.1, false, true],
  ['Vitamina C 1 g efervescente tubo', 14, 9, 5, 9.0, false, false],
  ['Complejo B tableta', 15, 9, 5, 0.09, false, true],
  ['Complejo B inyectable ampolla', 15, 9, 5, 2.3, true, false],
  ['Multivitamínico adulto frasco 60 tab', 14, 9, 5, 21.0, false, false],
  ['Hidrocortisona crema 1% 15 g', 11, 1, 7, 6.9, false, false],
  ['Clotrimazol crema 1% 20 g', 4, 2, 7, 5.2, false, false],
  ['Mupirocina ungüento 2% 15 g', 3, 2, 7, 14.0, true, false],
  ['Alcohol medicinal 70° 250 ml', 0, 9, 8, 2.8, false, false],
  ['Agua oxigenada 120 ml', 0, 9, 8, 1.6, false, false],
  ['Povidona yodada solución 120 ml', 0, 9, 8, 5.5, false, false],
  ['Gasa estéril 10x10 cm sobre', 0, 9, 8, 0.7, false, false],
  ['Esparadrapo 1/2" x 5 yardas', 0, 9, 8, 2.0, false, false],
  ['Jeringa descartable 5 ml', 0, 9, 8, 0.45, false, false],
  ['Mascarilla descartable x 50', 0, 9, 8, 7.0, false, false],
  ['Termómetro digital', 0, 9, 8, 9.5, false, false],
  ['Suero fisiológico 0.9% 500 ml', 0, 9, 8, 4.2, false, false],
  ['Gotas nasales de solución salina 30 ml', 0, 9, 5, 4.9, false, false],
  ['Dexametasona 4 mg/ml ampolla', 11, 1, 2, 1.6, true, false],
  ['Butilbromuro de hioscina 10 mg tableta', 7, 4, 4, 0.5, false, true],
  ['Metoclopramida 10 mg tableta', 7, 4, 4, 0.1, false, true],
  ['Loperamida 2 mg cápsula', 7, 4, 4, 0.22, false, true],
  ['Albendazol 400 mg tableta', 3, 2, 1, 1.4, false, true],
  ['Ketoprofeno 100 mg ampolla', 11, 1, 2, 2.2, true, false],
  ['Sildenafilo 50 mg tableta', 8, 5, 6, 1.5, true, true],
];

const LABS = ['Genfar', 'Medifarma', 'Portugal', 'Teva', 'Bayer', 'Pfizer', 'Farmindustria', 'Hersil', 'AC Farma', 'Roemmers', 'Sanofi', 'Merck Perú'];
const CATS = ['Analgésicos', 'Antibióticos', 'Antiinflamatorios', 'Antialérgicos', 'Gastrointestinales', 'Vitaminas y suplementos', 'Cardiovascular y diabetes', 'Dermatológicos', 'Cuidado personal y curaciones'];
const PRINCIPIOS = ['Paracetamol', 'Ibuprofeno', 'Naproxeno', 'Amoxicilina', 'Azitromicina', 'Loratadina', 'Cetirizina', 'Omeprazol', 'Losartán', 'Metformina', 'Dexametasona', 'Diclofenaco', 'Salbutamol', 'Ambroxol', 'Vitamina C', 'Vitamina B'];
const ACCIONES = ['Analgésico / Antipirético', 'Antiinflamatorio', 'Antibiótico', 'Antihistamínico', 'Antiulceroso', 'Antihipertensivo', 'Hipoglicemiante', 'Broncodilatador', 'Mucolítico', 'Suplemento / Uso general'];

function digitos(rng: ReturnType<typeof crearRng>, n: number) {
  let s = '';
  for (let i = 0; i < n; i++) s += rng.int(0, 9);
  return s;
}

export function generarDB(ahora = new Date()): DB {
  const rng = crearRng(20261006);
  const hoy = inicioDia(ahora);
  let seqs: Record<string, number> = {};
  const nid = (k: string) => (seqs[k] = (seqs[k] ?? 0) + 1);

  /* ---------------- catálogos ---------------- */
  const laboratorios = LABS.map((nombre) => ({ id: nid('lab'), nombre }));
  const categorias = CATS.map((nombre) => ({ id: nid('cat'), nombre }));
  const principios = PRINCIPIOS.map((nombre) => ({ id: nid('pa'), nombre }));
  const acciones = ACCIONES.map((nombre) => ({ id: nid('at'), nombre }));

  /* ---------------- productos (58 base + 22 con otro laboratorio = 80) ---------------- */
  const productos: R[] = [];
  const crearProducto = (b: Base, labIdx: number, factor: number, inactivo = false) => {
    const [nombre, pa, at, cat, costo, receta, tabs] = b;
    const precioCosto = redondear(costo * factor);
    const precioVenta = Math.max(0.2, Math.round(precioCosto * (1.3 + rng.rnd() * 0.35) * 10) / 10);
    const blister = tabs && rng.chance(0.7);
    const caja = tabs && rng.chance(0.5);
    productos.push({
      id: nid('prod'),
      nombre,
      codigo_digemid: `EE${digitos(rng, 5)}`,
      precio_costo: precioCosto,
      precio_venta: precioVenta,
      stock_minimo: rng.int(10, 40),
      barras: `775${digitos(rng, 10)}`,
      estado: !inactivo,
      requiere_receta: receta,
      laboratorio: laboratorios[labIdx],
      categoria: categorias[cat],
      principioActivo: principios[Math.min(pa, principios.length - 1)],
      accionTerapeutica: acciones[at],
      vende_por_presentaciones: blister || caja,
      blister_habilitado: blister,
      unidades_blister: blister ? 10 : null,
      precio_blister: blister ? redondear(precioVenta * 10 * 0.95) : null,
      caja_habilitado: caja,
      unidades_caja: caja ? 100 : null,
      precio_caja: caja ? redondear(precioVenta * 100 * 0.9) : null,
      factor: null,
      registro_sanitario: `RS-${digitos(rng, 6)}`,
    });
  };
  BASE.forEach((b, i) => crearProducto(b, i % LABS.length, 1));
  // Mismo nombre, distinto laboratorio (para demostrar el reporte por laboratorio)
  const duplicables = [0, 3, 10, 16, 18, 20, 24, 26, 33, 34, 7, 4, 13, 12, 29, 30, 19, 21, 25, 1, 17, 35];
  duplicables.forEach((idx, i) => crearProducto(BASE[idx], (idx + 3 + i) % LABS.length, 0.85 + rng.rnd() * 0.3, i === 21));
  // Los nombres de principio faltantes (índice 10..15) usan los más cercanos disponibles
  const faltantes = productos.length; void faltantes;

  /* ---------------- lotes ---------------- */
  const lotes: R[] = [];
  productos.forEach((p, i) => {
    const nl = rng.int(1, 3);
    const bajo = i % 11 === 5; // algunos con stock bajo el mínimo (alerta)
    for (let k = 0; k < nl; k++) {
      const dias = rng.chance(0.12) ? rng.int(10, 85) : rng.int(120, 900);
      lotes.push({
        id: nid('lote'),
        idProducto: p.id,
        lote: `L${rng.int(1000, 9999)}${String.fromCharCode(65 + rng.int(0, 5))}`,
        fechaVencimiento: ymd(sumarDias(hoy, dias)),
        stock: bajo ? rng.int(0, Math.max(1, Math.floor(p.stock_minimo / (nl * 2)))) : rng.int(15, 220),
        fechaIngreso: ymd(sumarDias(hoy, -rng.int(20, 120))),
      });
    }
  });

  /* ---------------- empleados ---------------- */
  const empleadosBase: [string, string, string, string, string, string | null][] = [
    ['Juan Pablo Inoñan', 'admin', 'admin123', 'Administrador', '08:00', null],
    ['Rosa Elena Campos', 'rcampos', 'rosa123', 'Cajero', '08:00', 'Domingo'],
    ['Luis Alberto Medina', 'lmedina', 'luis123', 'Cajero', '14:00', 'Lunes'],
    ['Karen Paredes Ríos', 'kparedes', 'karen123', 'Técnico Farmaceútico', '08:00', 'Martes'],
    ['Víctor Huamán Soto', 'vhuaman', 'victor123', 'Técnico Farmaceútico', '14:00', 'Miércoles'],
    ['Diego Salazar Vega', 'dsalazar', 'diego123', 'Delivery', '09:00', 'Jueves'],
  ];
  const empleados: R[] = empleadosBase.map(([nombre, username, password, rol, entrada, descanso]) => ({
    id: nid('emp'),
    nombre,
    username,
    _password: password,
    rol,
    estado: true,
    horaEntrada: entrada,
    horaSalida: entrada === '08:00' ? '16:00' : entrada === '09:00' ? '17:00' : '22:00',
    diaDescanso: descanso,
    metaVenta: null,
  }));
  empleados[5].estado = true;

  const permisos: Record<string, string[]> = {};
  empleados.forEach((e) => {
    if (e.rol === 'Administrador') permisos[e.id] = [...RUTAS_TODAS];
    else if (e.rol === 'Cajero')
      permisos[e.id] = ['/dashboard/caja', '/dashboard/caja/movimientos', '/dashboard/ventas', '/dashboard/ventas/generar', '/dashboard/clientes', '/dashboard/cotizaciones', '/dashboard/cotizaciones/generar', '/dashboard/ingresos', '/dashboard/egresos'];
    else permisos[e.id] = ['/dashboard/ventas', '/dashboard/ventas/generar', '/dashboard/productos', '/dashboard/productos/kardex', '/dashboard/clientes'];
  });

  /* ---------------- clientes (20) ---------------- */
  const clientes: R[] = [];
  const cliBase: [string, string, string, string][] = [
    ['Juan Carlos', 'Pérez', 'García', '4'],
    ['María Elena', 'Torres', 'Luna', '4'],
    ['Pedro', 'Ramos', 'Vega', '4'],
    ['Lucía', 'Flores', 'Díaz', '4'],
    ['Jorge Luis', 'Castillo', 'Mora', '4'],
    ['Ana María', 'Rojas', 'Cueva', '4'],
    ['Miguel Ángel', 'Quispe', 'Huanca', '4'],
    ['Carmen Rosa', 'Mamani', 'Apaza', '4'],
    ['Raúl', 'Chávez', 'Salas', '4'],
    ['Sofía', 'Vargas', 'León', '4'],
    ['Fernando', 'Mendoza', 'Ruiz', '4'],
    ['Patricia', 'Cárdenas', 'Soto', '4'],
    ['Alberto', 'Espinoza', 'Cruz', '4'],
    ['Gabriela', 'Rivera', 'Pino', '4'],
    ['Víctor Hugo', 'Delgado', 'Paz', '4'],
    ['Yesenia', 'Gonzales', 'Vera', '4'],
  ];
  cliBase.forEach(([n, ap, am]) => {
    clientes.push({
      id: nid('cli'), nombres: n, apellidoPaterno: ap, apellidoMaterno: am,
      dni: digitos(rng, 8), telefono: `9${digitos(rng, 8)}`, direccion: null, saldo: 0, puntos: 0,
    });
  });
  const empresas: [string, string][] = [
    ['CORPORACIÓN SALUD Y VIDA S.A.C.', 'Av. Arequipa 1450, Lince, Lima'],
    ['CLÍNICA SANTA ROSA E.I.R.L.', 'Jr. Cusco 320, Huancayo'],
    ['INVERSIONES MIRAFLORES S.A.C.', 'Calle Los Pinos 215, Miraflores, Lima'],
    ['CONSULTORIO MÉDICO DEL SOL S.R.L.', 'Av. Grau 880, Trujillo'],
  ];
  empresas.forEach(([rs, dir]) => {
    clientes.push({
      id: nid('cli'), nombres: rs, apellidoPaterno: null, apellidoMaterno: null,
      dni: `20${digitos(rng, 9)}`, telefono: `01${digitos(rng, 7)}`, direccion: dir, saldo: 0, puntos: 0,
    });
  });
  const idsRuc = clientes.filter((c) => c.dni.length === 11).map((c) => c.id);

  /* ---------------- arqueos (20) + ventas (300) ---------------- */
  const arqueos: R[] = [];
  const ventas: R[] = [];
  const cajeros = empleados.filter((e) => e.rol === 'Administrador' || e.rol === 'Cajero');
  const activos = productos.filter((p) => p.estado);
  const loteDe = (idProd: number) => lotes.filter((l) => l.idProducto === idProd);
  void loteDe;

  const crearVenta = (fecha: Date, emp: R) => {
    const nItems = rng.int(1, 4);
    const usados = new Set<number>();
    const detalles: R[] = [];
    let total = 0;
    for (let i = 0; i < nItems; i++) {
      const p = rng.pick(activos);
      if (usados.has(p.id)) continue;
      usados.add(p.id);
      let tipo = 'unidad';
      let precio = p.precio_venta;
      if (p.blister_habilitado && rng.chance(0.2)) { tipo = 'blister'; precio = p.precio_blister; }
      else if (p.caja_habilitado && rng.chance(0.05)) { tipo = 'caja'; precio = p.precio_caja; }
      const cantidad = tipo === 'unidad' ? rng.int(1, 6) : rng.int(1, 2);
      const subtotal = redondear(precio * cantidad);
      total += subtotal;
      detalles.push({
        id: nid('det'),
        producto: { id: p.id, nombre: p.nombre, precio_venta: p.precio_venta, stock: 0 },
        cantidad, tipoVenta: tipo, precioUnitario: precio, subtotal,
      });
    }
    total = redondear(total);

    let tipoComp = rng.pick(['nota_venta', 'nota_venta', 'boleta', 'boleta', 'boleta']);
    let cliente: R | null = rng.chance(0.55) ? rng.pick(clientes.filter((c) => c.dni.length === 8)) : null;
    if (rng.chance(0.08)) { tipoComp = 'factura'; cliente = clientes.find((c) => c.id === rng.pick(idsRuc))!; }

    let metodo = rng.pick(['Efectivo', 'Efectivo', 'Efectivo', 'Efectivo', 'Efectivo', 'Yape/Plin', 'Yape/Plin', 'Izipay', 'Transferencia']);
    if (cliente && cliente.dni.length === 8 && rng.chance(0.12)) metodo = 'Crédito';
    let vuelto = 0;
    let metodoPago = `${metodo} (${total.toFixed(2)})`;
    if (metodo === 'Efectivo') {
      const paga = Math.ceil(total / 5) * 5 + (rng.chance(0.3) ? 10 : 0);
      vuelto = redondear(paga - total);
    }
    const estado = !rng.chance(0.04);
    const puntos = cliente && estado ? Math.floor(total) : 0;
    const v: R = {
      id: 0,
      fecha: isoLocal(fecha),
      total, estado, metodoPago,
      tipoVenta: tipoComp,
      serie: null, numeroComprobante: null,
      vuelto, codigoIzipay: metodo === 'Izipay' ? `IZ${digitos(rng, 8)}` : null,
      empleado: { id: emp.id, nombre: emp.nombre, username: emp.username, rol: emp.rol, estado: true },
      cliente: cliente ? { id: cliente.id } : null,
      detalles,
      recetaPath: null,
      requiereReceta: detalles.some((d) => productos.find((p) => p.id === d.producto.id)?.requiere_receta),
      descuento: 0, cuponCodigo: null,
      _puntos: puntos,
    };
    if (metodo === 'Crédito' && cliente) {
      cliente.saldo = redondear(cliente.saldo + total);
      v._credito = estado ? total : 0;
      if (!estado) cliente.saldo = redondear(cliente.saldo - total);
    }
    ventas.push(v);
  };

  // 20 arqueos, uno por día (los 19 anteriores cerrados y el de hoy abierto)
  for (let d = 19; d >= 0; d--) {
    const dia = sumarDias(hoy, -d);
    const emp = d === 0 ? empleados[0] : cajeros[(19 - d) % cajeros.length];
    const inicio = d === 0
      ? new Date(Math.max(dia.getTime() + 60_000, ahora.getTime() - 4 * 3600_000))
      : new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 8, rng.int(0, 20));
    const fin = d === 0 ? null : new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 19, rng.int(0, 50));
    const montoInicial = rng.pick([50, 80, 100, 100, 150, 200]);
    arqueos.push({
      id: nid('arq'), numero: '', empleadoId: emp.id, empleadoNombre: emp.nombre,
      fechaInicio: isoLocal(inicio), montoInicial,
      fechaFin: fin ? isoLocal(fin) : null, montoFinal: null, montoDejado: null, estado: d === 0,
      _inicio: inicio.getTime(), _fin: (fin ?? ahora).getTime(),
    });
    arqueos[arqueos.length - 1].numero = `Arqueo Nro ${arqueos[arqueos.length - 1].id}`;
    const nVentas = d === 0 ? (ahora.getTime() - inicio.getTime() > 3600_000 ? rng.int(2, 6) : 0) : rng.int(5, 10);
    for (let k = 0; k < nVentas; k++) {
      const t = inicio.getTime() + rng.rnd() * ((fin ?? ahora).getTime() - inicio.getTime() - 60_000);
      crearVenta(new Date(t), emp);
    }
  }
  // Ventas anteriores (días 20 a 75) repartidas hasta completar 300
  while (ventas.length < 300) {
    const dias = rng.int(20, 75);
    const base = sumarDias(hoy, -dias);
    const h = rng.int(8, 20);
    crearVenta(new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, rng.int(0, 59), rng.int(0, 59)), rng.pick(empleados.slice(0, 5)));
  }

  // Orden cronológico, ids y numeración
  ventas.sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  const correlativos: Record<string, number> = { nota_venta: 0, boleta: 0, factura: 0 };
  const prefijos: Record<string, string> = { nota_venta: 'NV001', boleta: 'B001', factura: 'F001' };
  ventas.forEach((v) => {
    v.id = nid('venta');
    correlativos[v.tipoVenta] += 1;
    v.serie = prefijos[v.tipoVenta];
    v.numeroComprobante = correlativos[v.tipoVenta];
  });
  ventas.reverse(); // más recientes primero (como el backend)

  // Puntos de los clientes según sus ventas
  ventas.forEach((v) => {
    if (v.cliente && v._puntos) {
      const c = clientes.find((x) => x.id === v.cliente.id)!;
      c.puntos += v._puntos;
    }
  });
  // Deuda: unos pocos pagos parciales
  clientes.forEach((c) => { if (c.saldo > 40 && rng.chance(0.4)) c.saldo = redondear(c.saldo - 20); });

  /* ---------------- movimientos de caja (30) y cierre de arqueos ---------------- */
  const movimientos: R[] = [];
  const cats: [string, string, string[]][] = [
    ['EGRESO', 'PAGO_SERVICIOS', ['Pago de luz', 'Pago de agua', 'Internet y teléfono']],
    ['EGRESO', 'PAGO_PROVEEDOR', ['Pago a proveedor contra entrega', 'Adelanto a proveedor']],
    ['EGRESO', 'GASTO_VARIO', ['Útiles de limpieza', 'Bolsas y rollos de impresión', 'Movilidad']],
    ['EGRESO', 'RETIRO_EFECTIVO', ['Retiro de efectivo a gerencia']],
    ['INGRESO', 'APORTE_CAPITAL', ['Aporte para cambio de sencillo']],
    ['INGRESO', 'DEVOLUCION', ['Devolución de proveedor']],
    ['INGRESO', 'OTRO', ['Venta de bolsas reciclables']],
  ];
  const arqueosCerr = arqueos.slice(0, 19);
  for (let i = 0; i < 30; i++) {
    const arq = i < 3 ? arqueos[19] : arqueosCerr[(i * 7) % arqueosCerr.length];
    const [tipo, categoria, descs] = rng.pick(cats);
    const f = new Date(arq._inicio + rng.rnd() * (arq._fin - arq._inicio));
    movimientos.push({
      id: nid('mov'), empleadoNombre: arq.empleadoNombre, tipo, categoria,
      numero: `${tipo === 'INGRESO' ? 'ING' : 'EGR'}-${String(i + 1).padStart(4, '0')}`,
      fechaEmision: ymd(f), descripcion: rng.pick(descs),
      monto: redondear(rng.int(10, 180) + (rng.chance(0.5) ? 0.5 : 0)),
      medioPago: 'EFECTIVO', fechaRegistro: isoLocal(f), anulado: false,
      _arqueoId: arq.id, _empleadoId: arq.empleadoId,
    });
  }
  arqueosCerr.forEach((a) => {
    const efec = ventas.filter((v) => v.estado && v.empleado.id === a.empleadoId && new Date(v.fecha).getTime() >= a._inicio && new Date(v.fecha).getTime() <= a._fin && v.metodoPago.startsWith('Efectivo')).reduce((s, v) => s + v.total, 0);
    const ing = movimientos.filter((m) => m._arqueoId === a.id && m.tipo === 'INGRESO').reduce((s, m) => s + m.monto, 0);
    const egr = movimientos.filter((m) => m._arqueoId === a.id && m.tipo === 'EGRESO').reduce((s, m) => s + m.monto, 0);
    const esperado = a.montoInicial + efec + ing - egr;
    a.montoFinal = redondear(esperado + (rng.chance(0.6) ? 0 : rng.pick([-2, -1, 0.5, 1, 3])));
    a.montoDejado = Math.min(a.montoInicial, Math.floor(a.montoFinal / 2));
  });

  /* ---------------- proveedores (10) ---------------- */
  const provBase: [string, string, string][] = [
    ['DROGUERÍA FARMA PERÚ S.A.C.', 'Lima', 'Lima'],
    ['DISTRIBUIDORA SALUD TOTAL S.A.', 'Lima', 'Callao'],
    ['INVERSIONES MEDIFARMA S.A.', 'Lima', 'Lima'],
    ['GENFAR DEL PERÚ S.A.', 'Lima', 'Ate'],
    ['QUIMICA SUIZA COMERCIAL S.A.C.', 'Lima', 'Surquillo'],
    ['DROGUERÍA LA ESPERANZA E.I.R.L.', 'Junín', 'Huancayo'],
    ['COMERCIAL MÉDICA ANDINA S.R.L.', 'Junín', 'El Tambo'],
    ['BIOPHARMA IMPORT S.A.C.', 'Lima', 'San Isidro'],
    ['DISTRIBUCIONES VITAL S.A.C.', 'Arequipa', 'Cercado'],
    ['LABORATORIOS UNIDOS DEL SUR S.A.', 'Arequipa', 'Yanahuara'],
  ];
  const proveedores: R[] = provBase.map(([nombres, dep, dist], i) => ({
    id: nid('prov'), tipoDocumento: 'RUC', numeroDocumento: `20${digitos(rng, 9)}`, nombres,
    departamento: dep, provincia: dep, distrito: dist, direccion: `Av. Industrial ${rng.int(100, 999)}, ${dist}`,
    telefono: `01${digitos(rng, 7)}`, correo: `ventas${i + 1}@proveedor.pe`,
    contactoNombres: `${rng.pick(NOMBRES)} ${rng.pick(APELLIDOS)}`, contactoCelular: `9${digitos(rng, 8)}`, contactoCorreo: `contacto${i + 1}@proveedor.pe`,
  }));

  /* ---------------- compras (30) ---------------- */
  const compras: R[] = [];
  for (let i = 0; i < 30; i++) {
    const dias = Math.floor((i / 30) * 70) + rng.int(0, 2);
    const f = sumarDias(hoy, -dias);
    const prov = rng.pick(proveedores);
    const emp = rng.pick(empleados.slice(0, 4));
    const nIt = rng.int(2, 6);
    const usados = new Set<number>();
    const detalles: R[] = [];
    let totalC = 0;
    for (let k = 0; k < nIt; k++) {
      const p = rng.pick(activos);
      if (usados.has(p.id)) continue;
      usados.add(p.id);
      const cantidad = rng.int(20, 200);
      const importe = redondear(cantidad * p.precio_costo);
      totalC += importe;
      detalles.push({
        id: nid('detc'),
        producto: { id: p.id, nombre: p.nombre, codigoBarra: p.barras, unidadMedida: 'UNIDAD', gravada: true, precioUnitario: p.precio_venta, precioMayorista: redondear(p.precio_venta * 0.9), costoUnitario: p.precio_costo },
        lote: `L${rng.int(1000, 9999)}`, fechaVencimiento: ymd(sumarDias(hoy, rng.int(200, 900))),
        unidadMedida: 'UNIDAD', cantidad, precioUnitario: p.precio_costo, importe,
      });
    }
    totalC = redondear(totalC);
    const credito = rng.chance(0.3);
    const pagada = credito ? rng.chance(0.4) : true;
    const subtotal = redondear(totalC / 1.18);
    compras.push({
      id: nid('compra'), comprobante: rng.pick(['FACTURA', 'FACTURA', 'FACTURA', 'BOLETA', 'GUIA']),
      serie: `F${rng.int(1, 9).toString().padStart(3, '0')}`, numero: String(rng.int(1000, 99999)).padStart(8, '0'),
      fechaEmision: ymd(f), fechaRegistro: isoLocal(new Date(f.getFullYear(), f.getMonth(), f.getDate(), rng.int(9, 17), rng.int(0, 59))),
      regularizar: false, proveedor: prov, empleado: { id: emp.id, nombre: emp.nombre, rol: emp.rol },
      precioIncluyeIgv: true, descripcion: rng.chance(0.3) ? 'Reposición mensual' : '',
      subtotal, igv: redondear(totalC - subtotal), total: totalC, percepcion: 0, pagar: totalC,
      tipoPago: credito ? 'Crédito' : 'Contado', medioPago: rng.pick(['Efectivo', 'Transferencia', 'Yape/Plin']),
      estado: !rng.chance(0.05), estadoPago: pagada, detalles,
    });
  }
  compras.sort((a, b) => (a.fechaEmision < b.fechaEmision ? 1 : a.fechaEmision > b.fechaEmision ? -1 : b.id - a.id));

  /* ---------------- traslados (50) ---------------- */
  const sucursales: R[] = ['Sucursal Centro', 'Sucursal Norte', 'Sucursal Huancayo', 'Almacén Central'].map((nombre) => ({ id: nid('suc'), nombre }));
  const traslados: R[] = [];
  for (let i = 0; i < 50; i++) {
    const f = new Date(sumarDias(hoy, -Math.floor((i / 50) * 70)).getTime() + rng.int(9, 18) * 3600_000 + rng.int(0, 59) * 60_000);
    const suc = rng.pick(sucursales);
    const tipo = rng.chance(0.5) ? 'INGRESO' : 'EGRESO';
    const nIt = rng.int(1, 5);
    const usados = new Set<number>();
    const detalles: R[] = [];
    let tot = 0;
    for (let k = 0; k < nIt; k++) {
      const p = rng.pick(activos);
      if (usados.has(p.id)) continue;
      usados.add(p.id);
      const cantidad = rng.int(5, 60);
      const subtotal = redondear(cantidad * p.precio_costo);
      tot += subtotal;
      detalles.push({ id: nid('dett'), idProducto: p.id, nombreProducto: p.nombre, cantidad, precioUnitario: p.precio_costo, subtotal });
    }
    traslados.push({
      id: nid('tras'), tipo, idSucursal: suc.id, nombreSucursal: suc.nombre, fecha: isoLocal(f),
      total: redondear(tot), observacion: tipo === 'INGRESO' ? 'Reposición desde sucursal' : 'Transferencia por falta de stock', detalles,
    });
  }
  traslados.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

  /* ---------------- cotizaciones (12) ---------------- */
  const cotizaciones: R[] = [];
  for (let i = 0; i < 12; i++) {
    const f = new Date(sumarDias(hoy, -Math.floor(i * 1.5)).getTime() + rng.int(9, 18) * 3600_000);
    const emp = rng.pick(cajeros);
    const cli = rng.chance(0.7) ? rng.pick(clientes) : null;
    const detalles: R[] = [];
    let tot = 0;
    const usados = new Set<number>();
    for (let k = 0; k < rng.int(1, 4); k++) {
      const p = rng.pick(activos);
      if (usados.has(p.id)) continue;
      usados.add(p.id);
      const cantidad = rng.int(1, 8);
      const subtotal = redondear(cantidad * p.precio_venta);
      tot += subtotal;
      detalles.push({ id: nid('detq'), producto: { id: p.id, nombre: p.nombre }, tipoVenta: 'unidad', cantidad, precioUnitario: p.precio_venta, subtotal });
    }
    cotizaciones.push({
      id: nid('cot'), fecha: isoLocal(f), empleado: { id: emp.id, nombre: emp.nombre },
      idCliente: cli ? cli.id : null,
      clienteNombre: cli ? [cli.nombres, cli.apellidoPaterno, cli.apellidoMaterno].filter(Boolean).join(' ') : 'Clientes Varios',
      clienteDni: cli ? cli.dni : undefined, total: redondear(tot), estado: i % 7 !== 3, convertida: i % 5 === 4, detalles,
    });
  }

  /* ---------------- asistencias (últimos 14 días) ---------------- */
  const asistencias: R[] = [];
  for (let d = 13; d >= 0; d--) {
    const dia = sumarDias(hoy, -d);
    empleados.forEach((e) => {
      if (rng.chance(0.08)) return;
      const [hh] = String(e.horaEntrada).split(':').map(Number);
      const tarde = rng.chance(0.2) ? rng.int(3, 25) : 0;
      const entrada = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), hh, rng.int(0, 7) + tarde);
      const salidaH = Number(String(e.horaSalida).split(':')[0]);
      const hoyMismo = d === 0;
      asistencias.push({
        id: nid('asi'), idEmpleado: e.id, nombreEmpleado: e.nombre, fecha: ymd(dia),
        horaEntrada: `${String(entrada.getHours()).padStart(2, '0')}:${String(entrada.getMinutes()).padStart(2, '0')}:00`,
        horaSalida: hoyMismo ? null : `${String(salidaH).padStart(2, '0')}:${String(rng.int(0, 15)).padStart(2, '0')}:00`,
        tardanza: tarde > 10, minutosTardanza: tarde > 10 ? tarde : 0,
      });
    });
  }

  /* ---------------- metas de venta ---------------- */
  const mesActual = ymd(hoy).slice(0, 7);
  const mesAnt = ymd(sumarDias(new Date(hoy.getFullYear(), hoy.getMonth(), 1), -1)).slice(0, 7);
  const vendido = (idEmp: number, mes: string) => ventas.filter((v) => v.estado && v.empleado.id === idEmp && v.fecha.startsWith(mes)).reduce((s, v) => s + v.total, 0);
  const factores = [0.7, 1.4, 0.8, 1.6, 0.9, 1.2];
  empleados.forEach((e, i) => {
    const ref = vendido(e.id, mesActual) > 150 ? vendido(e.id, mesActual) : vendido(e.id, mesAnt);
    e.metaVenta = Math.max(300, Math.round((ref * factores[i % factores.length]) / 50) * 50);
  });

  /* ---------------- cupones ---------------- */
  const cuponTipos: R[] = [
    { id: nid('ctipo'), nombre: 'Cupón S/ 5', puntosRequeridos: 100, valor: 5, activo: true },
    { id: nid('ctipo'), nombre: 'Cupón S/ 10', puntosRequeridos: 200, valor: 10, activo: true },
    { id: nid('ctipo'), nombre: 'Cupón S/ 25', puntosRequeridos: 500, valor: 25, activo: true },
  ];
  const cupones: R[] = [];
  const conPuntos = clientes.filter((c) => c.puntos >= 300).slice(0, 4);
  conPuntos.forEach((c, i) => {
    const tipo = cuponTipos[i % 2];
    c.puntos -= tipo.puntosRequeridos;
    cupones.push({
      id: nid('cupon'), codigo: `CP${digitos(rng, 6)}`, idCliente: c.id,
      clienteNombre: [c.nombres, c.apellidoPaterno, c.apellidoMaterno].filter(Boolean).join(' '),
      nombre: tipo.nombre, valor: tipo.valor, puntosUsados: tipo.puntosRequeridos,
      fechaCreacion: isoLocal(sumarDias(ahora, -(i + 1) * 3)), fechaUso: null, estado: 'ACTIVO',
    });
  });

  /* ---------------- empresa ---------------- */
  const empresa = {
    id: 1, ruc: '10726560143', razonSocial: 'BOTICA JPFARMA S.A.C.', nombreComercial: 'Botica JPFarma',
    telefono: '907845855', email: 'jpsistems20@gmail.com', direccion: 'Lima 123', departamento: 'Lima', ciudad: 'Lima',
    logo: '/JPFarmaBanner.png', icono: '/JPFARMA.png', horaApertura: '08:00', horaCierre: '22:00', toleranciaMinutos: 10,
    backupAutomaticoActivo: true, frecuenciaBackup: 'DIARIO', ultimoBackupEnviado: '', rutaRecetas: '',
  };

  // Limpia campos internos que no se necesitan en la semilla
  seqs = { ...seqs };
  return {
    version: DB_VERSION, creadoEn: ymd(ahora), seq: seqs, empresa, laboratorios, categorias, principios, acciones,
    productos, lotes, clientes, empleados, permisos, proveedores, compras, sucursales, traslados, ventas, cotizaciones,
    arqueos, movimientos, asistencias, cuponTipos, cupones, correlativos,
  };
}
