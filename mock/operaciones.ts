/* eslint-disable @typescript-eslint/no-explicit-any */
// Rutas del servidor falso: ventas, compras, proveedores, cotizaciones, traslados, empresa y respaldo.
import {
  cargarDB, ruta, bad, paginar, nid, norm, enRango, descontarFefo, agregarLote, stockDe, lotesDe, porId,
  nombreCliente, arqueoAbierto, Resp,
} from './servidor';
import { R, ymd, isoLocal, redondear } from './util';

const PREFIJOS: Record<string, string> = { nota_venta: 'NV001', boleta: 'B001', factura: 'F001' };
const dia = (f: string) => String(f).slice(0, 10);

/* ============================================================
   VENTAS
   ============================================================ */
const ventaOut = (v: R): R => {
  const d = cargarDB();
  const cli = v.cliente ? d.clientes.find((c) => c.id === v.cliente.id) ?? null : null;
  const detalles = v.detalles.map((x: R) => {
    const p = d.productos.find((q) => q.id === x.producto.id);
    return { ...x, producto: { ...x.producto, precio_venta: p?.precio_venta ?? x.producto.precio_venta, stock: p ? stockDe(p.id) : 0 } };
  });
  return { ...v, cliente: cli, detalles };
};
const ventasOrdenadas = () =>
  [...cargarDB().ventas].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : b.id - a.id));
const filtrarEmp = (arr: R[], idEmp: string | null, key = 'empleado') => (idEmp ? arr.filter((v) => v[key].id === Number(idEmp)) : arr);

ruta('GET', '/ventas', (c) => paginar(ventasOrdenadas().map(ventaOut), c.q));
ruta('GET', '/ventas/dia', (c) => {
  const f = c.q.get('fecha') ?? ymd(new Date());
  return paginar(filtrarEmp(ventasOrdenadas(), c.q.get('idEmpleado')).filter((v) => dia(v.fecha) === f).map(ventaOut), c.q);
});
ruta('GET', '/ventas/dias', (c) => {
  const set = new Set(filtrarEmp(cargarDB().ventas, c.q.get('idEmpleado')).map((v) => dia(v.fecha)));
  return [...set].sort().reverse();
});
ruta('GET', '/ventas/:n', (_c, id) => ventaOut(porId(cargarDB().ventas, id, 'Venta no encontrada.')));

const unidadesBase = (p: R, tipo: string): number => {
  if (tipo === 'blister') {
    if (!p.vende_por_presentaciones || !p.blister_habilitado) bad(`El producto "${p.nombre}" no tiene habilitada la venta por blister.`);
    return p.unidades_blister ?? 1;
  }
  if (tipo === 'caja') {
    if (!p.vende_por_presentaciones || !p.caja_habilitado) bad(`El producto "${p.nombre}" no tiene habilitada la venta por caja.`);
    return p.unidades_caja ?? 1;
  }
  return 1;
};

