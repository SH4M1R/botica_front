import type { ConsolidadoGeneral } from '@/api/reportes';
import { crearExcelBuilder, formatFecha, formatEmision, formatMoneda } from './excelBase';

export async function generarConsolidadoGeneralExcel(data: ConsolidadoGeneral, logo?: string): Promise<Blob> {
  const b = crearExcelBuilder('Consolidado General');
  await b.encabezadoEmpresa(logo);

  b.titulo('Consolidado General de la Empresa');
  b.subtitulo([`Del ${formatFecha(data.fechaInicio)} al ${formatFecha(data.fechaFin)}`, `Fecha de emisión: ${formatEmision()}`]);

  b.campoValor('Ventas totales', formatMoneda(data.totalVentas));
  b.campoValor('Compras totales', `- ${formatMoneda(data.totalCompras)}`);
  b.espacio();
  b.campoValor('Utilidad bruta', formatMoneda(data.utilidadBruta), true);
  b.espacio();

  b.campoValor('Otros ingresos de caja', formatMoneda(data.totalIngresosCaja));
  b.campoValor('Gastos de caja', `- ${formatMoneda(data.totalEgresosCaja)}`);
  b.espacio();

  b.campoValor('UTILIDAD NETA', formatMoneda(data.utilidadNeta), true);

  return b.finalizar();
}