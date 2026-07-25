import type { ConsolidadoGeneral } from '@/api/reportes';
import { crearPos80Builder, crearA4Builder, formatFecha, formatEmision, formatMoneda } from './pdfBase';

export function generarConsolidadoGeneralPos80(data: ConsolidadoGeneral): Blob {
  const b = crearPos80Builder(110);

  b.texto('CONSOLIDADO GENERAL', { align: 'center', size: 9.5, bold: true });
  b.texto('Resumen Ejecutivo de la Empresa', { align: 'center', size: 7.5 });
  b.linea();
  b.texto(`Del ${formatFecha(data.fechaInicio)} al ${formatFecha(data.fechaFin)}`, { size: 7.5 });
  b.texto(`Emitido: ${formatEmision()}`, { size: 7.5 });
  b.linea();

  b.texto('Ventas totales:', { bold: true, size: 8 });
  b.texto(`  ${formatMoneda(data.totalVentas)}`, { size: 7.5 });
  b.espacio(1);

  b.texto('Compras totales:', { bold: true, size: 8 });
  b.texto(`  -${formatMoneda(data.totalCompras)}`, { size: 7.5 });
  b.espacio(1);

  b.linea(false);
  b.texto(`Utilidad bruta: ${formatMoneda(data.utilidadBruta)}`, { bold: true, size: 8.5 });
  b.espacio(1);

  b.texto('Otros ingresos de caja:', { bold: true, size: 8 });
  b.texto(`  ${formatMoneda(data.totalIngresosCaja)}`, { size: 7.5 });
  b.texto('Gastos de caja:', { bold: true, size: 8 });
  b.texto(`  -${formatMoneda(data.totalEgresosCaja)}`, { size: 7.5 });

  b.linea(false);
  b.texto(`UTILIDAD NETA: ${formatMoneda(data.utilidadNeta)}`, { bold: true, size: 9 });

  b.linea();
  b.texto('Reporte generado por el sistema', { align: 'center', size: 6.5 });

  return b.finalizar();
}

export function generarConsolidadoGeneralA4(data: ConsolidadoGeneral): Blob {
  const b = crearA4Builder();

  b.titulo('Consolidado General de la Empresa');
  b.subtitulo([
    `Del ${formatFecha(data.fechaInicio)} al ${formatFecha(data.fechaFin)}`,
    `Fecha de emisión: ${formatEmision()}`,
  ]);
  b.lineaSeparadora();

  b.campoValor('Ventas totales', formatMoneda(data.totalVentas));
  b.campoValor('Compras totales', `- ${formatMoneda(data.totalCompras)}`);
  b.avanzar(2);
  b.lineaSeparadora();
  b.campoValor('Utilidad bruta', formatMoneda(data.utilidadBruta), true);

  b.avanzar(4);
  b.campoValor('Otros ingresos de caja', formatMoneda(data.totalIngresosCaja));
  b.campoValor('Gastos de caja', `- ${formatMoneda(data.totalEgresosCaja)}`);

  b.avanzar(2);
  b.lineaSeparadora(true);
  b.campoValor('UTILIDAD NETA', formatMoneda(data.utilidadNeta), true);

  return b.finalizar();
}
