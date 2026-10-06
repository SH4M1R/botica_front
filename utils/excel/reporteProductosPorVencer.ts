import type { ProductoPorVencer } from '@/api/reportes';
import { crearExcelBuilder, formatFecha, formatEmision, ColumnaExcel } from './excelBase';

const columnas: ColumnaExcel<ProductoPorVencer>[] = [
  { header: 'Producto', align: 'left', width: 35, render: (f) => f.nombreProducto },
  { header: 'Laboratorio', align: 'left', width: 22, render: (f) => f.laboratorio || '—' },
  { header: 'Lote', align: 'left', width: 14, render: (f) => f.lote ?? '—' },
  { header: 'Vencimiento', align: 'left', width: 14, render: (f) => formatFecha(f.fechaVencimiento) },
  { header: 'Stock', align: 'right', width: 10, render: (f) => f.stock },
  {
    header: 'Días',
    align: 'right',
    width: 16,
    render: (f) => (f.diasRestantes < 0 ? `Vencido (${Math.abs(f.diasRestantes)}d)` : `${f.diasRestantes}d`),
  },
];

export async function generarProductosPorVencerExcel(
  filas: ProductoPorVencer[],
  dias = 90,
  logo?: string
): Promise<Blob> {
  const b = crearExcelBuilder('Productos por Vencer');
  await b.encabezadoEmpresa(logo);

  b.titulo('Productos por Vencer');
  b.subtitulo([`Próximos ${dias} días`, `Fecha de emisión: ${formatEmision()}`]);

  b.tabla(columnas, filas);

  b.campoValor('Total de productos', filas.length, true);

  return b.finalizar();
}