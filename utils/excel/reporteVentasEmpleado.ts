import type { VentaPorEmpleado } from '@/api/reportes';
import { crearExcelBuilder, formatFecha, formatEmision, formatMoneda, ColumnaExcel } from './excelBase';

const columnas: ColumnaExcel<VentaPorEmpleado>[] = [
  { header: 'Empleado', align: 'left', width: 30, render: (f) => f.nombreEmpleado },
  { header: 'N° Ventas', align: 'right', width: 14, render: (f) => f.cantidadVentas },
  { header: 'Total Vendido', align: 'right', width: 16, render: (f) => formatMoneda(f.totalVendido) },
];

export async function generarVentasPorEmpleadoExcel(
  fechaInicio: string,
  fechaFin: string,
  filas: VentaPorEmpleado[],
  logo?: string
): Promise<Blob> {
  const b = crearExcelBuilder('Ventas por Empleado');
  await b.encabezadoEmpresa(logo);

  b.titulo('Ventas por Empleado / Vendedor');
  b.subtitulo([`Del ${formatFecha(fechaInicio)} al ${formatFecha(fechaFin)}`, `Fecha de emisión: ${formatEmision()}`]);

  b.tabla(columnas, filas);

  const totalVentas = filas.reduce((s, f) => s + f.cantidadVentas, 0);
  const totalVendido = filas.reduce((s, f) => s + f.totalVendido, 0);
  b.campoValor('Total de ventas', totalVentas, true);
  b.campoValor('Total vendido', formatMoneda(totalVendido), true);

  return b.finalizar();
}