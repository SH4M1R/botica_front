import type { FlujoCaja, MovimientoCaja } from '@/api/reportes';
import { crearPos80Builder, crearA4Builder, formatFecha, formatEmision, formatMoneda, ColumnaReporte } from './pdfBase';

const columnas: ColumnaReporte<MovimientoCaja>[] = [
  { header: 'Fecha', align: 'left', widthA4: 25, render: (f) => formatFecha(f.fecha) },
  { header: 'Tipo', align: 'left', widthA4: 22, render: (f) => f.tipo },
  { header: 'Categoría', align: 'left', widthA4: 38, render: (f) => f.categoria },
  { header: 'Descripción', align: 'left', widthA4: 45, render: (f) => f.descripcion },
  { header: 'Monto', align: 'right', widthA4: 40, render: (f) => formatMoneda(f.monto) },
];

export function generarFlujoCajaPos80(data: FlujoCaja): Blob {
  const altura = 55 + data.movimientos.length * 24 + 25;
  const b = crearPos80Builder(altura);

  b.texto('FLUJO DE CAJA', { align: 'center', size: 9.5, bold: true });
  b.texto('Ingresos y Egresos', { align: 'center', size: 8 });
  b.linea();
  b.texto(`Del ${formatFecha(data.fechaInicio)} al ${formatFecha(data.fechaFin)}`, { size: 7.5 });
  b.texto(`Emitido: ${formatEmision()}`, { size: 7.5 });
  b.linea();

  data.movimientos.forEach((m) => {
    b.texto(`${m.tipo} · ${m.categoria}`, { bold: true, size: 7.5 });
    b.texto(`  ${formatFecha(m.fecha)} — ${m.numero}`, { size: 7 });
    b.texto(`  ${m.descripcion}`, { size: 7 });
    b.texto(`  Monto: ${formatMoneda(m.monto)} (${m.medioPago})`, { size: 7 });
    b.espacio(1);
  });

  b.linea(false);
  b.texto(`Total ingresos: ${formatMoneda(data.totalIngresos)}`, { bold: true, size: 8 });
  b.texto(`Total egresos: ${formatMoneda(data.totalEgresos)}`, { bold: true, size: 8 });
  b.texto(`Saldo neto: ${formatMoneda(data.saldoNeto)}`, { bold: true, size: 8.5 });
  b.linea();
  b.texto('Reporte generado por el sistema', { align: 'center', size: 6.5 });

  return b.finalizar();
}

export function generarFlujoCajaA4(data: FlujoCaja): Blob {
  const b = crearA4Builder();

  b.titulo('Flujo de Caja (Ingresos y Egresos)');
  b.subtitulo([
    `Del ${formatFecha(data.fechaInicio)} al ${formatFecha(data.fechaFin)}`,
    `Fecha de emisión: ${formatEmision()}`,
  ]);
  b.lineaSeparadora();

  b.encabezadoTabla(columnas);
  data.movimientos.forEach((fila) => b.filaTabla(columnas, fila));

  b.lineaSeparadora();
  b.avanzar(2);
  b.campoValor('Total ingresos', formatMoneda(data.totalIngresos));
  b.campoValor('Total egresos', formatMoneda(data.totalEgresos));
  b.campoValor('Saldo neto', formatMoneda(data.saldoNeto), true);

  return b.finalizar();
}
