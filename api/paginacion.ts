const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface Pagina<T> {
  data: T[];
  total: number;       // X-Total-Count
  totalPages: number;  // X-Total-Pages
  page: number;
  size: number;
}

type Params = Record<string, string | number | boolean | null | undefined>;

function buildQuery(params: Params): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  });
  const s = qs.toString();
  return s ? `?${s}` : '';
}

/** Pide UNA página y lee los totales de los headers. */
export async function fetchPagina<T>(
  path: string,
  page = 0,
  size = 50,
  params: Params = {}
): Promise<Pagina<T>> {
  const res = await fetch(`${API_URL}${path}${buildQuery({ ...params, page, size })}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(msg || `Error ${res.status} en ${path}`);
  }
  const text = await res.text();
  const data: T[] = text ? JSON.parse(text) : [];

  // Si el navegador no puede leer los headers (CORS sin exposedHeaders), se estima.
  const totalHeader = res.headers.get('X-Total-Count');
  const pagesHeader = res.headers.get('X-Total-Pages');
  const total = totalHeader !== null ? Number(totalHeader) : page * size + data.length;
  const totalPages =
    pagesHeader !== null ? Number(pagesHeader) : data.length === size ? page + 2 : page + 1;

  return { data, total, totalPages, page, size };
}

export const paginaVacia = <T>(page: number, size: number): Pagina<T> =>
  ({ data: [], total: 0, totalPages: 1, page, size });