ruta('POST', '/ventas', (c) => {
  const b = c.body ?? {};
  const d = cargarDB();
  if (!b.items?.length) bad('La venta debe tener al menos un producto.');
  const emp = d.empleados.find((e) => e.id === b.idEmpleado) ?? bad('Empleado no encontrado.');
  if (!arqueoAbierto(emp.id)) bad('No tienes una caja abierta. Abre tu caja para poder vender.', 409);
  const cliente = b.idCliente ? d.clientes.find((x) => x.id === b.idCliente) ?? null : null;
  const esCredito = String(b.metodoPago ?? '').startsWith('Crédito');
  if (esCredito && !cliente) bad('Se requiere un cliente registrado para ventas al crédito.');
  const tipoComp = String(b.tipoVenta ?? 'nota_venta').toLowerCase();
  if (!PREFIJOS[tipoComp]) bad('Tipo de venta inválido.');
  if (tipoComp === 'factura' && !cliente) bad('Se requiere un cliente registrado (con RUC) para emitir factura.');

  // validar stock antes de tocar nada
  const necesario = new Map<number, number>();
  for (const it of b.items) {
    const p = d.productos.find((x) => x.id === it.idProducto) ?? bad(`Producto no encontrado: ${it.idProducto}`);
    if (!(it.cantidad > 0)) bad(`Cantidad inválida para ${p.nombre}`);
    necesario.set(p.id, (necesario.get(p.id) ?? 0) + it.cantidad * unidadesBase(p, it.tipoVenta ?? 'unidad'));
  }
  for (const [idp, n] of necesario) {
    const disp = stockDe(idp);
    if (disp < n) bad(`Stock insuficiente para ${d.productos.find((x) => x.id === idp)!.nombre} (disponible: ${disp}, requerido: ${n})`, 409);
  }

  const consumos: { loteId: number; cantidad: number }[] = [];
  let total = 0;
  const detalles = b.items.map((it: R) => {
    const p = d.productos.find((x) => x.id === it.idProducto)!;
    const tipo = it.tipoVenta ?? 'unidad';
    consumos.push(...descontarFefo(p.id, it.cantidad * unidadesBase(p, tipo)));
    const subtotal = redondear(it.precioUnitario * it.cantidad);
    total += subtotal;
    return { id: nid('det'), producto: { id: p.id, nombre: p.nombre, precio_venta: p.precio_venta, stock: 0 }, cantidad: it.cantidad, tipoVenta: tipo, precioUnitario: it.precioUnitario, subtotal };
  });
  total = redondear(total);

  let descuento = 0;
  let cuponCodigo: string | null = null;
  if (b.idCupon) {
    if (!cliente) bad('Se requiere un cliente registrado para usar un cupón.');
    const cup = d.cupones.find((x) => x.id === b.idCupon) ?? bad('Cupón no encontrado.');
    if (cup.idCliente !== cliente!.id) bad('El cupón no pertenece a este cliente.');
    if (cup.estado !== 'ACTIVO') bad('El cupón ya fue utilizado.', 409);
    descuento = Math.min(cup.valor, total);
    total = redondear(total - descuento);
    cuponCodigo = cup.codigo;
    cup.estado = 'USADO'; cup.fechaUso = isoLocal(new Date());
  }
  if (b.montoPagado != null && b.montoPagado < total) bad(`El monto pagado (${b.montoPagado}) es menor al total de la venta (${total}).`);

  d.correlativos[tipoComp] = (d.correlativos[tipoComp] ?? 0) + 1;
  const puntos = cliente ? Math.floor(total) : 0;
  const v: R = {
    id: nid('venta'), fecha: isoLocal(new Date()), total, estado: true, metodoPago: b.metodoPago, tipoVenta: tipoComp,
    serie: PREFIJOS[tipoComp], numeroComprobante: d.correlativos[tipoComp],
    vuelto: b.montoPagado != null ? redondear(b.montoPagado - total) : 0, codigoIzipay: b.codigoIzipay ?? null,
    empleado: { id: emp.id, nombre: emp.nombre, username: emp.username, rol: emp.rol, estado: true },
    cliente: cliente ? { id: cliente.id } : null, detalles, recetaPath: null,
    requiereReceta: detalles.some((x: R) => d.productos.find((p) => p.id === x.producto.id)?.requiere_receta),
    descuento, cuponCodigo, _puntos: puntos, _consumos: consumos, _credito: esCredito ? total : 0,
  };
  d.ventas.push(v);
  if (cliente) {
    cliente.puntos = (cliente.puntos ?? 0) + puntos;
    if (esCredito) cliente.saldo = redondear((cliente.saldo ?? 0) + total);
  }
  return ventaOut(v);
});

