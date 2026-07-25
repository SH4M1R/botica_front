'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Users, TrendingUp, ShoppingBag, ArrowRight, Clock } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
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
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const HORAS = Array.from({ length: 24 }, (_, i) => i);

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

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [totalProductos, setTotalProductos] = useState(0);
  const [empleadosActivos, setEmpleadosActivos] = useState(0);
  const [ventasMensuales, setVentasMensuales] = useState(0);
  const [comprasMensuales, setComprasMensuales] = useState(0);

  const [ventas, setVentas] = useState<Venta[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [productosCatalogo, setProductosCatalogo] = useState<ProductoCatalogo[]>([]);

  const [heatmapRangoDias, setHeatmapRangoDias] = useState(30);
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

        setTotalProductos(productos.length);
        setEmpleadosActivos(empleados.filter((e) => e.estado).length);

        const totalMes = ventasData
          .filter((v) => v.estado && esMismoMes(v.fecha, ahora))
          .reduce((sum, v) => sum + v.total, 0);
        setVentasMensuales(totalMes);

        const totalComprasMes = comprasData
          .filter((c) => c.estado && esMismoMes(c.fechaEmision, ahora))
          .reduce((sum, c) => sum + c.total, 0);
        setComprasMensuales(totalComprasMes);

        setVentas(ventasData);
        setCompras(comprasData);
        setProductosCatalogo(productos);
      } catch {
        setTotalProductos(0);
        setEmpleadosActivos(0);
        setVentasMensuales(0);
        setComprasMensuales(0);
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

  const stats: StatCard[] = [
    {
      title: 'Total de Productos',
      value: totalProductos.toLocaleString('es-PE'),
      icon: Package,
      href: '/dashboard/productos',
    },
    {
      title: 'Empleados Activos',
      value: empleadosActivos.toLocaleString('es-PE'),
      icon: Users,
      href: '/dashboard/empleados',
    },
    {
      title: 'Ventas Mensuales',
      value: formatMoneda(ventasMensuales),
      icon: TrendingUp,
      href: '/dashboard/ventas/generar',
    },
    {
      title: 'Compras Mensuales',
      value: formatMoneda(comprasMensuales),
      icon: ShoppingBag,
      href: '/dashboard/compras',
    },
  ];

  // 1. Ventas de los últimos 7 días
  const ventasUltimos7Dias = useMemo(() => {
    const dias: { fecha: Date; label: string; total: number }[] = [];
    const hoy = new Date();

    for (let i = 6; i >= 0; i--) {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() - i);
      dias.push({
        fecha,
        label: fecha.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' }),
        total: 0,
      });
    }

    ventas.forEach((v) => {
      if (!v.estado) return;
      const dia = dias.find((d) => esMismoDia(v.fecha, d.fecha));
      if (dia) dia.total += v.total;
    });

    return dias.map((d) => ({ dia: d.label, total: Number(d.total.toFixed(2)) }));
  }, [ventas]);

  // 2. Heatmap: flujo de ventas por hora / día de la semana
  const heatmap = useMemo(() => {
    const matriz: number[][] = DIAS_SEMANA.map(() => HORAS.map(() => 0));
    const limite = new Date();
    limite.setDate(limite.getDate() - heatmapRangoDias);

    ventas.forEach((v) => {
      if (!v.estado) return;
      const fecha = new Date(v.fecha);
      if (heatmapRangoDias > 0 && fecha < limite) return;

      const diaJs = fecha.getDay(); // 0 = domingo
      const diaIndex = diaJs === 0 ? 6 : diaJs - 1; // 0 = lunes ... 6 = domingo
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

    for (let i = 5; i >= 0; i--) {
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
  }, [ventas, compras]);

  // Mapa id de producto -> categoría
  const categoriaPorProductoId = useMemo(() => {
    const mapa = new Map<number, string>();
    productosCatalogo.forEach((p) => mapa.set(p.id, p.categoria?.nombre ?? 'Sin categoría'));
    return mapa;
  }, [productosCatalogo]);

  // 4. Ventas por categoría de producto
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
    return Array.from(acumulado.entries())
      .map(([categoria, total]) => ({ categoria, total: Number(total.toFixed(2)) }))
      .sort((a, b) => b.total - a.total);
  }, [ventas, categoriaPorProductoId]);

  // 5. Ranking de ventas por empleado
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

  // 6. Compras por proveedor
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

  const horaFormateada = horaActual.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const fechaFormateada = horaActual.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-10">
      {/* Tarjetas de resumen + Tarjeta de Hora */}
      <div className="grid grid-cols-5 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <button
              key={index}
              onClick={() => router.push(stat.href)}
              className="w-full text-left bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-start justify-between group"
            >
              <div className="space-y-3">
                <span className="text-sm font-semibold text-zinc-400 block uppercase tracking-wider">{stat.title}</span>
                {loading ? (
                  <div className="h-9 w-24 bg-zinc-100 rounded-lg animate-pulse" />
                ) : (
                  <div className="text-2xl font-extrabold text-zinc-800">{stat.value}</div>
                )}
                <span className="flex items-center gap-1 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Ver más <ArrowRight size={12} />
                </span>
              </div>
              <div className="p-3 bg-primary/10 text-primary rounded-xl transition-colors duration-300">
                <Icon size={24} />
              </div>
            </button>
          );
        })}

        {/* Card independiente para la Hora del Sistema */}
        <div className="w-full bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs flex items-start justify-between">
          <div className="space-y-3">
            <span className="text-sm font-semibold text-zinc-400 block uppercase tracking-wider">Hora del Sistema</span>
            <div className="text-2xl font-extrabold text-zinc-800 font-mono tabular-nums">{horaFormateada}</div>
            <span className="text-xs font-medium text-zinc-500 capitalize block truncate max-w-[140px]">{fechaFormateada}</span>
          </div>
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Clock size={24} />
          </div>
        </div>
      </div>

      {/* Gráficos estadísticos */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">
            Ventas de los últimos 7 días
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={ventasUltimos7Dias}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis dataKey="dia" tick={{ fontSize: 12 }} stroke="#a1a1aa" />
              <YAxis tick={{ fontSize: 12 }} stroke="#a1a1aa" />
              <Tooltip formatter={(value: number) => formatMoneda(value)} />
              <Line type="monotone" dataKey="total" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">
            Compras vs Ventas (últimos 6 meses)
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={comprasVsVentas}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="#a1a1aa" />
              <YAxis tick={{ fontSize: 12 }} stroke="#a1a1aa" />
              <Tooltip formatter={(value: number) => formatMoneda(value)} />
              <Legend />
              <Bar dataKey="Ventas" fill="#7c3aed" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Compras" fill="#f97316" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Heatmap: flujo de ventas por hora / día de la semana */}
        <div className="col-span-2 bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs">
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
                              valor === 0 ? '#f4f4f5' : `rgba(124, 58, 237, ${0.15 + intensidad * 0.85})`,
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
                  {[0.15, 0.35, 0.55, 0.75, 1].map((op) => (
                    <div
                      key={op}
                      className="w-4 h-4 rounded-[3px]"
                      style={{ backgroundColor: `rgba(124, 58, 237, ${op})` }}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-zinc-400">Más ventas</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">
            Ventas por categoría de producto
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={ventasPorCategoria} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="#a1a1aa" />
              <YAxis type="category" dataKey="categoria" tick={{ fontSize: 12 }} stroke="#a1a1aa" width={120} />
              <Tooltip formatter={(value: number) => formatMoneda(value)} />
              <Bar dataKey="total" fill="#0ea5e9" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
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
              <Tooltip formatter={(value: number) => formatMoneda(value)} />
              <Bar dataKey="total" fill="#22c55e" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="col-span-2 bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">
            Compras por proveedor
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={comprasPorProveedor}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis dataKey="proveedor" tick={{ fontSize: 12 }} stroke="#a1a1aa" />
              <YAxis tick={{ fontSize: 12 }} stroke="#a1a1aa" />
              <Tooltip formatter={(value: number) => formatMoneda(value)} />
              <Bar dataKey="total" fill="#f97316" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}