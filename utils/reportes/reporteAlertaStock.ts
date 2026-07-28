// reporteAlertaStock.ts
import type { AlertaStock } from '@/api/reportes';
import { crearPos80Builder, crearA4Builder, formatEmision, ColumnaReporte } from './pdfBase';

const columnas: ColumnaReporte<AlertaStock>[] = [
  { header: 'Producto', align: 'left', widthA4: 70, render: (f) => f.nombreProducto },
  { header: 'Stock', align: 'right', widthA4: 30, render: (f) => String(f.stock) },
  { header: 'Mínimo', align: 'right', widthA4: 30, render: (f) => String(f.stockMinimo) },
  { header: 'Diferencia', align: 'right', widthA4: 40, render: (f) => String(f.diferencia) },
];

export async function generarAlertaStockPos80(filas: AlertaStock[], logo?: string): Promise<Blob> {
  const altura = 65 + filas.length * 18 + 20;
  const b = crearPos80Builder(altura);
  await b.encabezadoEmpresa(logo);

  b.texto('ALERTA DE STOCK MÍNIMO', { align: 'center', size: 9.5, bold: true });
  b.linea();
  b.texto(`Emitido: ${formatEmision()}`, { size: 7.5 });
  b.linea();

  if (filas.length === 0) {
    b.texto('No hay productos en alerta de stock.', { align: 'center', size: 7.5 });
  } else {
    filas.forEach((p) => {
      b.texto(p.nombreProducto, { bold: true, size: 7.5 });
      b.texto(`  Stock actual: ${p.stock}  |  Mínimo: ${p.stockMinimo}`, { size: 7 });
      b.texto(`  Diferencia: ${p.diferencia}`, { size: 7 });
      b.espacio(1);
    });
  }

  b.linea(false);
  b.texto(`Total de productos en alerta: ${filas.length}`, { bold: true, size: 8 });
  b.linea();
  b.texto('Reporte generado por el sistema', { align: 'center', size: 6.5 });

  return b.finalizar();
}

export async function generarAlertaStockA4(filas: AlertaStock[], logo?: string): Promise<Blob> {
  const b = crearA4Builder();
  await b.encabezadoEmpresa(logo);

  b.titulo('Productos por Alerta de Stock Mínimo');
  b.subtitulo([`Fecha de emisión: ${formatEmision()}`]);
  b.lineaSeparadora();

  b.encabezadoTabla(columnas);
  filas.forEach((fila) => b.filaTabla(columnas, fila));

  b.lineaSeparadora();
  b.avanzar(2);
  b.campoValor('Total de productos en alerta', String(filas.length), true);

  return b.finalizar();
}