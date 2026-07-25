import type { ReporteInventarioValorado, InventarioValoradoItem } from '@/api/reportes';
import { crearPos80Builder, crearA4Builder, formatEmision, formatMoneda, ColumnaReporte } from './pdfBase';

const columnas: ColumnaReporte<InventarioValoradoItem>[] = [
  { header: 'Producto', align: 'left', widthA4: 55, render: (f) => f.nombreProducto },
  { header: 'Stock', align: 'right', widthA4: 25, render: (f) => String(f.stock) },
  { header: 'Costo', align: 'right', widthA4: 30, render: (f) => formatMoneda(f.precioCosto) },
  { header: 'Valor Costo', align: 'right', widthA4: 30, render: (f) => formatMoneda(f.valorCosto) },
  { header: 'Valor Venta', align: 'right', widthA4: 30, render: (f) => formatMoneda(f.valorVenta) },
];

export function generarInventarioValoradoPos80(data: ReporteInventarioValorado): Blob {
  const altura = 55 + data.productos.length * 24 + 25;
  const b = crearPos80Builder(altura);

  b.texto('STOCK E INVENTARIO', { align: 'center', size: 9.5, bold: true });
  b.texto('Valorado', { align: 'center', size: 8 });
  b.linea();
  b.texto(`Emitido: ${formatEmision()}`, { size: 7.5 });
  b.linea();

  data.productos.forEach((p) => {
    b.texto(p.nombreProducto, { bold: true, size: 7.5 });
    b.texto(`  Stock: ${p.stock}  |  Costo: ${formatMoneda(p.precioCosto)}`, { size: 7 });
    b.texto(`  Valor costo: ${formatMoneda(p.valorCosto)}  |  Valor venta: ${formatMoneda(p.valorVenta)}`, {
      size: 7,
    });
    b.espacio(1);
  });

  b.linea(false);
  b.texto(`Total de productos: ${data.totalProductos}`, { bold: true, size: 8 });
  b.texto(`Valor total (costo): ${formatMoneda(data.valorTotalCosto)}`, { bold: true, size: 8 });
  b.texto(`Valor total (venta): ${formatMoneda(data.valorTotalVenta)}`, { bold: true, size: 8 });
  b.linea();
  b.texto('Reporte generado por el sistema', { align: 'center', size: 6.5 });

  return b.finalizar();
}

export function generarInventarioValoradoA4(data: ReporteInventarioValorado): Blob {
  const b = crearA4Builder();

  b.titulo('Stock Actual e Inventario Valorado');
  b.subtitulo([`Fecha de emisión: ${formatEmision()}`]);
  b.lineaSeparadora();

  b.encabezadoTabla(columnas);
  data.productos.forEach((fila) => b.filaTabla(columnas, fila));

  b.lineaSeparadora();
  b.avanzar(2);
  b.campoValor('Total de productos', String(data.totalProductos), true);
  b.campoValor('Valor total (costo)', formatMoneda(data.valorTotalCosto), true);
  b.campoValor('Valor total (venta)', formatMoneda(data.valorTotalVenta), true);

  return b.finalizar();
}
