'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ventasApi } from '@/api/ventas';
import { obtenerEmpresa } from '@/api/empresa';
import { generarBoletaPdf } from '@/utils/generarBoletaPdf';

// Agrega esto para satisfacer a Next.js durante `output: 'export'`
export function generateStaticParams() {
  return [{ id: '1' }];
}

export default function BoletaImprimiblePage() {
  const params = useParams();
  const idVenta = Number(params.id);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!idVenta) return;

    (async () => {
      try {
        const [venta, empresa] = await Promise.all([
          ventasApi.obtener(idVenta),
          obtenerEmpresa(),
        ]);
        const blob = await generarBoletaPdf(venta, empresa);
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