'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Users, TrendingUp, ArrowRight } from 'lucide-react';
import { productosApi } from '@/api/productos';
import { empleadosCrudApi } from '@/api/empleados';
import { ventasApi } from '@/api/ventas';

interface StatCard {
  title: string;
  value: string;
  icon: typeof Package;
  href: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [totalProductos, setTotalProductos] = useState(0);
  const [empleadosActivos, setEmpleadosActivos] = useState(0);
  const [ventasMensuales, setVentasMensuales] = useState(0);

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      try {
        const [productos, empleados, ventas] = await Promise.all([
          productosApi.listar(),
          empleadosCrudApi.listar(),
          ventasApi.listar(),
        ]);

        setTotalProductos(productos.length);
        setEmpleadosActivos(empleados.filter((e) => e.estado).length);

        const ahora = new Date();
        const totalMes = ventas
          .filter((v) => {
            const fecha = new Date(v.fecha);
            return (
              v.estado &&
              fecha.getMonth() === ahora.getMonth() &&
              fecha.getFullYear() === ahora.getFullYear()
            );
          })
          .reduce((sum, v) => sum + v.total, 0);
        setVentasMensuales(totalMes);
      } catch {
        setTotalProductos(0);
        setEmpleadosActivos(0);
        setVentasMensuales(0);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
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
      value: `S/ ${ventasMensuales.toFixed(2)}`,
      icon: TrendingUp,
      href: '/dashboard/ventas/generar',
    },
  ];

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-2xl font-bold text-primary tracking-tight">Panel de Administración</h1>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <button
              key={index}
              onClick={() => router.push(stat.href)}
              className="text-left bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-start justify-between group"
            >
              <div className="space-y-3">
                <span className="text-sm font-semibold text-zinc-400 block uppercase tracking-wider">{stat.title}</span>
                {loading ? (
                  <div className="h-9 w-24 bg-zinc-100 rounded-lg animate-pulse" />
                ) : (
                  <div className="text-3xl font-extrabold text-zinc-800">{stat.value}</div>
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
      </div>
    </div>
  );
}