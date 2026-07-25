import type { CuentasPorPagar, CompraDetalle } from '@/api/reportes';
import { crearPos80Builder, crearA4Builder, formatFecha, formatEmision, formatMoneda, ColumnaReporte } from './pdfBase';

const columnas: ColumnaReporte<CompraDetalle>[] = [
  { header: 'Comprobante', align: 'left', widthA4: 45, render: (f) => `${f.serie}-${f.numero}` },
  { header: 'Proveedor', align: 'left', widthA4: 55, render: (f) => f.proveedor },
  { header: 'Total', align: 'right', widthA4: 30, render: (f) => formatMoneda(f.total) },
  { header: 'Estado', align: 'right', widthA4: 40, render: (f) => (f.estadoPago ? 'Pagado' : 'Pendiente') },
];

export function generarCuentasPorPagarPos80(data: CuentasPorPagar): Blob {
  const altura = 55 + data.compras.length * 22 + 25;
  const b = crearPos80Builder(altura);

  b.texto('CUENTAS POR PAGAR', { align: 'center', size: 9.5, bold: true });
  b.texto('Compras Realizadas', { align: 'center', size: 8 });
  b.linea();
  b.texto(`Del ${formatFecha(data.fechaInicio)} al ${formatFecha(data.fechaFin)}`, { size: 7.5 });
  b.texto(`Emitido: ${formatEmision()}`, { size: 7.5 });
  b.linea();

  data.compras.forEach((c) => {
    b.texto(`${c.comprobante} ${c.serie}-${c.numero}`, { bold: true, size: 7.5 });
    b.texto(`  Proveedor: ${c.proveedor}`, { size: 7 });
    b.texto(`  Fecha: ${formatFecha(c.fechaEmision)}`, { size: 7 });
    b.texto(`  Total: ${formatMoneda(c.total)}  |  ${c.estadoPago ? 'Pagado' : 'Pendiente'}`, { size: 7 });
    b.espacio(1);
  });

  b.linea(false);
  b.texto(`Total comprado: ${formatMoneda(data.totalComprado)}`, { bold: true, size: 8 });
  b.texto(`Total pagado: ${formatMoneda(data.totalPagado)}`, { size: 7.5 });
  b.texto(`Total pendiente: ${formatMoneda(data.totalPendiente)}`, { bold: true, size: 8 });
  b.linea();
  b.texto('Reporte generado por el sistema', { align: 'center', size: 6.5 });

  return b.finalizar();
}

export function generarCuentasPorPagarA4(data: CuentasPorPagar): Blob {
  const b = crearA4Builder();

  b.titulo('Cuentas por Pagar / Compras Realizadas');
  b.subtitulo([
    `Del ${formatFecha(data.fechaInicio)} al ${formatFecha(data.fechaFin)}`,
    `Fecha de emisión: ${formatEmision()}`,
  ]);
  b.lineaSeparadora();

  b.encabezadoTabla(columnas);
  data.compras.forEach((fila) => b.filaTabla(columnas, fila));

  b.lineaSeparadora();
  b.avanzar(2);
  b.campoValor('Total comprado', formatMoneda(data.totalComprado), true);
  b.campoValor('Total pagado', formatMoneda(data.totalPagado));
  b.campoValor('Total pendiente', formatMoneda(data.totalPendiente), true);

  return b.finalizar();
}
