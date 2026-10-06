import type { ArqueoCierre } from '@/api/reportes';
import { crearExcelBuilder, formatFechaHora, formatEmision, formatMoneda } from './excelBase';

export async function generarArqueoCajaExcel(data: ArqueoCierre, logo?: string): Promise<Blob> {
  const b = crearExcelBuilder('Arqueo de Caja');
  await b.encabezadoEmpresa(logo);

  b.titulo('Reporte de Arqueo y Cierre de Caja');
  b.subtitulo([
    `Caja N°: ${data.idArqueo}`,
    `Empleado: ${data.nombreEmpleado}`,
    `Apertura: ${formatFechaHora(data.fechaInicio)}`,
    `Cierre: ${data.fechaFin ? formatFechaHora(data.fechaFin) : '— (sigue abierto)'}`,
    `Estado: ${data.estadoArqueo}`,
    `Fecha de emisión: ${formatEmision()}`,
  ]);

  b.campoValor('Monto inicial', formatMoneda(data.montoInicial));
  b.campoValor('Ventas en efectivo', formatMoneda(data.totalVentasEfectivo));
  b.campoValor('Otros ingresos de caja', formatMoneda(data.totalIngresosCaja));
  b.campoValor('Egresos de caja', `- ${formatMoneda(data.totalEgresosCaja)}`);
  b.espacio();

  b.campoValor('Saldo esperado (sistema)', formatMoneda(data.saldoEsperado), true);
  b.campoValor('Saldo físico ingresado', data.montoFinal != null ? formatMoneda(data.montoFinal) : '—', true);
  b.espacio();

  if (data.diferencia != null) {
    const etiqueta = data.diferencia === 0 ? 'CUADRE EXACTO' : data.diferencia > 0 ? 'SOBRANTE' : 'FALTANTE';
    b.campoValor(etiqueta, formatMoneda(Math.abs(data.diferencia)), true);
  } else {
    b.campoValor('Diferencia', 'Pendiente (arqueo abierto)', true);
  }

  return b.finalizar();
}