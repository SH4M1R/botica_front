import type { CatalogoTerapeutico } from '@/api/reportes';
import { crearPos80Builder, crearA4Builder, formatEmision, formatMoneda, ColumnaReporte } from './pdfBase';

const columnas: ColumnaReporte<CatalogoTerapeutico>[] = [
  { header: 'Producto', align: 'left', widthA4: 35, render: (f) => f.nombreProducto },
  { header: 'Laboratorio', align: 'left', widthA4: 25, render: (f) => f.laboratorio || '—' },
  { header: 'Principio Activo', align: 'left', widthA4: 35, render: (f) => f.principioActivo ?? '—' },
  { header: 'Acción Terapéutica', align: 'left', widthA4: 35, render: (f) => f.accionTerapeutica ?? '—' },
  { header: 'Stock', align: 'right', widthA4: 15, render: (f) => String(f.stock) },
  { header: 'P. Venta', align: 'right', widthA4: 25, render: (f) => formatMoneda(f.precioVenta) },
];

export async function generarCatalogoTerapeuticoPos80(
  filas: CatalogoTerapeutico[],
  titulo = 'CATÁLOGO TERAPÉUTICO',
  logo?: string
): Promise<Blob> {
  const altura = 65 + filas.length * 26 + 20;
  const b = crearPos80Builder(altura);
  await b.encabezadoEmpresa(logo);

  b.texto(titulo, { align: 'center', size: 9.5, bold: true });
  b.texto('Principio Activo / Acción Terapéutica', { align: 'center', size: 7.5 });
  b.linea();
  b.texto(`Emitido: ${formatEmision()}`, { size: 7.5 });
  b.linea();

  if (filas.length === 0) {
    b.texto('No se encontraron productos.', { align: 'center', size: 7.5 });
  } else {
    filas.forEach((p) => {
      b.texto(p.nombreProducto, { bold: true, size: 7.5 });
      b.texto(`  Lab: ${p.laboratorio || '—'}`, { size: 7 });
      b.texto(`  P. Activo: ${p.principioActivo ?? '—'}`, { size: 7 });
      b.texto(`  Acción: ${p.accionTerapeutica ?? '—'}`, { size: 7 });
      b.texto(`  Stock: ${p.stock}  |  P. Venta: ${formatMoneda(p.precioVenta)}`, { size: 7 });
      b.espacio(1);
    });
  }

  b.linea();
  b.texto(`Total de productos: ${filas.length}`, { bold: true, size: 8 });
  b.linea();
  b.texto('Reporte generado por el sistema', { align: 'center', size: 6.5 });

  return b.finalizar();
}

export async function generarCatalogoTerapeuticoA4(
  filas: CatalogoTerapeutico[],
  titulo = 'Catálogo por Principio Activo y Acción Terapéutica',
  logo?: string
): Promise<Blob> {
  const b = crearA4Builder();
  await b.encabezadoEmpresa(logo);

  b.titulo(titulo);
  b.subtitulo([`Fecha de emisión: ${formatEmision()}`, `Total de productos: ${filas.length}`]);
  b.lineaSeparadora();

  b.encabezadoTabla(columnas);
  filas.forEach((fila) => b.filaTabla(columnas, fila));

  return b.finalizar();
}