ruta('PUT', '/ventas/:n/anular', (_c, id) => {
  const d = cargarDB();
  const v = porId(d.ventas, id, 'Venta no encontrada.');
  if (!v.estado) bad('La venta ya se encuentra anulada.');
  (v._consumos ?? []).forEach((k: R) => { const l = d.lotes.find((x) => x.id === k.loteId); if (l) l.stock += k.cantidad; });
  const cli = v.cliente ? d.clientes.find((x) => x.id === v.cliente.id) : null;
  if (cli) {
    cli.puntos = Math.max(0, (cli.puntos ?? 0) - (v._puntos ?? 0));
    if (v._credito) cli.saldo = redondear(Math.max(0, (cli.saldo ?? 0) - v._credito));
  }
  if (v.cuponCodigo) {
    const cup = d.cupones.find((x) => x.codigo === v.cuponCodigo);
    if (cup) { cup.estado = 'ACTIVO'; cup.fechaUso = null; }
  }
  v.estado = false;
  return undefined;
});

ruta('POST', '/ventas/:n/receta', (_c, id) => {
  const v = porId(cargarDB().ventas, id, 'Venta no encontrada.');
  v.recetaPath = `receta_${v.id}.jpg`;
  return undefined;
});
ruta('GET', '/ventas/:n/receta', () => new Resp('Receta de demostración', {}, 'text/plain'));

/* ============================================================
   PROVEEDORES Y COMPRAS
   ============================================================ */
ruta('GET', '/proveedores', () => [...cargarDB().proveedores].sort((a, b) => a.nombres.localeCompare(b.nombres)));
ruta('GET', '/proveedores/:n', (_c, id) => porId(cargarDB().proveedores, id, 'Proveedor no encontrado.'));
ruta('POST', '/proveedores', (c) => {
  const b = c.body ?? {};
  if (!String(b.nombres ?? '').trim()) bad('El nombre del proveedor es obligatorio.');
  if (cargarDB().proveedores.some((p) => b.numeroDocumento && p.numeroDocumento === b.numeroDocumento)) bad('Ya existe un proveedor con ese documento.', 409);
  const p = { ...b, id: nid('prov') };
  cargarDB().proveedores.push(p);
  return p;
});
ruta('PUT', '/proveedores/:n', (c, id) => Object.assign(porId(cargarDB().proveedores, id, 'Proveedor no encontrado.'), c.body, { id: Number(id) }));

const comprasOrdenadas = () =>
  [...cargarDB().compras].sort((a, b) => (a.fechaEmision < b.fechaEmision ? 1 : a.fechaEmision > b.fechaEmision ? -1 : b.id - a.id));
