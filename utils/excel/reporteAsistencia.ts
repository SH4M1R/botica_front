import type { Asistencia } from '@/api/asistencia';
import { crearExcelBuilder, formatFecha, formatEmision, ColumnaExcel } from './excelBase';

function formatHora(fechaHora: string | null) {
  if (!fechaHora) return '—';
  return new Date(fechaHora).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

const columnas: ColumnaExcel<Asistencia>[] = [
  { header: 'Empleado', align: 'left', width: 28, render: (f) => f.nombreEmpleado },
  { header: 'Fecha', align: 'left', width: 14, render: (f) => formatFecha(f.fecha) },
  { header: 'Entrada', align: 'right', width: 12, render: (f) => formatHora(f.horaEntrada) },
  { header: 'Salida', align: 'right', width: 12, render: (f) => formatHora(f.horaSalida) },
  { header: 'Tardanza', align: 'right', width: 14, render: (f) => (f.tardanza ? `${f.minutosTardanza} min` : '—') },
];

export async function generarReporteAsistenciaExcel(
  fechaInicio: string,
  fechaFin: string,
  registros: Asistencia[],
  logo?: string
): Promise<Blob> {
  const b = crearExcelBuilder('Asistencia');
  await b.encabezadoEmpresa(logo);

  b.titulo('Reporte de Asistencia');
  b.subtitulo([`Periodo: ${formatFecha(fechaInicio)} al ${formatFecha(fechaFin)}`, `Fecha de emisión: ${formatEmision()}`]);

  const tardanzas = registros.filter((r) => r.tardanza).length;
  b.campoValor('Total registros', registros.length);
  b.campoValor('Total tardanzas', tardanzas);
  b.espacio();

  b.tabla(columnas, registros);

  return b.finalizar();
}