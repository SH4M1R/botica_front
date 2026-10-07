// Integración con el Sistema Facturador SUNAT (SFS). El backend (/api/sfs) detecta si el SFS
// está encendido y puede iniciarlo; la bandeja de envío es la web del propio SFS (puerto 9000).
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const SFS_URL_DEFAULT = 'http://localhost:9000';

export interface SfsEstado {
  activo: boolean;
  iniciando: boolean;
  url: string;
  rutaConfigurada: boolean;
}

const ESTADO_APAGADO: SfsEstado = { activo: false, iniciando: false, url: SFS_URL_DEFAULT, rutaConfigurada: true };

/** Marca que el backend antepone al error cuando se intenta emitir boleta/factura con el SFS apagado. */
export const SFS_APAGADO_MARCA = 'SFS_APAGADO';

export function esErrorSfsApagado(err: unknown): boolean {
  return err instanceof Error && err.message.includes(SFS_APAGADO_MARCA);
}

export const sfsApi = {
  // Si el backend no responde se considera apagado: nunca lanza.
  estado: async (): Promise<SfsEstado> => {
    try {
      const res = await fetch(`${API_URL}/sfs/estado`, { cache: 'no-store' });
      if (!res.ok) return ESTADO_APAGADO;
      return (await res.json()) as SfsEstado;
    } catch {
      return ESTADO_APAGADO;
    }
  },

  iniciar: async (): Promise<SfsEstado> => {
    const res = await fetch(`${API_URL}/sfs/iniciar`, { method: 'POST' });
    if (!res.ok) {
      const msg = await res.text().catch(() => '');
      throw new Error(msg || 'No se pudo encender el SFS.');
    }
    return (await res.json()) as SfsEstado;
  },

  // El SFS tarda cerca de 1 minuto en levantar: se consulta cada 3 s hasta que responda.
  esperarActivo: async (timeoutMs = 150_000): Promise<boolean> => {
    const limite = Date.now() + timeoutMs;
    while (Date.now() < limite) {
      const e = await sfsApi.estado();
      if (e.activo) return true;
      await new Promise((r) => setTimeout(r, 3000));
    }
    return false;
  },

  abrirBandeja: (url: string = SFS_URL_DEFAULT) => {
    window.open(`${url}/#`, '_blank', 'noopener');
  },
};
