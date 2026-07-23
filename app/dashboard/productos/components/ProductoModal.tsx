'use client';

import { useEffect, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { laboratoriosApi, categoriasApi, principiosActivosApi, accionesTerapeuticasApi } from "@/api/productos";
import type { Producto, ProductoPayload, Laboratorio, Categoria, PrincipioActivo, AccionTerapeutica } from "@/api/productos";
import LaboratorioModal from './LaboratorioModal';
import CategoriaModal from './CategoriaModal';
import PrincipioActivoModal from './PrincipioActivoModal';
import AccionTerapeuticaModal from './AccionTerapeuticaModal';

export function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 cursor-pointer ${checked ? 'bg-primary' : 'bg-zinc-300'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

interface ProductoModalProps {
  open: boolean;
  producto: Producto | null;
  onClose: () => void;
  onSave: (data: ProductoPayload) => Promise<void>;
}

const emptyForm: ProductoPayload = {
  nombre: '', codigo_digemid: '', precio_costo: 0, precio_venta: 0, stock: 0, stock_minimo: 0, barras: '',
  estado: true, requiere_receta: false, fecha_vencimiento: '', lote: '',
  laboratorio: { id: 0 }, categoria: { id: 0 },
  principioActivo: null, accionTerapeutica: null,
  vende_por_presentaciones: false,
  blister_habilitado: false, unidades_blister: null, precio_blister: null,
  caja_habilitado: false, unidades_caja: null, precio_caja: null,
  factor: 1, registro_sanitario: null,
};

export default function ProductoModal({ open, producto, onClose, onSave }: ProductoModalProps) {
  const [form, setForm] = useState<ProductoPayload>(emptyForm);
  const [laboratorios, setLaboratorios] = useState<Laboratorio[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [principiosActivos, setPrincipiosActivos] = useState<PrincipioActivo[]>([]);
  const [accionesTerapeuticas, setAccionesTerapeuticas] = useState<AccionTerapeutica[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [modalLabAbierto, setModalLabAbierto] = useState(false);
  const [modalCatAbierto, setModalCatAbierto] = useState(false);
  const [modalPrincipioAbierto, setModalPrincipioAbierto] = useState(false);
  const [modalAccionAbierto, setModalAccionAbierto] = useState(false);

  const cargarLaboratorios = () => laboratoriosApi.listar().then(setLaboratorios).catch(() => setLaboratorios([]));
  const cargarCategorias = () => categoriasApi.listar().then(setCategorias).catch(() => setCategorias([]));
  const cargarPrincipios = () => principiosActivosApi.listar().then(setPrincipiosActivos).catch(() => setPrincipiosActivos([]));
  const cargarAcciones = () => accionesTerapeuticasApi.listar().then(setAccionesTerapeuticas).catch(() => setAccionesTerapeuticas([]));

  useEffect(() => {
    if (!open) return;
    cargarLaboratorios();
    cargarCategorias();
    cargarPrincipios();
    cargarAcciones();
    setError('');
    setForm(producto ? {
      nombre: producto.nombre,
      codigo_digemid: producto.codigo_digemid ?? '',
      precio_costo: producto.precio_costo,
      precio_venta: producto.precio_venta,
      stock: producto.stock,
      stock_minimo: producto.stock_minimo ?? 0,
      barras: producto.barras ?? '',
      estado: producto.estado,
      requiere_receta: producto.requiere_receta ?? false,
      fecha_vencimiento: producto.fecha_vencimiento ?? '',
      lote: producto.lote ?? '',
      laboratorio: { id: producto.laboratorio.id },
      categoria: { id: producto.categoria.id },
      principioActivo: producto.principioActivo ? { id: producto.principioActivo.id } : null,
      accionTerapeutica: producto.accionTerapeutica ? { id: producto.accionTerapeutica.id } : null,
      vende_por_presentaciones: producto.vende_por_presentaciones ?? false,
      blister_habilitado: producto.blister_habilitado ?? false,
      unidades_blister: producto.unidades_blister ?? null,
      precio_blister: producto.precio_blister ?? null,
      caja_habilitado: producto.caja_habilitado ?? false,
      unidades_caja: producto.unidades_caja ?? null,
      precio_caja: producto.precio_caja ?? null,
      factor: producto.factor && producto.factor > 0 ? producto.factor : 1,
      registro_sanitario: producto.registro_sanitario ?? null,
    } : emptyForm);
  }, [producto, open]);

  if (!open) return null;

  const set = (field: keyof ProductoPayload, value: ProductoPayload[keyof ProductoPayload]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleGuardarLaboratorio = async (nombre: string) => {
    const nuevo = await laboratoriosApi.crear({ nombre });
    await cargarLaboratorios();
    set('laboratorio', { id: nuevo.id });
  };

  const handleGuardarCategoria = async (nombre: string) => {
    const nueva = await categoriasApi.crear({ nombre });
    await cargarCategorias();
    set('categoria', { id: nueva.id });
  };

  const handleGuardarPrincipio = async (nombre: string) => {
    const nuevo = await principiosActivosApi.crear({ nombre });
    await cargarPrincipios();
    set('principioActivo', { id: nuevo.id });
  };

  const handleGuardarAccion = async (nombre: string) => {
    const nueva = await accionesTerapeuticasApi.crear({ nombre });
    await cargarAcciones();
    set('accionTerapeutica', { id: nueva.id });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) return setError('El nombre es obligatorio.');
    if (!form.laboratorio.id || !form.categoria.id) return setError('Selecciona laboratorio y categoría.');

    if (form.vende_por_presentaciones) {
      if (!form.blister_habilitado && !form.caja_habilitado) {
        return setError('Habilita al menos una presentación (blister o caja), o desactiva la opción.');
      }
      if (form.blister_habilitado && (!form.unidades_blister || form.unidades_blister <= 0 || !form.precio_blister || form.precio_blister <= 0)) {
        return setError('Completa unidades y precio del blister.');
      }
      if (form.caja_habilitado && (!form.unidades_caja || form.unidades_caja <= 0 || !form.precio_caja || form.precio_caja <= 0)) {
        return setError('Completa unidades y precio de la caja.');
      }
    }

    const dataAEnviar: ProductoPayload = {
      ...form,
      factor: form.factor && form.factor > 0 ? form.factor : 1,
      blister_habilitado: form.vende_por_presentaciones && form.blister_habilitado,
      unidades_blister: form.vende_por_presentaciones && form.blister_habilitado ? form.unidades_blister : null,
      precio_blister: form.vende_por_presentaciones && form.blister_habilitado ? form.precio_blister : null,
      caja_habilitado: form.vende_por_presentaciones && form.caja_habilitado,
      unidades_caja: form.vende_por_presentaciones && form.caja_habilitado ? form.unidades_caja : null,
      precio_caja: form.vende_por_presentaciones && form.caja_habilitado ? form.precio_caja : null,
      registro_sanitario: form.registro_sanitario ?? null,
    };

    setSaving(true);
    setError('');
    try {
      await onSave(dataAEnviar);
      onClose();
    } catch {
      setError('No se pudo guardar el producto.');
    } finally {
      setSaving(false);
    }
  };

  // --- Cálculo de costo unitario y % de ganancia ---
  // precio_costo = costo ingresado (de la caja si factor > 1, o directo si factor = 1)
  // precio_venta = precio de venta por unidad
  const factorValido = form.factor && form.factor > 0 ? form.factor : 1;
  const costoUnitario = form.precio_costo > 0 ? form.precio_costo / factorValido : 0;
  const gananciaPct = costoUnitario > 0 ? ((form.precio_venta - costoUnitario) / costoUnitario) * 100 : 0;

  const inputClass = "w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all";
  const calculatedInputClass = "w-full px-3 py-2 rounded-lg border border-zinc-200 bg-zinc-100 text-sm font-semibold text-zinc-700 cursor-not-allowed";
  const labelClass = "text-xs font-semibold text-zinc-600";
  const addBtnClass = "flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-dark transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 w-full max-w-6xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-zinc-800">{producto ? 'Editar producto' : 'Nuevo producto'}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* Bloque: Información general */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-400">Información General</h3>

            {/* Nombre | Código de barras */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1">
                <label className={labelClass}>Nombre del Producto</label>
                <input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Código de barras</label>
                <input value={form.barras} onChange={(e) => set('barras', e.target.value)} className={inputClass} />
              </div>
            </div>

            {/* Categoría | Principio activo | Acción terapéutica | Laboratorio */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className={labelClass}>Categoría</label>
                  <button type="button" onClick={() => setModalCatAbierto(true)} className={addBtnClass}>
                    <Plus size={12} /> Nueva
                  </button>
                </div>
                <select value={form.categoria.id} onChange={(e) => set('categoria', { id: Number(e.target.value) })} className={inputClass}>
                  <option value={0} disabled>Selecciona...</option>
                  {categorias.map((cat) => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className={labelClass}>Principio activo</label>
                  <button type="button" onClick={() => setModalPrincipioAbierto(true)} className={addBtnClass}>
                    <Plus size={12} /> Nuevo
                  </button>
                </div>
                <select
                  value={form.principioActivo?.id ?? 0}
                  onChange={(e) => set('principioActivo', Number(e.target.value) ? { id: Number(e.target.value) } : null)}
                  className={inputClass}
                >
                  <option value={0}>Sin especificar</option>
                  {principiosActivos.map((pa) => <option key={pa.id} value={pa.id}>{pa.nombre}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className={labelClass}>Acción terapéutica</label>
                  <button type="button" onClick={() => setModalAccionAbierto(true)} className={addBtnClass}>
                    <Plus size={12} /> Nueva
                  </button>
                </div>
                <select
                  value={form.accionTerapeutica?.id ?? 0}
                  onChange={(e) => set('accionTerapeutica', Number(e.target.value) ? { id: Number(e.target.value) } : null)}
                  className={inputClass}
                >
                  <option value={0}>Sin especificar</option>
                  {accionesTerapeuticas.map((at) => <option key={at.id} value={at.id}>{at.nombre}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className={labelClass}>Laboratorio</label>
                  <button type="button" onClick={() => setModalLabAbierto(true)} className={addBtnClass}>
                    <Plus size={12} /> Nuevo
                  </button>
                </div>
                <select value={form.laboratorio.id} onChange={(e) => set('laboratorio', { id: Number(e.target.value) })} className={inputClass}>
                  <option value={0} disabled>Selecciona...</option>
                  {laboratorios.map((lab) => <option key={lab.id} value={lab.id}>{lab.nombre}</option>)}
                </select>
              </div>
            </div>

            {/* Código Digemid | Registro Sanitario | Lote | Fecha de vencimiento */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className={labelClass}>Código Digemid (Solamente si requiere)</label>
                <input value={form.codigo_digemid} onChange={(e) => set('codigo_digemid', e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Registro Sanitario</label>
                <input
                  type="number" step="0.01" min="0"
                  value={form.registro_sanitario ?? ''}
                  onChange={(e) => set('registro_sanitario', e.target.value ? Number(e.target.value) : null)}
                  className={inputClass}
                  placeholder="Ej. 12345"
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Lote (Solamente si requiere)</label>
                <input value={form.lote} onChange={(e) => set('lote', e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Fecha de vencimiento</label>
                <input type="date" value={form.fecha_vencimiento} onChange={(e) => set('fecha_vencimiento', e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          {/* Bloque: Precios y stock */}
          <div className="space-y-4 pt-2 border-t border-zinc-100">
            <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-400">Precios y Stock</h3>

            {/* Precio costo | Factor | Precio costo unidad (calculado) | % Ganancia (calculado) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className={labelClass}>Precio costo</label>
                <input type="number" step="0.01" min="0" value={form.precio_costo} onChange={(e) => set('precio_costo', Number(e.target.value))} className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Factor (unid. por caja)</label>
                <input
                  type="number" min="1"
                  value={form.factor ?? 1}
                  onChange={(e) => set('factor', e.target.value ? Number(e.target.value) : 1)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Precio costo unidad</label>
                <input type="text" disabled value={`S/ ${costoUnitario.toFixed(2)}`} className={calculatedInputClass} />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>% Ganancia</label>
                <input
                  type="text"
                  disabled
                  value={`${gananciaPct >= 0 ? '+' : ''}${gananciaPct.toFixed(1)}%`}
                  className={`${calculatedInputClass} ${gananciaPct < 0 ? 'text-red-500' : 'text-primary'}`}
                />
              </div>
            </div>

            {/* Precio venta | Stock | Stock mínimo | Producto activo | Requiere receta */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
              <div className="space-y-1">
                <label className={labelClass}>Precio venta</label>
                <input type="number" step="0.01" min="0" value={form.precio_venta} onChange={(e) => set('precio_venta', Number(e.target.value))} className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Stock</label>
                <input type="number" min="0" value={form.stock} onChange={(e) => set('stock', Number(e.target.value))} className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Stock Mínimo</label>
                <input type="number" min="0" value={form.stock_minimo ?? ''} onChange={(e) => set('stock_minimo', Number(e.target.value))} className={inputClass} />
              </div>
              <div className="flex items-center pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.estado} onChange={(e) => set('estado', e.target.checked)} className="w-4 h-4 accent-primary" />
                  <span className="text-sm font-medium text-zinc-700">Producto activo</span>
                </label>
              </div>
              <div className="flex items-center pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.requiere_receta} onChange={(e) => set('requiere_receta', e.target.checked)} className="w-4 h-4 accent-primary" />
                  <span className="text-sm font-medium text-zinc-700">Requiere Receta</span>
                </label>
              </div>
            </div>
          </div>

          {/* Bloque: Presentaciones de venta (blister / caja) — sin cambios */}
          <div className="space-y-4 pt-2 border-t border-zinc-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-400">Presentaciones de Venta</h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">Actívalo solo si este producto también se vende por blister y/o caja.</p>
              </div>
              <ToggleSwitch
                checked={form.vende_por_presentaciones}
                onChange={(checked) => {
                  set('vende_por_presentaciones', checked);
                  if (!checked) {
                    set('blister_habilitado', false);
                    set('caja_habilitado', false);
                  }
                }}
              />
            </div>

            {form.vende_por_presentaciones && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Blister */}
                <div className="rounded-xl border border-zinc-200 p-4 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.blister_habilitado}
                      onChange={(e) => set('blister_habilitado', e.target.checked)}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-sm font-semibold text-zinc-700">Se vende por blister</span>
                  </label>

                  {form.blister_habilitado && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className={labelClass}>Unidades por blister</label>
                        <input
                          type="number" min="1"
                          value={form.unidades_blister ?? ''}
                          onChange={(e) => set('unidades_blister', e.target.value ? Number(e.target.value) : null)}
                          className={inputClass}
                          placeholder="Ej. 10"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className={labelClass}>Precio por blister</label>
                        <input
                          type="number" step="0.01" min="0"
                          value={form.precio_blister ?? ''}
                          onChange={(e) => set('precio_blister', e.target.value ? Number(e.target.value) : null)}
                          className={inputClass}
                          placeholder="S/ 0.00"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Caja */}
                <div className="rounded-xl border border-zinc-200 p-4 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.caja_habilitado}
                      onChange={(e) => set('caja_habilitado', e.target.checked)}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-sm font-semibold text-zinc-700">Se vende por caja</span>
                  </label>

                  {form.caja_habilitado && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className={labelClass}>Unidades por caja</label>
                        <input
                          type="number" min="1"
                          value={form.unidades_caja ?? ''}
                          onChange={(e) => set('unidades_caja', e.target.value ? Number(e.target.value) : null)}
                          className={inputClass}
                          placeholder="Ej. 100"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className={labelClass}>Precio por caja</label>
                        <input
                          type="number" step="0.01" min="0"
                          value={form.precio_caja ?? ''}
                          onChange={(e) => set('precio_caja', e.target.value ? Number(e.target.value) : null)}
                          className={inputClass}
                          placeholder="S/ 0.00"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end pt-2 border-t border-zinc-100">
            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-xs hover:shadow-md transition-all disabled:opacity-60">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>

      <LaboratorioModal open={modalLabAbierto} onClose={() => setModalLabAbierto(false)} onSave={handleGuardarLaboratorio} />
      <CategoriaModal open={modalCatAbierto} onClose={() => setModalCatAbierto(false)} onSave={handleGuardarCategoria} />
      <PrincipioActivoModal open={modalPrincipioAbierto} onClose={() => setModalPrincipioAbierto(false)} onSave={handleGuardarPrincipio} />
      <AccionTerapeuticaModal open={modalAccionAbierto} onClose={() => setModalAccionAbierto(false)} onSave={handleGuardarAccion} />
    </div>
  );
}