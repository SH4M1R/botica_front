'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Pencil, Plus } from 'lucide-react';
import { proveedorApi } from '@/api/compra';
import type { Proveedor, ProveedorRequestDTO } from '@/api/compra';
import ProveedorModal from './components/ProveedorModal';

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [proveedorActivo, setProveedorActivo] = useState<Proveedor | null>(null);

  const cargarProveedores = async () => {
    setLoading(true);
    try {
      setProveedores(await proveedorApi.listar());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarProveedores();
  }, []);

  const proveedoresFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return proveedores;
    return proveedores.filter(
      (p) =>
        p.nombres.toLowerCase().includes(q) ||
        p.numeroDocumento?.includes(q) ||
        p.contactoNombres?.toLowerCase().includes(q)
    );
  }, [proveedores, search]);

  const handleGuardar = async (data: ProveedorRequestDTO) => {
    if (proveedorActivo) {
      await proveedorApi.actualizar(proveedorActivo.id, data);
    } else {
      await proveedorApi.crear(data);
    }
    await cargarProveedores();
  };

  const handleNuevo = () => {
    setProveedorActivo(null);
    setModalOpen(true);
  };

  const handleEditar = (p: Proveedor) => {
    setProveedorActivo(p);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Proveedores</h1>
          <p className="text-sm text-zinc-500 mt-1">Directorio y datos de contacto de proveedores.</p>
        </div>
        <button
          onClick={handleNuevo}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
        >
          <Plus size={16} />
          Nuevo Proveedor
        </button>
      </div>

      <div className="relative max-w-sm">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
          <Search size={16} />
        </span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, documento o contacto..."
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        />
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-zinc-400">Cargando proveedores...</div>
        ) : proveedoresFiltrados.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-400">No se encontraron proveedores.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  <th className="px-5 py-3">Nombre Proveedor</th>
                  <th className="px-5 py-3">Documento</th>
                  <th className="px-5 py-3">Teléfono</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Contacto</th>
                  <th className="px-5 py-3">Teléfono Contacto</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {proveedoresFiltrados.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="px-5 py-3 font-semibold text-zinc-800">{p.nombres}</td>
                    <td className="px-5 py-3 text-zinc-600 font-mono text-xs">
                      {p.tipoDocumento ? `${p.tipoDocumento}: ` : ''}
                      {p.numeroDocumento ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-zinc-600">{p.telefono ?? '—'}</td>
                    <td className="px-5 py-3 text-zinc-600">{p.correo ?? '—'}</td>
                    <td className="px-5 py-3 text-zinc-600">{p.contactoNombres ?? '—'}</td>
                    <td className="px-5 py-3 text-zinc-600">{p.contactoCelular ?? '—'}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleEditar(p)}
                          className="p-2 text-zinc-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Editar proveedor"
                        >
                          <Pencil size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ProveedorModal
        open={modalOpen}
        proveedor={proveedorActivo}
        onClose={() => setModalOpen(false)}
        onSave={handleGuardar}
      />
    </div>
  );
}