'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Package, TrendingUp, ShoppingBag, ArrowUpRight, ArrowDownRight, Minus, Clock, Wallet, CalendarDays, AlertTriangle, Bell, Pill, Receipt, ShoppingCart} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, AreaChart, Area, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { productosApi, type Producto as ProductoCatalogo } from '@/api/productos';
import { empleadosCrudApi } from '@/api/empleados';
import { ventasApi, type Venta } from '@/api/ventas';
import { comprasApi, type Compra } from '@/api/compra';
import { obtenerEmpresa } from '@/api/empresa';

interface StatCard {
  title: string;
  value: string;
  icon: typeof Package;
  href: string;
  variacion?: number | null;
  sparkline?: number[];
  tono: 'primary' | 'violet' | 'emerald' | 'orange' | 'sky' | 'rose';
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const HORAS = Array.from({ length: 24 }, (_, i) => i);

const PALETA_APOYO = ['#f97316', '#0ea5e9', '#a1a1aa', '#f43f5e', '#eab308'];

const TONOS: Record<StatCard['tono'], { bg: string; text: string }> = {
  primary: { bg: 'bg-primary/10', text: 'text-primary' },
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-500' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-500' },
  sky: { bg: 'bg-sky-500/10', text: 'text-sky-500' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-500' },
};

function formatMoneda(valor: number) {
  return `S/ ${valor.toFixed(2)}`;
}

function esMismoDia(fechaIso: string, referencia: Date) {
  const fecha = new Date(fechaIso);
  return (
    fecha.getDate() === referencia.getDate() &&
    fecha.getMonth() === referencia.getMonth() &&
    fecha.getFullYear() === referencia.getFullYear()
  );
}

function esMismoMes(fechaIso: string, referencia: Date) {
  return new Date(fechaIso).getMonth() === referencia.getMonth() && new Date(fechaIso).getFullYear() === referencia.getFullYear();
}

function variacionPorcentual(actual: number, anterior: number): number | null {
  if (anterior === 0) return actual === 0 ? 0 : null;
  return ((actual - anterior) / anterior) * 100;
}

function formatRelativo(fechaIso: string, ahora: Date) {
  const diffMs = ahora.getTime() - new Date(fechaIso).getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'Justo ahora';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHoras = Math.round(diffMin / 60);
  if (diffHoras < 24) return `Hace ${diffHoras} h`;
  const diffDias = Math.round(diffHoras / 24);
  return `Hace ${diffDias} d`;
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

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const puntos = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={36}>
      <LineChart data={puntos} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function InsigniaVariacion({ variacion }: { variacion?: number | null }) {
  if (variacion === undefined || variacion === null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-400">
        <Minus size={12} /> 0%
      </span>
    );
  }
  const positivo = variacion >= 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${positivo ? 'text-emerald-500' : 'text-rose-500'}`}>
      {positivo ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {Math.abs(variacion).toFixed(1)}%
    </span>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const primaryColor = usePrimaryColor();

  const [totalProductos, setTotalProductos] = useState(0);
  const [empleadosActivos, setEmpleadosActivos] = useState(0);
  const [ventasMensuales, setVentasMensuales] = useState(0);
  const [comprasMensuales, setComprasMensuales] = useState(0);
  const [ventasMesAnterior, setVentasMesAnterior] = useState(0);
  const [comprasMesAnterior, setComprasMesAnterior] = useState(0);

  const [ventas, setVentas] = useState<Venta[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [productosCatalogo, setProductosCatalogo] = useState<ProductoCatalogo[]>([]);

  const [heatmapRangoDias, setHeatmapRangoDias] = useState(30);
  const [evolucionRangoDias, setEvolucionRangoDias] = useState(7);
  const [comprasVentasRangoMeses, setComprasVentasRangoMeses] = useState(6);
  const [horario, setHorario] = useState<{ apertura: number; cierre: number }>({ apertura: 0, cierre: 23 });

  const [horaActual, setHoraActual] = useState(new Date());

  useEffect(() => {
    const intervalo = setInterval(() => setHoraActual(new Date()), 1000);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      try {
        const [productos, empleados, ventasData, comprasData] = await Promise.all([
          productosApi.listar(),
          empleadosCrudApi.listar(),
          ventasApi.listar(),
          comprasApi.listar(),
        ]);

        const ahora = new Date();
        const mesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);

        setTotalProductos(productos.length);
        setEmpleadosActivos(empleados.filter((e) => e.estado).length);

        const totalMes = ventasData
          .filter((v) => v.estado && esMismoMes(v.fecha, ahora))
          .reduce((sum, v) => sum + v.total, 0);
        setVentasMensuales(totalMes);

        const totalMesAnteriorVentas = ventasData
          .filter((v) => v.estado && esMismoMes(v.fecha, mesAnterior))
          .reduce((sum, v) => sum + v.total, 0);
        setVentasMesAnterior(totalMesAnteriorVentas);

        const totalComprasMes = comprasData
          .filter((c) => c.estado && esMismoMes(c.fechaEmision, ahora))
          .reduce((sum, c) => sum + c.total, 0);
        setComprasMensuales(totalComprasMes);

        const totalComprasMesAnterior = comprasData
          .filter((c) => c.estado && esMismoMes(c.fechaEmision, mesAnterior))
          .reduce((sum, c) => sum + c.total, 0);
        setComprasMesAnterior(totalComprasMesAnterior);

        setVentas(ventasData);
        setCompras(comprasData);
        setProductosCatalogo(productos);
      } catch {
        setTotalProductos(0);
        setEmpleadosActivos(0);
        setVentasMensuales(0);
        setComprasMensuales(0);
        setVentasMesAnterior(0);
        setComprasMesAnterior(0);
        setVentas([]);
        setCompras([]);
        setProductosCatalogo([]);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  useEffect(() => {
    obtenerEmpresa()
      .then((empresa) => {
        const parseHora = (valor: string, fallback: number) => {
          if (!valor) return fallback;
          const hora = parseInt(valor.split(':')[0], 10);
          return isNaN(hora) ? fallback : hora;
        };
        setHorario({
          apertura: parseHora(empresa.horaApertura, 0),
          cierre: parseHora(empresa.horaCierre, 23),
        });
      })
      .catch(() => setHorario({ apertura: 0, cierre: 23 }));
  }, []);

  const serieUltimos7Dias = useMemo(() => {
    const dias: { fecha: Date; label: string; ventas: number; compras: number }[] = [];
    const hoy = new Date();
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() - i);
      dias.push({ fecha, label: fecha.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' }), ventas: 0, compras: 0 });
    }
    ventas.forEach((v) => {
      if (!v.estado) return;
      const dia = dias.find((d) => esMismoDia(v.fecha, d.fecha));
      if (dia) dia.ventas += v.total;
    });
    compras.forEach((c) => {
      if (!c.estado) return;
      const dia = dias.find((d) => esMismoDia(c.fechaEmision, d.fecha));
      if (dia) dia.compras += c.total;
    });
    return dias;
  }, [ventas, compras]);

  const gananciaMensual = ventasMensuales - comprasMensuales;
  const gananciaMesAnterior = ventasMesAnterior - comprasMesAnterior;

  const variacionVentas = variacionPorcentual(ventasMensuales, ventasMesAnterior);
  const variacionCompras = variacionPorcentual(comprasMensuales, comprasMesAnterior);
  const variacionGanancia = variacionPorcentual(gananciaMensual, gananciaMesAnterior);

  const stats: StatCard[] = [
    {
      title: 'Total de Productos',
      value: totalProductos.toLocaleString('es-PE'),
      icon: Package,
      href: '/dashboard/productos',
      variacion: null,
      tono: 'violet',
    },
    {
      title: 'Ventas Mensuales',
      value: formatMoneda(ventasMensuales),
      icon: TrendingUp,
      href: '/dashboard/ventas/generar',
      variacion: variacionVentas,
      sparkline: serieUltimos7Dias.map((d) => d.ventas),
      tono: 'emerald',
    },
    {
      title: 'Compras Mensuales',
      value: formatMoneda(comprasMensuales),
      icon: ShoppingBag,
      href: '/dashboard/compras',
      variacion: variacionCompras,
      sparkline: serieUltimos7Dias.map((d) => d.compras),
      tono: 'orange',
    },
    {
      title: 'Ganancia Estimada',
      value: formatMoneda(gananciaMensual),
      icon: Wallet,
      href: '/dashboard/ventas/generar',
      variacion: variacionGanancia,
      sparkline: serieUltimos7Dias.map((d) => d.ventas - d.compras),
      tono: gananciaMensual >= 0 ? 'primary' : 'rose',
    },
  ];

  // 2. Evolución de ventas (rango seleccionable: 7 / 30 / 90 días)
  const evolucionVentas = useMemo(() => {
    const hoy = new Date();
    if (evolucionRangoDias <= 30) {
      const dias: { fecha: Date; label: string; total: number }[] = [];
      for (let i = evolucionRangoDias - 1; i >= 0; i--) {
        const fecha = new Date(hoy);
        fecha.setDate(hoy.getDate() - i);
        dias.push({ fecha, label: fecha.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }), total: 0 });
      }
      ventas.forEach((v) => {
        if (!v.estado) return;
        const dia = dias.find((d) => esMismoDia(v.fecha, d.fecha));
        if (dia) dia.total += v.total;
      });
      return dias.map((d) => ({ label: d.label, total: Number(d.total.toFixed(2)) }));
    }
    // Para 90 días agrupamos por semana para que el eje no se sature
    const semanas: { inicio: Date; label: string; total: number }[] = [];
    const totalSemanas = Math.ceil(evolucionRangoDias / 7);
    for (let i = totalSemanas - 1; i >= 0; i--) {
      const inicio = new Date(hoy);
      inicio.setDate(hoy.getDate() - i * 7 - 6);
      semanas.push({ inicio, label: `Sem. ${totalSemanas - i}`, total: 0 });
    }
    ventas.forEach((v) => {
      if (!v.estado) return;
      const fecha = new Date(v.fecha);
      const limite = new Date(hoy);
      limite.setDate(hoy.getDate() - evolucionRangoDias);
      if (fecha < limite) return;
      for (let i = semanas.length - 1; i >= 0; i--) {
        const finSemana = new Date(semanas[i].inicio);
        finSemana.setDate(finSemana.getDate() + 7);
        if (fecha >= semanas[i].inicio && fecha < finSemana) {
          semanas[i].total += v.total;
          break;
        }
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
      const diaIndex = diaJs === 0 ? 6 : diaJs - 1;
      const hora = fecha.getHours();
      matriz[diaIndex][hora] += 1;
    });

    const max = Math.max(1, ...matriz.flat());
    return { matriz, max };
  }, [ventas, heatmapRangoDias]);

  const horasVisibles = useMemo(() => {
    return HORAS.filter((h) => h >= horario.apertura && h <= horario.cierre);
  }, [horario]);

  const comprasVsVentas = useMemo(() => {
    const meses: { fecha: Date; label: string; ventas: number; compras: number }[] = [];
    const hoy = new Date();

    for (let i = comprasVentasRangoMeses - 1; i >= 0; i--) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      meses.push({
        fecha,
        label: fecha.toLocaleDateString('es-PE', { month: 'short', year: '2-digit' }),
        ventas: 0,
        compras: 0,
      });
    }

    ventas.forEach((v) => {
      if (!v.estado) return;
      const mes = meses.find((m) => esMismoMes(v.fecha, m.fecha));
      if (mes) mes.ventas += v.total;
    });

    compras.forEach((c) => {
      if (!c.estado) return;
      const mes = meses.find((m) => esMismoMes(c.fechaEmision, m.fecha));
      if (mes) mes.compras += c.total;
    });

    return meses.map((m) => ({
      mes: m.label,
      Ventas: Number(m.ventas.toFixed(2)),
      Compras: Number(m.compras.toFixed(2)),
    }));
  }, [ventas, compras, comprasVentasRangoMeses]);

  const categoriaPorProductoId = useMemo(() => {
    const mapa = new Map<number, string>();
    productosCatalogo.forEach((p) => mapa.set(p.id, p.categoria?.nombre ?? 'Sin categoría'));
    return mapa;
  }, [productosCatalogo]);

  const ventasPorCategoria = useMemo(() => {
    const acumulado = new Map<string, number>();
    ventas
      .filter((v) => v.estado)
      .forEach((v) => {
        v.detalles.forEach((d) => {
          const categoria = categoriaPorProductoId.get(d.producto.id) ?? 'Sin categoría';
          acumulado.set(categoria, (acumulado.get(categoria) ?? 0) + d.subtotal);
        });
      });
    const total = Array.from(acumulado.values()).reduce((a, b) => a + b, 0);
    return Array.from(acumulado.entries())
      .map(([categoria, total_]) => ({
        categoria,
        total: Number(total_.toFixed(2)),
        porcentaje: total > 0 ? Math.round((total_ / total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [ventas, categoriaPorProductoId]);

  const rankingEmpleados = useMemo(() => {
    const acumulado = new Map<string, number>();
    ventas
      .filter((v) => v.estado)
      .forEach((v) => {
        acumulado.set(v.empleado.nombre, (acumulado.get(v.empleado.nombre) ?? 0) + v.total);
      });
    return Array.from(acumulado.entries())
      .map(([empleado, total]) => ({ empleado, total: Number(total.toFixed(2)) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [ventas]);

  const comprasPorProveedor = useMemo(() => {
    const acumulado = new Map<string, number>();
    compras
      .filter((c) => c.estado)
      .forEach((c) => {
        acumulado.set(c.proveedor.nombres, (acumulado.get(c.proveedor.nombres) ?? 0) + c.total);
      });
    return Array.from(acumulado.entries())
      .map(([proveedor, total]) => ({ proveedor, total: Number(total.toFixed(2)) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [compras]);

  const topProductos = useMemo(() => {
    const acumulado = new Map<string, number>();
    ventas
      .filter((v) => v.estado)
      .forEach((v) => {
        v.detalles.forEach((d: any) => {
          const nombre = d.producto?.nombre ?? 'Producto';
          const cantidad = typeof d.cantidad === 'number' ? d.cantidad : 1;
          acumulado.set(nombre, (acumulado.get(nombre) ?? 0) + cantidad);
        });
      });
    return Array.from(acumulado.entries())
      .map(([nombre, unidades]) => ({ nombre, unidades }))
      .sort((a, b) => b.unidades - a.unidades)
      .slice(0, 5);
  }, [ventas]);

  const alertasStock = useMemo(() => {
    return productosCatalogo.filter((p: any) => {
      if (typeof p.stock !== 'number') return false;
      const minimo = typeof p.stockMinimo === 'number' ? p.stockMinimo : 5;
      return p.stock <= minimo;
    }).length;
  }, [productosCatalogo]);

  const alertasVencimiento = useMemo(() => {
    const en30Dias = new Date();
    en30Dias.setDate(en30Dias.getDate() + 30);
    return productosCatalogo.filter((p: any) => {
      if (!p.fechaVencimiento) return false;
      const fecha = new Date(p.fechaVencimiento);
      return fecha <= en30Dias && fecha >= new Date();
    }).length;
  }, [productosCatalogo]);

  // 9. Actividad reciente: última venta y última compra registradas
  const actividadReciente = useMemo(() => {
    const items: { tipo: 'venta' | 'compra'; label: string; fecha: string }[] = [];
    const ultimaVenta = [...ventas].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];
    const ultimaCompra = [...compras].sort(
      (a, b) => new Date(b.fechaEmision).getTime() - new Date(a.fechaEmision).getTime()
    )[0];
    if (ultimaVenta) items.push({ tipo: 'venta', label: 'Nueva venta registrada', fecha: ultimaVenta.fecha });
    if (ultimaCompra) items.push({ tipo: 'compra', label: 'Compra realizada', fecha: ultimaCompra.fechaEmision });
    return items.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [ventas, compras]);

  const horaFormateada = horaActual.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const fechaFormateada = horaActual.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
  const rangoFechasEncabezado = (() => {
    const hoy = new Date();
    const hace7 = new Date(hoy);
    hace7.setDate(hoy.getDate() - 6);
    const fmt = (f: Date) => f.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
    return `${fmt(hace7)} - ${fmt(hoy)}`;
  })();

  return (
  <div className="space-y-8">
    {/* Encabezado */}
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-xl font-extrabold text-primary">Bienvenido, que haremos el día de hoy</h1>
        <p className="text-sm text-zinc-500">Resumen general de tu negocio</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-xl px-4 py-2 text-sm font-semibold text-zinc-600 shadow-xs">
          <CalendarDays size={16} className="text-zinc-400" />
          {rangoFechasEncabezado}
        </div>
      </div>
    </div>

    {/* Tarjetas de resumen + Tarjeta de Hora */}
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const tono = TONOS[stat.tono];
          return (
            <button
              key={index}
              onClick={() => router.push(stat.href)}
              className="w-full text-left bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-semibold text-primary/90 uppercase tracking-wider">{stat.title}</span>
                <div className={`p-2 rounded-xl ${tono.bg} ${tono.text}`}>
                  <Icon size={18} />
                </div>
              </div>

              {loading ? (
                <div className="h-8 w-24 bg-zinc-100 rounded-lg animate-pulse" />
              ) : (
                <div className="text-xl font-extrabold text-zinc-800">{stat.value}</div>
              )}

              <div className="flex items-center justify-between mt-2">
                <InsigniaVariacion variacion={stat.variacion} />
                <span className="text-[10px] text-zinc-400">vs. mes anterior</span>
              </div>

              {stat.sparkline && (
                <div className="mt-2 -mx-1">
                  <MiniSparkline data={stat.sparkline} color={stat.tono === 'rose' ? '#f43f5e' : primaryColor} />
                </div>
              )}
            </button>
          );
        })}

        {/* Card independiente para la Hora del Sistema */}
        <div className="w-full bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Hora del Sistema</span>
            <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl">
              <Clock size={18} />
            </div>
          </div>
          <div className="text-xl font-extrabold text-zinc-800 font-mono tabular-nums">{horaFormateada}</div>
          <span className="text-xs font-medium text-zinc-500 capitalize block truncate mt-2">{fechaFormateada}</span>
        </div>
      </div>

      {/* Gráficos y Secciones del Dashboard */}
      <div className="space-y-6">
        {/* SECCIÓN 1: Evolución de Ventas y Compras vs Ventas */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Evolución de Ventas</h2>
              <select
                value={evolucionRangoDias}
                onChange={(e) => setEvolucionRangoDias(Number(e.target.value))}
                className="text-xs font-semibold text-zinc-600 border border-zinc-200 rounded-lg px-3 py-1.5 outline-none focus:border-primary cursor-pointer"
              >
                <option value={7}>7 días</option>
                <option value={30}>30 días</option>
                <option value={90}>90 días</option>
              </select>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={evolucionVentas}>
                <defs>
                  <linearGradient id="gradienteVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={primaryColor} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#a1a1aa" />
                <YAxis tick={{ fontSize: 12 }} stroke="#a1a1aa" />
                <Tooltip formatter={(value) => formatMoneda(Number(value ?? 0))} />
                <Area type="monotone" dataKey="total" stroke={primaryColor} strokeWidth={2.5} fill="url(#gradienteVentas)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Compras vs Ventas</h2>
              <select
                value={comprasVentasRangoMeses}
                onChange={(e) => setComprasVentasRangoMeses(Number(e.target.value))}
                className="text-xs font-semibold text-zinc-600 border border-zinc-200 rounded-lg px-3 py-1.5 outline-none focus:border-primary cursor-pointer"
              >
                <option value={3}>3 meses</option>
                <option value={6}>6 meses</option>
                <option value={12}>12 meses</option>
              </select>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={comprasVsVentas}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="#a1a1aa" />
                <YAxis tick={{ fontSize: 12 }} stroke="#a1a1aa" />
                <Tooltip formatter={(value) => formatMoneda(Number(value ?? 0))} />
                <Legend />
                <Bar dataKey="Ventas" fill={primaryColor} radius={[6, 6, 0, 0]} />
                <Bar dataKey="Compras" fill={PALETA_APOYO[0]} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SECCIÓN 2: Heatmap */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
              Flujo de ventas por hora y día de la semana
            </h2>
            <select
              value={heatmapRangoDias}
              onChange={(e) => setHeatmapRangoDias(Number(e.target.value))}
              className="text-xs font-semibold text-zinc-600 border border-zinc-200 rounded-lg px-3 py-1.5 outline-none focus:border-primary cursor-pointer"
            >
              <option value={7}>Últimos 7 días</option>
              <option value={30}>Últimos 30 días</option>
              <option value={90}>Últimos 90 días</option>
              <option value={0}>Todo el historial</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="flex ml-12 mb-1">
                {horasVisibles.map((h) => (
                  <div key={h} className="flex-1 text-center text-[10px] font-medium text-zinc-400">
                    {h % 3 === 0 ? `${h}h` : ''}
                  </div>
                ))}
              </div>

              {DIAS_SEMANA.map((dia, diaIndex) => (
                <div key={dia} className="flex items-center gap-2 mb-[3px]">
                  <div className="w-10 shrink-0 text-xs font-semibold text-zinc-500">{dia}</div>
                  <div className="flex flex-1 gap-[3px]">
                    {horasVisibles.map((hora) => {
                      const valor = heatmap.matriz[diaIndex][hora];
                      const intensidad = heatmap.max > 0 ? valor / heatmap.max : 0;
                      return (
                        <div
                          key={hora}
                          title={`${dia} ${hora}:00 — ${valor} venta${valor === 1 ? '' : 's'}`}
                          className="flex-1 aspect-square rounded-[3px] transition-transform hover:scale-125 cursor-default"
                          style={{
                            backgroundColor:
                              valor === 0
                                ? '#f4f4f5'
                                : `color-mix(in srgb, ${primaryColor} ${Math.round(15 + intensidad * 85)}%, white)`,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-end gap-2 mt-3">
                <span className="text-[10px] text-zinc-400">Menos ventas</span>
                <div className="flex gap-[3px]">
                  {[15, 35, 55, 75, 100].map((pct) => (
                    <div
                      key={pct}
                      className="w-4 h-4 rounded-[3px]"
                      style={{ backgroundColor: `color-mix(in srgb, ${primaryColor} ${pct}%, white)` }}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-zinc-400">Más ventas</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN 3: Categorías + Ranking Empleados */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">
              Ventas por categoría de producto
            </h2>
            <div className="flex items-center gap-4">
              <div className="relative w-40 h-40 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ventasPorCategoria}
                      dataKey="total"
                      nameKey="categoria"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={2}
                    >
                      {ventasPorCategoria.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? primaryColor : PALETA_APOYO[(i - 1) % PALETA_APOYO.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatMoneda(Number(value ?? 0))} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] text-zinc-400">Total</span>
                  <span className="text-sm font-bold text-zinc-700">100%</span>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                {ventasPorCategoria.slice(0, 4).map((c, i) => (
                  <div key={c.categoria} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: i === 0 ? primaryColor : PALETA_APOYO[(i - 1) % PALETA_APOYO.length] }}
                      />
                      <span className="text-zinc-600 truncate">{c.categoria}</span>
                    </div>
                    <span className="font-semibold text-zinc-500 shrink-0">{c.porcentaje}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">
              Ranking de ventas por empleado
            </h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={rankingEmpleados} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#a1a1aa" />
                <YAxis type="category" dataKey="empleado" tick={{ fontSize: 12 }} stroke="#a1a1aa" width={120} />
                <Tooltip formatter={(value) => formatMoneda(Number(value ?? 0))} />
                <Bar dataKey="total" fill={primaryColor} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SECCIÓN 4: Top Productos + Compras por Proveedor */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">
              Top productos más vendidos
            </h2>
            <div className="space-y-3">
              {topProductos.length === 0 && (
                <p className="text-xs text-zinc-400">Aún no hay ventas registradas.</p>
              )}
              {topProductos.map((p) => (
                <div key={p.nombre} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Pill size={14} />
                    </div>
                    <span className="text-sm text-zinc-600 truncate">{p.nombre}</span>
                  </div>
                  <span className="text-sm font-semibold text-zinc-700 shrink-0">
                    {p.unidades.toLocaleString('es-PE')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="xl:col-span-2 bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">
              Compras por proveedor
            </h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={comprasPorProveedor}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis dataKey="proveedor" tick={{ fontSize: 12 }} stroke="#a1a1aa" />
                <YAxis tick={{ fontSize: 12 }} stroke="#a1a1aa" />
                <Tooltip formatter={(value) => formatMoneda(Number(value ?? 0))} />
                <Bar dataKey="total" fill={primaryColor} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SECCIÓN 5: Alertas + Actividad Reciente */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">
              Alertas y notificaciones
            </h2>
            <div className="space-y-3">
              {alertasStock > 0 && (
                <div className="flex items-start gap-3 bg-rose-500/5 border border-rose-500/10 rounded-xl p-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                    <AlertTriangle size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-700">Stock crítico</p>
                    <p className="text-xs text-zinc-500">
                      {alertasStock} producto{alertasStock === 1 ? '' : 's'} con stock menor a 5 unidades
                    </p>
                  </div>
                </div>
              )}
              {alertasVencimiento > 0 && (
                <div className="flex items-start gap-3 bg-orange-500/5 border border-orange-500/10 rounded-xl p-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                    <Bell size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-700">Productos por vencer</p>
                    <p className="text-xs text-zinc-500">
                      {alertasVencimiento} producto{alertasVencimiento === 1 ? '' : 's'} vencen en los próximos 30 días
                    </p>
                  </div>
                </div>
              )}
              {alertasStock === 0 && alertasVencimiento === 0 && (
                <p className="text-xs text-zinc-400">No hay alertas de inventario por el momento.</p>
              )}
            </div>
          </div>

          <div className="xl:col-span-2 bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">
              Actividad reciente
            </h2>
            <div className="space-y-3">
              {actividadReciente.length === 0 && (
                <p className="text-xs text-zinc-400">Sin actividad registrada todavía.</p>
              )}
              {actividadReciente.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    {item.tipo === 'venta' ? <Receipt size={16} /> : <ShoppingCart size={16} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-700">{item.label}</p>
                  </div>
                  <span className="text-xs text-zinc-400 shrink-0">
                    {formatRelativo(item.fecha, horaActual)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}