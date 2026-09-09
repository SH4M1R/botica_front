import type { FlujoCaja, MovimientoCaja } from '@/api/reportes';
import { crearExcelBuilder, formatFecha, formatEmision, formatMoneda, ColumnaExcel } from './excelBase';

const columnas: ColumnaExcel<MovimientoCaja>[] = [
  { header: 'Fecha', align: 'left', width: 14, render: (f) => formatFecha(f.fecha) },
  { header: 'Tipo', align: 'left', width: 12, render: (f) => f.tipo },
  { header: 'Categoría', align: 'left', width: 20, render: (f) => f.categoria },
  { header: 'Descripción', align: 'left', width: 30, render: (f) => f.descripcion },
  { header: 'Monto', align: 'right', width: 14, render: (f) => formatMoneda(f.monto) },
  { header: 'Medio de Pago', align: 'left', width: 16, render: (f) => f.medioPago },
];

export async function generarFlujoCajaExcel(data: FlujoCaja, logo?: string): Promise<Blob> {
  const b = crearExcelBuilder('Flujo de Caja');
  await b.encabezadoEmpresa(logo);

  b.titulo('Flujo de Caja (Ingresos y Egresos)');
  b.subtitulo([`Del ${formatFecha(data.fechaInicio)} al ${formatFecha(data.fechaFin)}`, `Fecha de emisión: ${formatEmision()}`]);

  b.tabla(columnas, data.movimientos);

  b.campoValor('Total ingresos', formatMoneda(data.totalIngresos));
  b.campoValor('Total egresos', formatMoneda(data.totalEgresos));
  b.campoValor('Saldo neto', formatMoneda(data.saldoNeto), true);

  return b.finalizar();
}