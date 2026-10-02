'use client';

import { useState, useEffect, useRef } from 'react';
import { FileText, Printer, Loader2, Search, Check, ChevronDown, FileSpreadsheet } from 'lucide-react';

import ModalAviso, { TipoAviso } from '@/components/ModalAviso';

import * as api from '@/api/reportes';
import { productosApi } from '@/api/productos';
import { obtenerEmpresa } from '@/api/empresa';
import { descargarPdf, abrirPdfEnNuevaPestana } from '@/utils/reportes/pdfBase';
import { descargarExcel } from '@/utils/excel/excelBase';

// PDF
import { generarReporteAsistenciaPos80, generarReporteAsistenciaA4 } from '@/utils/reportes/reporteAsistencia';
import { generarReporteVentasPeriodoPos80, generarReporteVentasPeriodoA4 } from '@/utils/reportes/reporteVentasPeriodo';
import { generarVentasPorEmpleadoPos80, generarVentasPorEmpleadoA4 } from '@/utils/reportes/reporteVentasEmpleado';
import { generarTopProductosPos80, generarTopProductosA4 } from '@/utils/reportes/reporteTopProductos';
import { generarArqueoCajaPos80, generarArqueoCajaA4 } from '@/utils/reportes/reporteArqueoCaja';
import { generarFlujoCajaPos80, generarFlujoCajaA4 } from '@/utils/reportes/reporteFlujoCaja';
import { generarComprasPorProveedorPos80, generarComprasPorProveedorA4 } from '@/utils/reportes/reporteComprasProveedor';
import { generarAnalisisCostosPos80, generarAnalisisCostosA4 } from '@/utils/reportes/reporteAnalisisCostos';
import { generarCuentasPorPagarPos80, generarCuentasPorPagarA4 } from '@/utils/reportes/reporteCuentasPorPagar';
import { generarInventarioValoradoPos80, generarInventarioValoradoA4 } from '@/utils/reportes/reporteInventarioValorado';
import { generarAlertaStockPos80, generarAlertaStockA4 } from '@/utils/reportes/reporteAlertaStock';
import { generarCatalogoTerapeuticoPos80, generarCatalogoTerapeuticoA4 } from '@/utils/reportes/reporteCatalogoTerapeutico';
import { generarConsolidadoGeneralPos80, generarConsolidadoGeneralA4 } from '@/utils/reportes/reporteConsolidadoGeneral';
import { generarProductosPorLaboratorioPos80, generarProductosPorLaboratorioA4 } from '@/utils/reportes/reporteProductosPorLaboratorio';
import { generarProductosPorVencerPos80, generarProductosPorVencerA4 } from '@/utils/reportes/reporteProductosPorVencer';
import { generarVentasPorProductoPos80, generarVentasPorProductoA4 } from '@/utils/reportes/reporteVentasPorProducto';

// Excel
import { generarReporteAsistenciaExcel } from '@/utils/excel/reporteAsistencia';
import { generarReporteVentasPeriodoExcel } from '@/utils/excel/reporteVentasPeriodo';
import { generarVentasPorEmpleadoExcel } from '@/utils/excel/reporteVentasEmpleado';
import { generarTopProductosExcel } from '@/utils/excel/reporteTopProductos';
import { generarComprasPorProveedorExcel } from '@/utils/excel/reporteComprasProveedor';
import { generarAnalisisCostosExcel } from '@/utils/excel/reporteAnalisisCostos';
import { generarCuentasPorPagarExcel } from '@/utils/excel/reporteCuentasPorPagar';
import { generarInventarioValoradoExcel } from '@/utils/excel/reporteInventarioValorado';
import { generarAlertaStockExcel } from '@/utils/excel/reporteAlertaStock';
import { generarCatalogoTerapeuticoExcel } from '@/utils/excel/reporteCatalogoTerapeutico';
import { generarConsolidadoGeneralExcel } from '@/utils/excel/reporteConsolidadoGeneral';
import { generarProductosPorLaboratorioExcel } from '@/utils/excel/reporteProductosPorLaboratorio';
import { generarProductosPorVencerExcel } from '@/utils/excel/reporteProductosPorVencer';
import { generarVentasPorProductoExcel } from '@/utils/excel/reporteVentasPorProducto';
import { generarArqueoCajaExcel } from '@/utils/excel/reporteArqueoCaja';
import { generarFlujoCajaExcel } from '@/utils/excel/reporteFlujoCaja';

type Modulo = 'ventas' | 'caja' | 'compras' | 'inventario' | 'gestion';

interface Producto {
  id: number;
  nombre: string;
  codigo?: string;
  laboratorio?: string;
}

interface ProveedorItem {
  nombre: string;
}

const MODULOS: { id: Modulo; label: string }[] = [
  { id: 'ventas', label: 'Ventas' },
  { id: 'caja', label: 'Caja' },
  { id: 'compras', label: 'Compras' },
  { id: 'inventario', label: 'Inventario' },
  { id: 'gestion', label: 'Gestión' },
];

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function inicioDeMes() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

/* ============================================================
   Card con 3 botones: POS80, A4, Excel
   ============================================================ */

