import type { ArqueoCierre } from '@/api/reportes';
import { crearPos80Builder, crearA4Builder, formatFechaHora, formatEmision, formatMoneda } from './pdfBase';

export function generarArqueoCajaPos80(data: ArqueoCierre): Blob {
  const b = crearPos80Builder(110);

  b.texto('ARQUEO Y CIERRE DE CAJA', { align: 'center', size: 9.5, bold: true });
  b.texto(`Caja N° ${data.idArqueo}`, { align: 'center', size: 8, bold: true });
  b.linea();

  b.texto(`Empleado: ${data.nombreEmpleado}`, { size: 7.5 });
  b.texto(`Apertura: ${formatFechaHora(data.fechaInicio)}`, { size: 7.5 });
  b.texto(`Cierre: ${data.fechaFin ? formatFechaHora(data.fechaFin) : '— (sigue abierto)'}`, { size: 7.5 });
  b.texto(`Estado: ${data.estadoArqueo}`, { size: 7.5, bold: true });
  b.texto(`Emitido: ${formatEmision()}`, { size: 7.5 });
  b.linea();

  b.texto('Monto inicial:', { bold: true, size: 8 });
  b.texto(`  ${formatMoneda(data.montoInicial)}`, { size: 7.5 });
  b.espacio(1);

  b.texto('Ventas en efectivo:', { bold: true, size: 8 });
  b.texto(`  ${formatMoneda(data.totalVentasEfectivo)}`, { size: 7.5 });
  b.espacio(1);

  b.texto('Otros ingresos de caja:', { bold: true, size: 8 });
  b.texto(`  ${formatMoneda(data.totalIngresosCaja)}`, { size: 7.5 });
  b.espacio(1);

  b.texto('Egresos de caja:', { bold: true, size: 8 });
  b.texto(`  -${formatMoneda(data.totalEgresosCaja)}`, { size: 7.5 });
  b.espacio(1);

  b.linea(false);
  b.texto(`Saldo esperado: ${formatMoneda(data.saldoEsperado)}`, { bold: true, size: 8 });
  b.texto(`Saldo físico (ingresado): ${data.montoFinal != null ? formatMoneda(data.montoFinal) : '—'}`, {
    bold: true,
    size: 8,
  });

  if (data.diferencia != null) {
    const etiqueta = data.diferencia === 0 ? 'CUADRE EXACTO' : data.diferencia > 0 ? 'SOBRANTE' : 'FALTANTE';
    b.texto(`${etiqueta}: ${formatMoneda(Math.abs(data.diferencia))}`, { bold: true, size: 8.5 });
  } else {
    b.texto('Diferencia: pendiente (arqueo abierto)', { size: 7.5 });
  }

  b.linea();
  b.texto('Reporte generado por el sistema', { align: 'center', size: 6.5 });

  return b.finalizar();
}

export function generarArqueoCajaA4(data: ArqueoCierre): Blob {
  const b = crearA4Builder();

  b.titulo('Reporte de Arqueo y Cierre de Caja');
  b.subtitulo([
    `Caja N°: ${data.idArqueo}`,
    `Empleado: ${data.nombreEmpleado}`,
    `Apertura: ${formatFechaHora(data.fechaInicio)}`,
    `Cierre: ${data.fechaFin ? formatFechaHora(data.fechaFin) : '— (sigue abierto)'}`,
    `Estado: ${data.estadoArqueo}`,
    `Fecha de emisión: ${formatEmision()}`,
  ]);
  b.lineaSeparadora();

  b.campoValor('Monto inicial', formatMoneda(data.montoInicial));
  b.campoValor('Ventas en efectivo', formatMoneda(data.totalVentasEfectivo));
  b.campoValor('Otros ingresos de caja', formatMoneda(data.totalIngresosCaja));
  b.campoValor('Egresos de caja', `- ${formatMoneda(data.totalEgresosCaja)}`);
  b.avanzar(2);
  b.lineaSeparadora();

  b.campoValor('Saldo esperado (sistema)', formatMoneda(data.saldoEsperado), true);
  b.campoValor('Saldo físico ingresado', data.montoFinal != null ? formatMoneda(data.montoFinal) : '—', true);

  b.avanzar(2);
  if (data.diferencia != null) {
    const etiqueta = data.diferencia === 0 ? 'CUADRE EXACTO' : data.diferencia > 0 ? 'SOBRANTE' : 'FALTANTE';
    b.campoValor(etiqueta, formatMoneda(Math.abs(data.diferencia)), true);
  } else {
    b.campoValor('Diferencia', 'Pendiente (arqueo abierto)', true);
  }

  return b.finalizar();
}
