/* eslint-disable @typescript-eslint/no-explicit-any */
// Rutas GET de /reportes/* del servidor falso (modo demo). Replica la semántica del backend Java (carpeta reportes/).
import { ruta, cargarDB, stockDe, lotesDe, proximoVenc, nombreCliente, enRango, bad } from './servidor';
import { R, redondear, ymd } from './util';

const TASA_IGV = 0.18;
const porNombre = (a: R, b: R) => String(a.nombre ?? '').localeCompare(String(b.nombre ?? ''), 'es');
const suma = (arr: R[], f: (x: R) => number) => arr.reduce((s, x) => s + f(x), 0);
const ventasEnRango = (ini: string | null, fin: string | null) =>
  cargarDB().ventas.filter((v) => v.estado && enRango(v.fecha, ini, fin));
const comprasEnRango = (ini: string | null, fin: string | null) =>
  cargarDB().compras.filter((c) => c.estado && enRango(c.fechaEmision, ini, fin));
const movsEnRango = (ini: string | null, fin: string | null) =>
  cargarDB().movimientos.filter((m) => !m.anulado && enRango(m.fechaEmision, ini, fin));

/* ============================== VENTAS ============================== */
ruta('GET', '/reportes/ventas/periodo', (c) => {
  const ini = c.q.get('fechaInicio'), fin = c.q.get('fechaFin');
  const porDia = new Map<string, { n: number; total: number }>();
  for (const v of ventasEnRango(ini, fin)) {
    const f = String(v.fecha).slice(0, 10);
    const x = porDia.get(f) ?? { n: 0, total: 0 };
    x.n += 1; x.total += v.total;
    porDia.set(f, x);
  }
  let sub = 0, igv = 0, tot = 0, n = 0;
  const detallePorDia = [...porDia.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([fecha, x]) => {
    const subtotal = redondear(x.total / (1 + TASA_IGV));
    const i = redondear(x.total - subtotal);
    sub += subtotal; igv += i; tot += x.total; n += x.n;
    return { fecha, cantidadVentas: x.n, subtotal, igv: i, total: redondear(x.total) };
  });
  return {
    fechaInicio: ini, fechaFin: fin, totalVentas: n,
    subtotalGeneral: redondear(sub), igvGeneral: redondear(igv), totalGeneral: redondear(tot), detallePorDia,
  };
});

ruta('GET', '/reportes/ventas/por-empleado', (c) => {
  const m = new Map<number, { nombre: string; n: number; total: number }>();
  for (const v of ventasEnRango(c.q.get('fechaInicio'), c.q.get('fechaFin'))) {
    const x = m.get(v.empleado.id) ?? { nombre: v.empleado.nombre, n: 0, total: 0 };
    x.n += 1; x.total += v.total;
    m.set(v.empleado.id, x);
  }
  return [...m.entries()]
    .map(([idEmpleado, x]) => ({ idEmpleado, nombreEmpleado: x.nombre, cantidadVentas: x.n, totalVendido: redondear(x.total) }))
    .sort((a, b) => b.totalVendido - a.totalVendido);
});

ruta('GET', '/reportes/ventas/top-productos', (c) => {
  const limite = Number(c.q.get('limite')) > 0 ? Number(c.q.get('limite')) : 20;
  const m = new Map<number, { nombre: string; u: number; monto: number }>();
  for (const v of ventasEnRango(c.q.get('fechaInicio'), c.q.get('fechaFin'))) {
    for (const d of v.detalles as R[]) {
      const x = m.get(d.producto.id) ?? { nombre: d.producto.nombre, u: 0, monto: 0 };
      x.u += d.cantidad; x.monto += d.subtotal;
      m.set(d.producto.id, x);
    }
  }
  return [...m.entries()]
    .map(([idProducto, x]) => ({ idProducto, nombreProducto: x.nombre, unidadesVendidas: x.u, montoVendido: redondear(x.monto) }))
    .sort((a, b) => b.montoVendido - a.montoVendido)
    .slice(0, limite);
});

ruta('GET', '/reportes/ventas/por-producto/:n', (c, id) => {
  const d = cargarDB();
  const idp = Number(id);
  const detalle: any[] = [];
  let nombre = 'Producto no encontrado';
  let unidades = 0, total = 0;
  const ventas = [...ventasEnRango(c.q.get('fechaInicio'), c.q.get('fechaFin'))].sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
  for (const v of ventas) {
    for (const x of v.detalles as R[]) {
      if (x.producto.id !== idp) continue;
      if (!detalle.length) nombre = x.producto.nombre;
      const cli = v.cliente ? d.clientes.find((k) => k.id === v.cliente.id) : null;
      detalle.push({
        fecha: v.fecha, cliente: cli ? nombreCliente(cli) : 'Sin cliente', empleado: v.empleado.nombre,
        cantidad: x.cantidad, precioUnitario: x.precioUnitario, subtotal: redondear(x.subtotal), tipoVenta: x.tipoVenta,
      });
      unidades += x.cantidad; total += x.subtotal;
    }
  }
  return {
    idProducto: idp, nombreProducto: nombre, fechaInicio: c.q.get('fechaInicio'), fechaFin: c.q.get('fechaFin'),
    totalUnidades: unidades, totalVendido: redondear(total), detalle,
  };
});

