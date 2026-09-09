import type { CuentasPorPagar, CompraDetalle } from '@/api/reportes';
import { crearExcelBuilder, formatFecha, formatEmision, formatMoneda, ColumnaExcel } from './excelBase';

const columnas: ColumnaExcel<CompraDetalle>[] = [
  { header: 'Comprobante', align: 'left', width: 18, render: (f) => `${f.serie}-${f.numero}` },
  { header: 'Proveedor', align: 'left', width: 30, render: (f) => f.proveedor },
  { header: 'Fecha', align: 'left', width: 14, render: (f) => formatFecha(f.fechaEmision) },
  { header: 'Total', align: 'right', width: 14, render: (f) => formatMoneda(f.total) },
  { header: 'Estado', align: 'right', width: 14, render: (f) => (f.estadoPago ? 'Pagado' : 'Pendiente') },
];

export async function generarCuentasPorPagarExcel(data: CuentasPorPagar, logo?: string): Promise<Blob> {
  const b = crearExcelBuilder('Cuentas por Pagar');
  await b.encabezadoEmpresa(logo);

  b.titulo('Cuentas por Pagar / Compras Realizadas');
  b.subtitulo([`Del ${formatFecha(data.fechaInicio)} al ${formatFecha(data.fechaFin)}`, `Fecha de emisión: ${formatEmision()}`]);

  b.tabla(columnas, data.compras);

  b.campoValor('Total comprado', formatMoneda(data.totalComprado), true);
  b.campoValor('Total pagado', formatMoneda(data.totalPagado));
  b.campoValor('Total pendiente', formatMoneda(data.totalPendiente), true);

  return b.finalizar();
}