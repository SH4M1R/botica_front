'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  TrendingUp, ShoppingBag, ArrowUpRight, ArrowDownRight, Minus,
  Wallet, CalendarDays, AlertTriangle, Bell, Pill, ExternalLink,
  FileText, Building2, Receipt, Inbox, Users,
} from 'lucide-react';
import { productosApi, type Producto as ProductoCatalogo } from '@/api/productos';
import { empleadosCrudApi } from '@/api/empleados';
import { ventasApi, type Venta } from '@/api/ventas';
import { comprasApi, type Compra } from '@/api/compra';
import { obtenerEmpresa } from '@/api/empresa';

import type {
  EvolucionVentasItem,
  ComprasVsVentasItem,
  CategoriaPieItem,
  RankingEmpleadoItem,
  ComprasProveedorItem,
  EvolucionVentasCardProps,
  ComprasVsVentasCardProps,
  HeatmapCardProps,
  CategoriaPieCardProps,
  RankingEmpleadosCardProps,
  ComprasPorProveedorCardProps,
} from './dashboard/DashboardCharts';
import type { ActividadRecienteProps } from './dashboard/ActividadReciente';

// dejando las props como `{}` — de ahí los errores en `data`/`matriz`/`items`.
const EvolucionVentasCard = dynamic<EvolucionVentasCardProps>(() => import('./dashboard/DashboardCharts').then(m => m.EvolucionVentasCard), { ssr: false, loading: () => <ChartSkeleton /> });
const ComprasVsVentasCard = dynamic<ComprasVsVentasCardProps>(() => import('./dashboard/DashboardCharts').then(m => m.ComprasVsVentasCard), { ssr: false, loading: () => <ChartSkeleton /> });
const HeatmapCard = dynamic<HeatmapCardProps>(() => import('./dashboard/DashboardCharts').then(m => m.HeatmapCard), { ssr: false, loading: () => <ChartSkeleton height={220} /> });
const CategoriaPieCard = dynamic<CategoriaPieCardProps>(() => import('./dashboard/DashboardCharts').then(m => m.CategoriaPieCard), { ssr: false, loading: () => <ChartSkeleton /> });
const RankingEmpleadosCard = dynamic<RankingEmpleadosCardProps>(() => import('./dashboard/DashboardCharts').then(m => m.RankingEmpleadosCard), { ssr: false, loading: () => <ChartSkeleton /> });
const ComprasPorProveedorCard = dynamic<ComprasPorProveedorCardProps>(() => import('./dashboard/DashboardCharts').then(m => m.ComprasPorProveedorCard), { ssr: false, loading: () => <ChartSkeleton /> });
const ActividadReciente = dynamic<ActividadRecienteProps>(() => import('./dashboard/ActividadReciente').then(m => m.ActividadReciente), { ssr: false });

