import type { ReporteProductosPorLaboratorio, ProductoPorLaboratorio } from '@/api/reportes';
import { crearExcelBuilder, formatFecha, formatEmision, formatMoneda, ColumnaExcel } from './excelBase';

const columnas: ColumnaExcel<ProductoPorLaboratorio>[] = [
  { header: 'Producto', align: 'left', width: 35, render: (f) => f.nombreProducto },
  { header: 'Stock', align: 'right', width: 10, render: (f) => f.stock },
  { header: 'P. Venta', align: 'right', width: 14, render: (f) => formatMoneda(f.precioVenta) },
  {
    header: 'Vencimiento',
    align: 'left',
    width: 14,
    render: (f) => (f.fechaVencimiento ? formatFecha(f.fechaVencimiento) : '—'),
  },
];

export async function generarProductosPorLaboratorioExcel(
  data: ReporteProductosPorLaboratorio,
  logo?: string
): Promise<Blob> {
  const b = crearExcelBuilder('Productos por Laboratorio');
  await b.encabezadoEmpresa(logo);

  b.titulo(`Productos del Laboratorio: ${data.nombreLaboratorio}`);
  b.subtitulo([`Fecha de emisión: ${formatEmision()}`, `Total de productos: ${data.totalProductos}`]);

  b.tabla(columnas, data.productos);

  return b.finalizar();
}