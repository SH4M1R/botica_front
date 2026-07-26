'use client';

import { useEffect, useState, ComponentType } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react';
import {
  laboratoriosApi, categoriasApi, principiosActivosApi, accionesTerapeuticasApi,
} from '@/api/productos';
import LaboratorioModal from "../components/LaboratorioModal";
import CategoriaModal from  "../components/CategoriaModal";
import PrincipioActivoModal from "../components/PrincipioActivoModal";
import AccionTerapeuticaModal from "../components/AccionTerapeuticaModal";

type ItemBase = { id: number; nombre: string };

// 1. Definimos una interfaz común para todos los modales
export interface ModalProps {
  open: boolean;
  item: ItemBase | null;
  onClose: () => void;
  onSave: (nombre: string) => Promise<void>;
}

// 2. Anotamos la propiedad Modal explícitamente como ComponentType<ModalProps>
const TABS: Array<{
  key: string;
  label: string;
  api: typeof categoriasApi;
  Modal: ComponentType<ModalProps>;
}> = [
  { key: 'categoria', label: 'Categoría', api: categoriasApi, Modal: CategoriaModal as ComponentType<ModalProps> },
  { key: 'laboratorio', label: 'Laboratorio', api: laboratoriosApi, Modal: LaboratorioModal as ComponentType<ModalProps> },
  { key: 'principio', label: 'Principio Activo', api: principiosActivosApi, Modal: PrincipioActivoModal as ComponentType<ModalProps> },
  { key: 'accion', label: 'Acción Terapéutica', api: accionesTerapeuticasApi, Modal: AccionTerapeuticaModal as ComponentType<ModalProps> },
];

export default function AtributoProductoPage() {
  const [tabActiva, setTabActiva] = useState<string>('categoria');
  const [items, setItems] = useState<ItemBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [itemActivo, setItemActivo] = useState<ItemBase | null>(null);

  const tab = TABS.find((t) => t.key === tabActiva) || TABS[0];

  const cargar = async () => {
    setLoading(true);
    try {
      setItems(await tab.api.listar());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, [tabActiva]);

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

  const ModalComponent = tab.Modal;

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
          <span className="text-sm font-bold text-zinc-700">{tab.label}</span>
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
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider">
                <th className="px-5 py-3">#</th>
                <th className="px-5 py-3">Descripción</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-50/60 transition-colors">
                  <td className="px-5 py-3 text-zinc-500">{item.id}</td>
                  <td className="px-5 py-3 font-medium text-zinc-800">{item.nombre}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => { setItemActivo(item); setModalOpen(true); }} className="p-2 text-zinc-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleEliminar(item)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ModalComponent open={modalOpen} item={itemActivo} onClose={() => setModalOpen(false)} onSave={handleGuardar} />
    </div>
  );
}