function ChartSkeleton({ height = 260 }: { height?: number }) {
  return <div className="w-full rounded-xl bg-zinc-100 animate-pulse" style={{ height }} />;
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const HORAS = Array.from({ length: 24 }, (_, i) => i);
const PALETA_APOYO = ['#f97316', '#0ea5e9', '#a1a1aa', '#f43f5e', '#eab308'];

const TONOS: Record<string, { bg: string; text: string }> = {
  primary: { bg: 'bg-primary/10', text: 'text-primary' },
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-500' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-500' },
  sky: { bg: 'bg-sky-500/10', text: 'text-sky-500' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-500' },
};

const ENLACES_EXTERNOS = [
  { label: 'Cargar precio', sub: 'DIGEMID', url: 'https://opm-digemid.minsa.gob.pe/#/precio-productos/nuevo-cargar-precio/011605404', icon: FileText, tono: 'sky' as const },
  { label: 'Establecimientos', sub: 'DIGEMID', url: 'https://serviciosweb-digemid.minsa.gob.pe/Consultas/Establecimientos', icon: Building2, tono: 'sky' as const },
  { label: 'Productos farmacéuticos', sub: 'DIGEMID', url: 'https://www.digemid.minsa.gob.pe/rsProductosFarmaceuticos/', icon: Pill, tono: 'sky' as const },
  { label: 'Emitir boleta', sub: 'SUNAT', url: 'https://ww1.sunat.gob.pe/xssecurity/SignOnVerification.htm?signonForwardAction=https%3A%2F%2Fww1.sunat.gob.pe%2Fol-ti-itemisionboletaresp%2Femitirbvsimp.do', icon: Receipt, tono: 'orange' as const },
  { label: 'Buzón y menú SOL', sub: 'SUNAT', url: 'https://e-menu.sunat.gob.pe/cl-ti-itmenu/MenuInternet.htm?pestana=*&agrupacion=*&exe=buzon', icon: Inbox, tono: 'orange' as const },
  { label: 'Alertas y modificaciones', sub: 'DIGEMID', url: 'https://www.digemid.minsa.gob.pe/webDigemid/publicaciones/alertas-modificaciones/alertas/', icon: Bell, tono: 'rose' as const, alerta: true },
];

const METODOS_CONOCIDOS = ['Efectivo', 'Izipay', 'Transferencia', 'Yape/Plin', 'Yape', 'Plin', 'Crédito'];

function extraerMetodoPrincipal(cadena?: string): string {
  if (!cadena) return 'Otro';
  for (const m of METODOS_CONOCIDOS) {
    if (cadena.toLowerCase().includes(m.toLowerCase())) return m;
  }
  return cadena.split(' ')[0] || 'Otro';
}

function formatMoneda(valor: number) {
  return `S/ ${valor.toFixed(2)}`;
}

function esMismoDia(fechaIso: string, referencia: Date) {
  const fecha = new Date(fechaIso);
  return fecha.getDate() === referencia.getDate() && fecha.getMonth() === referencia.getMonth() && fecha.getFullYear() === referencia.getFullYear();
}

function esMismoMes(fechaIso: string, referencia: Date) {
  return new Date(fechaIso).getMonth() === referencia.getMonth() && new Date(fechaIso).getFullYear() === referencia.getFullYear();
}

function claveMes(fechaIso: string): string {
  const f = new Date(fechaIso);
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`;
}

function formatMesLabel(clave: string): string {
  const [anio, mes] = clave.split('-').map(Number);
  const texto = new Date(anio, mes - 1, 1).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function variacionPorcentual(actual: number, anterior: number): number | null {
  if (anterior === 0) return actual === 0 ? 0 : null;
  return ((actual - anterior) / anterior) * 100;
}

function usePrimaryColor(fallback = '#16a34a') {
  const [color, setColor] = useState(fallback);
  useEffect(() => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    if (!raw) return;
    const esTripletaHsl = /^\d+(\.\d+)?\s+\d+(\.\d+)?%\s+\d+(\.\d+)?%$/.test(raw);
    setColor(esTripletaHsl ? `hsl(${raw})` : raw);
  }, []);
  return color;
}

function InsigniaVariacion({ variacion }: { variacion?: number | null }) {
  if (variacion === undefined || variacion === null) {
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-400"><Minus size={12} /> 0%</span>;
  }
  const positivo = variacion >= 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${positivo ? 'text-emerald-500' : 'text-rose-500'}`}>
      {positivo ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {Math.abs(variacion).toFixed(1)}%
    </span>
  );
}

