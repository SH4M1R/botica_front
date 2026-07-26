'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, Eye, EyeOff, LogIn, KeyRound } from 'lucide-react';
import { empleadosApi } from '@/api/ventas';
import { useSession } from '@/hooks/useSession';

const empleadosDemo = [
  { id: 1, nombre: 'Administrador', username: 'admin', password: 'admin123', rol: 'Administrador' },
  { id: 2, nombre: 'Ana Torres', username: 'atorres', password: 'demo123', rol: 'Cajero' },
  { id: 3, nombre: 'Juan Pérez', username: 'jperez', password: 'demo123', rol: 'Técnico Farmacéutico' },
];

export default function LoginPage() {
  const router = useRouter();
  const { iniciarSesion } = useSession();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const autoRellenar = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) return setError('Ingresa usuario y contraseña.');

    setLoading(true);
    try {
      const empleado = await empleadosApi.login(username.trim(), password);
      iniciarSesion({ id: empleado.id, nombre: empleado.nombre, rol: empleado.rol });
      router.push('/dashboard');
    } catch {
      setError('Usuario o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8 relative transition-colors duration-300">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl border border-zinc-200 transition-all">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary transition-colors duration-300">
            <LogIn size={24} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Iniciar Sesión</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="username" className="text-sm font-semibold text-zinc-700">Usuario</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400"><User size={18} /></span>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-zinc-300 bg-zinc-50 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-semibold text-zinc-700">Contraseña</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400"><Lock size={18} /></span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-zinc-300 bg-zinc-50 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-red-500 font-medium text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg shadow-xs hover:shadow-md transition-all duration-300 focus:outline-hidden focus:ring-2 focus:ring-primary/50 disabled:opacity-60 cursor-pointer"
          >
            {loading ? 'Ingresando...' : 'Ingresar al sistema'}
          </button>
        </form>

        {/* Sección de Usuarios de Prueba */}
        <div className="pt-4 border-t border-zinc-200">
          <div className="flex items-center gap-1.5 mb-3 text-zinc-500">
            <KeyRound size={14} />
            <span className="text-xs font-semibold uppercase tracking-wider">Credenciales de prueba</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {empleadosDemo.map((emp) => (
              <button
                key={emp.id}
                type="button"
                onClick={() => autoRellenar(emp.username, emp.password)}
                className="p-2 text-left rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-primary/5 hover:border-primary/40 transition-all group cursor-pointer"
              >
                <p className="text-xs font-semibold text-zinc-800 group-hover:text-primary leading-tight">{emp.nombre}</p>
                <p className="text-[10px] text-zinc-500 leading-tight mt-0.5">{emp.rol}</p>
                <div className="text-[10px] text-zinc-400 mt-1 font-mono">
                  {emp.username} / <span className="font-sans">{emp.password}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}