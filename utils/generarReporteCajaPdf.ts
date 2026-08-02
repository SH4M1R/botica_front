import type { ArqueoCaja } from '@/api/arqueo';
import type { Venta } from '@/api/ventas';
import { getNombreCompleto } from '@/api/ventas';
import {
  crearPos80Builder,
  formatEmision,
  formatFecha,
  formatMoneda,
} from './/reportes/pdfBase'; // Ajusta la ruta a tu pdfBase si es distinta

export async function generarReporteCajaPdf(
  arqueo: ArqueoCaja,
  ventas: Venta[],
  logo?: string
): Promise<Blob> {
  const alturaEstimada = 60 + ventas.length * 12 + 30;
  const b = crearPos80Builder(alturaEstimada);

  // 1. Renderizar el logo y datos iniciales de la empresa
  await b.encabezadoEmpresa(logo);

  // 2. Encabezado del reporte
  b.texto('CIERRE DE CAJA', { align: 'center', size: 10, bold: true });
  b.texto(`N° ${arqueo.numero}`, { align: 'center', size: 9, bold: true });

  b.linea();

  b.texto(`Empleado: ${arqueo.empleadoNombre}`, { size: 7.5 });
  b.texto(`Apertura: ${formatFecha(arqueo.fechaInicio)}`, { size: 7.5 });
  b.texto(
    `Cierre: ${arqueo.fechaFin ? formatFecha(arqueo.fechaFin) : 'En curso'}`,
    { size: 7.5 }
  );
  b.texto(`Monto Inicial: ${formatMoneda(arqueo.montoInicial)}`, { size: 7.5 });
  if (arqueo.montoFinal !== null && arqueo.montoFinal !== undefined) {
    b.texto(`Monto Final: ${formatMoneda(arqueo.montoFinal)}`, { size: 7.5 });
  }

  b.linea();

  // 3. Detalle de ventas
  let total = 0;

  ventas.forEach((v) => {
    const cliente = v.cliente ? getNombreCompleto(v.cliente) : 'Clientes Varios';
    const hora = new Date(v.fecha).toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
    });

    b.texto(`${cliente}`, { bold: true, size: 7.5 });
    b.texto(
      `  Hora: ${hora} | Método: ${v.metodoPago} | Total: ${formatMoneda(v.total)}`,
      { size: 7 }
    );
    b.espacio(1);

    total += v.total;
  });

  // 4. Totales
  b.linea(false);
  b.texto(`TOTAL: ${formatMoneda(total)}`, { bold: true, size: 9 });
  b.espacio(1);

  b.linea();
  b.texto(`Ventas registradas: ${ventas.length}`, { size: 7 });
  b.texto(`Emitido: ${formatEmision()}`, { size: 6.5 });
  b.texto('Reporte generado por el sistema', { align: 'center', size: 6.5 });

  return b.finalizar();
}