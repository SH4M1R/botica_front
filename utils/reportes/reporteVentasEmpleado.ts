import type { VentaPorEmpleado } from '@/api/reportes';
import { crearPos80Builder, crearA4Builder, formatFecha, formatEmision, formatMoneda, ColumnaReporte } from './pdfBase';

const columnas: ColumnaReporte<VentaPorEmpleado>[] = [
  { header: 'Empleado', align: 'left', widthA4: 70, render: (f) => f.nombreEmpleado },
  { header: 'N° Ventas', align: 'right', widthA4: 40, render: (f) => String(f.cantidadVentas) },
  { header: 'Total Vendido', align: 'right', widthA4: 60, render: (f) => formatMoneda(f.totalVendido) },
];

export async function generarVentasPorEmpleadoPos80(
  fechaInicio: string,
  fechaFin: string,
  filas: VentaPorEmpleado[],
  logo?: string
): Promise<Blob> {
  const altura = 65 + filas.length * 16 + 20;
  const b = crearPos80Builder(altura);
  await b.encabezadoEmpresa(logo);

  b.texto('VENTAS POR EMPLEADO', { align: 'center', size: 9.5, bold: true });
  b.linea();
  b.texto(`Del ${formatFecha(fechaInicio)} al ${formatFecha(fechaFin)}`, { size: 7.5 });
  b.texto(`Emitido: ${formatEmision()}`, { size: 7.5 });
  b.linea();

  b.tabla(columnas, filas);

  const totalVentas = filas.reduce((s, f) => s + f.cantidadVentas, 0);
  const totalVendido = filas.reduce((s, f) => s + f.totalVendido, 0);

  b.linea(false);
  b.texto(`Total ventas: ${totalVentas}`, { bold: true, size: 8 });
  b.texto(`Total vendido: ${formatMoneda(totalVendido)}`, { bold: true, size: 8 });
  b.linea();
  b.texto('Reporte generado por el sistema', { align: 'center', size: 6.5 });

  return b.finalizar();
}

export async function generarVentasPorEmpleadoA4(
  fechaInicio: string,
  fechaFin: string,
  filas: VentaPorEmpleado[],
  logo?: string
): Promise<Blob> {
  const b = crearA4Builder();
  await b.encabezadoEmpresa(logo);

  b.titulo('Ventas por Empleado / Vendedor');
  b.subtitulo([`Del ${formatFecha(fechaInicio)} al ${formatFecha(fechaFin)}`, `Fecha de emisión: ${formatEmision()}`]);
  b.lineaSeparadora();

  b.encabezadoTabla(columnas);
  filas.forEach((fila) => b.filaTabla(columnas, fila));

  const totalVentas = filas.reduce((s, f) => s + f.cantidadVentas, 0);
  const totalVendido = filas.reduce((s, f) => s + f.totalVendido, 0);

  b.lineaSeparadora();
  b.avanzar(2);
  b.campoValor('Total de ventas', String(totalVentas), true);
  b.campoValor('Total vendido', formatMoneda(totalVendido), true);

  return b.finalizar();
}