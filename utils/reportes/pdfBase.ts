import jsPDF from 'jspdf';

export interface ColumnaReporte<T> {
  header: string;
  align: 'left' | 'right';
  widthA4: number;
  render: (fila: T) => string;
}

export function formatFecha(fecha: string) {
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatFechaHora(fechaHora: string) {
  return new Date(fechaHora).toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatEmision() {
  return new Date().toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatMoneda(monto: number) {
  return `S/ ${monto.toFixed(2)}`;
}

export function descargarPdf(blob: Blob, nombreArchivo: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nombreArchivo}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function abrirPdfEnNuevaPestana(blob: Blob) {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

async function cargarImagenBase64(url: string): Promise<{ data: string; ratio: number } | null> {
  try {
    let data: string;
    if (url.startsWith('data:')) {
      data = url;
    } else {
      const res = await fetch(url);
      const blob = await res.blob();
      data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
    const dim = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.width, h: img.height });
      img.onerror = () => resolve({ w: 100, h: 100 });
      img.src = data;
    });
    return { data, ratio: dim.h / dim.w };
  } catch {
    return null;
  }
}

function formatoImagen(data: string) {
  return data.includes('image/jpeg') || data.includes('image/jpg') ? 'JPEG' : 'PNG';
}

/* ============================================================
   POS80 BUILDER
   ============================================================ */

export function crearPos80Builder(alturaEstimada: number) {
  const ANCHO = 80;
  const MARGEN = 6;
  const centerX = ANCHO / 2;
  const doc = new jsPDF({ unit: 'mm', format: [ANCHO, Math.max(alturaEstimada, 120)] });
  let y = 6;

  const b = {
    doc,
    async encabezadoEmpresa(logoUrl?: string) {
      if (!logoUrl) return;
      const logo = await cargarImagenBase64(logoUrl);
      if (!logo) return;
      const anchoLogo = 45;
      const altoLogo = anchoLogo * logo.ratio;
      const xLogo = centerX - anchoLogo / 2;
      doc.addImage(logo.data, formatoImagen(logo.data), xLogo, y, anchoLogo, altoLogo);
      y += altoLogo + 4;
    },
    texto(
      contenido: string,
      opts: { align?: 'left' | 'center' | 'right'; size?: number; bold?: boolean } = {}
    ) {
      const { align = 'left', size = 8, bold = false } = opts;
      doc.setFont('courier', bold ? 'bold' : 'normal');
      doc.setFontSize(size);
      const posX = align === 'center' ? centerX : align === 'right' ? ANCHO - MARGEN : MARGEN;
      doc.text(contenido, posX, y, { align });
      y += size * 0.42 + 1.2;
    },
    linea(dashed = true) {
      doc.setLineDashPattern(dashed ? [0.5, 0.5] : [], 0);
      doc.setDrawColor(0);
      doc.line(MARGEN, y, ANCHO - MARGEN, y);
      y += 3;
    },
    espacio(n: number) {
      y += n;
    },
    tabla<T>(columnas: ColumnaReporte<T>[], filas: T[]) {
      const anchoDisponible = ANCHO - MARGEN * 2;
      const totalWidth = columnas.reduce((s, c) => s + c.widthA4, 0);
      const anchos = columnas.map((c) => (c.widthA4 / totalWidth) * anchoDisponible);
      const xs: number[] = [];
      let acc = MARGEN;
      anchos.forEach((w) => {
        xs.push(acc);
        acc += w;
      });

      doc.setFont('courier', 'bold');
      doc.setFontSize(6.5);
      columnas.forEach((c, i) => {
        const posX = c.align === 'right' ? xs[i] + anchos[i] : xs[i];
        doc.text(c.header, posX, y, { align: c.align === 'right' ? 'right' : 'left' });
      });
      y += 3.5;
      doc.setDrawColor(0);
      doc.line(MARGEN, y, ANCHO - MARGEN, y);
      y += 3;

      doc.setFont('courier', 'normal');
      doc.setFontSize(6.5);
      filas.forEach((fila) => {
        columnas.forEach((c, i) => {
          const valor = c.render(fila);
          const posX = c.align === 'right' ? xs[i] + anchos[i] : xs[i];
          doc.text(valor, posX, y, { align: c.align === 'right' ? 'right' : 'left', maxWidth: anchos[i] });
        });
        y += 4.2;
      });
    },
    finalizar(): Blob {
      return doc.output('blob');
    },
  };

  return b;
}

/* ============================================================
   A4 BUILDER
   ============================================================ */

export function crearA4Builder() {
  const MARGEN = 20;
  const ANCHO_PAGINA = 210;
  const ANCHO_UTIL = ANCHO_PAGINA - MARGEN * 2;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = 20;
  let columnasActuales: ColumnaReporte<any>[] = [];
  let xsActuales: number[] = [];

  function calcularXs(columnas: ColumnaReporte<any>[]) {
    const xs: number[] = [];
    let acc = MARGEN;
    columnas.forEach((c) => {
      xs.push(acc);
      acc += c.widthA4;
    });
    return xs;
  }

  const b = {
    doc,
    async encabezadoEmpresa(logoUrl?: string) {
      if (!logoUrl) return;
      const logo = await cargarImagenBase64(logoUrl);
      if (!logo) return;
      const altoMax = 20;
      const anchoLogo = altoMax / logo.ratio;
      doc.addImage(logo.data, formatoImagen(logo.data), ANCHO_PAGINA - MARGEN - anchoLogo, y, anchoLogo, altoMax);
    },
    titulo(texto: string) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(texto, MARGEN, y + 6);
      y += 16;
    },
    subtitulo(lineas: string[]) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      lineas.forEach((linea) => {
        doc.text(linea, MARGEN, y);
        y += 6;
      });
    },
    lineaSeparadora(bold = false) {
      doc.setDrawColor(bold ? 0 : 180);
      doc.line(MARGEN, y, MARGEN + ANCHO_UTIL, y);
      y += 7;
    },
    encabezadoTabla<T>(columnas: ColumnaReporte<T>[]) {
      columnasActuales = columnas;
      xsActuales = calcularXs(columnas);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      columnas.forEach((c, i) => {
        const posX = c.align === 'right' ? xsActuales[i] + c.widthA4 : xsActuales[i];
        doc.text(c.header, posX, y, { align: c.align === 'right' ? 'right' : 'left' });
      });
      y += 3;
      doc.setDrawColor(0);
      doc.line(MARGEN, y, MARGEN + ANCHO_UTIL, y);
      y += 7;
      doc.setFont('helvetica', 'normal');
    },
    filaTabla<T>(columnas: ColumnaReporte<T>[], fila: T) {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      const xs = xsActuales.length === columnas.length ? xsActuales : calcularXs(columnas);
      doc.setFontSize(9);
      columnas.forEach((c, i) => {
        const valor = c.render(fila);
        const posX = c.align === 'right' ? xs[i] + c.widthA4 : xs[i];
        doc.text(valor, posX, y, { align: c.align === 'right' ? 'right' : 'left' });
      });
      y += 7;
    },
    campoValor(label: string, valor: string, bold = false) {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(bold ? 11 : 10);
      doc.text(label, MARGEN, y);
      doc.text(valor, MARGEN + ANCHO_UTIL, y, { align: 'right' });
      y += 7;
    },
    avanzar(n: number) {
      y += n;
    },
    finalizar(): Blob {
      return doc.output('blob');
    },
  };

  return b;
}