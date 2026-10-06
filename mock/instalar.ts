// Activa el servidor falso: intercepta fetch hacia la API y responde desde el navegador (sin backend).
import { manejar } from './servidor';
import './operaciones';
import './reportes';

declare global { interface Window { __botica_mock__?: boolean } }

export function instalarMock() {
  if (typeof window === 'undefined' || window.__botica_mock__) return;
  window.__botica_mock__ = true;
  const original = window.fetch.bind(window);
  const base = process.env.NEXT_PUBLIC_API_URL ?? '';

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const esApi =
      urlStr.startsWith('undefined') || urlStr.startsWith('/api') || (base !== '' && urlStr.startsWith(base)) ||
      /^https?:\/\/(localhost|127\.0\.0\.1):8000\//.test(urlStr);
    if (!esApi) return original(input, init);

    let relativo = urlStr.replace(/^undefined/, '').replace(/^https?:\/\/[^/]+/, '');
    if (base && urlStr.startsWith(base)) relativo = urlStr.slice(base.length);
    if (!relativo.startsWith('/')) relativo = '/' + relativo;
    const url = new URL(relativo, 'http://demo.local');
    const metodo = init?.method ?? (typeof input === 'object' && 'method' in input ? (input as Request).method : 'GET');

    let body: unknown = undefined;
    let form: FormData | null = null;
    if (init?.body instanceof FormData) form = init.body;
    else if (typeof init?.body === 'string' && init.body) { try { body = JSON.parse(init.body); } catch { body = undefined; } }

    await new Promise((r) => setTimeout(r, 60 + Math.random() * 120)); // latencia simulada
    const resp = manejar(metodo, url, body, form);
    return resp ?? new Response('Ruta no disponible en modo demostración: ' + url.pathname, { status: 404 });
  };
}