/* ============================== CAJA ============================== */
const esEfectivo = (m: R) => String(m.medioPago).toUpperCase() === 'EFECTIVO';

ruta('GET', '/reportes/caja/arqueo/:n', (_c, id) => {
  const d = cargarDB();
  const a = d.arqueos.find((x) => x.id === Number(id)) ?? bad(`Arqueo de caja no encontrado: ${id}`, 404);
  // Ventas en efectivo del cajero dentro del horario del arqueo (mismo criterio que servidor.ts)
  const ini = new Date(a.fechaInicio.length <= 10 ? `${a.fechaInicio}T00:00:00` : a.fechaInicio).getTime();
  const finT = a.fechaFin ? new Date(a.fechaFin.length <= 10 ? `${a.fechaFin}T00:00:00` : a.fechaFin).getTime() : Date.now() + 60_000;
  const efectivo = suma(
    d.ventas.filter((v) => {
      const t = new Date(v.fecha).getTime();
      return v.estado && v.empleado.id === a.empleadoId && t >= ini && t <= finT && String(v.metodoPago).startsWith('Efectivo');
    }),
    (v) => v.total,
  );
  const movs = d.movimientos.filter((m) => m._arqueoId === a.id && !m.anulado && esEfectivo(m));
  const ing = suma(movs.filter((m) => m.tipo === 'INGRESO'), (m) => m.monto);
  const egr = suma(movs.filter((m) => m.tipo === 'EGRESO'), (m) => m.monto);
  const montoInicial = a.montoInicial ?? 0;
  const saldoEsperado = redondear(montoInicial + efectivo + ing - egr);
  const cerrado = a.estado === false || a.fechaFin != null;
  return {
    idArqueo: a.id, nombreEmpleado: a.empleadoNombre ?? null, fechaInicio: a.fechaInicio, fechaFin: a.fechaFin ?? null,
    montoInicial, montoFinal: a.montoFinal ?? null,
    totalVentasEfectivo: redondear(efectivo), totalIngresosCaja: redondear(ing), totalEgresosCaja: redondear(egr),
    saldoEsperado, diferencia: a.montoFinal != null ? redondear(a.montoFinal - saldoEsperado) : null,
    estadoArqueo: cerrado ? 'CERRADO' : 'ABIERTO',
  };
});

ruta('GET', '/reportes/caja/flujo', (c) => {
  const ini = c.q.get('fechaInicio'), fin = c.q.get('fechaFin');
  const movs = movsEnRango(ini, fin).sort((a, b) => (String(a.fechaEmision) < String(b.fechaEmision) ? -1 : String(a.fechaEmision) > String(b.fechaEmision) ? 1 : a.id - b.id));
  const ing = suma(movs.filter((m) => String(m.tipo).toUpperCase() === 'INGRESO'), (m) => m.monto);
  const egr = suma(movs.filter((m) => String(m.tipo).toUpperCase() === 'EGRESO'), (m) => m.monto);
  return {
    fechaInicio: ini, fechaFin: fin, totalIngresos: redondear(ing), totalEgresos: redondear(egr), saldoNeto: redondear(ing - egr),
    movimientos: movs.map((m) => ({
      fecha: String(m.fechaEmision).slice(0, 10), tipo: m.tipo, categoria: m.categoria, numero: m.numero,
      descripcion: m.descripcion, monto: m.monto, medioPago: m.medioPago, empleado: m.empleadoNombre,
    })),
  };
});

/* ============================== COMPRAS ============================== */
ruta('GET', '/reportes/compras/proveedores', () =>
  [...cargarDB().proveedores]
    .sort((a, b) => String(a.nombres).localeCompare(String(b.nombres), 'es'))
    .map((p) => ({ idProveedor: p.id, nombreProveedor: p.nombres, ruc: p.numeroDocumento })));