function ReporteCard({
  titulo,
  descripcion,
  children,
  cargando,
  onPos80,
  onA4,
  onExcel,
}: {
  titulo: string;
  descripcion: string;
  children?: React.ReactNode;
  cargando: boolean;
  onPos80: () => void;
  onA4: () => void;
  onExcel: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
          <FileText size={18} />
        </div>
        <div>
          <h3 className="font-semibold text-primary text-sm">{titulo}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">{descripcion}</p>
        </div>
      </div>

      {children && <div className="flex flex-wrap gap-3">{children}</div>}

      <div className="flex gap-2 mt-auto pt-2 border-t border-zinc-100">
        <button
          disabled={cargando}
          onClick={onPos80}
          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-zinc-300 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {cargando ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
          POS80
        </button>
        <button
          disabled={cargando}
          onClick={onA4}
          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {cargando ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
          A4
        </button>
        <button
          disabled={cargando}
          onClick={onExcel}
          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-emerald-300 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {cargando ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
          Excel
        </button>
      </div>
    </div>
  );
}

function InputFecha({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-zinc-500">
      {label}
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 rounded-lg border border-zinc-300 bg-white text-sm text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
      />
    </label>
  );
}

function InputNumero({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-zinc-500">
      {label}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-28 px-3 py-2 rounded-lg border border-zinc-300 bg-white text-sm text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
      />
    </label>
  );
}

function BuscadorProducto({
  label,
  productoSeleccionado,
  onSeleccionarProducto,
  onError,
}: {
  label: string;
  productoSeleccionado: Producto | null;
  onSeleccionarProducto: (prod: Producto | null) => void;
  onError: (msg: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [todosLosProductos, setTodosLosProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setCargando(true);
    productosApi
      .listarActivos()
      .then((data) =>
        setTodosLosProductos(
          data.map((p) => ({
            id: p.id,
            nombre: p.nombre,
            codigo: p.codigo_digemid,
            laboratorio: p.laboratorio?.nombre,
          }))
        )
      )
      .catch((err) => {
        onError('No se pudieron cargar los productos.');
      })
      .finally(() => setCargando(false));
  }, [onError]);

  const productosFiltrados = query.trim()
    ? todosLosProductos.filter((p) => {
        const q = query.toLowerCase();
        return (
          p.nombre.toLowerCase().includes(q) ||
          p.codigo?.toLowerCase().includes(q) ||
          p.laboratorio?.toLowerCase().includes(q)
        );
      })
    : todosLosProductos;

  return (
    <div className="flex flex-col gap-1 text-xs text-zinc-500 w-full relative" ref={dropdownRef}>
      <span>{label}</span>
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar producto por nombre o código..."
          value={productoSeleccionado ? productoSeleccionado.nombre : query}
          onFocus={() => {
            setAbierto(true);
            if (productoSeleccionado) {
              setQuery('');
              onSeleccionarProducto(null);
            }
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (productoSeleccionado) onSeleccionarProducto(null);
            setAbierto(true);
          }}
          className="w-full pl-8 pr-8 py-2 rounded-lg border border-zinc-300 bg-white text-sm text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        />
        <Search size={15} className="absolute left-2.5 top-2.5 text-zinc-400" />
        {cargando ? (
          <Loader2 size={15} className="absolute right-2.5 top-2.5 animate-spin text-zinc-400" />
        ) : (
          <ChevronDown size={15} className="absolute right-2.5 top-2.5 text-zinc-400 pointer-events-none" />
        )}
      </div>

      {abierto && productosFiltrados.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg max-h-60 overflow-y-auto z-50">
          {productosFiltrados.slice(0, 50).map((prod) => (
            <button
              key={prod.id}
              type="button"
              onClick={() => {
                onSeleccionarProducto(prod);
                setAbierto(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-zinc-50 flex items-center justify-between border-b border-zinc-100 last:border-none transition-colors cursor-pointer"
            >
              <div>
                <p className="font-medium text-xs text-zinc-800">{prod.nombre}</p>
                <p className="text-[10px] text-zinc-400">
                  {prod.codigo ? `Cód: ${prod.codigo}` : ''} {prod.laboratorio ? `| Lab: ${prod.laboratorio}` : ''}
                </p>
              </div>
              {productoSeleccionado?.id === prod.id && <Check size={14} className="text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BuscadorLaboratorio({
  label,
  laboratorioSeleccionado,
  onSeleccionarLaboratorio,
  onError,
}: {
  label: string;
  laboratorioSeleccionado: api.LaboratorioResumen | null;
  onSeleccionarLaboratorio: (lab: api.LaboratorioResumen | null) => void;
  onError: (msg: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [laboratorios, setLaboratorios] = useState<api.LaboratorioResumen[]>([]);
  const [cargando, setCargando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setCargando(true);
    api
      .listarLaboratorios()
      .then(setLaboratorios)
      .catch((err) => {
        onError('No se pudieron cargar los laboratorios.');
      })
      .finally(() => setCargando(false));
  }, [onError]);

  const laboratoriosFiltrados = query.trim()
    ? laboratorios.filter((l) => l.nombreLaboratorio.toLowerCase().includes(query.toLowerCase()))
    : laboratorios;

  return (
    <div className="flex flex-col gap-1 text-xs text-zinc-500 w-full relative" ref={dropdownRef}>
      <span>{label}</span>
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar laboratorio..."
          value={laboratorioSeleccionado ? laboratorioSeleccionado.nombreLaboratorio : query}
          onFocus={() => {
            setAbierto(true);
            if (laboratorioSeleccionado) {
              setQuery('');
              onSeleccionarLaboratorio(null);
            }
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (laboratorioSeleccionado) onSeleccionarLaboratorio(null);
            setAbierto(true);
          }}
          className="w-full pl-8 pr-8 py-2 rounded-lg border border-zinc-300 bg-white text-sm text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        />
        <Search size={15} className="absolute left-2.5 top-2.5 text-zinc-400" />
        {cargando ? (
          <Loader2 size={15} className="absolute right-2.5 top-2.5 animate-spin text-zinc-400" />
        ) : (
          <ChevronDown size={15} className="absolute right-2.5 top-2.5 text-zinc-400 pointer-events-none" />
        )}
      </div>

      {abierto && laboratoriosFiltrados.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg max-h-60 overflow-y-auto z-50">
          {laboratoriosFiltrados.map((lab) => (
            <button
              key={lab.idLaboratorio}
              type="button"
              onClick={() => {
                onSeleccionarLaboratorio(lab);
                setAbierto(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-zinc-50 flex items-center justify-between border-b border-zinc-100 last:border-none transition-colors cursor-pointer"
            >
              <div>
                <p className="font-medium text-xs text-zinc-800">{lab.nombreLaboratorio}</p>
                <p className="text-[10px] text-zinc-400">{lab.cantidadProductos} producto(s)</p>
              </div>
              {laboratorioSeleccionado?.idLaboratorio === lab.idLaboratorio && (
                <Check size={14} className="text-primary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BuscadorProveedor({
  label,
  proveedorSeleccionado,
  onSeleccionarProveedor,
  onError,
}: {
  label: string;
  proveedorSeleccionado: ProveedorItem | null;
  onSeleccionarProveedor: (prov: ProveedorItem | null) => void;
  onError: (msg: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [proveedores, setProveedores] = useState<ProveedorItem[]>([]);
  const [cargando, setCargando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setCargando(true);
    productosApi
      .listarActivos()
      .then((data) => {
        const nombresUnicos = Array.from(
          new Set(
            data
              .map((p) => p.laboratorio?.nombre)
              .filter((nom): nom is string => Boolean(nom && nom.trim() !== ''))
          )
        ).sort();
        setProveedores(nombresUnicos.map((nombre) => ({ nombre })));
      })
      .catch((err) => {
        onError('No se pudieron cargar los proveedores.');
      })
      .finally(() => setCargando(false));
  }, [onError]);

  const proveedoresFiltrados = query.trim()
    ? proveedores.filter((p) => p.nombre.toLowerCase().includes(query.toLowerCase()))
    : proveedores;

  return (
    <div className="flex flex-col gap-1 text-xs text-zinc-500 w-full relative" ref={dropdownRef}>
      <span>{label}</span>
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar proveedor por nombre..."
          value={proveedorSeleccionado ? proveedorSeleccionado.nombre : query}
          onFocus={() => {
            setAbierto(true);
            if (proveedorSeleccionado) {
              setQuery('');
              onSeleccionarProveedor(null);
            }
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (proveedorSeleccionado) onSeleccionarProveedor(null);
            setAbierto(true);
          }}
          className="w-full pl-8 pr-8 py-2 rounded-lg border border-zinc-300 bg-white text-sm text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        />
        <Search size={15} className="absolute left-2.5 top-2.5 text-zinc-400" />
        {cargando ? (
          <Loader2 size={15} className="absolute right-2.5 top-2.5 animate-spin text-zinc-400" />
        ) : (
          <ChevronDown size={15} className="absolute right-2.5 top-2.5 text-zinc-400 pointer-events-none" />
        )}
      </div>

      {abierto && proveedoresFiltrados.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg max-h-60 overflow-y-auto z-50">
          {proveedoresFiltrados.map((prov, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                onSeleccionarProveedor(prov);
                setAbierto(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-zinc-50 flex items-center justify-between border-b border-zinc-100 last:border-none transition-colors cursor-pointer"
            >
              <div>
                <p className="font-medium text-xs text-zinc-800">{prov.nombre}</p>
              </div>
              {proveedorSeleccionado?.nombre === prov.nombre && <Check size={14} className="text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BuscadorPrincipioActivo({
  label,
  principioSeleccionado,
  onSeleccionarPrincipio,
  onError,
}: {
  label: string;
  principioSeleccionado: string | null;
  onSeleccionarPrincipio: (principio: string | null) => void;
  onError: (msg: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [principios, setPrincipios] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setCargando(true);
    api
      .obtenerCatalogoTerapeutico()
      .then((data) => {
        const unicos = Array.from(
          new Set(
            data
              .map((item) => item.principioActivo)
              .filter((p): p is string => Boolean(p && p.trim() !== ''))
          )
        ).sort();
        setPrincipios(unicos);
      })
      .catch((err) => {
        onError('No se pudieron cargar los principios activos.');
      })
      .finally(() => setCargando(false));
  }, [onError]);

  const principiosFiltrados = query.trim()
    ? principios.filter((p) => p.toLowerCase().includes(query.toLowerCase()))
    : principios;

  return (
    <div className="flex flex-col gap-1 text-xs text-zinc-500 w-full relative" ref={dropdownRef}>
      <span>{label}</span>
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar principio activo..."
          value={principioSeleccionado ?? query}
          onFocus={() => {
            setAbierto(true);
            if (principioSeleccionado) {
              setQuery('');
              onSeleccionarPrincipio(null);
            }
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (principioSeleccionado) onSeleccionarPrincipio(null);
            setAbierto(true);
          }}
          className="w-full pl-8 pr-8 py-2 rounded-lg border border-zinc-300 bg-white text-sm text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        />
        <Search size={15} className="absolute left-2.5 top-2.5 text-zinc-400" />
        {cargando ? (
          <Loader2 size={15} className="absolute right-2.5 top-2.5 animate-spin text-zinc-400" />
        ) : (
          <ChevronDown size={15} className="absolute right-2.5 top-2.5 text-zinc-400 pointer-events-none" />
        )}
      </div>

      {abierto && principiosFiltrados.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg max-h-60 overflow-y-auto z-50">
          {principiosFiltrados.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                onSeleccionarPrincipio(p);
                setAbierto(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-zinc-50 flex items-center justify-between border-b border-zinc-100 last:border-none transition-colors cursor-pointer"
            >
              <p className="font-medium text-xs text-zinc-800">{p}</p>
              {principioSeleccionado === p && <Check size={14} className="text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReportesPage() {
  const [moduloActivo, setModuloActivo] = useState<Modulo>('ventas');
  const [cargando, setCargando] = useState<string | null>(null);

  const [fechaInicio, setFechaInicio] = useState(inicioDeMes());
  const [fechaFin, setFechaFin] = useState(hoy());

  const [idArqueo, setIdArqueo] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [laboratorioSeleccionado, setLaboratorioSeleccionado] = useState<api.LaboratorioResumen | null>(null);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<ProveedorItem | null>(null);
  const [principioSeleccionado, setPrincipioSeleccionado] = useState<string | null>(null);

  const [limiteTop, setLimiteTop] = useState('20');
  const [diasVencer, setDiasVencer] = useState('30');

  const [logoEmpresa, setLogoEmpresa] = useState<string | undefined>(undefined);

  // Estado para controlar el ModalAviso
  const [avisoState, setAvisoState] = useState<{
    isOpen: boolean;
    mensaje: string;
    titulo?: string;
    tipo?: TipoAviso;
  }>({
    isOpen: false,
    mensaje: '',
    titulo: 'Aviso',
    tipo: 'warning',
  });

  const mostrarAviso = (mensaje: string, titulo = 'Aviso', tipo: TipoAviso = 'warning') => {
    setAvisoState({ isOpen: true, mensaje, titulo, tipo });
  };

  const cerrarAviso = () => {
    setAvisoState((prev) => ({ ...prev, isOpen: false }));
  };

  useEffect(() => {
    obtenerEmpresa()
      .then((empresa) => setLogoEmpresa(empresa.logo || undefined))
      .catch(() => {
        mostrarAviso('No se pudo cargar la información de la empresa.', 'Error de carga', 'error');
      });
  }, []);

  async function ejecutar(key: string, accion: () => Promise<void>) {
    setCargando(key);
    try {
      await accion();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ocurrió un error al generar el reporte.';
      mostrarAviso(msg, 'Error al generar reporte', 'error');
    } finally {
      setCargando(null);
    }
  }

  return (
    <div className="space-y-6">
      <ModalAviso
        isOpen={avisoState.isOpen}
        titulo={avisoState.titulo}
        mensaje={avisoState.mensaje}
        tipo={avisoState.tipo}
        onClose={cerrarAviso}
      />

      <div>
        <h1 className="text-2xl font-bold text-primary tracking-tight">Reportes</h1>
        <p className="text-sm text-zinc-500 mt-1">Genera y descarga los reportes del sistema en ticket, A4 o Excel.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {MODULOS.map((m) => (
          <button
            key={m.id}
            onClick={() => setModuloActivo(m.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              moduloActivo === m.id
                ? 'bg-primary text-white'
                : 'bg-white text-zinc-600 border border-zinc-300 hover:bg-zinc-50'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {moduloActivo !== 'inventario' && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs p-4 flex flex-wrap gap-4 items-end">
          <InputFecha label="Fecha inicio" value={fechaInicio} onChange={setFechaInicio} />
          <InputFecha label="Fecha fin" value={fechaFin} onChange={setFechaFin} />
        </div>
      )}

      {/* ===================== VENTAS ===================== */}
      {moduloActivo === 'ventas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <ReporteCard
            titulo="Ventas Diarias / Periódicas"
            descripcion="Resumen analítico de ventas con desglose de subtotal, IGV y total."
            cargando={cargando === 'ventas-periodo'}
            onPos80={() =>
              ejecutar('ventas-periodo', async () => {
                const data = await api.obtenerReporteVentasPeriodo(fechaInicio, fechaFin);
                abrirPdfEnNuevaPestana(await generarReporteVentasPeriodoPos80(data, logoEmpresa));
              })
            }
            onA4={() =>
              ejecutar('ventas-periodo', async () => {
                const data = await api.obtenerReporteVentasPeriodo(fechaInicio, fechaFin);
                descargarPdf(
                  await generarReporteVentasPeriodoA4(data, logoEmpresa),
                  `ventas-periodo-${fechaInicio}_${fechaFin}`
                );
              })
            }
            onExcel={() =>
              ejecutar('ventas-periodo', async () => {
                const data = await api.obtenerReporteVentasPeriodo(fechaInicio, fechaFin);
                descargarExcel(
                  await generarReporteVentasPeriodoExcel(data, logoEmpresa),
                  `ventas-periodo-${fechaInicio}_${fechaFin}`
                );
              })
            }
          />

          <ReporteCard
            titulo="Ventas por Empleado"
            descripcion="Desempeño y volumen de ventas por vendedor."
            cargando={cargando === 'ventas-empleado'}
            onPos80={() =>
              ejecutar('ventas-empleado', async () => {
                const data = await api.obtenerVentasPorEmpleado(fechaInicio, fechaFin);
                abrirPdfEnNuevaPestana(await generarVentasPorEmpleadoPos80(fechaInicio, fechaFin, data, logoEmpresa));
              })
            }
            onA4={() =>
              ejecutar('ventas-empleado', async () => {
                const data = await api.obtenerVentasPorEmpleado(fechaInicio, fechaFin);
                descargarPdf(
                  await generarVentasPorEmpleadoA4(fechaInicio, fechaFin, data, logoEmpresa),
                  `ventas-por-empleado-${fechaInicio}_${fechaFin}`
                );
              })
            }
            onExcel={() =>
              ejecutar('ventas-empleado', async () => {
                const data = await api.obtenerVentasPorEmpleado(fechaInicio, fechaFin);
                descargarExcel(
                  await generarVentasPorEmpleadoExcel(fechaInicio, fechaFin, data, logoEmpresa),
                  `ventas-por-empleado-${fechaInicio}_${fechaFin}`
                );
              })
            }
          />

          <ReporteCard
            titulo="Productos Más Vendidos"
            descripcion="Ranking Top / ABC por unidades y monto vendido."
            cargando={cargando === 'top-productos'}
            onPos80={() =>
              ejecutar('top-productos', async () => {
                const data = await api.obtenerTopProductos(fechaInicio, fechaFin, Number(limiteTop) || 20);
                abrirPdfEnNuevaPestana(await generarTopProductosPos80(fechaInicio, fechaFin, data, logoEmpresa));
              })
            }
            onA4={() =>
              ejecutar('top-productos', async () => {
                const data = await api.obtenerTopProductos(fechaInicio, fechaFin, Number(limiteTop) || 20);
                descargarPdf(
                  await generarTopProductosA4(fechaInicio, fechaFin, data, logoEmpresa),
                  `top-productos-${fechaInicio}_${fechaFin}`
                );
              })
            }
            onExcel={() =>
              ejecutar('top-productos', async () => {
                const data = await api.obtenerTopProductos(fechaInicio, fechaFin, Number(limiteTop) || 20);
                descargarExcel(
                  await generarTopProductosExcel(fechaInicio, fechaFin, data, logoEmpresa),
                  `top-productos-${fechaInicio}_${fechaFin}`
                );
              })
            }
          >
            <InputNumero label="Límite (top N)" value={limiteTop} onChange={setLimiteTop} placeholder="20" />
          </ReporteCard>

          <ReporteCard
            titulo="Ventas por Producto"
            descripcion="Detalle de ventas realizadas de un producto específico en el periodo seleccionado."
            cargando={cargando === 'ventas-producto'}
            onPos80={() =>
              ejecutar('ventas-producto', async () => {
                if (!productoSeleccionado) {
                  return mostrarAviso('Por favor, selecciona un producto.');
                }
                const data = await api.obtenerVentasPorProducto(productoSeleccionado.id, fechaInicio, fechaFin);
                abrirPdfEnNuevaPestana(await generarVentasPorProductoPos80(data, logoEmpresa));
              })
            }
            onA4={() =>
              ejecutar('ventas-producto', async () => {
                if (!productoSeleccionado) {
                  return mostrarAviso('Por favor, selecciona un producto.');
                }
                const data = await api.obtenerVentasPorProducto(productoSeleccionado.id, fechaInicio, fechaFin);
                descargarPdf(
                  await generarVentasPorProductoA4(data, logoEmpresa),
                  `ventas-producto-${productoSeleccionado.id}-${fechaInicio}_${fechaFin}`
                );
              })
            }
            onExcel={() =>
              ejecutar('ventas-producto', async () => {
                if (!productoSeleccionado) {
                  return mostrarAviso('Por favor, selecciona un producto.');
                }
                const data = await api.obtenerVentasPorProducto(productoSeleccionado.id, fechaInicio, fechaFin);
                descargarExcel(
                  await generarVentasPorProductoExcel(data, logoEmpresa),
                  `ventas-producto-${productoSeleccionado.id}-${fechaInicio}_${fechaFin}`
                );
              })
            }
          >
            <BuscadorProducto
              label="Seleccionar Producto"
              productoSeleccionado={productoSeleccionado}
              onSeleccionarProducto={setProductoSeleccionado}
              onError={(msg) => mostrarAviso(msg, 'Error de Carga', 'error')}
            />
          </ReporteCard>
        </div>
      )}

      {/* ===================== CAJA ===================== */}
      {moduloActivo === 'caja' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <ReporteCard
            titulo="Arqueo y Cierre de Caja"
            descripcion="Comparativo entre saldo esperado y saldo físico ingresado."
            cargando={cargando === 'arqueo'}
            onPos80={() =>
              ejecutar('arqueo', async () => {
                if (!idArqueo) {
                  return mostrarAviso('Ingresa el N° de arqueo/caja.');
                }
                const data = await api.obtenerReporteArqueo(Number(idArqueo));
                abrirPdfEnNuevaPestana(await generarArqueoCajaPos80(data, logoEmpresa));
              })
            }
            onA4={() =>
              ejecutar('arqueo', async () => {
                if (!idArqueo) {
                  return mostrarAviso('Ingresa el N° de arqueo/caja.');
                }
                const data = await api.obtenerReporteArqueo(Number(idArqueo));
                descargarPdf(await generarArqueoCajaA4(data, logoEmpresa), `arqueo-caja-${idArqueo}`);
              })
            }
            onExcel={() =>
              ejecutar('arqueo', async () => {
                if (!idArqueo) {
                  return mostrarAviso('Ingresa el N° de arqueo/caja.');
                }
                const data = await api.obtenerReporteArqueo(Number(idArqueo));
                descargarExcel(await generarArqueoCajaExcel(data, logoEmpresa), `arqueo-caja-${idArqueo}`);
              })
            }
          >
            <InputNumero label="N° de arqueo/caja" value={idArqueo} onChange={setIdArqueo} placeholder="Ej: 12" />
          </ReporteCard>

          <ReporteCard
            titulo="Flujo de Caja"
            descripcion="Ingresos y egresos discriminados por tipo y categoría."
            cargando={cargando === 'flujo-caja'}
            onPos80={() =>
              ejecutar('flujo-caja', async () => {
                const data = await api.obtenerFlujoCaja(fechaInicio, fechaFin);
                abrirPdfEnNuevaPestana(await generarFlujoCajaPos80(data, logoEmpresa));
              })
            }
            onA4={() =>
              ejecutar('flujo-caja', async () => {
                const data = await api.obtenerFlujoCaja(fechaInicio, fechaFin);
                descargarPdf(await generarFlujoCajaA4(data, logoEmpresa), `flujo-caja-${fechaInicio}_${fechaFin}`);
              })
            }
            onExcel={() =>
              ejecutar('flujo-caja', async () => {
                const data = await api.obtenerFlujoCaja(fechaInicio, fechaFin);
                descargarExcel(
                  await generarFlujoCajaExcel(data, logoEmpresa),
                  `flujo-caja-${fechaInicio}_${fechaFin}`
                );
              })
            }
          />
        </div>
      )}

      {/* ===================== COMPRAS ===================== */}
      {moduloActivo === 'compras' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <ReporteCard
            titulo="Historial de Compras por Proveedor"
            descripcion="Resumen de órdenes de compra por proveedor/laboratorio."
            cargando={cargando === 'compras-proveedor'}
            onPos80={() =>
              ejecutar('compras-proveedor', async () => {
                let data = await api.obtenerComprasPorProveedor(fechaInicio, fechaFin);
                if (proveedorSeleccionado) {
                  data = data.filter((p) =>
                    p.nombreProveedor.toLowerCase().includes(proveedorSeleccionado.nombre.toLowerCase())
                  );
                }
                abrirPdfEnNuevaPestana(
                  await generarComprasPorProveedorPos80(fechaInicio, fechaFin, data, logoEmpresa)
                );
              })
            }
            onA4={() =>
              ejecutar('compras-proveedor', async () => {
                let data = await api.obtenerComprasPorProveedor(fechaInicio, fechaFin);
                if (proveedorSeleccionado) {
                  data = data.filter((p) =>
                    p.nombreProveedor.toLowerCase().includes(proveedorSeleccionado.nombre.toLowerCase())
                  );
                }
                descargarPdf(
                  await generarComprasPorProveedorA4(fechaInicio, fechaFin, data, logoEmpresa),
                  `compras-por-proveedor-${fechaInicio}_${fechaFin}`
                );
              })
            }
            onExcel={() =>
              ejecutar('compras-proveedor', async () => {
                let data = await api.obtenerComprasPorProveedor(fechaInicio, fechaFin);
                if (proveedorSeleccionado) {
                  data = data.filter((p) =>
                    p.nombreProveedor.toLowerCase().includes(proveedorSeleccionado.nombre.toLowerCase())
                  );
                }
                descargarExcel(
                  await generarComprasPorProveedorExcel(fechaInicio, fechaFin, data, logoEmpresa),
                  `compras-por-proveedor-${fechaInicio}_${fechaFin}`
                );
              })
            }
          >

          </ReporteCard>

          <ReporteCard
            titulo="Análisis de Costos"
            descripcion="Histórico de precios de entrada de un producto específico."
            cargando={cargando === 'analisis-costos'}
            onPos80={() =>
              ejecutar('analisis-costos', async () => {
                if (!productoSeleccionado) {
                  return mostrarAviso('Selecciona un producto.');
                }
                const data = await api.obtenerAnalisisCostos(productoSeleccionado.id);
                abrirPdfEnNuevaPestana(await generarAnalisisCostosPos80(data, logoEmpresa));
              })
            }
            onA4={() =>
              ejecutar('analisis-costos', async () => {
                if (!productoSeleccionado) {
                  return mostrarAviso('Selecciona un producto.');
                }
                const data = await api.obtenerAnalisisCostos(productoSeleccionado.id);
                descargarPdf(
                  await generarAnalisisCostosA4(data, logoEmpresa),
                  `analisis-costos-producto-${productoSeleccionado.id}`
                );
              })
            }
            onExcel={() =>
              ejecutar('analisis-costos', async () => {
                if (!productoSeleccionado) {
                  return mostrarAviso('Selecciona un producto.');
                }
                const data = await api.obtenerAnalisisCostos(productoSeleccionado.id);
                descargarExcel(
                  await generarAnalisisCostosExcel(data, logoEmpresa),
                  `analisis-costos-producto-${productoSeleccionado.id}`
                );
              })
            }
          >
            <BuscadorProducto
              label="Seleccionar Producto"
              productoSeleccionado={productoSeleccionado}
              onSeleccionarProducto={setProductoSeleccionado}
              onError={(msg) => mostrarAviso(msg, 'Error de Carga', 'error')}
            />
          </ReporteCard>

          <ReporteCard
            titulo="Cuentas por Pagar"
            descripcion="Registro detallado de facturas de compra procesadas."
            cargando={cargando === 'cuentas-por-pagar'}
            onPos80={() =>
              ejecutar('cuentas-por-pagar', async () => {
                const data = await api.obtenerCuentasPorPagar(fechaInicio, fechaFin);
                abrirPdfEnNuevaPestana(await generarCuentasPorPagarPos80(data, logoEmpresa));
              })
            }
            onA4={() =>
              ejecutar('cuentas-por-pagar', async () => {
                const data = await api.obtenerCuentasPorPagar(fechaInicio, fechaFin);
                descargarPdf(
                  await generarCuentasPorPagarA4(data, logoEmpresa),
                  `cuentas-por-pagar-${fechaInicio}_${fechaFin}`
                );
              })
            }
            onExcel={() =>
              ejecutar('cuentas-por-pagar', async () => {
                const data = await api.obtenerCuentasPorPagar(fechaInicio, fechaFin);
                descargarExcel(
                  await generarCuentasPorPagarExcel(data, logoEmpresa),
                  `cuentas-por-pagar-${fechaInicio}_${fechaFin}`
                );
              })
            }
          />
        </div>
      )}

      {/* ===================== INVENTARIO ===================== */}
      {moduloActivo === 'inventario' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <ReporteCard
            titulo="Stock e Inventario Valorado"
            descripcion="Todos los productos en existencia valorados a costo y venta."
            cargando={cargando === 'inventario-valorado'}
            onPos80={() =>
              ejecutar('inventario-valorado', async () => {
                const data = await api.obtenerInventarioValorado();
                abrirPdfEnNuevaPestana(await generarInventarioValoradoPos80(data, logoEmpresa));
              })
            }
            onA4={() =>
              ejecutar('inventario-valorado', async () => {
                const data = await api.obtenerInventarioValorado();
                descargarPdf(await generarInventarioValoradoA4(data, logoEmpresa), 'inventario-valorado');
              })
            }
            onExcel={() =>
              ejecutar('inventario-valorado', async () => {
                const data = await api.obtenerInventarioValorado();
                descargarExcel(await generarInventarioValoradoExcel(data, logoEmpresa), 'inventario-valorado');
              })
            }
          />

          <ReporteCard
            titulo="Alerta de Stock Mínimo"
            descripcion="Productos con stock igual o menor al punto de reorden."
            cargando={cargando === 'alerta-stock'}
            onPos80={() =>
              ejecutar('alerta-stock', async () => {
                const data = await api.obtenerAlertaStockMinimo();
                abrirPdfEnNuevaPestana(await generarAlertaStockPos80(data, logoEmpresa));
              })
            }
            onA4={() =>
              ejecutar('alerta-stock', async () => {
                const data = await api.obtenerAlertaStockMinimo();
                descargarPdf(await generarAlertaStockA4(data, logoEmpresa), 'alerta-stock-minimo');
              })
            }
            onExcel={() =>
              ejecutar('alerta-stock', async () => {
                const data = await api.obtenerAlertaStockMinimo();
                descargarExcel(await generarAlertaStockExcel(data, logoEmpresa), 'alerta-stock-minimo');
              })
            }
          />

          <ReporteCard
            titulo="Catálogo por Principio Activo"
            descripcion="Alternativas y sustitutos genéricos por acción terapéutica."
            cargando={cargando === 'catalogo-terapeutico'}
            onPos80={() =>
              ejecutar('catalogo-terapeutico', async () => {
                let data = await api.obtenerCatalogoTerapeutico();
                if (principioSeleccionado) {
                  data = data.filter((item) => item.principioActivo === principioSeleccionado);
                }
                const tituloRpt = principioSeleccionado
                  ? `CATÁLOGO: ${principioSeleccionado.toUpperCase()}`
                  : 'CATÁLOGO TERAPÉUTICO';
                abrirPdfEnNuevaPestana(await generarCatalogoTerapeuticoPos80(data, tituloRpt, logoEmpresa));
              })
            }
            onA4={() =>
              ejecutar('catalogo-terapeutico', async () => {
                let data = await api.obtenerCatalogoTerapeutico();
                if (principioSeleccionado) {
                  data = data.filter((item) => item.principioActivo === principioSeleccionado);
                }
                const tituloRpt = principioSeleccionado
                  ? `Catálogo de Productos - ${principioSeleccionado}`
                  : 'Catálogo por Principio Activo y Acción Terapéutica';
                descargarPdf(await generarCatalogoTerapeuticoA4(data, tituloRpt, logoEmpresa), 'catalogo-terapeutico');
              })
            }
            onExcel={() =>
              ejecutar('catalogo-terapeutico', async () => {
                let data = await api.obtenerCatalogoTerapeutico();
                if (principioSeleccionado) {
                  data = data.filter((item) => item.principioActivo === principioSeleccionado);
                }
                const tituloRpt = principioSeleccionado
                  ? `Catálogo de Productos - ${principioSeleccionado}`
                  : 'Catálogo por Principio Activo y Acción Terapéutica';
                descargarExcel(
                  await generarCatalogoTerapeuticoExcel(data, tituloRpt, logoEmpresa),
                  'catalogo-terapeutico'
                );
              })
            }
          >
            <BuscadorPrincipioActivo
              label="Seleccionar Principio Activo"
              principioSeleccionado={principioSeleccionado}
              onSeleccionarPrincipio={setPrincipioSeleccionado}
              onError={(msg) => mostrarAviso(msg, 'Error de Carga', 'error')}
            />
          </ReporteCard>

          <ReporteCard
            titulo="Productos por Laboratorio"
            descripcion="Listado completo de productos de un laboratorio o marca específica."
            cargando={cargando === 'productos-laboratorio'}
            onPos80={() =>
              ejecutar('productos-laboratorio', async () => {
                if (!laboratorioSeleccionado) {
                  return mostrarAviso('Selecciona un laboratorio.');
                }
                const data = await api.obtenerProductosPorLaboratorio(laboratorioSeleccionado.idLaboratorio);
                abrirPdfEnNuevaPestana(await generarProductosPorLaboratorioPos80(data, logoEmpresa));
              })
            }
            onA4={() =>
              ejecutar('productos-laboratorio', async () => {
                if (!laboratorioSeleccionado) {
                  return mostrarAviso('Selecciona un laboratorio.');
                }
                const data = await api.obtenerProductosPorLaboratorio(laboratorioSeleccionado.idLaboratorio);
                descargarPdf(
                  await generarProductosPorLaboratorioA4(data, logoEmpresa),
                  `productos-laboratorio-${laboratorioSeleccionado.idLaboratorio}`
                );
              })
            }
            onExcel={() =>
              ejecutar('productos-laboratorio', async () => {
                if (!laboratorioSeleccionado) {
                  return mostrarAviso('Selecciona un laboratorio.');
                }
                const data = await api.obtenerProductosPorLaboratorio(laboratorioSeleccionado.idLaboratorio);
                descargarExcel(
                  await generarProductosPorLaboratorioExcel(data, logoEmpresa),
                  `productos-laboratorio-${laboratorioSeleccionado.idLaboratorio}`
                );
              })
            }
          >
            <BuscadorLaboratorio
              label="Seleccionar Laboratorio"
              laboratorioSeleccionado={laboratorioSeleccionado}
              onSeleccionarLaboratorio={setLaboratorioSeleccionado}
              onError={(msg) => mostrarAviso(msg, 'Error de Carga', 'error')}
            />
          </ReporteCard>

          <ReporteCard
            titulo="Productos Próximos a Vencer"
            descripcion="Lista de lotes o productos próximos a llegar a su fecha de caducidad."
            cargando={cargando === 'productos-por-vencer'}
            onPos80={() =>
              ejecutar('productos-por-vencer', async () => {
                const data = await api.obtenerProductosPorVencer(Number(diasVencer) || 30);
                abrirPdfEnNuevaPestana(
                  await generarProductosPorVencerPos80(data, Number(diasVencer) || 30, logoEmpresa)
                );
              })
            }
            onA4={() =>
              ejecutar('productos-por-vencer', async () => {
                const data = await api.obtenerProductosPorVencer(Number(diasVencer) || 30);
                descargarPdf(
                  await generarProductosPorVencerA4(data, Number(diasVencer) || 30, logoEmpresa),
                  `productos-por-vencer-${diasVencer}-dias`
                );
              })
            }
            onExcel={() =>
              ejecutar('productos-por-vencer', async () => {
                const data = await api.obtenerProductosPorVencer(Number(diasVencer) || 30);
                descargarExcel(
                  await generarProductosPorVencerExcel(data, Number(diasVencer) || 30, logoEmpresa),
                  `productos-por-vencer-${diasVencer}-dias`
                );
              })
            }
          >
            <InputNumero label="Días margen" value={diasVencer} onChange={setDiasVencer} placeholder="30" />
          </ReporteCard>
        </div>
      )}

      {/* ===================== GESTION ===================== */}
      {moduloActivo === 'gestion' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <ReporteCard
            titulo="Consolidado General"
            descripcion="Ventas totales vs. compras totales vs. gastos de caja."
            cargando={cargando === 'consolidado'}
            onPos80={() =>
              ejecutar('consolidado', async () => {
                const data = await api.obtenerConsolidadoGeneral(fechaInicio, fechaFin);
                abrirPdfEnNuevaPestana(await generarConsolidadoGeneralPos80(data, logoEmpresa));
              })
            }
            onA4={() =>
              ejecutar('consolidado', async () => {
                const data = await api.obtenerConsolidadoGeneral(fechaInicio, fechaFin);
                descargarPdf(
                  await generarConsolidadoGeneralA4(data, logoEmpresa),
                  `consolidado-general-${fechaInicio}_${fechaFin}`
                );
              })
            }
            onExcel={() =>
              ejecutar('consolidado', async () => {
                const data = await api.obtenerConsolidadoGeneral(fechaInicio, fechaFin);
                descargarExcel(
                  await generarConsolidadoGeneralExcel(data, logoEmpresa),
                  `consolidado-general-${fechaInicio}_${fechaFin}`
                );
              })
            }
          />

          <ReporteCard
            titulo="Reporte de Asistencia"
            descripcion="Marcaciones de entrada, salida y tardanzas del personal."
            cargando={cargando === 'asistencia'}
            onPos80={() =>
              ejecutar('asistencia', async () => {
                const data = await api.obtenerReporteAsistencia(fechaInicio, fechaFin);
                abrirPdfEnNuevaPestana(await generarReporteAsistenciaPos80(fechaInicio, fechaFin, data, logoEmpresa));
              })
            }
            onA4={() =>
              ejecutar('asistencia', async () => {
                const data = await api.obtenerReporteAsistencia(fechaInicio, fechaFin);
                descargarPdf(
                  await generarReporteAsistenciaA4(fechaInicio, fechaFin, data, logoEmpresa),
                  `reporte-asistencia-${fechaInicio}_${fechaFin}`
                );
              })
            }
            onExcel={() =>
              ejecutar('asistencia', async () => {
                const data = await api.obtenerReporteAsistencia(fechaInicio, fechaFin);
                descargarExcel(
                  await generarReporteAsistenciaExcel(fechaInicio, fechaFin, data, logoEmpresa),
                  `reporte-asistencia-${fechaInicio}_${fechaFin}`
                );
              })
            }
          />
        </div>
      )}
    </div>
  );
}