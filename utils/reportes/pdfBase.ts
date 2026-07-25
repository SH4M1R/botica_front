import jsPDF from 'jspdf';

/* ============================================================
   Formateo
   ============================================================ */

export function formatFecha(fecha: string | Date): string {
  return new Date(fecha).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatFechaHora(fecha: string | Date): string {
  return new Date(fecha).toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatEmision(): string {
  return formatFechaHora(new Date());
}

export function formatMoneda(valor: number | null | undefined): string {
  return `S/ ${(valor ?? 0).toFixed(2)}`;
}

/* ============================================================
   Descarga / apertura del blob generado
   ============================================================ */

export function descargarPdf(blob: Blob, nombreArchivo: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo.endsWith('.pdf') ? nombreArchivo : `${nombreArchivo}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function abrirPdfEnNuevaPestana(blob: Blob) {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

/* ============================================================
   Definicion de columnas (compartida entre POS80 y A4)
   ============================================================ */

export interface ColumnaReporte<T> {
  header: string;
  align?: 'left' | 'right' | 'center';
  widthA4: number; // mm, ancho de columna en la tabla A4
  render: (fila: T) => string;
}

/* ============================================================
   POS80 — builder tipo "ticket"
   ============================================================ */

export interface Pos80Builder {
  texto: (contenido: string, opts?: { align?: 'left' | 'center' | 'right'; size?: number; bold?: boolean }) => void;
  linea: (dashed?: boolean) => void;
  espacio: (mm?: number) => void;
  tabla: <T>(columnas: ColumnaReporte<T>[], filas: T[]) => void;
  finalizar: () => Blob;
}

export function crearPos80Builder(alturaEstimadaMm: number): Pos80Builder {
  const ANCHO = 80;
  const MARGEN = 6;
  const doc = new jsPDF({ unit: 'mm', format: [ANCHO, Math.max(alturaEstimadaMm, 90)] });
  let y = 6;
  const centerX = ANCHO / 2;

  const texto: Pos80Builder['texto'] = (contenido, opts = {}) => {
    const { align = 'left', size = 8, bold = false } = opts;
    doc.setFont('courier', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const posX = align === 'center' ? centerX : align === 'right' ? ANCHO - MARGEN : MARGEN;
    doc.text(contenido, posX, y, { align });
    y += size * 0.42 + 1.2;
  };

  const linea: Pos80Builder['linea'] = (dashed = true) => {
    doc.setLineDashPattern(dashed ? [0.5, 0.5] : [], 0);
    doc.setDrawColor(0);
    doc.line(MARGEN, y, ANCHO - MARGEN, y);
    y += 3;
  };

  const espacio: Pos80Builder['espacio'] = (mm = 1) => {
    y += mm;
  };

  // Tabla simple apilada: en 80mm no entran muchas columnas lado a lado,
  // asi que cada fila se muestra como bloque (header en negrita + campos).
  const tabla: Pos80Builder['tabla'] = (columnas, filas) => {
    filas.forEach((fila) => {
      columnas.forEach((col, i) => {
        const valor = col.render(fila);
        if (i === 0) {
          texto(valor, { bold: true, size: 7.5 });
        } else {
          texto(`  ${col.header}: ${valor}`, { size: 7 });
        }
      });
      espacio(1);
    });
  };

  const finalizar = () => doc.output('blob');

  return { texto, linea, espacio, tabla, finalizar };
}

/* ============================================================
   A4 — builder tipo "documento"
   ============================================================ */

export interface A4Builder {
  titulo: (texto: string) => void;
  subtitulo: (lineas: string[]) => void;
  lineaSeparadora: (gruesa?: boolean) => void;
  encabezadoTabla: <T>(columnas: ColumnaReporte<T>[]) => void;
  filaTabla: <T>(columnas: ColumnaReporte<T>[], fila: T, bold?: boolean) => void;
  campoValor: (label: string, valor: string, bold?: boolean) => void;
  avanzar: (mm: number) => void;
  finalizar: () => Blob;
}

export function crearA4Builder(): A4Builder {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const MARGEN = 20;
  const ANCHO_PAGINA = 210;
  const ANCHO_UTIL = ANCHO_PAGINA - MARGEN * 2;
  let y = 25;

  const titulo: A4Builder['titulo'] = (texto) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(texto, MARGEN, y);
    y += 10;
  };

  const subtitulo: A4Builder['subtitulo'] = (lineas) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    lineas.forEach((linea) => {
      doc.text(linea, MARGEN, y);
      y += 6;
    });
    y += 4;
  };

  const lineaSeparadora: A4Builder['lineaSeparadora'] = (gruesa = false) => {
    doc.setDrawColor(gruesa ? 0 : 180);
    doc.line(MARGEN, y, MARGEN + ANCHO_UTIL, y);
    y += gruesa ? 8 : 7;
  };

  function xsDeColumnas<T>(columnas: ColumnaReporte<T>[]) {
    const xsDerecha: number[] = [];
    let acumulado = MARGEN;
    columnas.forEach((col) => {
      acumulado += col.widthA4;
      xsDerecha.push(acumulado);
    });
    return xsDerecha;
  }

  const saltoDePaginaSiNecesario = () => {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
  };

  const encabezadoTabla: A4Builder['encabezadoTabla'] = (columnas) => {
    const xsDerecha = xsDeColumnas(columnas);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    let xInicio = MARGEN;
    columnas.forEach((col, i) => {
      if (col.align === 'right') {
        doc.text(col.header, xsDerecha[i], y, { align: 'right' });
      } else if (col.align === 'center') {
        doc.text(col.header, xInicio + col.widthA4 / 2, y, { align: 'center' });
      } else {
        doc.text(col.header, xInicio, y);
      }
      xInicio += col.widthA4;
    });
    y += 3;
    lineaSeparadora(true);
  };

  const filaTabla: A4Builder['filaTabla'] = (columnas, fila, bold = false) => {
    const xsDerecha = xsDeColumnas(columnas);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(10);
    let xInicio = MARGEN;
    columnas.forEach((col, i) => {
      const valor = col.render(fila);
      if (col.align === 'right') {
        doc.text(valor, xsDerecha[i], y, { align: 'right' });
      } else if (col.align === 'center') {
        doc.text(valor, xInicio + col.widthA4 / 2, y, { align: 'center' });
      } else {
        doc.text(valor, xInicio, y);
      }
      xInicio += col.widthA4;
    });
    y += 8;
    saltoDePaginaSiNecesario();
  };

  const avanzar: A4Builder['avanzar'] = (mm) => {
    y += mm;
    saltoDePaginaSiNecesario();
  };

  const campoValor: A4Builder['campoValor'] = (label, valor, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(11);
    doc.text(label, MARGEN, y);
    doc.text(valor, MARGEN + ANCHO_UTIL, y, { align: 'right' });
    y += 7;
    saltoDePaginaSiNecesario();
  };

  const finalizar = () => doc.output('blob');

  return { titulo, subtitulo, lineaSeparadora, encabezadoTabla, filaTabla, campoValor, avanzar, finalizar };
}
