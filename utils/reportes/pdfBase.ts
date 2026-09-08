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

export async function cargarImagenBase64(url: string): Promise<{ data: string; width: number; height: number } | null> {
  try {
    let data: string;
    if (url.startsWith('data:')) {
      data = url;
    } else {
      const res = await fetch(url);
      if (!res.ok) return null;
      const blob = await res.blob();
      data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
    const dim = await new Promise<{ width: number; height: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => resolve({ width: 100, height: 100 });
      img.src = data;
    });
    return { data, width: dim.width, height: dim.height };
  } catch {
    return null;
  }
}

export function formatoImagen(data: string) {
  return data.includes('image/jpeg') || data.includes('image/jpg') ? 'JPEG' : 'PNG';
}

/**
 * Calcula el ancho/alto final de un logo respetando SIEMPRE un ancho y alto
 * máximos, sin distorsionar la proporción original. Antes cada builder tenía
 * su propia versión de este cálculo (o no lo tenía), lo que hacía que el logo
 * se viera desproporcionado según el tamaño de la imagen subida.
 */
function ajustarDimensionesLogo(anchoOriginal: number, altoOriginal: number, maxW: number, maxH: number) {
  let w = maxW;
  let h = (altoOriginal * w) / anchoOriginal;
  if (h > maxH) {
    h = maxH;
    w = (anchoOriginal * h) / altoOriginal;
  }
  return { w, h };
}

/* ============================================================
   POS80 BUILDER
   ============================================================ */

