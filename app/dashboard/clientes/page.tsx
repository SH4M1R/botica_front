'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Pencil, HandCoins, Plus, Wallet, History } from 'lucide-react';
import { clientesApi, getNombreCompleto } from '@/api/ventas';
import type { Cliente } from '@/api/ventas';
import ClienteModal from './components/ClienteModal';
import PagoDeudaModal from './components/PagoDeudaModal';
import SaldoModal from './components/SaldoModal';
import Paginacion from '@/components/Paginacion';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [clienteActivo, setClienteActivo] = useState<Cliente | null>(null);
  const [pagoModalOpen, setPagoModalOpen] = useState(false);
  const [clienteParaPago, setClienteParaPago] = useState<Cliente | null>(null);

  const [saldoModalOpen, setSaldoModalOpen] = useState(false);
  const [clienteParaSaldo, setClienteParaSaldo] = useState<Cliente | null>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);

  const cargarClientes = async () => {
    setLoading(true);
    try {
      setClientes(await clientesApi.listar());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarClientes(); }, []);

  const clientesFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) =>
      getNombreCompleto(c).toLowerCase().includes(q) || c.dni?.includes(q)
    );
  }, [clientes, search]);

  const totalItems = clientesFiltrados.length;
  const totalPaginas = Math.ceil(totalItems / pageSize) || 1;
  const paginaSegura = Math.min(Math.max(currentPage, 1), totalPaginas);

  const itemsPaginados = useMemo(() => {
    return clientesFiltrados.slice(
      (paginaSegura - 1) * pageSize,
      paginaSegura * pageSize
    );
  }, [clientesFiltrados, paginaSegura, pageSize]);

  const handleGuardar = async (data: { nombres: string; apellidoPaterno?: string; apellidoMaterno?: string; dni?: string; telefono?: string }) => {
    if (clienteActivo) {
      await clientesApi.actualizar(clienteActivo.id, data);
    } else {
      await clientesApi.crear(data);
    }
    await cargarClientes();
  };

  const handleRegistrarPago = async (id: number, monto: number) => {
    setClientes((prev) => prev.map((c) =>
      c.id === id ? { ...c, saldo: Math.max(0, (c.saldo ?? 0) - monto) } : c
    ));
    try {
      await clientesApi.registrarPago(id, monto);
    } finally {
      await cargarClientes();
    }
  };

  const handleModificarSaldo = async (id: number, saldo: number) => {
    setClientes((prev) => prev.map((c) => (c.id === id ? { ...c, saldo } : c)));
    try {
      await clientesApi.actualizarSaldo(id, saldo);
    } finally {
      await cargarClientes();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Clientes</h1>
          <p className="text-sm text-zinc-500 mt-1">Historial y datos de los clientes registrados.</p>
        </div>
        <button
          onClick={() => { setClienteActivo(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-xs transition-all cursor-pointer"
        >
          <Plus size={16} />
          Nuevo cliente
        </button>
      </div>

      <div className="relative max-w-sm">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400"><Search size={16} /></span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o DNI..."
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        />
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-zinc-400">Cargando clientes...</div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-400">No se encontraron clientes.</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <colgroup>
                <col style={{ width: '35%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '25%' }} />
              </colgroup>
              <thead>
                <tr className="bg-primary/10 border-b border-zinc-200 text-left text-xs font-bold text-primary uppercase tracking-wider">
                  <th className="px-5 py-3">NOMBRE</th>
                  <th className="px-5 py-3">DNI</th>
                  <th className="px-5 py-3">TELÉFONO</th>
                  <th className="px-5 py-3">DEUDA</th>
                  <th className="px-5 py-3 text-right">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {itemsPaginados.map((c) => (
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
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
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

            {!loading && clientesFiltrados.length > 0 && (
              <Paginacion
                currentPage={paginaSegura}
                totalPages={totalPaginas}
                pageSize={pageSize}
                totalItems={totalItems}
                itemLabel="clientes"
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
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