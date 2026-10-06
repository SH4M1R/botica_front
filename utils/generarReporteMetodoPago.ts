import type { ArqueoCaja } from '@/api/arqueo';
import { crearPos80Builder, crearA4Builder, formatFechaHora, formatEmision, formatMoneda, ColumnaReporte } from './reportes/pdfBase';

export interface FilaMetodoPago {
  metodo: string;
  cantidadVentas: number;
  totalVendido: number;
}

const columnas: ColumnaReporte<FilaMetodoPago>[] = [
  { header: 'Método de Pago', align: 'left', widthA4: 85, render: (f) => f.metodo },
  { header: 'N° Ventas', align: 'right', widthA4: 40, render: (f) => String(f.cantidadVentas ?? 0) },
  { header: 'Total Vendido', align: 'right', widthA4: 45, render: (f) => formatMoneda(f.totalVendido ?? 0) },
];

export async function generarReporteMetodoPagoPos80(
  caja: ArqueoCaja,
  filas: FilaMetodoPago[],
  totales: FilaMetodoPago,
  logo?: string
): Promise<Blob> {
  const altura = 60 + filas.length * 16 + 20;
  const b = crearPos80Builder(altura);
  await b.encabezadoEmpresa(logo);

  b.texto('REPORTE POR MÉTODO DE PAGO', { align: 'center', size: 9.5, bold: true });
  b.texto(`Caja N° ${caja.numero}`, { align: 'center', size: 8, bold: true });
  b.linea();
  b.texto(`Empleado: ${caja.empleadoNombre}`, { size: 7.5 });
  b.texto(`Apertura: ${formatFechaHora(caja.fechaInicio)}`, { size: 7.5 });
  b.texto(`Emitido: ${formatEmision()}`, { size: 7.5 });
  b.linea();

  b.tabla(columnas, filas);

  b.linea(false);
  b.texto(`Total ventas: ${totales.cantidadVentas ?? 0}`, { bold: true, size: 8 });
  b.texto(`Total vendido: ${formatMoneda(totales.totalVendido ?? 0)}`, { bold: true, size: 8 });
  b.linea();
  b.texto('Reporte generado por el sistema', { align: 'center', size: 6.5 });

  return b.finalizar();
}

export async function generarReporteMetodoPagoA4(
  caja: ArqueoCaja,
  filas: FilaMetodoPago[],
  totales: FilaMetodoPago,
  logo?: string
): Promise<Blob> {
  const b = crearA4Builder();
  await b.encabezadoEmpresa(logo);

  b.titulo('Reporte por Método de Pago');
  b.subtitulo([
    `Caja N°: ${caja.numero}`,
    `Empleado: ${caja.empleadoNombre}`,
    `Apertura de caja: ${formatFechaHora(caja.fechaInicio)}`,
    `Fecha de emisión: ${formatEmision()}`,
  ]);
  b.lineaSeparadora();

  b.encabezadoTabla(columnas);
  filas.forEach((fila) => b.filaTabla(columnas, fila));

  b.lineaSeparadora();
  b.avanzar(2);
  b.campoValor('Total ventas', String(totales.cantidadVentas ?? 0), true);
  b.campoValor('Total vendido', formatMoneda(totales.totalVendido ?? 0), true);

  return b.finalizar();
}