ruta('GET', '/reportes/compras/por-proveedor', (c) => {
  const idProv = Number(c.q.get('idProveedor')) || 0;
  const m = new Map<number, { nombre: string; n: number; total: number }>();
  for (const k of comprasEnRango(c.q.get('fechaInicio'), c.q.get('fechaFin'))) {
    if (idProv && k.proveedor.id !== idProv) continue;
    const x = m.get(k.proveedor.id) ?? { nombre: k.proveedor.nombres, n: 0, total: 0 };
    x.n += 1; x.total += k.total;
    m.set(k.proveedor.id, x);
  }
  return [...m.entries()]
    .map(([idProveedor, x]) => ({ idProveedor, nombreProveedor: x.nombre, cantidadCompras: x.n, totalComprado: redondear(x.total) }))
    .sort((a, b) => b.totalComprado - a.totalComprado);
});

ruta('GET', '/reportes/compras/analisis-costos/:n', (_c, id) => {
  const d = cargarDB();
  const p = d.productos.find((x) => x.id === Number(id)) ?? bad(`Producto no encontrado: ${id}`, 404);
  const historico: any[] = [];
  const compras = d.compras.filter((k) => k.estado).sort((a, b) => (a.fechaEmision < b.fechaEmision ? -1 : a.fechaEmision > b.fechaEmision ? 1 : a.id - b.id));
  for (const k of compras) {
    for (const x of k.detalles as R[]) {
      if (x.producto.id !== p.id) continue;
      historico.push({ fecha: String(k.fechaEmision).slice(0, 10), proveedor: k.proveedor.nombres, cantidad: x.cantidad, precioUnitario: x.precioUnitario });
    }
  }
  const precios = historico.map((h) => h.precioUnitario as number);
  return {
    idProducto: p.id, nombreProducto: p.nombre,
    precioMinimo: precios.length ? redondear(Math.min(...precios)) : null,
    precioMaximo: precios.length ? redondear(Math.max(...precios)) : null,
    precioPromedio: precios.length ? redondear(precios.reduce((s, x) => s + x, 0) / precios.length) : null,
    precioVentaActual: p.precio_venta ?? null,
    historico,
  };
});

ruta('GET', '/reportes/compras/cuentas-por-pagar', (c) => {
  const ini = c.q.get('fechaInicio'), fin = c.q.get('fechaFin');
  const lista = comprasEnRango(ini, fin).sort((a, b) => (a.fechaEmision < b.fechaEmision ? -1 : a.fechaEmision > b.fechaEmision ? 1 : a.id - b.id));
  const pagado = suma(lista.filter((k) => k.estadoPago === true), (k) => k.total);
  const pendiente = suma(lista.filter((k) => k.estadoPago !== true), (k) => k.total);
  return {
    fechaInicio: ini, fechaFin: fin,
    totalComprado: redondear(pagado + pendiente), totalPendiente: redondear(pendiente), totalPagado: redondear(pagado),
    compras: lista.map((k) => ({
      id: k.id, comprobante: k.comprobante, serie: k.serie, numero: k.numero, fechaEmision: String(k.fechaEmision).slice(0, 10),
      proveedor: k.proveedor.nombres, total: k.total, pagar: k.pagar ?? 0, tipoPago: k.tipoPago, medioPago: k.medioPago, estadoPago: k.estadoPago,
    })),
  };
});

/* ============================== INVENTARIO (solo productos activos) ============================== */
const activos = () => cargarDB().productos.filter((p) => p.estado);

ruta('GET', '/reportes/inventario/valorado', () => {
  let vc = 0, vv = 0;
  const productos = [...activos()].sort(porNombre).map((p) => {
    const stock = stockDe(p.id);
    const valorCosto = redondear(stock * p.precio_costo);
    const valorVenta = redondear(stock * p.precio_venta);
    vc += valorCosto; vv += valorVenta;
    return {
      idProducto: p.id, nombreProducto: p.nombre, categoria: p.categoria?.nombre ?? 'Sin categoria',
      laboratorio: p.laboratorio?.nombre ?? 'Sin laboratorio', stock,
      precioCosto: p.precio_costo, precioVenta: p.precio_venta, valorCosto, valorVenta,
    };
  });
  return { totalProductos: productos.length, valorTotalCosto: redondear(vc), valorTotalVenta: redondear(vv), productos };
});

ruta('GET', '/reportes/inventario/alerta-stock-minimo', () =>
  activos()
    .filter((p) => p.stock_minimo != null)
    .map((p) => ({ p, stock: stockDe(p.id) }))
    .filter(({ p, stock }) => stock <= p.stock_minimo)
    .sort((a, b) => (a.stock - a.p.stock_minimo) - (b.stock - b.p.stock_minimo))
    .map(({ p, stock }) => ({
      idProducto: p.id, nombreProducto: p.nombre,
      laboratorio: p.laboratorio ? { idLaboratorio: p.laboratorio.id, nombre: p.laboratorio.nombre } : null,
      stock, stockMinimo: p.stock_minimo, diferencia: stock - p.stock_minimo,
    })));

