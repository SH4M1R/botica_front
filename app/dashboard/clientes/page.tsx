'use client';

import { useState } from 'react';
import { usePaginaServidor } from '@/hooks/usePaginaServidor';
import { useDebounce } from '@/hooks/useDebounce';
import Link from 'next/link';
import { Search, Pencil, HandCoins, Plus, Wallet, History, Gift, Settings2 } from 'lucide-react';
import { clientesApi, getNombreCompleto } from '@/api/ventas';
import type { Cliente } from '@/api/ventas';
import ClienteModal from './components/ClienteModal';
import PagoDeudaModal from './components/PagoDeudaModal';
import SaldoModal from './components/SaldoModal';
import CuponesModal from './components/CuponesModal';
import CuponTiposModal from './components/CuponTiposModal';
import Paginacion from '@/components/Paginacion';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export default function ClientesPage() {
  const [search, setSearch] = useState('');
  const q = useDebounce(search.trim(), 300);
  const [modalOpen, setModalOpen] = useState(false);
  const [clienteActivo, setClienteActivo] = useState<Cliente | null>(null);
  const [pagoModalOpen, setPagoModalOpen] = useState(false);
  const [clienteParaPago, setClienteParaPago] = useState<Cliente | null>(null);

  const [cuponesOpen, setCuponesOpen] = useState(false);
  const [clienteCupones, setClienteCupones] = useState<Cliente | null>(null);
  const [tiposOpen, setTiposOpen] = useState(false);

  const [saldoModalOpen, setSaldoModalOpen] = useState(false);
  const [clienteParaSaldo, setClienteParaSaldo] = useState<Cliente | null>(null);

  // La búsqueda y la paginación las hace el servidor
  const {
    items: clientes, setItems: setClientes, total: totalItems, totalPages: totalPaginas,
    page: paginaSegura, size: pageSize, loading, setPage: setCurrentPage, cambiarTamano, recargar,
  } = usePaginaServidor<Cliente>(
    (p, sz) => clientesApi.listarPaginado(p, sz, q),
    [q],
    PAGE_SIZE_OPTIONS[0]
  );

  const handleGuardar = async (data: { nombres: string; apellidoPaterno?: string; apellidoMaterno?: string; dni?: string; telefono?: string; direccion?: string }) => {
    if (clienteActivo) {
      await clientesApi.actualizar(clienteActivo.id, data);
    } else {
      await clientesApi.crear(data);
    }
    recargar();
  };

  const handleRegistrarPago = async (id: number, monto: number) => {
    setClientes((prev) => prev.map((c) =>
      c.id === id ? { ...c, saldo: Math.max(0, (c.saldo ?? 0) - monto) } : c
    ));
    try {
      await clientesApi.registrarPago(id, monto);
    } finally {
      recargar();
    }
  };

  const handleModificarSaldo = async (id: number, saldo: number) => {
    setClientes((prev) => prev.map((c) => (c.id === id ? { ...c, saldo } : c)));
    try {
      await clientesApi.actualizarSaldo(id, saldo);
    } finally {
      recargar();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Clientes</h1>
          <p className="text-sm text-zinc-500 mt-1">Historial y datos de los clientes registrados.</p>
        </div>
        <div className="flex items-center gap-2">
        <button
          onClick={() => setTiposOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary border-2 border-primary/30 hover:bg-primary/10 rounded-lg transition-all cursor-pointer"
        >
          <Settings2 size={16} />
          Configurar cupones
        </button>
        <button
          onClick={() => { setClienteActivo(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-xs transition-all cursor-pointer"
        >
          <Plus size={16} />
          Nuevo cliente
        </button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400"><Search size={16} /></span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, DNI o RUC..."
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        />
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        {loading && clientes.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-400">Cargando clientes...</div>
        ) : clientes.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-400">No se encontraron clientes.</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <colgroup>
                <col style={{ width: '28%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '27%' }} />
              </colgroup>
              <thead>
                <tr className="bg-primary/10 border-b border-zinc-200 text-left text-xs font-bold text-primary uppercase tracking-wider">
                  <th className="px-5 py-3">NOMBRE</th>
                  <th className="px-5 py-3">DNI / RUC</th>
                  <th className="px-5 py-3">TELÉFONO</th>
                  <th className="px-5 py-3">DEUDA</th>
                  <th className="px-5 py-3">PUNTOS</th>
                  <th className="px-5 py-3 text-right">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {clientes.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="px-5 py-3 font-semibold text-zinc-800">{getNombreCompleto(c)}</td>
                    <td className="px-5 py-3 text-zinc-600 font-mono text-xs">{c.dni ?? '—'}</td>
                    <td className="px-5 py-3 text-zinc-600">{c.telefono ?? '—'}</td>
                    <td className="px-5 py-3">
                      {c.saldo && c.saldo > 0 ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-500">
                          S/ {c.saldo.toFixed(2)}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-400">Sin deuda</span>
                      )}
                    </td>
                    <td className="px-5 py-3 font-semibold text-primary">{c.puntos ?? 0}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => { setClienteCupones(c); setCuponesOpen(true); }}
                          title="Puntos y cupones"
                          className="p-2 text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors border-2 cursor-pointer"
                        >
                          <Gift size={16} />
                        </button>
                        <Link
                          href={`/dashboard/clientes/historial?id=${c.id}`}
                          title="Ver historial de compras"
                          className="p-2 text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors border-2 cursor-pointer"
                        >
                          <History size={16} />
                        </Link>
                        {Boolean(c.saldo && c.saldo > 0) && (
                          <button
                            onClick={() => { setClienteParaPago(c); setPagoModalOpen(true); }}
                            title="Registrar pago de deuda"
                            className="p-2 text-primary hover:text-primary/70 hover:bg-primary/10 rounded-lg transition-colors border-2 cursor-pointer"
                          >
                            <HandCoins size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => { setClienteParaSaldo(c); setSaldoModalOpen(true); }}
                          title="Modificar saldo"
                          className="p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors border-2 cursor-pointer"
                        >
                          <Wallet size={16} />
                        </button>
                        <button 
                          onClick={() => { setClienteActivo(c); setModalOpen(true); }} 
                          title="Editar" 
                          className="p-2 text-green-500 hover:text-green-600 hover:bg-green-100 rounded-lg transition-colors border-2 cursor-pointer"
                        >
                          <Pencil size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {clientes.length > 0 && (
              <Paginacion
                currentPage={paginaSegura}
                totalPages={totalPaginas}
                pageSize={pageSize}
                totalItems={totalItems}
                itemLabel="clientes"
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={setCurrentPage}
                onPageSizeChange={cambiarTamano}
              />
            )}
          </>
        )}
      </div>

      <ClienteModal
        open={modalOpen}
        cliente={clienteActivo}
        onClose={() => setModalOpen(false)}
        onSave={handleGuardar}
      />

      <CuponesModal
        open={cuponesOpen}
        cliente={clienteCupones}
        onClose={() => setCuponesOpen(false)}
        onCambio={recargar}
      />

      <CuponTiposModal open={tiposOpen} onClose={() => setTiposOpen(false)} />

      <PagoDeudaModal
        open={pagoModalOpen}
        cliente={clienteParaPago}
        onClose={() => setPagoModalOpen(false)}
        onSave={handleRegistrarPago}
      />

      <SaldoModal
        open={saldoModalOpen}
        cliente={clienteParaSaldo}
        onClose={() => setSaldoModalOpen(false)}
        onSave={handleModificarSaldo}
      />
    </div>
  );
}