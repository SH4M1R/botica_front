import type { CompraPorProveedor } from '@/api/reportes';
import { crearExcelBuilder, formatFecha, formatEmision, formatMoneda, ColumnaExcel } from './excelBase';

const columnas: ColumnaExcel<CompraPorProveedor>[] = [
  { header: 'Proveedor', align: 'left', width: 35, render: (f) => f.nombreProveedor },
  { header: 'N° Compras', align: 'right', width: 14, render: (f) => f.cantidadCompras },
  { header: 'Total Comprado', align: 'right', width: 16, render: (f) => formatMoneda(f.totalComprado) },
];

export async function generarComprasPorProveedorExcel(
  fechaInicio: string,
  fechaFin: string,
  filas: CompraPorProveedor[],
  logo?: string
): Promise<Blob> {
  const b = crearExcelBuilder('Compras por Proveedor');
  await b.encabezadoEmpresa(logo);

  b.titulo('Historial de Compras por Proveedor');
  b.subtitulo([`Del ${formatFecha(fechaInicio)} al ${formatFecha(fechaFin)}`, `Fecha de emisión: ${formatEmision()}`]);

  b.tabla(columnas, filas);

  const totalCompras = filas.reduce((s, f) => s + f.cantidadCompras, 0);
  const totalComprado = filas.reduce((s, f) => s + f.totalComprado, 0);
  b.campoValor('Total de compras', totalCompras, true);
  b.campoValor('Total comprado', formatMoneda(totalComprado), true);

  return b.finalizar();
}