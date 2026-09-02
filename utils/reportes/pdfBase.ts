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

async function cargarImagenBase64(url: string): Promise<{ data: string; width: number; height: number } | null> {
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

function formatoImagen(data: string) {
  return data.includes('image/jpeg') || data.includes('image/jpg') ? 'JPEG' : 'PNG';
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

  const b = {
    doc,
    async encabezadoEmpresa(logoUrlManual?: string) {
      let urlLogo = logoUrlManual;
      let empresa: EmpresaForm | null = null;

      if (!urlLogo) {
        empresa = await obtenerEmpresa();
        urlLogo = empresa.logo;
      }

      // 1. Agregar Logo Centrado y escalado proporcionalmente
      if (urlLogo) {
        const logo = await cargarImagenBase64(urlLogo);
        if (logo) {
          const maxW = 32; // Ancho máximo sugerido para POS80 (mm)
          const maxH = 18; // Alto máximo sugerido para POS80 (mm)

          let logoW = maxW;
          let logoH = (logo.height * logoW) / logo.width;

          if (logoH > maxH) {
            logoH = maxH;
            logoW = (logo.width * logoH) / logo.height;
          }

          const xLogo = centerX - logoW / 2;
          try {
            doc.addImage(logo.data, formatoImagen(logo.data), xLogo, y, logoW, logoH);
            y += logoH + 3;
          } catch (e) {
            console.warn('No se pudo agregar la imagen al PDF POS80:', e);
          }
        }
      }

      // 2. Información de Empresa
      if (empresa && (empresa.nombreComercial || empresa.razonSocial)) {
        const nombre = empresa.nombreComercial || empresa.razonSocial;
        doc.setFont('courier', 'bold');
        doc.setFontSize(9);
        doc.text(nombre, centerX, y, { align: 'center' });
        y += 4;

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
    async encabezadoEmpresa(logoUrlManual?: string) {
      let urlLogo = logoUrlManual;
      let empresa: EmpresaForm | null = null;

      if (!urlLogo) {
        empresa = await obtenerEmpresa();
        urlLogo = empresa.logo;
      }

      let yEmpresa = y;
      let altoLogoEfectivo = 0;

      // 1. Dibujar datos de la empresa en la esquina izquierda si existen
      if (empresa && (empresa.razonSocial || empresa.nombreComercial)) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(empresa.nombreComercial || empresa.razonSocial, MARGEN, yEmpresa);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        yEmpresa += 4;
        if (empresa.ruc) {
          doc.text(`RUC: ${empresa.ruc}`, MARGEN, yEmpresa);
          yEmpresa += 3.5;
        }
        if (empresa.direccion) {
          const lineasDir = doc.splitTextToSize(empresa.direccion, 100);
          lineasDir.forEach((linea: string) => {
            doc.text(linea, MARGEN, yEmpresa);
            yEmpresa += 3.5;
          });
        }
      }

      // 2. Dibujar Logo en la esquina superior derecha (Alineado y escalado proporcionalmente)
      if (urlLogo) {
        const logo = await cargarImagenBase64(urlLogo);
        if (logo) {
          const maxW = 40; // Ancho máximo (mm)
          const maxH = 20; // Alto máximo (mm)

          let logoW = maxW;
          let logoH = (logo.height * logoW) / logo.width;

          if (logoH > maxH) {
            logoH = maxH;
            logoW = (logo.width * logoH) / logo.height;
          }

          const xLogo = ANCHO_PAGINA - MARGEN - logoW;
          try {
            doc.addImage(
              logo.data,
              formatoImagen(logo.data),
              xLogo,
              y,
              logoW,
              logoH
            );
            altoLogoEfectivo = logoH;
          } catch (e) {
            console.warn('No se pudo agregar el logo al PDF A4:', e);
          }
        }
      }

      // 3. Avanzar `y` considerando cuál de los dos elementos ocupó más espacio vertical
      const espacioUtilizado = Math.max(yEmpresa - y, altoLogoEfectivo);
      y += espacioUtilizado + 8; // Margen de separación con el contenido
    },
    titulo(texto: string) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text(texto, MARGEN, y);
      y += 7;
    },
    subtitulo(lineas: string[]) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      lineas.forEach((linea) => {
        doc.text(linea, MARGEN, y);
        y += 5;
      });
      y += 2;
    },
    lineaSeparadora(bold = false) {
      doc.setDrawColor(bold ? 0 : 180);
      doc.line(MARGEN, y, MARGEN + ANCHO_UTIL, y);
      y += 7;
    },
    encabezadoTabla<T>(columnas: ColumnaReporte<T>[]) {
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
      const xs = xsActuales.length === columnas.length ? xsActuales : calcularXs(columnas);
      doc.setFontSize(9);
      const fontSize = 9;
      const lineHeight = fontSize * 0.38 + 1.2;

      const celdasCalculadas = columnas.map((c, i) => {
        const valor = c.render ? c.render(fila) : '';
        const anchoDisponible = c.widthA4 - 2; 
        const lineas = doc.splitTextToSize(valor, anchoDisponible);
        return { col: c, x: xs[i], lineas };
      });

      const maxLineas = Math.max(...celdasCalculadas.map((item) => item.lineas.length));
      const alturaFila = maxLineas * lineHeight;

      if (y + alturaFila > ALTO_PAGINA - 22) {
        doc.addPage();
        y = 20;
      }

      celdasCalculadas.forEach(({ col, x, lineas }) => {
        const posX = col.align === 'right' ? x + col.widthA4 : x;
        lineas.forEach((lineaTexto: string, lineIdx: number) => {
          doc.text(lineaTexto, posX, y + lineIdx * lineHeight, {
            align: col.align === 'right' ? 'right' : 'left',
          });
        });
      });

      y += alturaFila + 2.5;
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
    console.warn("Aviso: No se pudo conectar al servidor de datos de empresa.");
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