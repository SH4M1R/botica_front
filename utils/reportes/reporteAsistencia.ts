import type { Asistencia } from '@/api/asistencia';
import { crearPos80Builder, crearA4Builder, formatFecha, formatEmision, ColumnaReporte } from './pdfBase';

function formatHora(fechaHora: string | null) {
  if (!fechaHora) return '—';
  return new Date(fechaHora).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

const columnasA4: ColumnaReporte<Asistencia>[] = [
  { header: 'Empleado', align: 'left', widthA4: 65, render: (f) => f.nombreEmpleado },
  { header: 'Fecha', align: 'right', widthA4: 30, render: (f) => formatFecha(f.fecha) },
  { header: 'Entrada', align: 'right', widthA4: 25, render: (f) => formatHora(f.horaEntrada) },
  { header: 'Salida', align: 'right', widthA4: 25, render: (f) => formatHora(f.horaSalida) },
  { header: 'Tardanza', align: 'right', widthA4: 25, render: (f) => (f.tardanza ? `${f.minutosTardanza} min` : '—') },
];

/**
 * Reporte Formato POS Ticket (80mm) usando pdfBase
 */
export async function generarReporteAsistenciaPos80(
  fechaInicio: string,
  fechaFin: string,
  registros: Asistencia[],
  logo?: string
): Promise<Blob> {
  const alturaEstimada = 90 + registros.length * 18 + 20;
  const b = crearPos80Builder(alturaEstimada);
  await b.encabezadoEmpresa(logo);

  b.texto('REPORTE DE ASISTENCIA', { align: 'center', size: 9.5, bold: true });
  b.texto(`Del ${formatFecha(fechaInicio)} al ${formatFecha(fechaFin)}`, { align: 'center', size: 7.5 });
  b.linea();

  const tardanzas = registros.filter((r) => r.tardanza).length;
  b.texto(`Total registros: ${registros.length}`, { size: 7.5 });
  b.texto(`Tardanzas: ${tardanzas}`, { size: 7.5 });
  b.linea();

  registros.forEach((r) => {
    b.texto(r.nombreEmpleado, { bold: true, size: 8 });
    b.texto(`  Fecha: ${formatFecha(r.fecha)}`, { size: 7 });
    b.texto(`  Entrada: ${formatHora(r.horaEntrada)}   Salida: ${formatHora(r.horaSalida)}`, { size: 7 });
    if (r.tardanza) {
      b.texto(`  ** Tardanza: ${r.minutosTardanza} min **`, { size: 7, bold: true });
    }
    b.espacio(1);
  });

  b.linea(false);
  b.texto('Reporte generado por el sistema', { align: 'center', size: 6.5 });

  return b.finalizar();
}

/**
 * Reporte Formato Hoja A4 usando pdfBase
 */
export async function generarReporteAsistenciaA4(
  fechaInicio: string,
  fechaFin: string,
  registros: Asistencia[],
  logo?: string
): Promise<Blob> {
  const b = crearA4Builder();
  await b.encabezadoEmpresa(logo);

  b.titulo('Reporte de Asistencia');
  b.subtitulo([
    `Periodo: ${formatFecha(fechaInicio)} al ${formatFecha(fechaFin)}`,
    `Fecha de emisión: ${formatEmision()}`,
  ]);
  b.lineaSeparadora();

  const tardanzas = registros.filter((r) => r.tardanza).length;
  b.campoValor('Total registros', String(registros.length));
  b.campoValor('Total tardanzas', String(tardanzas));
  b.avanzar(3);
  b.lineaSeparadora();

  b.encabezadoTabla(columnasA4);
  registros.forEach((fila) => b.filaTabla(columnasA4, fila));

  return b.finalizar();
}