'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, Settings, ShoppingCart, Contact, ChevronDown,
  List, Plus, Users, Tags, Lock, Repeat, ArrowDownToLine, ArrowUpFromLine,
  CreditCard, Receipt, ArrowRightLeft, ShieldCheck, UserCheck,
  BarChart3, CalendarCheck, ShoppingBag, Wallet, ChevronsLeft, ChevronsRight, FileText,
  ClipboardList,
} from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { arqueoApi } from '@/api/arqueo';
import { permisosApi } from '@/api/permisos';

const topLinks = [
  { href: '/dashboard', label: 'Panel', icon: LayoutDashboard, siempreVisible: true },
  { href: '/dashboard/asistencia', label: 'Asistencia', icon: CalendarCheck, siempreVisible: false },
  { href: '/dashboard/reportes', label: 'Reportes', icon: BarChart3, siempreVisible: false },
];

const cajaChildren = [
  { href: '/dashboard/caja', label: 'Arqueo de caja', icon: Receipt },
  { href: '/dashboard/caja/movimientos', label: 'Movimientos', icon: ArrowRightLeft },
  { href: '/dashboard/caja/medios-pago', label: 'Medio de pago', icon: CreditCard },
];

const productosChildren = [
  { href: '/dashboard/productos', label: 'Listado productos', icon: List },
  { href: '/dashboard/productos/atributos', label: 'Atributos', icon: Tags },
  { href: '/dashboard/productos/kardex', label: 'Kardex', icon: ClipboardList },
];

const trasladosChildren = [
  { href: '/dashboard/ingresos', label: 'Ingresos', icon: ArrowDownToLine },
  { href: '/dashboard/egresos', label: 'Egresos', icon: ArrowUpFromLine },
];

const empleadosChildren = [
  { href: '/dashboard/empleados', label: 'Listado Empleados', icon: UserCheck },
  { href: '/dashboard/empleados/permisos', label: 'Asignar Permisos', icon: ShieldCheck },
];

const bottomLinks = [
  { href: '/dashboard/configuracion', label: 'Configuración', icon: Settings },
];

const EVENTO_CAJA_ACTUALIZADA = 'caja:actualizada';
const RUTA_GENERAR_VENTA = '/dashboard/ventas/generar';
const RUTA_GENERAR_COTIZACION = '/dashboard/ventas/cotizacion';
const RUTA_GENERAR_COMPRA = '/dashboard/compras/generar';

type MenuId = 'caja' | 'ventas' | 'cotizaciones' | 'compras' | 'productos' | 'empleados' | 'traslados' | null;

interface SidebarProps {
  onClose?: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onCajaCerrada: () => void;
}

/**
 * Función helper para generar el enlace dinámico a WhatsApp
 * con el mensaje predeterminado según la hora local.
 */
function obtenerWhatsAppLink() {
  const hora = new Date().getHours();
  let saludo = 'Buenos días';

  if (hora >= 12 && hora < 19) {
    saludo = 'Buenas tardes';
  } else if (hora >= 19 || hora < 5) {
    saludo = 'Buenas noches';
  }

  const mensaje = `${saludo}, tengo una consulta`;
  return `https://wa.me/51907845855?text=${encodeURIComponent(mensaje)}`;
}