ruta('GET', '/compras', (c) => {
  let arr = comprasOrdenadas().filter((x) => enRango(x.fechaEmision, c.q.get('desde'), c.q.get('hasta')));
  const e = c.q.get('idEmpleado');
  if (e) arr = arr.filter((x) => x.empleado?.id === Number(e));
  return paginar(arr, c.q);
});
ruta('GET', '/compras/:n', (_c, id) => porId(cargarDB().compras, id, 'Compra no encontrada.'));
ruta('POST', '/compras', (c) => {
  const b = c.body ?? {};
  const d = cargarDB();
  if (!b.items?.length) bad('La compra debe tener al menos un producto.');
  const prov = d.proveedores.find((p) => p.id === b.idProveedor) ?? bad('Proveedor no encontrado.');
  const emp = d.empleados.find((e) => e.id === b.idEmpleado) ?? bad('Empleado no encontrado.');
  const lotesCreados: number[] = [];
  let suma = 0;
  const detalles = b.items.map((it: R) => {
    const p = d.productos.find((x) => x.id === it.idProducto) ?? bad(`Producto no encontrado: ${it.idProducto}`);
    const importe = redondear(it.cantidad * it.precioUnitario);
    suma += importe;
    const l = agregarLote(p.id, it.lote ?? null, it.fechaVencimiento ?? null, it.cantidad);
    lotesCreados.push(l.id);
    return {
      id: nid('detc'),
      producto: { id: p.id, nombre: p.nombre, codigoBarra: p.barras, unidadMedida: it.unidadMedida ?? 'UNIDAD', gravada: true, precioUnitario: p.precio_venta, precioMayorista: redondear(p.precio_venta * 0.9), costoUnitario: it.precioUnitario },
      lote: it.lote, fechaVencimiento: it.fechaVencimiento, unidadMedida: it.unidadMedida ?? 'UNIDAD', cantidad: it.cantidad, precioUnitario: it.precioUnitario, importe,
    };
  });
  suma = redondear(suma);
  let subtotal: number, igv: number, total: number;
  if (b.precioIncluyeIgv) { total = suma; subtotal = redondear(total / 1.18); igv = redondear(total - subtotal); }
  else { subtotal = suma; igv = redondear(subtotal * 0.18); total = redondear(subtotal + igv); }
  const percepcion = Number(b.percepcion) || 0;
  const compra: R = {
    id: nid('compra'), comprobante: b.comprobante, serie: b.serie, numero: b.numero, fechaEmision: b.fechaEmision,
    fechaRegistro: isoLocal(new Date()), regularizar: !!b.regularizar, proveedor: prov,
    empleado: { id: emp.id, nombre: emp.nombre, rol: emp.rol }, precioIncluyeIgv: !!b.precioIncluyeIgv, descripcion: b.descripcion ?? '',
    subtotal, igv, total, percepcion, pagar: redondear(total + percepcion), tipoPago: b.tipoPago, medioPago: b.medioPago,
    estado: true, estadoPago: b.tipoPago === 'Contado', detalles, _lotes: lotesCreados,
  };
  d.compras.push(compra);
  return compra;
});
ruta('PUT', '/compras/:n/anular', (_c, id) => {
  const d = cargarDB();
  const x = porId(d.compras, id, 'Compra no encontrada.');
  if (!x.estado) bad('La compra ya está anulada.');
  (x._lotes ?? []).forEach((lid: number, i: number) => {
    const l = d.lotes.find((q) => q.id === lid);
    if (l) l.stock = Math.max(0, l.stock - (x.detalles[i]?.cantidad ?? 0));
  });
  x.estado = false;
  return undefined;
});

/* ============================================================
   COTIZACIONES
   ============================================================ */
const cotOrdenadas = () => [...cargarDB().cotizaciones].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : b.id - a.id));
ruta('GET', '/cotizaciones', (c) => paginar(cotOrdenadas(), c.q));
ruta('GET', '/cotizaciones/dia', (c) => {
  const f = c.q.get('fecha') ?? ymd(new Date());
  return paginar(filtrarEmp(cotOrdenadas(), c.q.get('idEmpleado')).filter((x) => dia(x.fecha) === f), c.q);
});
ruta('GET', '/cotizaciones/dias', (c) =>
  [...new Set(filtrarEmp(cargarDB().cotizaciones, c.q.get('idEmpleado')).map((x) => dia(x.fecha)))].sort().reverse());
ruta('GET', '/cotizaciones/:n', (_c, id) => porId(cargarDB().cotizaciones, id, 'Cotización no encontrada.'));
ruta('POST', '/cotizaciones', (c) => {
  const b = c.body ?? {};
  const d = cargarDB();
  if (!b.items?.length) bad('La cotización debe tener al menos un producto.');
  const emp = d.empleados.find((e) => e.id === b.idEmpleado) ?? bad('Empleado no encontrado.');
  const cli = b.idCliente ? d.clientes.find((x) => x.id === b.idCliente) ?? null : null;
  let total = 0;
  const detalles = b.items.map((it: R) => {
    const p = d.productos.find((x) => x.id === it.idProducto) ?? bad(`Producto no encontrado: ${it.idProducto}`);
    const subtotal = redondear(it.precioUnitario * it.cantidad);
    total += subtotal;
    return { id: nid('detq'), producto: { id: p.id, nombre: p.nombre }, tipoVenta: it.tipoVenta ?? 'unidad', cantidad: it.cantidad, precioUnitario: it.precioUnitario, subtotal };
  });
  const cot: R = {
    id: nid('cot'), fecha: isoLocal(new Date()), empleado: { id: emp.id, nombre: emp.nombre },
    idCliente: cli ? cli.id : null, clienteNombre: cli ? nombreCliente(cli) : (b.clienteNombre?.trim() || 'Clientes Varios'),
    clienteDni: cli ? cli.dni : b.clienteDni || undefined, total: redondear(total), estado: true, convertida: false, detalles,
  };
  d.cotizaciones.push(cot);
  return cot;
});
ruta('PUT', '/cotizaciones/:n/anular', (_c, id) => { porId(cargarDB().cotizaciones, id, 'Cotización no encontrada.').estado = false; return undefined; });
ruta('PUT', '/cotizaciones/:n/convertir', (_c, id) => { porId(cargarDB().cotizaciones, id, 'Cotización no encontrada.').convertida = true; return undefined; });