export function crearPos80Builder(alturaEstimada: number) {
  const ANCHO = 80;
  const MARGEN = 6;
  const ANCHO_UTIL = ANCHO - MARGEN * 2;
  const centerX = ANCHO / 2;
  const doc = new jsPDF({ unit: 'mm', format: [ANCHO, Math.max(alturaEstimada, 120)] });
  let y = 6;

  const MAX_W_LOGO_POS80 = 30;
  const MAX_H_LOGO_POS80 = 16;

  const b = {
    doc,
    async encabezadoEmpresa(logoUrlManual?: string) {
      let urlLogo = logoUrlManual;
      let empresa: EmpresaForm | null = null;

      if (!urlLogo) {
        empresa = await obtenerEmpresa();
        urlLogo = empresa.logo;
      }

      if (urlLogo) {
        const logo = await cargarImagenBase64(urlLogo);
        if (logo) {
          const { w: logoW, h: logoH } = ajustarDimensionesLogo(
            logo.width,
            logo.height,
            MAX_W_LOGO_POS80,
            MAX_H_LOGO_POS80
          );
          const xLogo = centerX - logoW / 2;
          try {
            doc.addImage(logo.data, formatoImagen(logo.data), xLogo, y, logoW, logoH);
            y += logoH + 3;
          } catch (e) {
            console.warn('No se pudo agregar la imagen al PDF POS80:', e);
          }
        }
      }

      if (empresa && (empresa.nombreComercial || empresa.razonSocial)) {
        const nombre = empresa.nombreComercial || empresa.razonSocial;
        doc.setFont('courier', 'bold');
        doc.setFontSize(9);
        const lineasNombre = doc.splitTextToSize(nombre, ANCHO_UTIL);
        lineasNombre.forEach((linea: string) => {
          doc.text(linea, centerX, y, { align: 'center' });
          y += 4;
        });

        if (empresa.ruc) {
          doc.setFont('courier', 'normal');
          doc.setFontSize(7.5);
          doc.text(`RUC: ${empresa.ruc}`, centerX, y, { align: 'center' });
          y += 4;
        }
        y += 2;
      }
    },
    texto(
      contenido: string,
      opts: { align?: 'left' | 'center' | 'right'; size?: number; bold?: boolean } = {}
    ) {
      const { align = 'left', size = 8, bold = false } = opts;
      doc.setFont('courier', bold ? 'bold' : 'normal');
      doc.setFontSize(size);

      const lineas = doc.splitTextToSize(contenido, ANCHO_UTIL);
      const lineHeight = size * 0.42 + 1.2;

      lineas.forEach((linea: string) => {
        const posX = align === 'center' ? centerX : align === 'right' ? ANCHO - MARGEN : MARGEN;
        doc.text(linea, posX, y, { align });
        y += lineHeight;
      });
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
      const totalWidth = columnas.reduce((s, c) => s + c.widthA4, 0);
      const anchos = columnas.map((c) => (c.widthA4 / totalWidth) * ANCHO_UTIL);
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
      const fontSize = 6.5;
      const lineHeight = fontSize * 0.42 + 1;

      filas.forEach((fila) => {
        let maxFilasEnFila = 1;

        const celdasProcesadas = columnas.map((c, i) => {
          const valor = c.render(fila);
          const lineas = doc.splitTextToSize(valor, anchos[i]);
          if (lineas.length > maxFilasEnFila) {
            maxFilasEnFila = lineas.length;
          }
          return { col: c, index: i, lineas };
        });

        celdasProcesadas.forEach(({ col, index, lineas }) => {
          const posX = col.align === 'right' ? xs[index] + anchos[index] : xs[index];
          lineas.forEach((linea: string, lineIdx: number) => {
            doc.text(linea, posX, y + lineIdx * lineHeight, {
              align: col.align === 'right' ? 'right' : 'left',
            });
          });
        });

        // Avance de línea simple por cada fila de datos
        y += maxFilasEnFila * lineHeight + 1;
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
  const ALTO_PAGINA = 297;
  const ANCHO_UTIL = ANCHO_PAGINA - MARGEN * 2;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = 20;

  // Estado de la tabla "activa" (se usa para escalar anchos, dibujar bordes,
  // hacer zebra striping y repetir la cabecera al saltar de página)
  let xsActuales: number[] = [];
  let anchosActuales: number[] = [];
  let columnasActuales: ColumnaReporte<any>[] = [];
  let filaContador = 0;

  const ALTURA_HEADER_TABLA = 8;
  const PADDING_CELDA = 2;

  function calcularXsYAnchos(columnas: ColumnaReporte<any>[]) {
    const total = columnas.reduce((s, c) => s + c.widthA4, 0);
    const anchos = columnas.map((c) => (c.widthA4 / total) * ANCHO_UTIL);
    const xs: number[] = [];
    let acc = MARGEN;
    anchos.forEach((w) => {
      xs.push(acc);
      acc += w;
    });
    return { xs, anchos };
  }

  function dibujarCabeceraTabla(columnas: ColumnaReporte<any>[], xs: number[], anchos: number[]) {
    doc.setFillColor(232, 232, 232);
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.2);
    doc.rect(MARGEN, y, ANCHO_UTIL, ALTURA_HEADER_TABLA, 'FD');

    // separadores verticales entre columnas
    let acc = MARGEN;
    anchos.forEach((w, i) => {
      if (i > 0) doc.line(acc, y, acc, y + ALTURA_HEADER_TABLA);
      acc += w;
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    columnas.forEach((c, i) => {
      const posX = c.align === 'right' ? xs[i] + anchos[i] - PADDING_CELDA : xs[i] + PADDING_CELDA;
      doc.text(c.header, posX, y + ALTURA_HEADER_TABLA / 2 + 1.3, {
        align: c.align === 'right' ? 'right' : 'left',
      });
    });

    y += ALTURA_HEADER_TABLA;
    filaContador = 0;
  }

  const b = {
    doc,
    async encabezadoEmpresa(logoUrlManual?: string) {
      let urlLogo = logoUrlManual;
      let empresa: EmpresaForm | null = null;

      if (!urlLogo) {
        empresa = await obtenerEmpresa();
        urlLogo = empresa.logo;
      }

      const MAX_W_LOGO = 35;
      const MAX_H_LOGO = 22;
      const GAP = 6;
      // Ancho reservado para el texto de empresa: SIEMPRE deja el espacio del
      // logo libre, aunque no haya logo, para que el layout no "salte".
      const anchoTextoDisponible = ANCHO_UTIL - MAX_W_LOGO - GAP;

      const yInicio = y;
      let yTexto = yInicio;
      let altoTexto = 0;

      if (empresa && (empresa.razonSocial || empresa.nombreComercial)) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        const nombre = empresa.nombreComercial || empresa.razonSocial;
        const lineasNombre = doc.splitTextToSize(nombre, anchoTextoDisponible);
        lineasNombre.forEach((linea: string) => {
          doc.text(linea, MARGEN, yTexto);
          yTexto += 5;
        });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(60, 60, 60);

        if (empresa.ruc) {
          doc.text(`RUC: ${empresa.ruc}`, MARGEN, yTexto);
          yTexto += 4;
        }
        if (empresa.direccion) {
          const lineasDir = doc.splitTextToSize(empresa.direccion, anchoTextoDisponible);
          lineasDir.forEach((linea: string) => {
            doc.text(linea, MARGEN, yTexto);
            yTexto += 4;
          });
        }
        if (empresa.departamento || empresa.ciudad) {
          doc.text([empresa.departamento, empresa.ciudad].filter(Boolean).join(' - '), MARGEN, yTexto);
          yTexto += 4;
        }
        doc.setTextColor(0, 0, 0);
        altoTexto = yTexto - yInicio;
      }

      // Logo en esquina superior derecha, centrado verticalmente respecto al
      // bloque de texto (antes se dibujaba desde `y` fijo y podía quedar
      // descolgado o encimarse con el texto si el nombre era largo).
      let altoLogo = 0;
      if (urlLogo) {
        const logo = await cargarImagenBase64(urlLogo);
        if (logo) {
          const { w: logoW, h: logoH } = ajustarDimensionesLogo(logo.width, logo.height, MAX_W_LOGO, MAX_H_LOGO);
          const xLogo = ANCHO_PAGINA - MARGEN - logoW;
          const yLogo = yInicio + Math.max(0, (Math.max(altoTexto, logoH) - logoH) / 2);
          try {
            doc.addImage(logo.data, formatoImagen(logo.data), xLogo, yLogo, logoW, logoH);
            altoLogo = logoH;
          } catch (e) {
            console.warn('No se pudo agregar el logo al PDF A4:', e);
          }
        }
      }

      const espacioUtilizado = Math.max(altoTexto, altoLogo);
      y = yInicio + espacioUtilizado + 6;

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.line(MARGEN, y, MARGEN + ANCHO_UTIL, y);
      y += 8;
    },
    titulo(texto: string) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(0, 0, 0);
      doc.text(texto, MARGEN, y);
      y += 8;
    },
    subtitulo(lineas: string[]) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      lineas.forEach((linea) => {
        doc.text(linea, MARGEN, y);
        y += 5;
      });
      doc.setTextColor(0, 0, 0);
      y += 3;
    },
    lineaSeparadora(bold = false) {
      doc.setDrawColor(bold ? 0 : 180);
      doc.setLineWidth(bold ? 0.4 : 0.2);
      doc.line(MARGEN, y, MARGEN + ANCHO_UTIL, y);
      y += 7;
    },
    encabezadoTabla<T>(columnas: ColumnaReporte<T>[]) {
      columnasActuales = columnas;
      const { xs, anchos } = calcularXsYAnchos(columnas);
      xsActuales = xs;
      anchosActuales = anchos;
      dibujarCabeceraTabla(columnas, xs, anchos);
    },
    filaTabla<T>(columnas: ColumnaReporte<T>[], fila: T) {
      const mismasColumnas = xsActuales.length === columnas.length;
      const xs = mismasColumnas ? xsActuales : calcularXsYAnchos(columnas).xs;
      const anchos = mismasColumnas ? anchosActuales : calcularXsYAnchos(columnas).anchos;

      doc.setFontSize(9);
      const fontSize = 9;
      const lineHeight = fontSize * 0.38 + 1.2;

      const celdasCalculadas = columnas.map((c, i) => {
        const valor = c.render ? c.render(fila) : '';
        const anchoDisponible = anchos[i] - PADDING_CELDA * 2;
        const lineas = doc.splitTextToSize(valor, anchoDisponible);
        return { col: c, x: xs[i], ancho: anchos[i], lineas };
      });

      const maxLineas = Math.max(...celdasCalculadas.map((item) => item.lineas.length));
      const alturaContenido = maxLineas * lineHeight;
      const alturaFila = alturaContenido + PADDING_CELDA * 1.5;

      // Salto de página: si no entra la fila, se crea página nueva y se
      // repite la cabecera de la tabla (antes la cabecera no se repetía).
      if (y + alturaFila > ALTO_PAGINA - 22) {
        doc.addPage();
        y = 20;
        if (columnasActuales.length) {
          dibujarCabeceraTabla(columnasActuales, xs, anchos);
        }
      }

      // Franjas alternadas (zebra) para que se lea como tabla real
      if (filaContador % 2 === 1) {
        doc.setFillColor(247, 247, 247);
        doc.rect(MARGEN, y, ANCHO_UTIL, alturaFila, 'F');
      }
      filaContador++;

      // Bordes de la fila + separadores verticales
      doc.setDrawColor(210, 210, 210);
      doc.setLineWidth(0.15);
      doc.rect(MARGEN, y, ANCHO_UTIL, alturaFila);
      let acc = MARGEN;
      anchos.forEach((w, i) => {
        if (i > 0) doc.line(acc, y, acc, y + alturaFila);
        acc += w;
      });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
      const yTextoInicio = y + (alturaFila - alturaContenido) / 2 + lineHeight * 0.75;

      celdasCalculadas.forEach(({ col, x, ancho, lineas }) => {
        const posX = col.align === 'right' ? x + ancho - PADDING_CELDA : x + PADDING_CELDA;
        lineas.forEach((lineaTexto: string, lineIdx: number) => {
          doc.text(lineaTexto, posX, yTextoInicio + lineIdx * lineHeight, {
            align: col.align === 'right' ? 'right' : 'left',
          });
        });
      });
      doc.setTextColor(0, 0, 0);

      y += alturaFila;
    },

        firmasDobles(labelIzq: string, labelDer: string) {
      if (y > ALTO_PAGINA - 40) {
        doc.addPage();
        y = 20;
      }
      const xIzq = MARGEN;
      const xDer = MARGEN + ANCHO_UTIL / 2 + 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(labelIzq, xIzq, y);
      doc.text(labelDer, xDer, y);
      y += 10;
      doc.line(xIzq, y, xIzq + 70, y);
      doc.line(xDer, y, xDer + 70, y);
      y += 5;
    },

    
    campoValor(label: string, valor: string, bold = false) {
      if (y > ALTO_PAGINA - 20) {
        doc.addPage();
        y = 20;
      }
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

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface EmpresaForm {
  id?: number;
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  telefono: string;
  email: string;
  direccion: string;
  departamento: string;
  ciudad: string;
  logo: string;
  icono: string;
  horaApertura: string;
  horaCierre: string;
  toleranciaMinutos: number;
}

export async function obtenerEmpresa(): Promise<EmpresaForm> {
  const estructuraVacia: EmpresaForm = {
    ruc: '',
    razonSocial: '',
    nombreComercial: '',
    telefono: '',
    email: '',
    direccion: '',
    departamento: '',
    ciudad: '',
    logo: '',
    icono: '',
    horaApertura: '',
    horaCierre: '',
    toleranciaMinutos: 10,
  };

  try {
    const urlFinal = API_URL?.endsWith('/api') ? `${API_URL}/empresa` : `${API_URL}/api/empresa`;

    const response = await fetch(urlFinal);

    if (response.status === 404) {
      return estructuraVacia;
    }

    if (!response.ok) {
      throw new Error('Error al obtener los datos de la empresa');
    }

    return await response.json();
  } catch {
    console.warn('Aviso: No se pudo conectar al servidor de datos de empresa.');
    return estructuraVacia;
  }
}

export async function guardarEmpresa(data: EmpresaForm): Promise<EmpresaForm> {
  const urlFinal = API_URL?.endsWith('/api') ? `${API_URL}/empresa` : `${API_URL}/api/empresa`;

  const response = await fetch(urlFinal, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Error al guardar los datos de la empresa');
  }

  return response.json();
}

export const empresaApi = {
  obtener: obtenerEmpresa,
  guardar: guardarEmpresa,
};