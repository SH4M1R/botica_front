'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ventasApi } from '@/api/ventas';
import { obtenerEmpresa } from '@/api/empresa';
import { generarBoletaPdf } from '@/utils/generarBoletaPdf';

export default function BoletaCliente() {
  const searchParams = useSearchParams();
  const idVenta = Number(searchParams.get('id'));
  const vueltoParam = searchParams.get('vuelto');
  const vuelto = vueltoParam ? Number(vueltoParam) : undefined;
  const [error, setError] = useState('');

  useEffect(() => {
    if (!idVenta) return;

    (async () => {
      try {
        const [venta, empresa] = await Promise.all([
          ventasApi.obtener(idVenta),
          obtenerEmpresa(),
        ]);
        const blob = await generarBoletaPdf(venta, empresa, vuelto);
        const url = URL.createObjectURL(blob);
        window.location.replace(url);
      } catch {
        setError('No se pudo generar la boleta.');
      }
    })();
  }, [idVenta]);

  if (error) return <p className="p-6 text-sm text-red-500">{error}</p>;
  return <p className="p-6 text-sm text-zinc-400">Generando boleta...</p>;
}