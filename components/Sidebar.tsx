'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package, 
  Settings, 
  ShoppingCart, 
  Contact, 
  ChevronDown, 
  List, 
  Plus, 
  Users, 
  Tags, 
  Lock, 
  Repeat,
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet, 
  CreditCard, 
  Receipt, 
  ArrowRightLeft,
  ShieldCheck, 
  UserCheck, 
  ShoppingBag 
} from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { arqueoApi } from '@/api/arqueo';
import { CajaCerradaModal } from './CajaCerradaModal';

const topLinks = [
  { href: '/dashboard', label: 'Panel', icon: LayoutDashboard },
];

const cajaChildren = [
  { href: '/dashboard/caja', label: 'Arqueo de caja', icon: Receipt },
  { href: '/dashboard/caja/movimientos', label: 'Movimientos', icon: ArrowRightLeft },
  { href: '/dashboard/caja/medios-pago', label: 'Medio de pago', icon: CreditCard },
];

const productosChildren = [
  { href: '/dashboard/productos', label: 'Listado productos', icon: List },
  { href: '/dashboard/productos/atributos', label: 'Atributos', icon: Tags },
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

type MenuId = 'caja' | 'ventas' | 'compras' | 'productos' | 'empleados' | 'traslados' | null;

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { empleado, cargando: cargandoSesion } = useSession();

  const cajaActivo = pathname.startsWith('/dashboard/caja');
  const productosActivo = pathname.startsWith('/dashboard/productos');
  const ventasActivo = pathname.startsWith('/dashboard/ventas');
  const comprasActivo = pathname.startsWith('/dashboard/compras') || pathname.startsWith('/dashboard/proveedores');
  const empleadosActivo = pathname.startsWith('/dashboard/empleados');
  const trasladosActivo = pathname.startsWith('/dashboard/traslados');

const menuActivoInicial: MenuId = cajaActivo
    ? 'caja'
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

  const [cajaAbierta, setCajaAbierta] = useState<unknown | null | undefined>(undefined);
  const [modalCajaOpen, setModalCajaOpen] = useState(false);

  useEffect(() => {
    if (cargandoSesion || !empleado?.id) return;
    let activo = true;

    const revisar = () => {
      arqueoApi.cajaActual(empleado.id)
        .then((actual) => { if (activo) setCajaAbierta(actual ?? null); })
        .catch(() => { if (activo) setCajaAbierta(null); });
    };

    revisar();

    window.addEventListener('focus', revisar);
    window.addEventListener(EVENTO_CAJA_ACTUALIZADA, revisar);

    const intervalo = setInterval(revisar, 30000);

    return () => {
      activo = false;
      clearInterval(intervalo);
      window.removeEventListener('focus', revisar);
      window.removeEventListener(EVENTO_CAJA_ACTUALIZADA, revisar);
    };
  }, [empleado?.id, cargandoSesion, pathname]);

  const puedeVender = !!cajaAbierta;

  const linkClass = (active: boolean) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shrink-0 ${
      active ? 'bg-white text-primary shadow-md' : 'text-white/75 hover:bg-white/10 hover:text-white'
    }`;

  const handleClickGenerarVenta = (e: React.MouseEvent) => {
    if (!puedeVender) {
      e.preventDefault();
      setModalCajaOpen(true);
    }
  };

  const irAArqueo = () => {
    setModalCajaOpen(false);
    router.push('/dashboard/caja');
  };

  return (
    <>
      <aside className="w-64 shrink-0 h-full bg-primary flex flex-col text-white shadow-2xl transition-colors duration-300">
        <nav
          className="flex flex-col gap-1 flex-1 min-h-0 overflow-y-auto p-5 pt-20
                     [&::-webkit-scrollbar]:w-1.5
                     [&::-webkit-scrollbar-track]:bg-primary
                     [&::-webkit-scrollbar-thumb]:bg-white/25
                     [&::-webkit-scrollbar-thumb]:rounded-full
                     hover:[&::-webkit-scrollbar-thumb]:bg-white/40"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.25) transparent' }}
        >
          {topLinks.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={linkClass(pathname === href)}>
              <Icon size={18} />
              {label}
            </Link>
          ))}

          {/* Caja */}
          <button
            onClick={() => toggleMenu('caja')}
            className={linkClass(cajaActivo && menuAbierto !== 'caja')}
          >
            <Wallet size={18} />
            <span className="flex-1 text-left">Caja</span>
            <ChevronDown size={16} className={`transition-transform ${menuAbierto === 'caja' ? 'rotate-180' : ''}`} />
          </button>

          {menuAbierto === 'caja' && (
            <div className="flex flex-col gap-1 pl-4">
              {cajaChildren.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className={linkClass(pathname === href)}>
                  <Icon size={16} />
                  <span className="text-sm">{label}</span>
                </Link>
              ))}
            </div>
          )}

          {/* Ventas */}
          <button
            onClick={() => toggleMenu('ventas')}
            className={linkClass(ventasActivo && menuAbierto !== 'ventas')}
          >
            <ShoppingCart size={18} />
            <span className="flex-1 text-left">Ventas</span>
            <ChevronDown size={16} className={`transition-transform ${menuAbierto === 'ventas' ? 'rotate-180' : ''}`} />
          </button>

          {menuAbierto === 'ventas' && (
            <div className="flex flex-col gap-1 pl-4">
              <Link href="/dashboard/ventas" className={linkClass(pathname === '/dashboard/ventas')}>
                <List size={16} />
                <span className="text-sm">Listado de ventas</span>
              </Link>

              <Link
                href="/dashboard/ventas/generar"
                onClick={handleClickGenerarVenta}
                title={!puedeVender ? 'Debes abrir tu caja primero' : undefined}
                className={`${linkClass(pathname === '/dashboard/ventas/generar')} ${!puedeVender ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {puedeVender ? <Plus size={16} /> : <Lock size={16} />}
                <span className="text-sm">Generar venta</span>
              </Link>

              <Link href="/dashboard/clientes" className={linkClass(pathname === '/dashboard/clientes')}>
                <Contact size={16} />
                <span className="text-sm">Clientes</span>
              </Link>
            </div>
          )}

          {/* Compras */}
          <button
            onClick={() => toggleMenu('compras')}
            className={linkClass(comprasActivo && menuAbierto !== 'compras')}
          >
            <ShoppingBag size={18} />
            <span className="flex-1 text-left">Compras</span>
            <ChevronDown size={16} className={`transition-transform ${menuAbierto === 'compras' ? 'rotate-180' : ''}`} />
          </button>

          {menuAbierto === 'compras' && (
            <div className="flex flex-col gap-1 pl-4">
              <Link href="/dashboard/compras" className={linkClass(pathname === '/dashboard/compras')}>
                <List size={16} />
                <span className="text-sm">Listado de Compras</span>
              </Link>

              <Link href="/dashboard/compras/generar" className={linkClass(pathname === '/dashboard/compras/generar')}>
                <Plus size={16} />
                <span className="text-sm">Ingresar Compra</span>
              </Link>

              <Link href="/dashboard/proveedores" className={linkClass(pathname === '/dashboard/proveedores')}>
                <Contact size={16} />
                <span className="text-sm">Proveedores</span>
              </Link>
            </div>
          )}

          {/* Productos */}
          <button
            onClick={() => toggleMenu('productos')}
            className={linkClass(productosActivo && menuAbierto !== 'productos')}
          >
            <Package size={18} />
            <span className="flex-1 text-left">Productos</span>
            <ChevronDown size={16} className={`transition-transform ${menuAbierto === 'productos' ? 'rotate-180' : ''}`} />
          </button>

          {menuAbierto === 'productos' && (
            <div className="flex flex-col gap-1 pl-4">
              {productosChildren.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className={linkClass(pathname === href)}>
                  <Icon size={16} />
                  <span className="text-sm">{label}</span>
                </Link>
              ))}
            </div>
          )}


          {/* Traslados */}
          <button
            onClick={() => toggleMenu('traslados')}
            className={linkClass(trasladosActivo && menuAbierto !== 'traslados')}
          >
            <Repeat size={18} />
            <span className="flex-1 text-left">Traslados</span>
            <ChevronDown size={16} className={`transition-transform ${menuAbierto === 'traslados' ? 'rotate-180' : ''}`} />
          </button>

          {menuAbierto === 'traslados' && (
            <div className="flex flex-col gap-1 pl-4">
              {trasladosChildren.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className={linkClass(pathname === href)}>
                  <Icon size={16} />
                  <span className="text-sm">{label}</span>
                </Link>
              ))}
            </div>
          )}

          {/* Empleados */}
          <button
            onClick={() => toggleMenu('empleados')}
            className={linkClass(empleadosActivo && menuAbierto !== 'empleados')}
          >
            <Users size={18} />
            <span className="flex-1 text-left">Empleados</span>
            <ChevronDown size={16} className={`transition-transform ${menuAbierto === 'empleados' ? 'rotate-180' : ''}`} />
          </button>

          {menuAbierto === 'empleados' && (
            <div className="flex flex-col gap-1 pl-4">
              {empleadosChildren.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className={linkClass(pathname === href)}>
                  <Icon size={16} />
                  <span className="text-sm">{label}</span>
                </Link>
              ))}
            </div>
          )}

          {bottomLinks.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={linkClass(pathname === href)}>
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <CajaCerradaModal
        open={modalCajaOpen}
        onClose={() => setModalCajaOpen(false)}
        onIrAArqueo={irAArqueo}
      />
    </>
  );
}