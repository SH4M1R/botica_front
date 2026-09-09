import type { AlertaStock } from '@/api/reportes';
import { crearExcelBuilder, formatEmision, ColumnaExcel } from './excelBase';

const columnas: ColumnaExcel<AlertaStock>[] = [
  { header: 'Producto', align: 'left', width: 35, render: (f) => f.nombreProducto },
  { header: 'Stock', align: 'right', width: 10, render: (f) => f.stock },
  { header: 'Mínimo', align: 'right', width: 10, render: (f) => f.stockMinimo },
  { header: 'Diferencia', align: 'right', width: 12, render: (f) => f.diferencia },
];

export async function generarAlertaStockExcel(filas: AlertaStock[], logo?: string): Promise<Blob> {
  const b = crearExcelBuilder('Alerta de Stock');
  await b.encabezadoEmpresa(logo);

  b.titulo('Productos por Alerta de Stock Mínimo');
  b.subtitulo([`Fecha de emisión: ${formatEmision()}`]);

  b.tabla(columnas, filas);

  b.campoValor('Total de productos en alerta', filas.length, true);

  return b.finalizar();
}