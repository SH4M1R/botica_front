'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Eye, Receipt, Calendar, User } from 'lucide-react';
import { clientesApi, ventasApi, getNombreCompleto } from '@/api/ventas';
import type { Cliente, Venta } from '@/api/ventas';
import VentaDetalleModal from '@/app/dashboard/ventas/components/VentaDetalleModal';
import Paginacion from '@/components/Paginacion';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

function obtenerSoloMetodos(metodoPagoCadena: string | undefined): string {
  if (!metodoPagoCadena) return '—';
  const metodosDisponibles = ['Efectivo', 'Izipay', 'Transferencia', 'Yape/Plin', 'Yape', 'Plin', 'Crédito'];
  const encontrados: string[] = [];

  for (const m of metodosDisponibles) {
    if (metodoPagoCadena.toLowerCase().includes(m.toLowerCase()) && !encontrados.includes(m)) {
      encontrados.push(m);
    }
  }

  return encontrados.length > 0 ? encontrados.join(' / ') : metodoPagoCadena.split(' ')[0];
}

function HistorialClienteContenido() {
  const searchParams = useSearchParams();
  const clienteId = Number(searchParams.get('id'));

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [ventaDetalle, setVentaDetalle] = useState<Venta | null>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);

  useEffect(() => {
    async function cargarDatos() {
      if (!clienteId) return;
      setLoading(true);
      try {
        const [listaClientes, listaVentas] = await Promise.all([
          clientesApi.listar(),
          ventasApi.listar(),
        ]);

        const cli = listaClientes.find((c) => c.id === clienteId) ?? null;
        setCliente(cli);

        const comprasCliente = listaVentas
          .filter((v) => v.cliente?.id === clienteId)
          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

        setVentas(comprasCliente);
      } catch (error) {
        console.error('Error cargando historial del cliente:', error);
      } finally {
        setLoading(false);
      }
    }

    cargarDatos();
  }, [clienteId]);

  const totalItems = ventas.length;
  const totalPaginas = Math.ceil(totalItems / pageSize) || 1;
  const paginaSegura = Math.min(Math.max(currentPage, 1), totalPaginas);

  const itemsPaginados = useMemo(() => {
    return ventas.slice((paginaSegura - 1) * pageSize, paginaSegura * pageSize);
  }, [ventas, paginaSegura, pageSize]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/clientes"
            className="p-2 rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 transition-colors"
            title="Volver a clientes"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-primary tracking-tight">
              Historial de Compras
            </h1>
            <p className="text-sm text-zinc-500 mt-1 flex items-center gap-2">
              <User size={14} className="text-primary" />
              <span>{cliente ? getNombreCompleto(cliente) : 'Cargando...'}</span>
              {cliente?.dni && <span className="font-mono text-xs">({cliente.dni})</span>}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-zinc-400">Cargando historial...</div>
        ) : ventas.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-400">
            Este cliente no tiene compras registradas.
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <colgroup>
                <col style={{ width: '12%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '15%' }} />
              </colgroup>
              <thead>
                <tr className="bg-primary/10 border-b border-zinc-200 text-left text-xs font-bold text-primary uppercase tracking-wider">
                  <th className="px-5 py-3">N° VENTA</th>
                  <th className="px-5 py-3">FECHA Y HORA</th>
                  <th className="px-5 py-3">VENDEDOR</th>
                  <th className="px-5 py-3">MÉTODO DE PAGO</th>
                  <th className="px-5 py-3 text-right">TOTAL</th>
                  <th className="px-5 py-3 text-right">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {itemsPaginados.map((v) => (
                  <tr key={v.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="px-5 py-3 font-mono text-zinc-600">
                      #{String(v.id).padStart(6, '0')}
                    </td>
                    <td className="px-5 py-3 text-zinc-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-zinc-400" />
                        <span>
                          {new Date(v.fecha).toLocaleDateString('es-PE')} -{' '}
                          {new Date(v.fecha).toLocaleTimeString('es-PE', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-zinc-600">{v.empleado?.nombre ?? '—'}</td>
                    <td className="px-5 py-3 font-medium text-zinc-700">
                      {obtenerSoloMetodos(v.metodoPago)}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-zinc-800">
                      S/ {v.total.toFixed(2)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setVentaDetalle(v)}
                          className="p-2 text-green-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors border-2 cursor-pointer"
                          title="Ver detalle"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => window.open(`/dashboard/ventas/boleta?id=${v.id}`, '_blank')}
                          className="p-2 text-primary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors border-2 cursor-pointer"
                          title="Imprimir boleta"
                        >
                          <Receipt size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Paginacion
              currentPage={paginaSegura}
              totalPages={totalPaginas}
              pageSize={pageSize}
              totalItems={totalItems}
              itemLabel="compras"
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </>
        )}
      </div>

      <VentaDetalleModal venta={ventaDetalle} onClose={() => setVentaDetalle(null)} />
    </div>
  );
}

export default function HistorialClientePage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-sm text-zinc-400">Cargando...</div>}>
      <HistorialClienteContenido />
    </Suspense>
  );
}