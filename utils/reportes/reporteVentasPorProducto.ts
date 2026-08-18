import type { ReporteVentasPorProducto, VentaDetalleProducto } from '@/api/reportes';
import {
  crearPos80Builder,
  crearA4Builder,
  formatFechaHora,
  formatFecha,
  formatEmision,
  formatMoneda,
  ColumnaReporte,
} from './pdfBase';

const columnas: ColumnaReporte<VentaDetalleProducto>[] = [
  { header: 'Fecha', align: 'left', widthA4: 50, render: (f) => formatFechaHora(f.fecha) },
  { header: 'Cliente', align: 'left', widthA4: 30, render: (f) => f.cliente },
  { header: 'Cant.', align: 'right', widthA4: 20, render: (f) => String(f.cantidad) },
  { header: 'P. Unit.', align: 'right', widthA4: 30, render: (f) => formatMoneda(f.precioUnitario) },
  { header: 'Subtotal', align: 'right', widthA4: 40, render: (f) => formatMoneda(f.subtotal) },
];

export async function generarVentasPorProductoPos80(data: ReporteVentasPorProducto, logo?: string): Promise<Blob> {
  const altura = 65 + data.detalle.length * 20 + 25;
  const b = crearPos80Builder(altura);
  b.encabezadoEmpresa(logo);

  b.texto('VENTAS POR PRODUCTO', { align: 'center', size: 9.5, bold: true });
  b.linea();
  b.texto(`Producto: ${data.nombreProducto}`, { bold: true, size: 7.5 });
  b.texto(`Del ${formatFecha(data.fechaInicio)} al ${formatFecha(data.fechaFin)}`, { size: 7.5 });
  b.texto(`Emitido: ${formatEmision()}`, { size: 7.5 });
  b.linea();

  b.tabla(columnas, data.detalle);

  b.linea(false);
  b.texto(`Total unidades: ${data.totalUnidades}`, { bold: true, size: 8 });
  b.texto(`Total vendido: ${formatMoneda(data.totalVendido)}`, { bold: true, size: 8 });
  b.linea();
  b.texto('Reporte generado por el sistema', { align: 'center', size: 6.5 });

  return b.finalizar();
}

export async function generarVentasPorProductoA4(data: ReporteVentasPorProducto, logo?: string): Promise<Blob> {
  const b = crearA4Builder();
  b.encabezadoEmpresa(logo);

  b.titulo('Ventas por Producto');
  b.subtitulo([
    `Producto: ${data.nombreProducto}`,
    `Del ${formatFecha(data.fechaInicio)} al ${formatFecha(data.fechaFin)}`,
    `Fecha de emisión: ${formatEmision()}`,
  ]);
  b.lineaSeparadora();

  b.encabezadoTabla(columnas);
  data.detalle.forEach((fila) => b.filaTabla(columnas, fila));

  b.lineaSeparadora();
  b.avanzar(2);
  b.campoValor('Total unidades vendidas', String(data.totalUnidades), true);
  b.campoValor('Total vendido', formatMoneda(data.totalVendido), true);

  return b.finalizar();
}