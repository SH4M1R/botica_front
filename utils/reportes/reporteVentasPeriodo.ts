// reporteVentasPeriodo.ts
import type { ReporteVentasPeriodo } from '@/api/reportes';
import { crearPos80Builder, crearA4Builder, formatFecha, formatEmision, formatMoneda, ColumnaReporte } from './pdfBase';

const columnas: ColumnaReporte<ReporteVentasPeriodo['detallePorDia'][number]>[] = [
  { header: 'Fecha', align: 'left', widthA4: 40, render: (f) => formatFecha(f.fecha) },
  { header: 'N° Ventas', align: 'right', widthA4: 30, render: (f) => String(f.cantidadVentas) },
  { header: 'Subtotal', align: 'right', widthA4: 33, render: (f) => formatMoneda(f.subtotal) },
  { header: 'IGV', align: 'right', widthA4: 33, render: (f) => formatMoneda(f.igv) },
  { header: 'Total', align: 'right', widthA4: 34, render: (f) => formatMoneda(f.total) },
];

export async function generarReporteVentasPeriodoPos80(data: ReporteVentasPeriodo, logo?: string): Promise<Blob> {
  const altura = 65 + data.detallePorDia.length * 22 + 25;
  const b = crearPos80Builder(altura);
  await b.encabezadoEmpresa(logo);

  b.texto('REPORTE DE VENTAS', { align: 'center', size: 9.5, bold: true });
  b.texto('Diarias / Periódicas', { align: 'center', size: 8, bold: true });
  b.linea();
  b.texto(`Del ${formatFecha(data.fechaInicio)} al ${formatFecha(data.fechaFin)}`, { size: 7.5 });
  b.texto(`Emitido: ${formatEmision()}`, { size: 7.5 });
  b.linea();

  b.tabla(columnas, data.detallePorDia);

  b.linea(false);
  b.texto(`Total ventas: ${data.totalVentas}`, { bold: true, size: 8 });
  b.texto(`Subtotal: ${formatMoneda(data.subtotalGeneral)}`, { size: 7.5 });
  b.texto(`IGV: ${formatMoneda(data.igvGeneral)}`, { size: 7.5 });
  b.texto(`Total: ${formatMoneda(data.totalGeneral)}`, { bold: true, size: 8 });
  b.linea();
  b.texto('Reporte generado por el sistema', { align: 'center', size: 6.5 });

  return b.finalizar();
}

export async function generarReporteVentasPeriodoA4(data: ReporteVentasPeriodo, logo?: string): Promise<Blob> {
  const b = crearA4Builder();
  await b.encabezadoEmpresa(logo);

  b.titulo('Reporte de Ventas Diarias / Periódicas');
  b.subtitulo([
    `Del ${formatFecha(data.fechaInicio)} al ${formatFecha(data.fechaFin)}`,
    `Fecha de emisión: ${formatEmision()}`,
  ]);
  b.lineaSeparadora();

  b.encabezadoTabla(columnas);
  data.detallePorDia.forEach((fila) => b.filaTabla(columnas, fila));

  b.lineaSeparadora();
  b.avanzar(2);
  b.campoValor('Total de ventas', String(data.totalVentas), true);
  b.campoValor('Subtotal', formatMoneda(data.subtotalGeneral));
  b.campoValor('IGV', formatMoneda(data.igvGeneral));
  b.campoValor('TOTAL GENERAL', formatMoneda(data.totalGeneral), true);

  return b.finalizar();
}