const filaCatalogo = (p: R) => ({
  idProducto: p.id, nombreProducto: p.nombre, principioActivo: p.principioActivo?.nombre ?? null,
  accionTerapeutica: p.accionTerapeutica?.nombre ?? null, stock: stockDe(p.id), precioVenta: p.precio_venta,
  laboratorio: p.laboratorio?.nombre ?? '',
});
const cmp = (a: any, b: any) => String(a ?? '').localeCompare(String(b ?? ''), 'es');

ruta('GET', '/reportes/inventario/catalogo-terapeutico', (c) => {
  const pa = (c.q.get('principioActivo') ?? '').trim().toLowerCase();
  return activos()
    .filter((p) => !pa || String(p.principioActivo?.nombre ?? '').toLowerCase().includes(pa))
    .sort((a, b) => cmp(a.principioActivo?.nombre, b.principioActivo?.nombre) || cmp(a.accionTerapeutica?.nombre, b.accionTerapeutica?.nombre) || cmp(a.nombre, b.nombre))
    .map(filaCatalogo);
});

ruta('GET', '/reportes/inventario/sustitutos', (c) => {
  const idPa = Number(c.q.get('idPrincipioActivo')), excl = Number(c.q.get('idProductoExcluir'));
  return activos()
    .filter((p) => p.principioActivo?.id === idPa && p.id !== excl)
    .map(filaCatalogo)
    .filter((f) => f.stock > 0)
    .sort((a, b) => b.stock - a.stock);
});

ruta('GET', '/reportes/inventario/por-vencer', (c) => {
  const dias = Number(c.q.get('dias')) > 0 ? Number(c.q.get('dias')) : 90;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const lim = new Date(hoy); lim.setDate(lim.getDate() + dias);
  const limStr = ymd(lim);
  const res: any[] = [];
  for (const p of activos()) {
    for (const l of lotesDe(p.id)) {
      if (!l.fechaVencimiento || !(l.stock > 0) || String(l.fechaVencimiento).slice(0, 10) > limStr) continue;
      const fv = String(l.fechaVencimiento).slice(0, 10);
      const diasRestantes = Math.round((new Date(`${fv}T00:00:00`).getTime() - hoy.getTime()) / 86_400_000);
      res.push({
        idProducto: p.id, nombreProducto: p.nombre, lote: l.lote ?? null, fechaVencimiento: fv, stock: l.stock,
        diasRestantes, laboratorio: p.laboratorio?.nombre ?? '',
      });
    }
  }
  return res.sort((a, b) => (a.fechaVencimiento < b.fechaVencimiento ? -1 : a.fechaVencimiento > b.fechaVencimiento ? 1 : 0));
});

ruta('GET', '/reportes/inventario/laboratorios', () => {
  const d = cargarDB();
  return [...d.laboratorios].sort(porNombre).map((l) => ({
    idLaboratorio: l.id, nombreLaboratorio: l.nombre,
    cantidadProductos: d.productos.filter((p) => p.estado && p.laboratorio?.id === l.id).length,
  }));
});

ruta('GET', '/reportes/inventario/por-laboratorio/:n', (_c, id) => {
  const d = cargarDB();
  const lab = d.laboratorios.find((l) => l.id === Number(id));
  const productos = d.productos.filter((p) => p.estado && p.laboratorio?.id === Number(id)).sort(porNombre).map((p) => ({
    idProducto: p.id, nombreProducto: p.nombre, stock: stockDe(p.id), precioVenta: p.precio_venta, fechaVencimiento: proximoVenc(p.id),
  }));
  return { idLaboratorio: Number(id), nombreLaboratorio: lab?.nombre ?? '—', totalProductos: productos.length, productos };
});

/* ============================== GESTIÓN ============================== */
ruta('GET', '/reportes/gestion/consolidado', (c) => {
  const ini = c.q.get('fechaInicio'), fin = c.q.get('fechaFin');
  const ventas = suma(ventasEnRango(ini, fin), (v) => v.total);
  const compras = suma(comprasEnRango(ini, fin), (k) => k.total);
  const movs = movsEnRango(ini, fin);
  const ing = suma(movs.filter((m) => m.tipo === 'INGRESO'), (m) => m.monto);
  const egr = suma(movs.filter((m) => m.tipo === 'EGRESO'), (m) => m.monto);
  const bruta = redondear(ventas - compras);
  return {
    fechaInicio: ini, fechaFin: fin, totalVentas: redondear(ventas), totalCompras: redondear(compras),
    totalIngresosCaja: redondear(ing), totalEgresosCaja: redondear(egr), utilidadBruta: bruta, utilidadNeta: redondear(bruta + ing - egr),
  };
});
