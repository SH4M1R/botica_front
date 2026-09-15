const API_URL = process.env.NEXT_PUBLIC_API_URL;

//
// Verifica si el servicio local del SFS (Sistema de Facturación SUNAT,
// D:\SFS_v1.3.2\facturadorApp-1.3.2.jar) está corriendo, permite
// iniciarlo remotamente (ejecutando EjecutarSFS.bat), y permite abrir su
// Bandeja (abrirBandeja.bat) para verificar a simple vista que los
// comprobantes se están enviando/procesando bien.
//
// IMPORTANTE: el navegador NO puede lanzar procesos ni ejecutar .bat en la
// máquina directamente por seguridad. Por eso las tres funciones llaman a
// tu backend (Spring), que SÍ corre en la misma máquina donde vive la
// carpeta sfs.ruta-base y que es quien realmente ejecuta los .bat con
// ProcessBuilder. Ver SfsController.java.
//
// AJUSTA lo siguiente a tu proyecto real:
// - La URL base (API_URL) si ya tienes una constante/env var compartida
//   con productosApi, ventasApi, etc.
// - Las rutas '/sfs/estado', '/sfs/iniciar' y '/sfs/bandeja' si en tu
//   backend quedan expuestas distinto.
// - El shape de la respuesta (`data.activo`, `data.mensaje`, etc.)

export interface ResultadoAccionSfs {
  ok: boolean;
  mensaje?: string;
}

export const sfsApi = {
  /**
   * Devuelve true si el SFS está activo y disponible para emitir
   * comprobantes electrónicos (boletas/facturas), false en cualquier
   * otro caso: servicio apagado, error de red, timeout, etc.
   */
  verificarEstado: async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`${API_URL}/sfs/estado`, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);

      if (!res.ok) return false;

      const data = await res.json().catch(() => null);
      if (!data) return false;

      return data.activo === true || data.estado === 'ACTIVO' || data.online === true;
    } catch {
      return false;
    }
  },

  /**
   * Pide al backend que ejecute EjecutarSFS.bat para "encender" el SFS.
   * El .jar tarda unos segundos en levantar, así que esto NO deja el SFS
   * disponible al toque: solo dispara el arranque (ver hook
   * useSfsEstado, que reintenta verificarEstado() solo tras llamar esto).
   */
  iniciar: async (): Promise<ResultadoAccionSfs> => {
    return postAccionSfs('/sfs/iniciar', 'No se pudo iniciar el SFS.');
  },

  /**
   * Pide al backend que ejecute abrirBandeja.bat, para ver en vivo si el
   * SFS está procesando/enviando los comprobantes correctamente.
   */
  abrirBandeja: async (): Promise<ResultadoAccionSfs> => {
    return postAccionSfs('/sfs/bandeja', 'No se pudo abrir la Bandeja del SFS.');
  },
};

async function postAccionSfs(ruta: string, mensajeErrorPorDefecto: string): Promise<ResultadoAccionSfs> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${API_URL}${ruta}`, {
      method: 'POST',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return { ok: false, mensaje: data?.mensaje ?? mensajeErrorPorDefecto };
    }

    const data = await res.json().catch(() => null);
    return { ok: true, mensaje: data?.mensaje };
  } catch {
    return { ok: false, mensaje: 'Error de conexión con el backend.' };
  }
}