'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react';
import {
  laboratoriosApi, categoriasApi, principiosActivosApi, accionesTerapeuticasApi,
} from '@/api/productos';
import LaboratorioModal from "../components/LaboratorioModal";
import CategoriaModal from  "../components/CategoriaModal";
import PrincipioActivoModal from "../components/PrincipioActivoModal";
import AccionTerapeuticaModal from "../components/AccionTerapeuticaModal";
import Paginacion from "@/components/Paginacion";

type ItemBase = { id: number; nombre: string };

const TABS = [
  { key: 'categoria', label: 'CATEGORÍA', api: categoriasApi, Modal: CategoriaModal },
  { key: 'laboratorio', label: 'LABORATORIO', api: laboratoriosApi, Modal: LaboratorioModal },
  { key: 'principio', label: 'PRINCIPIO ACTIVO', api: principiosActivosApi, Modal: PrincipioActivoModal },
  { key: 'accion', label: 'ACCIÓN TERAPEÚTICA', api: accionesTerapeuticasApi, Modal: AccionTerapeuticaModal },
] as const;

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

const COL_WIDTHS = {
  id: '10%',
  descripcion: '75%',
  acciones: '15%',
};

export default function AtributoProductoPage() {
  const [tabActiva, setTabActiva] = useState<typeof TABS[number]['key']>('categoria');
  const [items, setItems] = useState<ItemBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [itemActivo, setItemActivo] = useState<ItemBase | null>(null);

  // 1. Estados para la paginación
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);

  const tab = TABS.find((t) => t.key === tabActiva)!;

  const cargar = async () => {
    setLoading(true);
    try {
      setItems(await tab.api.listar());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    // Resetear a la página 1 cada vez que se cambia de pestaña
    setCurrentPage(1); 
    cargar(); 
  }, [tabActiva]);

  // 2. Cálculos para paginación local en el frontend
  const totalItems = items.length;
  const totalPaginas = Math.ceil(totalItems / pageSize) || 1;
  const paginaSegura = Math.min(Math.max(currentPage, 1), totalPaginas);

  // Recortar únicamente los elementos que pertenecen a la página actual
  const itemsPaginados = items.slice(
    (paginaSegura - 1) * pageSize,
    paginaSegura * pageSize
  );

  const handleGuardar = async (nombre: string) => {
    if (itemActivo) await tab.api.actualizar(itemActivo.id, { nombre });
    else await tab.api.crear({ nombre });
    await cargar();
  };

  const handleEliminar = async (item: ItemBase) => {
    if (!confirm(`¿Eliminar "${item.nombre}"?`)) return;
    try {
      await tab.api.eliminar(item.id);
      await cargar();
    } catch {
      alert('No se pudo eliminar. Puede que esté siendo usado por algún producto.');
    }
  };

  const Modal = tab.Modal;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/productos" className="text-zinc-400 hover:text-zinc-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Atributos de Producto</h1>
          <p className="text-sm text-zinc-500 mt-1">Gestiona los catálogos usados al registrar productos.</p>
        </div>
      </div>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTabActiva(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tabActiva === t.key ? 'bg-primary text-white shadow-xs' : 'bg-white text-zinc-500 border border-zinc-200 hover:border-zinc-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
          <span className="text-sm font-bold text-primary">{tab.label}</span>
          <button
            onClick={() => { setItemActivo(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-3 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-semibold rounded-lg shadow-xs transition-all"
          >
            <Plus size={14} /> Nuevo
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-zinc-400">Cargando...</div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-400">Aún no hay registros.</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <colgroup>
                <col style={{ width: COL_WIDTHS.id }} />
                <col style={{ width: COL_WIDTHS.descripcion }} />
                <col style={{ width: COL_WIDTHS.acciones }} />
              </colgroup>
              <thead>
                <tr className="bg-primary/10 border-b border-zinc-200 text-left text-xs font-bold text-primary uppercase tracking-wider">
                  <th className="px-5 py-3">CÓDIGO</th>
                  <th className="px-5 py-3">DESCRIPCIÓN</th>
                  <th className="px-5 py-3 text-right">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {/* 3. Renderizar solo la porción correspondiente a la página actual */}
                {itemsPaginados.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="px-5 py-3 text-zinc-800">{item.id}</td>
                    <td className="px-5 py-3 font-bold text-zinc-800">{item.nombre}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => { setItemActivo(item); setModalOpen(true); }} title="Editar" className="p-2 text-green-500 hover:text-green-600 hover:bg-green-100 rounded-lg transition-colors border-2">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => handleEliminar(item)} title="Borrar" className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border-2">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 4. Componente de paginación correctamente enlazado */}
            <Paginacion
              currentPage={paginaSegura}
              totalPages={totalPaginas}
              pageSize={pageSize}
              totalItems={totalItems}
              itemLabel={tab.label.toLowerCase()}
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

      <Modal open={modalOpen} item={itemActivo} onClose={() => setModalOpen(false)} onSave={handleGuardar} />
    </div>
  );
}