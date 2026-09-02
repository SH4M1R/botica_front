'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Power } from 'lucide-react';
import { empleadosCrudApi } from '@/api/empleados';
import type { Empleado, EmpleadoPayload } from '@/api/empleados';
import EmpleadoModal from './components/EmpleadoModal';
import Paginacion from '@/components/Paginacion';
import ModalEliminar from "@/components/ModalEliminar";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export default function EmpleadosPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [empleadoActivo, setEmpleadoActivo] = useState<Empleado | null>(null);

  // Paginación
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);

  const cargarEmpleados = async () => {
    setLoading(true);
    try {
      setEmpleados(await empleadosCrudApi.listar());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarEmpleados(); }, []);

  const empleadosFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return empleados;
    return empleados.filter((e) => e.nombre.toLowerCase().includes(q) || e.username.toLowerCase().includes(q));
  }, [empleados, search]);

  // Resetear a la página 1 cuando cambia la búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // Cálculos para la paginación
  const totalItems = empleadosFiltrados.length;
  const totalPaginas = Math.ceil(totalItems / pageSize) || 1;
  const paginaSegura = Math.min(Math.max(currentPage, 1), totalPaginas);

  const [modalConfig, setModalConfig] = useState<{
  isOpen: boolean;
  mensaje: string;
  errorMensaje?: string;
  onConfirm: () => Promise<void>;
}>({
  isOpen: false,
  mensaje: '',
  onConfirm: async () => {},
});

const cerrarModal = () =>
  setModalConfig((prev) => ({ ...prev, isOpen: false }));

  const itemsPaginados = useMemo(() => {
    return empleadosFiltrados.slice(
      (paginaSegura - 1) * pageSize,
      paginaSegura * pageSize
    );
  }, [empleadosFiltrados, paginaSegura, pageSize]);

  const handleGuardar = async (data: EmpleadoPayload) => {
    if (empleadoActivo) await empleadosCrudApi.actualizar(empleadoActivo.id, data);
    else await empleadosCrudApi.crear(data);
    await cargarEmpleados();
  };

  const handleToggleEstado = async (empleado: Empleado) => {
    const accion = empleado.estado ? 'desactivar' : 'activar';
    if (!confirm(`¿Deseas ${accion} a "${empleado.nombre}"?`)) return;
    await empleadosCrudApi.cambiarEstado(empleado.id, !empleado.estado);
    await cargarEmpleados();
  };

  const handleEliminar = (empleado: Empleado) => {
    setModalConfig({
      isOpen: true,
      mensaje: `¿Eliminar definitivamente a "${empleado.nombre}"? Esta acción no se puede deshacer y fallará si tiene ventas registradas.`,
      errorMensaje: 'No se pudo eliminar. Es posible que este empleado tenga ventas registradas — intenta desactivarlo en su lugar.',
      onConfirm: async () => {
        await empleadosCrudApi.eliminar(empleado.id);
        await cargarEmpleados();
      },
    });
  };

  const rolBadgeClass = (rol: string) => {
    if (rol === 'Administrador') return 'bg-primary/10 text-primary';
    if (rol === 'Vendedor') return 'bg-blue-50 text-blue-600';
    return 'bg-amber-50 text-amber-600'; 
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Empleados</h1>
          <p className="text-sm text-zinc-500 mt-1">Gestiona el personal con acceso al sistema.</p>
        </div>
        <button
          onClick={() => { setEmpleadoActivo(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-3 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-semibold rounded-lg shadow-xs transition-all"
        >
          <Plus size={14} /> Nuevo empleado
        </button>
      </div>

      <div className="relative max-w-sm">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400"><Search size={16} /></span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o usuario..."
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        />
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-zinc-400">Cargando empleados...</div>
        ) : empleadosFiltrados.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-400">No se encontraron empleados.</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <colgroup>
                <col style={{ width: '30%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '20%' }} />
              </colgroup>
              <thead>
                <tr className="bg-primary/10 border-b border-zinc-200 text-left text-xs font-bold text-primary uppercase tracking-wider">
                  <th className="px-5 py-3">NOMBRE</th>
                  <th className="px-5 py-3">USUARIO</th>
                  <th className="px-5 py-3">ROL</th>
                  <th className="px-5 py-3">ESTADO</th>
                  <th className="px-5 py-3 text-right">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {itemsPaginados.map((emp) => (
                  <tr key={emp.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="px-5 py-3 font-semibold text-zinc-800">{emp.nombre}</td>
                    <td className="px-5 py-3 text-zinc-600 font-mono text-xs">{emp.username}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${rolBadgeClass(emp.rol)}`}>
                        {emp.rol}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${emp.estado ? 'bg-primary/10 text-primary' : 'bg-zinc-100 text-zinc-400'}`}>
                        {emp.estado ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleToggleEstado(emp)}
                          className={`p-2 rounded-lg transition-colors border-2 ${
                            emp.estado 
                              ? 'text-amber-400 hover:text-amber-500 hover:bg-amber-50' 
                              : 'text-primary/60 hover:text-primary hover:bg-primary/10'
                          }`}
                          title={emp.estado ? 'Desactivar' : 'Activar'}
                        >
                          <Power size={16} />
                        </button>
                        <button 
                          onClick={() => { setEmpleadoActivo(emp); setModalOpen(true); }} 
                          title="Editar" 
                          className="p-2 text-green-500 hover:text-green-600 hover:bg-green-100 rounded-lg transition-colors border-2"
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          onClick={() => handleEliminar(emp)} 
                          title="Eliminar definitivamente" 
                          className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border-2"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && empleadosFiltrados.length > 0 && (
              <Paginacion
                currentPage={paginaSegura}
                totalPages={totalPaginas}
                pageSize={pageSize}
                totalItems={totalItems}
                itemLabel="empleados"
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

      <EmpleadoModal
        open={modalOpen}
        empleado={empleadoActivo}
        onClose={() => setModalOpen(false)}
        onSave={handleGuardar}
      />

      <ModalEliminar
      isOpen={modalConfig.isOpen}
      onClose={cerrarModal}
      mensaje={modalConfig.mensaje}
      errorMensajeDefault={modalConfig.errorMensaje}
      onConfirm={modalConfig.onConfirm}
    />
    </div>
  );
}