// Campos que el backend puede devolver pero que el tipo Producto
// declarado en @/api/productos aún no incluye.
type ProductoConAlertas = ProductoCatalogo & { stockMinimo?: number; fechaVencimiento?: string };

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const primaryColor = usePrimaryColor();

  const [empleadosActivos, setEmpleadosActivos] = useState(0);
  const [ventasMensuales, setVentasMensuales] = useState(0);
  const [comprasMensuales, setComprasMensuales] = useState(0);
  const [ventasMesAnterior, setVentasMesAnterior] = useState(0);
  const [comprasMesAnterior, setComprasMesAnterior] = useState(0);
  const [cantidadVentasMensual, setCantidadVentasMensual] = useState(0);
  const [cantidadVentasMesAnterior, setCantidadVentasMesAnterior] = useState(0);

  const [ventas, setVentas] = useState<Venta[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [productosCatalogo, setProductosCatalogo] = useState<ProductoCatalogo[]>([]);

  const [heatmapRangoDias, setHeatmapRangoDias] = useState(30);
  const [evolucionRangoDias, setEvolucionRangoDias] = useState(7);
  const [comprasVentasRangoMeses, setComprasVentasRangoMeses] = useState(6);
  const [horario, setHorario] = useState<{ apertura: number; cierre: number }>({ apertura: 0, cierre: 23 });
  const [mesSeleccionado, setMesSeleccionado] = useState<string>(() => claveMes(new Date().toISOString()));

  useEffect(() => {
    let cancelado = false;
    const cargarDatos = async () => {
      setLoading(true);
      try {
        const [productos, empleados, ventasData, comprasData] = await Promise.all([
          productosApi.listar(),
          empleadosCrudApi.listar(),
          ventasApi.listar(),
          comprasApi.listar(),
        ]);
        if (cancelado) return;

        const ahora = new Date();
        const mesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);

        const ventasMesActualArr = ventasData.filter((v) => v.estado && esMismoMes(v.fecha, ahora));
        const ventasMesAnteriorArr = ventasData.filter((v) => v.estado && esMismoMes(v.fecha, mesAnterior));

        setEmpleadosActivos(empleados.filter((e) => e.estado).length);
        setVentasMensuales(ventasMesActualArr.reduce((s, v) => s + v.total, 0));
        setVentasMesAnterior(ventasMesAnteriorArr.reduce((s, v) => s + v.total, 0));
        setCantidadVentasMensual(ventasMesActualArr.length);
        setCantidadVentasMesAnterior(ventasMesAnteriorArr.length);
        setComprasMensuales(comprasData.filter((c) => c.estado && esMismoMes(c.fechaEmision, ahora)).reduce((s, c) => s + c.total, 0));
        setComprasMesAnterior(comprasData.filter((c) => c.estado && esMismoMes(c.fechaEmision, mesAnterior)).reduce((s, c) => s + c.total, 0));
        setVentas(ventasData);
        setCompras(comprasData);
        setProductosCatalogo(productos);
      } catch {
        if (cancelado) return;
        setEmpleadosActivos(0); setVentasMensuales(0); setComprasMensuales(0);
        setVentasMesAnterior(0); setComprasMesAnterior(0); setCantidadVentasMensual(0); setCantidadVentasMesAnterior(0);
        setVentas([]); setCompras([]); setProductosCatalogo([]);
      } finally {
        if (!cancelado) setLoading(false);
      }
    };
    cargarDatos();
    return () => { cancelado = true; };
  }, []);

  useEffect(() => {
    obtenerEmpresa()
      .then((empresa) => {
        const parseHora = (valor: string, fallback: number) => {
          if (!valor) return fallback;
          const hora = parseInt(valor.split(':')[0], 10);
          return isNaN(hora) ? fallback : hora;
        };
        setHorario({ apertura: parseHora(empresa.horaApertura, 0), cierre: parseHora(empresa.horaCierre, 23) });
      })
      .catch(() => setHorario({ apertura: 0, cierre: 23 }));
  }, []);

  const gananciaMensual = ventasMensuales - comprasMensuales;
  const gananciaMesAnterior = ventasMesAnterior - comprasMesAnterior;
  const variacionVentas = variacionPorcentual(ventasMensuales, ventasMesAnterior);
  const variacionCompras = variacionPorcentual(comprasMensuales, comprasMesAnterior);
  const variacionGanancia = variacionPorcentual(gananciaMensual, gananciaMesAnterior);

  // Promedios diarios: el mes en curso se divide entre los días ya transcurridos,
  // y el mes anterior (ya cerrado) entre su total de días, para comparar "ritmo diario" real.
  const diasTranscurridosMes = new Date().getDate();
  const diasMesAnteriorTotal = new Date(new Date().getFullYear(), new Date().getMonth(), 0).getDate();

  const promedioVentaDiaria = diasTranscurridosMes > 0 ? ventasMensuales / diasTranscurridosMes : 0;
  const promedioVentaDiariaAnterior = diasMesAnteriorTotal > 0 ? ventasMesAnterior / diasMesAnteriorTotal : 0;
  const variacionPromedioVenta = variacionPorcentual(promedioVentaDiaria, promedioVentaDiariaAnterior);

  const promedioClientesDiario = diasTranscurridosMes > 0 ? cantidadVentasMensual / diasTranscurridosMes : 0;
  const promedioClientesDiarioAnterior = diasMesAnteriorTotal > 0 ? cantidadVentasMesAnterior / diasMesAnteriorTotal : 0;
  const variacionPromedioClientes = variacionPorcentual(promedioClientesDiario, promedioClientesDiarioAnterior);

  // Ticket promedio: cuánto gasta en promedio cada cliente por venta
  const ticketPromedio = cantidadVentasMensual > 0 ? ventasMensuales / cantidadVentasMensual : 0;
  const ticketPromedioAnterior = cantidadVentasMesAnterior > 0 ? ventasMesAnterior / cantidadVentasMesAnterior : 0;
  const variacionTicketPromedio = variacionPorcentual(ticketPromedio, ticketPromedioAnterior);

  // Margen de ganancia: rentabilidad relativa, no solo el monto en soles
  const margenActual = ventasMensuales > 0 ? (gananciaMensual / ventasMensuales) * 100 : 0;
  const margenMesAnterior = ventasMesAnterior > 0 ? (gananciaMesAnterior / ventasMesAnterior) * 100 : 0;
  const variacionMargen = variacionPorcentual(margenActual, margenMesAnterior);

  const metodoPagoStats = useMemo(() => {
    const contarPorMetodo = (lista: Venta[]) => {
      const conteo = new Map<string, number>();
      lista.forEach((v) => {
        const metodo = extraerMetodoPrincipal(v.metodoPago);
        conteo.set(metodo, (conteo.get(metodo) ?? 0) + 1);
      });
      return conteo;
    };

    const ahora = new Date();
    const mesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
    const ventasMesActualArr = ventas.filter((v) => v.estado && esMismoMes(v.fecha, ahora));
    const ventasMesAnteriorArr = ventas.filter((v) => v.estado && esMismoMes(v.fecha, mesAnterior));

    const conteoActual = contarPorMetodo(ventasMesActualArr);
    const totalActual = ventasMesActualArr.length;

    let metodoTop = 'Sin datos';
    let cantidadTop = 0;
    conteoActual.forEach((cant, metodo) => {
      if (cant > cantidadTop) { cantidadTop = cant; metodoTop = metodo; }
    });

    const porcentajeActual = totalActual > 0 ? (cantidadTop / totalActual) * 100 : 0;

    const conteoAnterior = contarPorMetodo(ventasMesAnteriorArr);
    const totalAnterior = ventasMesAnteriorArr.length;
    const cantidadTopMesAnterior = conteoAnterior.get(metodoTop) ?? 0;
    const porcentajeAnterior = totalAnterior > 0 ? (cantidadTopMesAnterior / totalAnterior) * 100 : 0;

    return {
      metodoTop,
      porcentaje: porcentajeActual,
      variacion: variacionPorcentual(porcentajeActual, porcentajeAnterior),
    };
  }, [ventas]);

  const stats = useMemo(() => [
    { title: 'Ventas del mes', value: formatMoneda(ventasMensuales), icon: TrendingUp, href: '/dashboard/ventas/generar', variacion: variacionVentas, tono: 'emerald' as const },
    { title: 'Compras del mes', value: formatMoneda(comprasMensuales), icon: ShoppingBag, href: '/dashboard/compras', variacion: variacionCompras, tono: 'orange' as const },
    {
      title: 'Ganancia estimada',
      value: formatMoneda(gananciaMensual),
      icon: Wallet,
      href: '/dashboard/ventas/generar',
      variacion: variacionGanancia,
      tono: gananciaMensual >= 0 ? ('primary' as const) : ('rose' as const),
    },
    {
      title: 'Promedio de venta diaria',
      value: formatMoneda(promedioVentaDiaria),
      icon: TrendingUp,
      href: '/dashboard/ventas',
      variacion: variacionPromedioVenta,
      tono: 'sky' as const,
    },
    {
      title: 'Clientes atendidos por día',
      value: `${promedioClientesDiario.toFixed(1)} /día`,
      icon: Users,
      href: '/dashboard/clientes',
      variacion: variacionPromedioClientes,
      tono: 'violet' as const,
    },
    {
      title: 'Ticket promedio por venta',
      value: formatMoneda(ticketPromedio),
      icon: Receipt,
      href: '/dashboard/ventas',
      variacion: variacionTicketPromedio,
      tono: 'violet' as const,
    },
    {
      title: 'Margen de ganancia',
      value: `${margenActual.toFixed(1)}%`,
      icon: Wallet,
      href: '/dashboard/ventas',
      variacion: variacionMargen,
      tono: margenActual >= 0 ? ('primary' as const) : ('rose' as const),
    },
    {
      title: 'Método de pago más usado',
      value: `${metodoPagoStats.metodoTop} (${metodoPagoStats.porcentaje.toFixed(0)}%)`,
      icon: Wallet,
      href: '/dashboard/ventas',
      variacion: metodoPagoStats.variacion,
      tono: 'sky' as const,
    },
  ], [
    ventasMensuales, comprasMensuales, gananciaMensual,
    variacionVentas, variacionCompras, variacionGanancia,
    promedioVentaDiaria, variacionPromedioVenta,
    promedioClientesDiario, variacionPromedioClientes,
    ticketPromedio, variacionTicketPromedio,
    margenActual, variacionMargen,
    metodoPagoStats,
  ]);

  const evolucionVentas = useMemo<EvolucionVentasItem[]>(() => {
    const hoy = new Date();
    if (evolucionRangoDias <= 30) {
      const dias: { fecha: Date; label: string; total: number }[] = [];
      for (let i = evolucionRangoDias - 1; i >= 0; i--) {
        const fecha = new Date(hoy);
        fecha.setDate(hoy.getDate() - i);
        dias.push({ fecha, label: fecha.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }), total: 0 });
      }
      ventas.forEach((v) => { if (v.estado) { const d = dias.find((d) => esMismoDia(v.fecha, d.fecha)); if (d) d.total += v.total; } });
      return dias.map((d) => ({ label: d.label, total: Number(d.total.toFixed(2)) }));
    }
    const semanas: { inicio: Date; label: string; total: number }[] = [];
    const totalSemanas = Math.ceil(evolucionRangoDias / 7);
    for (let i = totalSemanas - 1; i >= 0; i--) {
      const inicio = new Date(hoy);
      inicio.setDate(hoy.getDate() - i * 7 - 6);
      semanas.push({ inicio, label: `Sem. ${totalSemanas - i}`, total: 0 });
    }
    const limite = new Date(hoy);
    limite.setDate(hoy.getDate() - evolucionRangoDias);
    ventas.forEach((v) => {
      if (!v.estado) return;
      const fecha = new Date(v.fecha);
      if (fecha < limite) return;
      for (let i = semanas.length - 1; i >= 0; i--) {
        const finSemana = new Date(semanas[i].inicio);
        finSemana.setDate(finSemana.getDate() + 7);
        if (fecha >= semanas[i].inicio && fecha < finSemana) { semanas[i].total += v.total; break; }
      }
    });
    return semanas.map((s) => ({ label: s.label, total: Number(s.total.toFixed(2)) }));
  }, [ventas, evolucionRangoDias]);

  const heatmap = useMemo(() => {
    const matriz: number[][] = DIAS_SEMANA.map(() => HORAS.map(() => 0));
    const limite = new Date();
    limite.setDate(limite.getDate() - heatmapRangoDias);
    ventas.forEach((v) => {
      if (!v.estado) return;
      const fecha = new Date(v.fecha);
      if (heatmapRangoDias > 0 && fecha < limite) return;
      const diaJs = fecha.getDay();
      matriz[diaJs === 0 ? 6 : diaJs - 1][fecha.getHours()] += 1;
    });
    return { matriz, max: Math.max(1, ...matriz.flat()) };
  }, [ventas, heatmapRangoDias]);

  const horasVisibles = useMemo(() => HORAS.filter((h) => h >= horario.apertura && h <= horario.cierre), [horario]);

  const comprasVsVentas = useMemo<ComprasVsVentasItem[]>(() => {
    const meses: { fecha: Date; label: string; ventas: number; compras: number }[] = [];
    const hoy = new Date();
    for (let i = comprasVentasRangoMeses - 1; i >= 0; i--) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      meses.push({ fecha, label: fecha.toLocaleDateString('es-PE', { month: 'short', year: '2-digit' }), ventas: 0, compras: 0 });
    }
    ventas.forEach((v) => { if (v.estado) { const m = meses.find((m) => esMismoMes(v.fecha, m.fecha)); if (m) m.ventas += v.total; } });
    compras.forEach((c) => { if (c.estado) { const m = meses.find((m) => esMismoMes(c.fechaEmision, m.fecha)); if (m) m.compras += c.total; } });
    return meses.map((m) => ({ mes: m.label, Ventas: Number(m.ventas.toFixed(2)), Compras: Number(m.compras.toFixed(2)) }));
  }, [ventas, compras, comprasVentasRangoMeses]);

  const categoriaPorProductoId = useMemo(() => {
    const mapa = new Map<number, string>();
    productosCatalogo.forEach((p) => mapa.set(p.id, p.categoria?.nombre ?? 'Sin categoría'));
    return mapa;
  }, [productosCatalogo]);

  const mesesDisponibles = useMemo(() => {
    const claves = new Set<string>();
    claves.add(claveMes(new Date().toISOString()));
    ventas.forEach((v) => claves.add(claveMes(v.fecha)));
    compras.forEach((c) => claves.add(claveMes(c.fechaEmision)));
    return Array.from(claves).sort((a, b) => (a < b ? 1 : -1));
  }, [ventas, compras]);

  useEffect(() => {
    if (mesesDisponibles.length > 0 && !mesesDisponibles.includes(mesSeleccionado)) {
      setMesSeleccionado(mesesDisponibles[0]);
    }
  }, [mesesDisponibles, mesSeleccionado]);

  const ventasDelMes = useMemo(() => ventas.filter((v) => v.estado && claveMes(v.fecha) === mesSeleccionado), [ventas, mesSeleccionado]);
  const comprasDelMes = useMemo(() => compras.filter((c) => c.estado && claveMes(c.fechaEmision) === mesSeleccionado), [compras, mesSeleccionado]);

  const ventasPorCategoria = useMemo<CategoriaPieItem[]>(() => {
    const acumulado = new Map<string, number>();
    ventasDelMes.forEach((v) => v.detalles.forEach((d) => {
      const categoria = categoriaPorProductoId.get(d.producto.id) ?? 'Sin categoría';
      acumulado.set(categoria, (acumulado.get(categoria) ?? 0) + d.subtotal);
    }));
    const total = Array.from(acumulado.values()).reduce((a, b) => a + b, 0);
    return Array.from(acumulado.entries())
      .map(([categoria, total_]) => ({ categoria, total: Number(total_.toFixed(2)), porcentaje: total > 0 ? Math.round((total_ / total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [ventasDelMes, categoriaPorProductoId]);

  const rankingEmpleados = useMemo<RankingEmpleadoItem[]>(() => {
    const acumulado = new Map<string, number>();
    ventasDelMes.forEach((v) => acumulado.set(v.empleado.nombre, (acumulado.get(v.empleado.nombre) ?? 0) + v.total));
    return Array.from(acumulado.entries()).map(([empleado, total]) => ({ empleado, total: Number(total.toFixed(2)) })).sort((a, b) => b.total - a.total).slice(0, 6);
  }, [ventasDelMes]);

  const comprasPorProveedor = useMemo<ComprasProveedorItem[]>(() => {
    const acumulado = new Map<string, number>();
    comprasDelMes.forEach((c) => acumulado.set(c.proveedor.nombres, (acumulado.get(c.proveedor.nombres) ?? 0) + c.total));
    return Array.from(acumulado.entries()).map(([proveedor, total]) => ({ proveedor, total: Number(total.toFixed(2)) })).sort((a, b) => b.total - a.total).slice(0, 6);
  }, [comprasDelMes]);

  const topProductos = useMemo(() => {
    const acumulado = new Map<string, number>();
    ventasDelMes.forEach((v) => v.detalles.forEach((d) => {
      const nombre = d.producto?.nombre ?? 'Producto';
      acumulado.set(nombre, (acumulado.get(nombre) ?? 0) + (typeof d.cantidad === 'number' ? d.cantidad : 1));
    }));
    return Array.from(acumulado.entries()).map(([nombre, unidades]) => ({ nombre, unidades })).sort((a, b) => b.unidades - a.unidades).slice(0, 5);
  }, [ventasDelMes]);

  // Cast local: stockMinimo/fechaVencimiento no están en el tipo Producto
  // declarado en @/api/productos, aunque el backend sí los devuelva.
  // Lo ideal a mediano plazo es agregarlos directamente a esa interfaz.
  const alertasStock = useMemo(
    () => (productosCatalogo as ProductoConAlertas[]).filter(
      (p) => typeof p.stock === 'number' && p.stock <= (typeof p.stockMinimo === 'number' ? p.stockMinimo : 5)
    ).length,
    [productosCatalogo]
  );

  const alertasVencimiento = useMemo(() => {
    const en30Dias = new Date();
    en30Dias.setDate(en30Dias.getDate() + 30);
    return (productosCatalogo as ProductoConAlertas[]).filter(
      (p) => p.fechaVencimiento && new Date(p.fechaVencimiento) <= en30Dias && new Date(p.fechaVencimiento) >= new Date()
    ).length;
  }, [productosCatalogo]);

  const actividadReciente = useMemo(() => {
    const items: { tipo: 'venta' | 'compra'; label: string; fecha: string }[] = [];
    const ultimaVenta = [...ventas].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];
    const ultimaCompra = [...compras].sort((a, b) => new Date(b.fechaEmision).getTime() - new Date(a.fechaEmision).getTime())[0];
    if (ultimaVenta) items.push({ tipo: 'venta', label: 'Nueva venta registrada', fecha: ultimaVenta.fecha });
    if (ultimaCompra) items.push({ tipo: 'compra', label: 'Nueva compra realizada', fecha: ultimaCompra.fechaEmision });
    return items.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [ventas, compras]);

  const rangoFechasEncabezado = useMemo(() => {
    const hoy = new Date();
    const hace7 = new Date(hoy);
    hace7.setDate(hoy.getDate() - 6);
    const fmt = (f: Date) => f.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
    return `${fmt(hace7)} - ${fmt(hoy)}`;
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-primary">Bienvenido al panel administrativo de JPFarma</h1>
          <p className="text-sm text-zinc-500">Resumen general de tu negocio</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-xl px-4 py-2 text-sm font-semibold text-zinc-600 shadow-xs">
            <CalendarDays size={16} className="text-zinc-400" />
            {rangoFechasEncabezado}
          </div>
        </div>
      </div>

      {/* Tarjetas de métricas principales — 8 tarjetas, 4x2 en pantallas grandes */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const tono = TONOS[stat.tono];
          return (
            <button
              key={index}
              onClick={() => router.push(stat.href)}
              className="w-full text-left bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-semibold text-primary/90 uppercase tracking-wider">{stat.title}</span>
                <div className={`p-2 rounded-xl ${tono.bg} ${tono.text}`}><Icon size={18} /></div>
              </div>
              {loading ? <div className="h-8 w-24 bg-zinc-100 rounded-lg animate-pulse" /> : <div className="text-xl font-extrabold text-zinc-800">{stat.value}</div>}
              <div className="flex items-center justify-between mt-2">
                <InsigniaVariacion variacion={stat.variacion} />
                <span className="text-[10px] text-zinc-400">vs. mes anterior</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">Accesos rápidos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {ENLACES_EXTERNOS.map((enlace) => {
            const Icon = enlace.icon;
            const tono = TONOS[enlace.tono];
            return (
              <a
                key={enlace.url}
                href={enlace.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 bg-white border border-zinc-200 rounded-xl px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-transparent"
              >
                <div className={`relative p-2.5 rounded-xl ${tono.bg} ${tono.text} shrink-0 transition-transform group-hover:scale-110`}>
                  {enlace.alerta && (
                    <span className="absolute inset-0 rounded-xl bg-rose-500/40 animate-ping pointer-events-none" />
                  )}
                  <Icon size={18} className={enlace.alerta ? 'relative z-10 animate-pulse text-rose-600' : ''} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{enlace.sub}</p>
                  <p className="text-sm font-semibold text-zinc-700 truncate">{enlace.label}</p>
                </div>
                <ExternalLink size={14} className="shrink-0 text-zinc-300 transition-all group-hover:text-zinc-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            );
          })}
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <EvolucionVentasCard data={evolucionVentas} primaryColor={primaryColor} rango={evolucionRangoDias} onRangoChange={setEvolucionRangoDias} />
          <ComprasVsVentasCard data={comprasVsVentas} primaryColor={primaryColor} secondaryColor={PALETA_APOYO[0]} rango={comprasVentasRangoMeses} onRangoChange={setComprasVentasRangoMeses} />
        </div>

        <HeatmapCard matriz={heatmap.matriz} max={heatmap.max} horasVisibles={horasVisibles} primaryColor={primaryColor} rango={heatmapRangoDias} onRangoChange={setHeatmapRangoDias} />

        <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-zinc-200 shadow-xs">
          <div>
            <h2 className="text-sm font-bold text-zinc-800">Análisis mensual</h2>
            <p className="text-xs text-zinc-400">Categorías, empleados, productos y proveedores del mes seleccionado</p>
          </div>
          <select
            value={mesSeleccionado}
            onChange={(e) => setMesSeleccionado(e.target.value)}
            className="text-xs font-semibold text-zinc-600 border border-zinc-200 rounded-lg px-3 py-1.5 outline-none focus:border-primary cursor-pointer"
          >
            {mesesDisponibles.map((m) => <option key={m} value={m}>{formatMesLabel(m)}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <CategoriaPieCard data={ventasPorCategoria} primaryColor={primaryColor} paletaApoyo={PALETA_APOYO} mesLabel={formatMesLabel(mesSeleccionado)} />
          <RankingEmpleadosCard data={rankingEmpleados} primaryColor={primaryColor} mesLabel={formatMesLabel(mesSeleccionado)} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">Productos más vendidos</h2>
            <div className="space-y-3">
              {topProductos.length === 0 && <p className="text-xs text-zinc-400">Sin ventas registradas en {formatMesLabel(mesSeleccionado)}.</p>}
              {topProductos.map((p) => (
                <div key={p.nombre} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><Pill size={14} /></div>
                    <span className="text-sm text-zinc-600 truncate">{p.nombre}</span>
                  </div>
                  <span className="text-sm font-semibold text-zinc-700 shrink-0">{p.unidades.toLocaleString('es-PE')}</span>
                </div>
              ))}
            </div>
          </div>
          <ComprasPorProveedorCard data={comprasPorProveedor} primaryColor={primaryColor} mesLabel={formatMesLabel(mesSeleccionado)} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">Alertas y notificaciones</h2>
            <div className="space-y-3">
              {alertasStock > 0 && (
                <div className="flex items-start gap-3 bg-rose-500/5 border border-rose-500/10 rounded-xl p-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0"><AlertTriangle size={16} /></div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-700">Stock crítico</p>
                    <p className="text-xs text-zinc-500">{alertasStock} producto{alertasStock === 1 ? '' : 's'} con stock menor a 5 unidades</p>
                  </div>
                </div>
              )}
              {alertasVencimiento > 0 && (
                <div className="flex items-start gap-3 bg-orange-500/5 border border-orange-500/10 rounded-xl p-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0"><Bell size={16} /></div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-700">Productos por vencer</p>
                    <p className="text-xs text-zinc-500">{alertasVencimiento} producto{alertasVencimiento === 1 ? '' : 's'} vencen en los próximos 30 días</p>
                  </div>
                </div>
              )}
              {alertasStock === 0 && alertasVencimiento === 0 && <p className="text-xs text-zinc-400">No hay alertas de inventario por el momento.</p>}
            </div>
          </div>
          <ActividadReciente items={actividadReciente} />
        </div>
      </div>
    </div>
  );
}