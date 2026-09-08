import type { ProductoPorVencer } from '@/api/reportes';
import { crearPos80Builder, crearA4Builder, formatFecha, formatEmision, ColumnaReporte } from './pdfBase';

const columnas: ColumnaReporte<ProductoPorVencer>[] = [
  { header: 'Producto', align: 'left', widthA4: 55, render: (f) => f.nombreProducto },
  { header: 'Lote', align: 'left', widthA4: 25, render: (f) => f.lote ?? '—' },
  { header: 'Vencimiento', align: 'left', widthA4: 30, render: (f) => formatFecha(f.fechaVencimiento) },
  { header: 'Stock', align: 'right', widthA4: 20, render: (f) => String(f.stock) },
  {
    header: 'Días',
    align: 'right',
    widthA4: 20,
    render: (f) => (f.diasRestantes < 0 ? `Vencido (${Math.abs(f.diasRestantes)}d)` : `${f.diasRestantes}d`),
  },
];

export async function generarProductosPorVencerPos80(
  filas: ProductoPorVencer[],
  dias = 90,
  logo?: string
): Promise<Blob> {
  const altura = 60 + filas.length * 22 + 20;
  const b = crearPos80Builder(altura);
  await b.encabezadoEmpresa(logo);

  b.texto('PRODUCTOS POR VENCER', { align: 'center', size: 9.5, bold: true });
  b.texto(`Próximos ${dias} días`, { align: 'center', size: 7.5 });
  b.linea();
  b.texto(`Emitido: ${formatEmision()}`, { size: 7.5 });
  b.linea();

  if (filas.length === 0) {
    b.texto('No hay productos por vencer.', { align: 'center', size: 7.5 });
  } else {
    filas.forEach((p) => {
      b.texto(p.nombreProducto, { bold: true, size: 7.5 });
      b.texto(`  Lote: ${p.lote ?? '—'}  |  Vence: ${formatFecha(p.fechaVencimiento)}`, { size: 7 });
      b.texto(
        `  Stock: ${p.stock}  |  ${
          p.diasRestantes < 0 ? `Vencido hace ${Math.abs(p.diasRestantes)}d` : `${p.diasRestantes} días restantes`
        }`,
        { size: 7 }
      );
      b.espacio(1);
    });
  }

  b.linea(false);
  b.texto(`Total de productos: ${filas.length}`, { bold: true, size: 8 });
  b.linea();
  b.texto('Reporte generado por el sistema', { align: 'center', size: 6.5 });

  return b.finalizar();
}

export async function generarProductosPorVencerA4(
  filas: ProductoPorVencer[],
  dias = 90,
  logo?: string
): Promise<Blob> {
  const b = crearA4Builder();
  await b.encabezadoEmpresa(logo);

  b.titulo('Productos por Vencer');
  b.subtitulo([`Próximos ${dias} días`, `Fecha de emisión: ${formatEmision()}`]);
  b.lineaSeparadora();

  b.encabezadoTabla(columnas);
  filas.forEach((fila) => b.filaTabla(columnas, fila));

  b.lineaSeparadora();
  b.avanzar(2);
  b.campoValor('Total de productos', String(filas.length), true);

  return b.finalizar();
}