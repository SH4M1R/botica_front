// reporteComprasProveedor.ts
import type { CompraPorProveedor } from '@/api/reportes';
import { crearPos80Builder, crearA4Builder, formatFecha, formatEmision, formatMoneda, ColumnaReporte } from './pdfBase';

const columnas: ColumnaReporte<CompraPorProveedor>[] = [
  { header: 'Proveedor', align: 'left', widthA4: 75, render: (f) => f.nombreProveedor },
  { header: 'N° Compras', align: 'right', widthA4: 40, render: (f) => String(f.cantidadCompras) },
  { header: 'Total Comprado', align: 'right', widthA4: 55, render: (f) => formatMoneda(f.totalComprado) },
];

export async function generarComprasPorProveedorPos80(
  fechaInicio: string,
  fechaFin: string,
  filas: CompraPorProveedor[],
  logo?: string
): Promise<Blob> {
  const altura = 65 + filas.length * 16 + 20;
  const b = crearPos80Builder(altura);
  await b.encabezadoEmpresa(logo);

  b.texto('HISTORIAL DE COMPRAS', { align: 'center', size: 9.5, bold: true });
  b.texto('Por Proveedor', { align: 'center', size: 8 });
  b.linea();
  b.texto(`Del ${formatFecha(fechaInicio)} al ${formatFecha(fechaFin)}`, { size: 7.5 });
  b.texto(`Emitido: ${formatEmision()}`, { size: 7.5 });
  b.linea();

  b.tabla(columnas, filas);

  const totalCompras = filas.reduce((s, f) => s + f.cantidadCompras, 0);
  const totalComprado = filas.reduce((s, f) => s + f.totalComprado, 0);

  b.linea(false);
  b.texto(`Total compras: ${totalCompras}`, { bold: true, size: 8 });
  b.texto(`Total comprado: ${formatMoneda(totalComprado)}`, { bold: true, size: 8 });
  b.linea();
  b.texto('Reporte generado por el sistema', { align: 'center', size: 6.5 });

  return b.finalizar();
}

export async function generarComprasPorProveedorA4(
  fechaInicio: string,
  fechaFin: string,
  filas: CompraPorProveedor[],
  logo?: string
): Promise<Blob> {
  const b = crearA4Builder();
  await b.encabezadoEmpresa(logo);

  b.titulo('Historial de Compras por Proveedor');
  b.subtitulo([`Del ${formatFecha(fechaInicio)} al ${formatFecha(fechaFin)}`, `Fecha de emisión: ${formatEmision()}`]);
  b.lineaSeparadora();

  b.encabezadoTabla(columnas);
  filas.forEach((fila) => b.filaTabla(columnas, fila));

  const totalCompras = filas.reduce((s, f) => s + f.cantidadCompras, 0);
  const totalComprado = filas.reduce((s, f) => s + f.totalComprado, 0);

  b.lineaSeparadora();
  b.avanzar(2);
  b.campoValor('Total de compras', String(totalCompras), true);
  b.campoValor('Total comprado', formatMoneda(totalComprado), true);

  return b.finalizar();
}