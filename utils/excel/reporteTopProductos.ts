import type { ProductoMasVendido } from '@/api/reportes';
import { crearExcelBuilder, formatFecha, formatEmision, formatMoneda, ColumnaExcel } from './excelBase';

const columnas: ColumnaExcel<ProductoMasVendido>[] = [
  { header: 'Producto', align: 'left', width: 35, render: (f) => f.nombreProducto },
  { header: 'Unidades', align: 'right', width: 14, render: (f) => f.unidadesVendidas },
  { header: 'Monto Vendido', align: 'right', width: 16, render: (f) => formatMoneda(f.montoVendido) },
];

export async function generarTopProductosExcel(
  fechaInicio: string,
  fechaFin: string,
  filas: ProductoMasVendido[],
  logo?: string
): Promise<Blob> {
  const b = crearExcelBuilder('Top Productos');
  await b.encabezadoEmpresa(logo);

  b.titulo('Productos Más Vendidos (Top / ABC)');
  b.subtitulo([`Del ${formatFecha(fechaInicio)} al ${formatFecha(fechaFin)}`, `Fecha de emisión: ${formatEmision()}`]);

  b.tabla(columnas, filas);

  const totalUnidades = filas.reduce((s, f) => s + f.unidadesVendidas, 0);
  const totalMonto = filas.reduce((s, f) => s + f.montoVendido, 0);
  b.campoValor('Total unidades vendidas', totalUnidades, true);
  b.campoValor('Total vendido', formatMoneda(totalMonto), true);

  return b.finalizar();
}