import type { ReporteInventarioValorado, InventarioValoradoItem } from '@/api/reportes';
import { crearExcelBuilder, formatEmision, formatMoneda, ColumnaExcel } from './excelBase';

const columnas: ColumnaExcel<InventarioValoradoItem>[] = [
  { header: 'Producto', align: 'left', width: 35, render: (f) => f.nombreProducto },
  { header: 'Laboratorio', align: 'left', width: 22, render: (f) => f.laboratorio || '—' },
  { header: 'Stock', align: 'right', width: 10, render: (f) => f.stock },
  { header: 'Costo', align: 'right', width: 14, render: (f) => formatMoneda(f.precioCosto) },
  { header: 'Valor Costo', align: 'right', width: 14, render: (f) => formatMoneda(f.valorCosto) },
  { header: 'Valor Venta', align: 'right', width: 14, render: (f) => formatMoneda(f.valorVenta) },
];

export async function generarInventarioValoradoExcel(data: ReporteInventarioValorado, logo?: string): Promise<Blob> {
  const b = crearExcelBuilder('Inventario Valorado');
  await b.encabezadoEmpresa(logo);

  b.titulo('Stock Actual e Inventario Valorado');
  b.subtitulo([`Fecha de emisión: ${formatEmision()}`]);

  b.tabla(columnas, data.productos);

  b.campoValor('Total de productos', data.totalProductos, true);
  b.campoValor('Valor total (costo)', formatMoneda(data.valorTotalCosto), true);
  b.campoValor('Valor total (venta)', formatMoneda(data.valorTotalVenta), true);

  return b.finalizar();
}