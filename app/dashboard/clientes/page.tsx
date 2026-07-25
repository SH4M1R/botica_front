'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Pencil, HandCoins } from 'lucide-react';
import { clientesApi } from '@/api/ventas';
import type { Cliente } from '@/api/ventas';
import ClienteModal from './components/ClienteModal';
import PagoDeudaModal from './components/PagoDeudaModal';

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [clienteActivo, setClienteActivo] = useState<Cliente | null>(null);
  const [pagoModalOpen, setPagoModalOpen] = useState(false);
  const [clienteParaPago, setClienteParaPago] = useState<Cliente | null>(null);

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
    return clientes.filter((c) => c.nombre.toLowerCase().includes(q) || c.dni?.includes(q));
  }, [clientes, search]);

  const handleGuardar = async (data: { nombre: string; dni?: string; telefono?: string }) => {
    if (clienteActivo) await clientesApi.actualizar(clienteActivo.id, data);
    await cargarClientes();
  };

  const handleRegistrarPago = async (id: number, monto: number) => {
    // actualización optimista: descuenta el monto del saldo en pantalla al instante
    setClientes((prev) => prev.map((c) =>
      c.id === id ? { ...c, saldo: Math.max(0, (c.saldo ?? 0) - monto) } : c
    ));
    try {
      await clientesApi.registrarPago(id, monto);
    } finally {
      // recargamos igual desde el servidor para tener el saldo real y consistente
      await cargarClientes();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary tracking-tight">Clientes</h1>
        <p className="text-sm text-zinc-500 mt-1">Historial y datos de los clientes registrados.</p>
      </div>

      <div className="relative max-w-sm">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400"><Search size={16} /></span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o DNI..."
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        />
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-zinc-400">Cargando clientes...</div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-400">No se encontraron clientes.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider">
                <th className="px-5 py-3">Nombre</th>
                <th className="px-5 py-3">DNI</th>
                <th className="px-5 py-3">Teléfono</th>
                <th className="px-5 py-3">Deuda</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {clientesFiltrados.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-50/60 transition-colors">
                  <td className="px-5 py-3 font-semibold text-zinc-800">{c.nombre}</td>
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
                      {c.saldo && c.saldo > 0 && (
                        <button
                          onClick={() => { setClienteParaPago(c); setPagoModalOpen(true); }}
                          title="Registrar pago de deuda"
                          className="p-2 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <HandCoins size={16} />
                        </button>
                      )}
                      <button onClick={() => { setClienteActivo(c); setModalOpen(true); }} className="p-2 text-zinc-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                        <Pencil size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    </div>
  );
}