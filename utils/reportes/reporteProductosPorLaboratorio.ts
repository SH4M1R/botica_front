import type { ReporteProductosPorLaboratorio, ProductoPorLaboratorio } from '@/api/reportes';
import {
  crearPos80Builder,
  crearA4Builder,
  formatFecha,
  formatEmision,
  formatMoneda,
  ColumnaReporte,
} from './pdfBase';

const columnas: ColumnaReporte<ProductoPorLaboratorio>[] = [
  { header: 'Producto', align: 'left', widthA4: 65, render: (f) => f.nombreProducto },
  { header: 'Stock', align: 'right', widthA4: 25, render: (f) => String(f.stock) },
  { header: 'Stock Fisico', align: 'right', widthA4: 25, render: () => '' },
  { header: 'P. Venta', align: 'right', widthA4: 30, render: (f) => formatMoneda(f.precioVenta) },
  {
    header: 'Vencimiento',
    align: 'right',
    widthA4: 30,
    render: (f) => (f.fechaVencimiento ? formatFecha(f.fechaVencimiento) : '—'),
  },
];

export async function generarProductosPorLaboratorioPos80(
  data: ReporteProductosPorLaboratorio,
  logo?: string
): Promise<Blob> {
  const altura = 65 + data.productos.length * 22 + 20;
  const b = crearPos80Builder(altura);
  await b.encabezadoEmpresa(logo);

  b.texto('PRODUCTOS POR LABORATORIO', { align: 'center', size: 9, bold: true });
  b.texto(data.nombreLaboratorio, { align: 'center', size: 8, bold: true });
  b.linea();
  b.texto(`Emitido: ${formatEmision()}`, { size: 7.5 });
  b.linea();

  b.tabla(columnas, data.productos);

  b.linea(false);
  b.texto(`Total de productos: ${data.totalProductos}`, { bold: true, size: 8 });
  b.linea();
  b.texto('Reporte generado por el sistema', { align: 'center', size: 6.5 });

  return b.finalizar();
}

export async function generarProductosPorLaboratorioA4(
  data: ReporteProductosPorLaboratorio,
  logo?: string
): Promise<Blob> {
  const b = crearA4Builder();
  await b.encabezadoEmpresa(logo);

  b.titulo(`Productos del Laboratorio: ${data.nombreLaboratorio}`);
  b.subtitulo([`Fecha de emisión: ${formatEmision()}`, `Total de productos: ${data.totalProductos}`]);
  b.lineaSeparadora();

  b.encabezadoTabla(columnas);
  data.productos.forEach((fila) => b.filaTabla(columnas, fila));

  return b.finalizar();
}