import type { ReporteVentasPeriodo } from '@/api/reportes';
import { crearExcelBuilder, formatFecha, formatEmision, formatMoneda, ColumnaExcel } from './excelBase';

const columnas: ColumnaExcel<ReporteVentasPeriodo['detallePorDia'][number]>[] = [
  { header: 'Fecha', align: 'left', width: 14, render: (f) => formatFecha(f.fecha) },
  { header: 'N° Ventas', align: 'right', width: 12, render: (f) => f.cantidadVentas },
  { header: 'Subtotal', align: 'right', width: 14, render: (f) => formatMoneda(f.subtotal) },
  { header: 'IGV', align: 'right', width: 14, render: (f) => formatMoneda(f.igv) },
  { header: 'Total', align: 'right', width: 14, render: (f) => formatMoneda(f.total) },
];

export async function generarReporteVentasPeriodoExcel(data: ReporteVentasPeriodo, logo?: string): Promise<Blob> {
  const b = crearExcelBuilder('Ventas Periodo');
  await b.encabezadoEmpresa(logo);

  b.titulo('Reporte de Ventas Diarias / Periódicas');
  b.subtitulo([`Del ${formatFecha(data.fechaInicio)} al ${formatFecha(data.fechaFin)}`, `Fecha de emisión: ${formatEmision()}`]);

  b.tabla(columnas, data.detallePorDia);

  b.campoValor('Total de ventas', data.totalVentas, true);
  b.campoValor('Subtotal', formatMoneda(data.subtotalGeneral));
  b.campoValor('IGV', formatMoneda(data.igvGeneral));
  b.campoValor('TOTAL GENERAL', formatMoneda(data.totalGeneral), true);

  return b.finalizar();
}