/* ============================================================
   TRASLADOS
   ============================================================ */
const trasOrdenados = () => [...cargarDB().traslados].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : b.id - a.id));
ruta('GET', '/traslados', (c) => {
  const tipo = c.q.get('tipo');
  const q = norm(c.q.get('q')).trim();
  let arr = trasOrdenados();
  if (tipo) arr = arr.filter((t) => t.tipo === tipo);
  if (q) arr = arr.filter((t) => norm(t.nombreSucursal).includes(q) || norm(t.observacion).includes(q) || t.detalles.some((x: R) => norm(x.nombreProducto).includes(q)));
  return paginar(arr, c.q);
});
ruta('GET', '/traslados/:n', (_c, id) => porId(cargarDB().traslados, id, 'Traslado no encontrado.'));
ruta('POST', '/traslados', (c) => {
  const b = c.body ?? {};
  const d = cargarDB();
  if (!b.detalles?.length) bad('El traslado debe tener al menos un producto.');
  const suc = d.sucursales.find((s) => s.id === b.idSucursal) ?? bad('Sucursal no encontrada.');
  if (b.tipo !== 'INGRESO' && b.tipo !== 'EGRESO') bad('Tipo de traslado inválido.');
  if (b.tipo === 'EGRESO') {
    for (const it of b.detalles) {
      const p = d.productos.find((x) => x.id === it.idProducto) ?? bad(`Producto no encontrado: ${it.idProducto}`);
      if (stockDe(p.id) < it.cantidad) bad(`Stock insuficiente para ${p.nombre} (disponible: ${stockDe(p.id)}, requerido: ${it.cantidad})`, 409);
    }
  }
  let total = 0;
  const detalles = b.detalles.map((it: R) => {
    const p = d.productos.find((x) => x.id === it.idProducto) ?? bad(`Producto no encontrado: ${it.idProducto}`);
    if (b.tipo === 'EGRESO') descontarFefo(p.id, it.cantidad);
    else agregarLote(p.id, `TR${nid('lote')}`, ymd(new Date(Date.now() + 365 * 86400_000)), it.cantidad);
    const subtotal = redondear(it.cantidad * it.precioUnitario);
    total += subtotal;
    return { id: nid('dett'), idProducto: p.id, nombreProducto: p.nombre, cantidad: it.cantidad, precioUnitario: it.precioUnitario, subtotal };
  });
  const t: R = { id: nid('tras'), tipo: b.tipo, idSucursal: suc.id, nombreSucursal: suc.nombre, fecha: isoLocal(new Date()), total: redondear(total), observacion: b.observacion ?? '', detalles };
  d.traslados.push(t);
  return t;
});
void lotesDe;

/* ============================================================
   EMPRESA Y RESPALDO
   ============================================================ */
ruta('GET', '/empresa', () => cargarDB().empresa);
ruta('POST', '/empresa', (c) => { const d = cargarDB(); d.empresa = { ...d.empresa, ...c.body, id: 1 }; return d.empresa; });
ruta('GET', '/backup/manual', () => new Resp(
  `-- Respaldo de demostración (${isoLocal(new Date())})\n-- Este modo no usa base de datos real.\n`, {}, 'application/sql'));
ruta('POST', '/backup/enviar-correo', () => new Resp('Modo demostración: no se envió ningún correo.', {}, 'text/plain'));
