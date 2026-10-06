import type { ProductoMasVendido } from '@/api/reportes';
import { crearPos80Builder, crearA4Builder, formatFecha, formatEmision, formatMoneda, ColumnaReporte } from './pdfBase';

const columnas: ColumnaReporte<ProductoMasVendido>[] = [
  { header: 'Producto', align: 'left', widthA4: 75, render: (f) => f.nombreProducto },
  { header: 'Unidades', align: 'right', widthA4: 40, render: (f) => String(f.unidadesVendidas) },
  { header: 'Monto Vendido', align: 'right', widthA4: 55, render: (f) => formatMoneda(f.montoVendido) },
];

export async function generarTopProductosPos80(
  fechaInicio: string,
  fechaFin: string,
  filas: ProductoMasVendido[],
  logo?: string
): Promise<Blob> {
  const altura = 65 + filas.length * 16 + 20;
  const b = crearPos80Builder(altura);
  await b.encabezadoEmpresa(logo);

  b.texto('PRODUCTOS MÁS VENDIDOS', { align: 'center', size: 9.5, bold: true });
  b.texto('Ranking (Top / ABC)', { align: 'center', size: 8 });
  b.linea();
  b.texto(`Del ${formatFecha(fechaInicio)} al ${formatFecha(fechaFin)}`, { size: 7.5 });
  b.texto(`Emitido: ${formatEmision()}`, { size: 7.5 });
  b.linea();

  b.tabla(columnas, filas);

  b.linea(false);
  const totalUnidades = filas.reduce((s, f) => s + f.unidadesVendidas, 0);
  const totalMonto = filas.reduce((s, f) => s + f.montoVendido, 0);
  b.texto(`Total unidades: ${totalUnidades}`, { bold: true, size: 8 });
  b.texto(`Total vendido: ${formatMoneda(totalMonto)}`, { bold: true, size: 8 });
  b.linea();
  b.texto('Reporte generado por el sistema', { align: 'center', size: 6.5 });

  return b.finalizar();
}

export async function generarTopProductosA4(
  fechaInicio: string,
  fechaFin: string,
  filas: ProductoMasVendido[],
  logo?: string
): Promise<Blob> {
  const b = crearA4Builder();
  await b.encabezadoEmpresa(logo);

  b.titulo('Productos Más Vendidos (Top / ABC)');
  b.subtitulo([`Del ${formatFecha(fechaInicio)} al ${formatFecha(fechaFin)}`, `Fecha de emisión: ${formatEmision()}`]);
  b.lineaSeparadora();

  b.encabezadoTabla(columnas);
  filas.forEach((fila) => b.filaTabla(columnas, fila));

  const totalUnidades = filas.reduce((s, f) => s + f.unidadesVendidas, 0);
  const totalMonto = filas.reduce((s, f) => s + f.montoVendido, 0);

  b.lineaSeparadora();
  b.avanzar(2);
  b.campoValor('Total unidades vendidas', String(totalUnidades), true);
  b.campoValor('Total vendido', formatMoneda(totalMonto), true);

  return b.finalizar();
}