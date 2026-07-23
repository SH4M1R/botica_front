'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import { empleadosApi } from '@/api/ventas';
import { useSession } from '@/hooks/useSession';

export default function LoginPage() {
  const router = useRouter();
  const { iniciarSesion } = useSession();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 relative transition-colors duration-300">
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
            className="w-full py-3 px-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg shadow-xs hover:shadow-md transition-all duration-300 focus:outline-hidden focus:ring-2 focus:ring-primary/50 disabled:opacity-60"
          >
            {loading ? 'Ingresando...' : 'Ingresar al sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}