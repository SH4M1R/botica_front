import ExcelJS from 'exceljs';
import { formatFecha, formatFechaHora, formatEmision, formatMoneda } from '@/utils/reportes/pdfBase';

// Reexportamos los mismos formateadores que usan tus PDFs, para que
// las fechas/montos se vean identicos en ambos formatos.
export { formatFecha, formatFechaHora, formatEmision, formatMoneda };

export interface ColumnaExcel<T> {
  header: string;
  width?: number;
  align?: 'left' | 'right' | 'center';
  render: (fila: T) => string | number;
}

export function descargarExcel(blob: Blob, nombreArchivo: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo.endsWith('.xlsx') ? nombreArchivo : `${nombreArchivo}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

interface LogoBuffer {
  buffer: ArrayBuffer;
  extension: 'png' | 'jpeg';
}

async function cargarImagenBuffer(url: string): Promise<LogoBuffer | null> {
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
    const extension: 'png' | 'jpeg' =
      data.includes('image/jpeg') || data.includes('image/jpg') ? 'jpeg' : 'png';
    const base64 = data.split(',')[1];
    const binary = atob(base64);
    const buffer = new ArrayBuffer(binary.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
    return { buffer, extension };
  } catch {
    return null;
  }
}

/* ============================================================
   Paleta / constantes de estilo, calcadas del diseño del PDF
   ============================================================ */

const COLOR_TITULO = 'FF18181B'; // zinc-900
const COLOR_SUBTITULO = 'FF71717A'; // zinc-500
const COLOR_LINEA = 'FFD4D4D8'; // zinc-300
const COLOR_HEADER_FONDO = 'FFE4E4E7'; // zinc-200
const COLOR_HEADER_TEXTO = 'FF18181B';
const COLOR_ZEBRA = 'FFF7F7F8'; // gris muy claro para filas alternas
const COLOR_BORDE_CELDA = 'FFE4E4E7';

const ANCHO_MERGE_DEFECTO = 5; // columnas a fusionar para titulo/subtitulo cuando aun no se dibujo ninguna tabla

/* ============================================================
   Builder de Excel — mismo rol que crearPos80Builder / crearA4Builder
   ============================================================ */

export interface ExcelBuilder {
  encabezadoEmpresa: (logoUrl?: string) => Promise<void>;
  titulo: (texto: string) => void;
  subtitulo: (lineas: string[]) => void;
  lineaSeparadora: () => void;
  tabla: <T>(columnas: ColumnaExcel<T>[], filas: T[]) => void;
  campoValor: (label: string, valor: string | number, bold?: boolean) => void;
  espacio: (filas?: number) => void;
  finalizar: () => Promise<Blob>;
}

export function crearExcelBuilder(nombreHoja = 'Reporte'): ExcelBuilder {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(nombreHoja, {
    views: [{ showGridLines: false }],
  });
  let fila = 1;

  // Ancho de tabla "activo": se actualiza cuando se dibuja una tabla, y se
  // usa para saber hasta donde fusionar el titulo/subtitulo y hasta donde
  // alinear a la derecha los campoValor (igual que en el PDF, donde el
  // total queda alineado con el borde derecho de la tabla).
  let numColumnasActivo = ANCHO_MERGE_DEFECTO;

  const fusionarSiPosible = (filaObjetivo: number, colInicio: number, colFin: number) => {
    if (colFin > colInicio) {
      try {
        sheet.mergeCells(filaObjetivo, colInicio, filaObjetivo, colFin);
      } catch {
        // si ya estaba fusionado o hay conflicto, seguimos sin romper el reporte
      }
    }
  };

  const encabezadoEmpresa: ExcelBuilder['encabezadoEmpresa'] = async (logoUrl) => {
    if (!logoUrl) return;
    const logo = await cargarImagenBuffer(logoUrl);
    if (!logo) return;

    const imageId = workbook.addImage({ buffer: logo.buffer, extension: logo.extension });
    sheet.addImage(imageId, {
      tl: { col: 0, row: 0 },
      ext: { width: 130, height: 60 },
    });
    fila += 5; // deja espacio debajo del logo para que no se encime con el titulo
  };

  const lineaSeparadora: ExcelBuilder['lineaSeparadora'] = () => {
    for (let col = 1; col <= numColumnasActivo; col++) {
      sheet.getCell(fila, col).border = { top: { style: 'thin', color: { argb: COLOR_LINEA } } };
    }
    fila += 1;
  };

  const titulo: ExcelBuilder['titulo'] = (texto) => {
    const cell = sheet.getCell(fila, 1);
    cell.value = texto;
    cell.font = { bold: true, size: 18, color: { argb: COLOR_TITULO } };
    fusionarSiPosible(fila, 1, numColumnasActivo);
    fila += 1;
    espacioInterno(1);
  };

  const subtitulo: ExcelBuilder['subtitulo'] = (lineas) => {
    lineas.forEach((linea) => {
      const cell = sheet.getCell(fila, 1);
      cell.value = linea;
      cell.font = { size: 11, color: { argb: COLOR_SUBTITULO } };
      fusionarSiPosible(fila, 1, numColumnasActivo);
      fila += 1;
    });
    espacioInterno(1);
    lineaSeparadora();
    espacioInterno(1);
  };

  function espacioInterno(filas: number) {
    fila += filas;
  }

  const tabla: ExcelBuilder['tabla'] = (columnas, filas) => {
    numColumnasActivo = columnas.length;

    // Encabezado de la tabla: fondo gris, texto en negrita, bordes finos
    // (igual que el header con fondo #E8E8E8 del PDF)
    columnas.forEach((col, i) => {
      const cell = sheet.getCell(fila, i + 1);
      cell.value = col.header;
      cell.font = { bold: true, size: 11, color: { argb: COLOR_HEADER_TEXTO } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_FONDO } };
      cell.alignment = {
        horizontal: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left',
        vertical: 'middle',
      };
      cell.border = {
        top: { style: 'thin', color: { argb: COLOR_BORDE_CELDA } },
        bottom: { style: 'thin', color: { argb: COLOR_BORDE_CELDA } },
        left: { style: 'thin', color: { argb: COLOR_BORDE_CELDA } },
        right: { style: 'thin', color: { argb: COLOR_BORDE_CELDA } },
      };
    });
    sheet.getRow(fila).height = 22;
    fila += 1;

    // Filas de datos: zebra striping + bordes finos, igual que la tabla del PDF
    filas.forEach((filaDatos, idx) => {
      columnas.forEach((col, i) => {
        const cell = sheet.getCell(fila, i + 1);
        cell.value = col.render(filaDatos);
        cell.font = { size: 10.5 };
        cell.alignment = {
          horizontal: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left',
          vertical: 'middle',
        };
        cell.border = {
          top: { style: 'thin', color: { argb: COLOR_BORDE_CELDA } },
          bottom: { style: 'thin', color: { argb: COLOR_BORDE_CELDA } },
          left: { style: 'thin', color: { argb: COLOR_BORDE_CELDA } },
          right: { style: 'thin', color: { argb: COLOR_BORDE_CELDA } },
        };
        if (idx % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ZEBRA } };
        }
      });
      sheet.getRow(fila).height = 20;
      fila += 1;
    });

    // Anchos de columna
    columnas.forEach((col, i) => {
      sheet.getColumn(i + 1).width = col.width ?? Math.max(14, col.header.length + 4);
    });

    espacioInterno(1); // espacio despues de la tabla, antes de los totales
  };

  const campoValor: ExcelBuilder['campoValor'] = (label, valor, bold = false) => {
    const cellLabel = sheet.getCell(fila, 1);
    cellLabel.value = label;
    cellLabel.font = { bold: true, size: bold ? 13 : 11, color: { argb: COLOR_TITULO } };

    // El valor se alinea a la derecha, en la ultima columna de la tabla
    // (igual que "S/ 8.00" queda pegado al borde derecho en el PDF).
    const colValor = Math.max(numColumnasActivo, 2);
    fusionarSiPosible(fila, 2, colValor);
    const cellValor = sheet.getCell(fila, colValor);
    cellValor.value = valor;
    cellValor.font = { bold: true, size: bold ? 13 : 11, color: { argb: COLOR_TITULO } };
    cellValor.alignment = { horizontal: 'right' };

    sheet.getRow(fila).height = bold ? 24 : 20;
    fila += 1;
  };

  const espacio: ExcelBuilder['espacio'] = (filas = 1) => {
    fila += filas;
  };

  const finalizar: ExcelBuilder['finalizar'] = async () => {
    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  };

  return { encabezadoEmpresa, titulo, subtitulo, lineaSeparadora, tabla, campoValor, espacio, finalizar };
}