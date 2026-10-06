import type { ReporteVentasPorProducto, VentaDetalleProducto } from '@/api/reportes';
import { crearExcelBuilder, formatFecha, formatFechaHora, formatEmision, formatMoneda, ColumnaExcel } from './excelBase';

const columnas: ColumnaExcel<VentaDetalleProducto>[] = [
  { header: 'Fecha', align: 'left', width: 20, render: (f) => formatFechaHora(f.fecha) },
  { header: 'Cliente', align: 'left', width: 25, render: (f) => f.cliente },
  { header: 'Cant.', align: 'right', width: 10, render: (f) => f.cantidad },
  { header: 'P. Unit.', align: 'right', width: 14, render: (f) => formatMoneda(f.precioUnitario) },
  { header: 'Subtotal', align: 'right', width: 14, render: (f) => formatMoneda(f.subtotal) },
];

export async function generarVentasPorProductoExcel(data: ReporteVentasPorProducto, logo?: string): Promise<Blob> {
  const b = crearExcelBuilder('Ventas por Producto');
  await b.encabezadoEmpresa(logo);

  b.titulo('Ventas por Producto');
  b.subtitulo([
    `Producto: ${data.nombreProducto}`,
    `Del ${formatFecha(data.fechaInicio)} al ${formatFecha(data.fechaFin)}`,
    `Fecha de emisión: ${formatEmision()}`,
  ]);

  b.tabla(columnas, data.detalle);

  b.campoValor('Total unidades vendidas', data.totalUnidades, true);
  b.campoValor('Total vendido', formatMoneda(data.totalVendido), true);

  return b.finalizar();
}