export default function Sidebar({ onClose, collapsed, onToggleCollapse, onCajaCerrada }: SidebarProps) {
  const pathname = usePathname();
  const { empleado, cargando: cargandoSesion } = useSession();

  const esAdmin = empleado?.rol === 'Administrador';

  const [permisos, setPermisos] = useState<Set<string>>(new Set());
  const [cargandoPermisos, setCargandoPermisos] = useState(true);

  useEffect(() => {
    if (cargandoSesion || !empleado?.id) return;

    if (esAdmin) {
      setCargandoPermisos(false);
      return;
    }

    setCargandoPermisos(true);
    permisosApi.obtener(empleado.id)
      .then((rutas) => setPermisos(new Set(rutas)))
      .catch(() => setPermisos(new Set()))
      .finally(() => setCargandoPermisos(false));
  }, [empleado?.id, esAdmin, cargandoSesion]);

  const tienePermiso = (ruta: string) => {
    if (esAdmin) return true;
    if (cargandoSesion || cargandoPermisos) return false;
    return permisos.has(ruta);
  };

  const cajaChildrenVisibles = cajaChildren.filter((c) => tienePermiso(c.href));
  const productosChildrenVisibles = productosChildren.filter((c) => tienePermiso(c.href));
  const trasladosChildrenVisibles = trasladosChildren.filter((c) => tienePermiso(c.href));
  const empleadosChildrenVisibles = empleadosChildren.filter((c) =>
    c.href === '/dashboard/empleados/permisos' ? esAdmin : tienePermiso(c.href)
  );

  const ventasLinksVisibles = {
    listado: tienePermiso('/dashboard/ventas'),
    generar: tienePermiso(RUTA_GENERAR_VENTA),
    clientes: tienePermiso('/dashboard/clientes'),
  };
  const ventasModuloVisible = Object.values(ventasLinksVisibles).some(Boolean);

  const cotizacionesLinksVisibles = {
    generar: tienePermiso(RUTA_GENERAR_COTIZACION),
    listado: tienePermiso('/dashboard/ventas/cotizaciones'),
  };
  const cotizacionesModuloVisible = Object.values(cotizacionesLinksVisibles).some(Boolean);

  const comprasLinksVisibles = {
    listado: tienePermiso('/dashboard/compras'),
    generar: tienePermiso(RUTA_GENERAR_COMPRA),
    proveedores: tienePermiso('/dashboard/proveedores'),
  };
  const comprasModuloVisible = Object.values(comprasLinksVisibles).some(Boolean);

  const cajaModuloVisible = cajaChildrenVisibles.length > 0;
  const productosModuloVisible = productosChildrenVisibles.length > 0;
  const trasladosModuloVisible = trasladosChildrenVisibles.length > 0;
  const empleadosModuloVisible = empleadosChildrenVisibles.length > 0;

  const topLinksVisibles = topLinks.filter((link) => link.siempreVisible || tienePermiso(link.href));

  const cajaActivo = pathname.startsWith('/dashboard/caja');
  const productosActivo = pathname.startsWith('/dashboard/productos');
  const cotizacionesActivo = pathname === RUTA_GENERAR_COTIZACION || pathname.startsWith('/dashboard/ventas/cotizaciones');
  const ventasActivo = (pathname.startsWith('/dashboard/ventas') || pathname.startsWith('/dashboard/clientes')) && !cotizacionesActivo;
  const comprasActivo = pathname.startsWith('/dashboard/compras') || pathname.startsWith('/dashboard/proveedores');
  const empleadosActivo = pathname.startsWith('/dashboard/empleados');
  const trasladosActivo = pathname.startsWith('/dashboard/ingresos') || pathname.startsWith('/dashboard/egresos');

  const menuActivoInicial: MenuId = cajaActivo
    ? 'caja'
    : cotizacionesActivo
    ? 'cotizaciones'
    : ventasActivo
    ? 'ventas'
    : comprasActivo
    ? 'compras'
    : productosActivo
    ? 'productos'
    : empleadosActivo
    ? 'empleados'
    : trasladosActivo
    ? 'traslados'
    : null;

  const [menuAbierto, setMenuAbierto] = useState<MenuId>(menuActivoInicial);

  const toggleMenu = (id: MenuId) => {
    setMenuAbierto((prev) => (prev === id ? null : id));
  };

  const handleToggleMenu = (id: MenuId) => {
    if (collapsed) {
      onToggleCollapse();
      setMenuAbierto(id);
    } else {
      toggleMenu(id);
    }
  };

  const [cajaAbierta, setCajaAbierta] = useState<unknown | null | undefined>(undefined);

  const revisarCaja = useCallback(() => {
    if (!empleado?.id) return;
    arqueoApi.cajaActual(empleado.id)
      .then((actual) => setCajaAbierta(actual ?? null))
      .catch(() => setCajaAbierta(null));
  }, [empleado?.id]);

  useEffect(() => {
    if (cargandoSesion || !empleado?.id) return;

    revisarCaja();

    window.addEventListener('focus', revisarCaja);
    window.addEventListener(EVENTO_CAJA_ACTUALIZADA, revisarCaja);
    window.addEventListener('storage', revisarCaja);

    const intervalo = setInterval(revisarCaja, 5000);

    return () => {
      clearInterval(intervalo);
      window.removeEventListener('focus', revisarCaja);
      window.removeEventListener(EVENTO_CAJA_ACTUALIZADA, revisarCaja);
      window.removeEventListener('storage', revisarCaja);
    };
  }, [empleado?.id, cargandoSesion, pathname, revisarCaja]);

  const puedeVender = !!cajaAbierta;

  const abrirVentanaFlotanteVenta = useCallback(() => {
    const width = 1280;
    const height = 800;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    const popupUrl = `${window.location.origin}${RUTA_GENERAR_VENTA}?popup=true`;

    window.open(
      popupUrl,
      'GenerarVentaPOS',
      `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,status=no,toolbar=no,menubar=no,location=no`
    );
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'F4') return;

      const target = e.target as HTMLElement | null;
      const estaEscribiendo =
        !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (estaEscribiendo) return;

      if (!ventasLinksVisibles.generar) return;

      e.preventDefault();

      if (!puedeVender) {
        onCajaCerrada();
        return;
      }

      abrirVentanaFlotanteVenta();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [ventasLinksVisibles.generar, puedeVender, onCajaCerrada, abrirVentanaFlotanteVenta]);

  const abrirVentanaFlotanteCompra = useCallback(() => {
    const width = 1280;
    const height = 800;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    const popupUrl = `${window.location.origin}${RUTA_GENERAR_COMPRA}?popup=true`;

    window.open(
      popupUrl,
      'GenerarCompraPOS',
      `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,status=no,toolbar=no,menubar=no,location=no`
    );
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'F6') return;

      const target = e.target as HTMLElement | null;
      const estaEscribiendo =
        !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (estaEscribiendo) return;

      if (!comprasLinksVisibles.generar) return;

      e.preventDefault();
      abrirVentanaFlotanteCompra();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [comprasLinksVisibles.generar, abrirVentanaFlotanteCompra]);

  const linkClass = (active: boolean) =>
    `flex items-center gap-3 rounded-lg text-md font-semibold transition-all shrink-0 ${
      collapsed ? 'justify-center px-0 py-2.5' : 'px-4 py-2.5'
    } ${
      active ? 'bg-white text-primary shadow-md' : 'text-white hover:bg-white/20 hover:text-white'
    }`;

  const handleClickGenerarVenta = (e: React.MouseEvent) => {
    if (!puedeVender) {
      e.preventDefault();
      onCajaCerrada();
    } else if (onClose) {
      onClose();
    }
  };

  const handleLinkClick = () => {
    if (onClose) onClose();
  };

  return (
    <div className="flex flex-col h-full bg-primary text-white shadow-2xl">
      {/* Top Header con WhatsApp, Separador y Botón de Colapsar */}
      <div
        className={`hidden md:flex items-center border-b border-white px-3 py-3 ${
          collapsed ? 'flex-col gap-2 justify-center' : 'justify-between'
        }`}
      >
        <a
          href={obtenerWhatsAppLink()}
          target="_blank"
          rel="noopener noreferrer"
          title={collapsed ? 'Comunícate con JPSYSTEMS' : 'Comunícate con JPSYSTEMS'}
          className={`flex items-center gap-2 rounded-lg text-sm font-semibold transition-all text-white hover:bg-white/20 p-0.5 ${
            collapsed ? 'justify-center' : 'flex-1 min-w-0 mr-1'
          }`}
        >
          <img
            src="/JPSYSTEMS.png"
            alt="JPSYSTEMS"
            className="w-10 h-10 rounded-full object-cover shrink-0 border border-white/30"
          />
          {!collapsed && <span className="truncate text-xs">Contactanos</span>}
        </a>

        {/* Línea de separación (Vertical en expandido, Horizontal en colapsado) */}
        <div
          className={`bg-white shrink-0 ${
            collapsed ? 'w-full h-[1px]' : 'h-8 w-[1px] mx-1'
          }`}
        />

        <button
          type="button"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          className="p-2 rounded-lg text-white hover:bg-white/20 transition-colors cursor-pointer shrink-0"
        >
          {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
        </button>
      </div>

      <nav
        className="flex flex-col gap-1 flex-1 min-h-0 overflow-y-auto p-3
                   [&::-webkit-scrollbar]:w-1.5
                   [&::-webkit-scrollbar-track]:bg-primary
                   [&::-webkit-scrollbar-thumb]:bg-white/25
                   [&::-webkit-scrollbar-thumb]:rounded-full
                   hover:[&::-webkit-scrollbar-thumb]:bg-white/40"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.25) transparent' }}
      >
        {topLinksVisibles.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={handleLinkClick}
            title={collapsed ? label : undefined}
            className={linkClass(pathname === href)}
          >
            <Icon size={18} />
            {!collapsed && label}
          </Link>
        ))}

        {/* Caja */}
        {cajaModuloVisible && (
          <>
            <button
              type="button"
              onClick={() => handleToggleMenu('caja')}
              title={collapsed ? 'Caja' : undefined}
              className={linkClass(cajaActivo && menuAbierto !== 'caja')}
            >
              <Wallet size={18} />
              {!collapsed && <span className="flex-1 text-left">Caja</span>}
              {!collapsed && (
                <ChevronDown size={16} className={`transition-transform ${menuAbierto === 'caja' ? 'rotate-180' : ''}`} />
              )}
            </button>

            {!collapsed && menuAbierto === 'caja' && (
              <div className="flex flex-col gap-1 pl-4">
                {cajaChildrenVisibles.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href} onClick={handleLinkClick} className={linkClass(pathname === href)}>
                    <Icon size={16} />
                    <span className="text-sm">{label}</span>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* Ventas */}
        {ventasModuloVisible && (
          <>
            <button
              type="button"
              onClick={() => handleToggleMenu('ventas')}
              title={collapsed ? 'Ventas' : undefined}
              className={linkClass(ventasActivo && menuAbierto !== 'ventas')}
            >
              <ShoppingCart size={18} />
              {!collapsed && <span className="flex-1 text-left">Ventas</span>}
              {!collapsed && (
                <ChevronDown size={16} className={`transition-transform ${menuAbierto === 'ventas' ? 'rotate-180' : ''}`} />
              )}
            </button>

            {!collapsed && menuAbierto === 'ventas' && (
              <div className="flex flex-col gap-1 pl-4">
                {ventasLinksVisibles.listado && (
                  <Link href="/dashboard/ventas" onClick={handleLinkClick} className={linkClass(pathname === '/dashboard/ventas')}>
                    <List size={16} />
                    <span className="text-sm">Listado de ventas</span>
                  </Link>
                )}

                {ventasLinksVisibles.generar && (
                  <Link
                    href={RUTA_GENERAR_VENTA}
                    onClick={handleClickGenerarVenta}
                    title={!puedeVender ? 'Debes abrir tu caja primero' : 'Generar venta (F4 abre ventana flotante desde cualquier página)'}
                    className={`${linkClass(pathname === RUTA_GENERAR_VENTA)} ${!puedeVender ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {puedeVender ? <Plus size={16} /> : <Lock size={16} />}
                    <span className="text-sm flex-1">Generar venta</span>
                    {!collapsed && puedeVender && (
                      <span className="text-[10px] font-semibold text-white/60 border border-white/30 rounded px-1">F4</span>
                    )}
                  </Link>
                )}

                {ventasLinksVisibles.clientes && (
                  <Link href="/dashboard/clientes" onClick={handleLinkClick} className={linkClass(pathname === '/dashboard/clientes')}>
                    <Contact size={16} />
                    <span className="text-sm">Clientes</span>
                  </Link>
                )}
              </div>
            )}
          </>
        )}

        {/* Cotizaciones */}
        {cotizacionesModuloVisible && (
          <>
            <button
              type="button"
              onClick={() => handleToggleMenu('cotizaciones')}
              title={collapsed ? 'Cotizaciones' : undefined}
              className={linkClass(cotizacionesActivo && menuAbierto !== 'cotizaciones')}
            >
              <FileText size={18} />
              {!collapsed && <span className="flex-1 text-left">Cotizaciones</span>}
              {!collapsed && (
                <ChevronDown size={16} className={`transition-transform ${menuAbierto === 'cotizaciones' ? 'rotate-180' : ''}`} />
              )}
            </button>

            {!collapsed && menuAbierto === 'cotizaciones' && (
              <div className="flex flex-col gap-1 pl-4">
                {cotizacionesLinksVisibles.listado && (
                  <Link
                    href="/dashboard/ventas/cotizaciones"
                    onClick={handleLinkClick}
                    className={linkClass(pathname === '/dashboard/ventas/cotizaciones')}
                  >
                    <List size={16} />
                    <span className="text-sm">Listado cotizaciones</span>
                  </Link>
                )}

                {cotizacionesLinksVisibles.generar && (
                  <Link
                    href={RUTA_GENERAR_COTIZACION}
                    onClick={handleLinkClick}
                    title="Generar cotización (no requiere caja abierta)"
                    className={linkClass(pathname === RUTA_GENERAR_COTIZACION)}
                  >
                    <Plus size={16} />
                    <span className="text-sm flex-1">Generar cotización</span>
                  </Link>
                )}
              </div>
            )}
          </>
        )}

        {/* Compras */}
        {comprasModuloVisible && (
          <>
            <button
              type="button"
              onClick={() => handleToggleMenu('compras')}
              title={collapsed ? 'Compras' : undefined}
              className={linkClass(comprasActivo && menuAbierto !== 'compras')}
            >
              <ShoppingBag size={18} />
              {!collapsed && <span className="flex-1 text-left">Compras</span>}
              {!collapsed && (
                <ChevronDown size={16} className={`transition-transform ${menuAbierto === 'compras' ? 'rotate-180' : ''}`} />
              )}
            </button>

            {!collapsed && menuAbierto === 'compras' && (
              <div className="flex flex-col gap-1 pl-4">
                {comprasLinksVisibles.listado && (
                  <Link href="/dashboard/compras" onClick={handleLinkClick} className={linkClass(pathname === '/dashboard/compras')}>
                    <List size={16} />
                    <span className="text-sm">Listado de Compras</span>
                  </Link>
                )}

                {comprasLinksVisibles.generar && (
                  <Link
                    href={RUTA_GENERAR_COMPRA}
                    onClick={handleLinkClick}
                    title="Ingresar Compra (F6 abre ventana flotante desde cualquier página)"
                    className={linkClass(pathname === RUTA_GENERAR_COMPRA)}
                  >
                    <Plus size={16} />
                    <span className="text-sm flex-1">Ingresar Compra</span>
                    {!collapsed && (
                      <span className="text-[10px] font-semibold text-white/60 border border-white/30 rounded px-1">F6</span>
                    )}
                  </Link>
                )}

                {comprasLinksVisibles.proveedores && (
                  <Link href="/dashboard/proveedores" onClick={handleLinkClick} className={linkClass(pathname === '/dashboard/proveedores')}>
                    <Contact size={16} />
                    <span className="text-sm">Proveedores</span>
                  </Link>
                )}
              </div>
            )}
          </>
        )}

        {/* Productos */}
        {productosModuloVisible && (
          <>
            <button
              type="button"
              onClick={() => handleToggleMenu('productos')}
              title={collapsed ? 'Productos' : undefined}
              className={linkClass(productosActivo && menuAbierto !== 'productos')}
            >
              <Package size={18} />
              {!collapsed && <span className="flex-1 text-left">Productos</span>}
              {!collapsed && (
                <ChevronDown size={16} className={`transition-transform ${menuAbierto === 'productos' ? 'rotate-180' : ''}`} />
              )}
            </button>

            {!collapsed && menuAbierto === 'productos' && (
              <div className="flex flex-col gap-1 pl-4">
                {productosChildrenVisibles.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href} onClick={handleLinkClick} className={linkClass(pathname === href)}>
                    <Icon size={16} />
                    <span className="text-sm">{label}</span>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* Traslados */}
        {trasladosModuloVisible && (
          <>
            <button
              type="button"
              onClick={() => handleToggleMenu('traslados')}
              title={collapsed ? 'Traslados' : undefined}
              className={linkClass(trasladosActivo && menuAbierto !== 'traslados')}
            >
              <Repeat size={18} />
              {!collapsed && <span className="flex-1 text-left">Traslados</span>}
              {!collapsed && (
                <ChevronDown size={16} className={`transition-transform ${menuAbierto === 'traslados' ? 'rotate-180' : ''}`} />
              )}
            </button>

            {!collapsed && menuAbierto === 'traslados' && (
              <div className="flex flex-col gap-1 pl-4">
                {trasladosChildrenVisibles.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href} onClick={handleLinkClick} className={linkClass(pathname === href)}>
                    <Icon size={16} />
                    <span className="text-sm">{label}</span>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* Empleados */}
        {empleadosModuloVisible && (
          <>
            <button
              type="button"
              onClick={() => handleToggleMenu('empleados')}
              title={collapsed ? 'Empleados' : undefined}
              className={linkClass(empleadosActivo && menuAbierto !== 'empleados')}
            >
              <Users size={18} />
              {!collapsed && <span className="flex-1 text-left">Empleados</span>}
              {!collapsed && (
                <ChevronDown size={16} className={`transition-transform ${menuAbierto === 'empleados' ? 'rotate-180' : ''}`} />
              )}
            </button>

            {!collapsed && menuAbierto === 'empleados' && (
              <div className="flex flex-col gap-1 pl-4">
                {empleadosChildrenVisibles.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href} onClick={handleLinkClick} className={linkClass(pathname === href)}>
                    <Icon size={16} />
                    <span className="text-sm">{label}</span>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {esAdmin && bottomLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={handleLinkClick}
            title={collapsed ? label : undefined}
            className={linkClass(pathname === href)}
          >
            <Icon size={18} />
            {!collapsed && label}
          </Link>
        ))}
      </nav>
    </div>
  );
}