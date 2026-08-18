'use client';

import { useEffect, useState } from 'react';
import type { Producto } from '@/api/productos';

export type TipoVenta = 'unidad' | 'blister' | 'caja';

export interface CarritoItem {
  idProducto: number;
  cantidad: number;
  tipoVenta: TipoVenta;
  precioUnitario: number;
  producto: Producto;
}

export type ProductoConCodigo = Producto & { codigo_barras?: string | null };

export function tiposDisponibles(producto: Producto): { value: TipoVenta; label: string }[] {
  const tipos: { value: TipoVenta; label: string }[] = [{ value: 'unidad', label: 'Unidad' }];
  if (producto.vende_por_presentaciones && producto.blister_habilitado) {
    tipos.push({ value: 'blister', label: `Blister (${producto.unidades_blister ?? '?'} und)` });
  }
  if (producto.vende_por_presentaciones && producto.caja_habilitado) {
    tipos.push({ value: 'caja', label: `Caja (${producto.unidades_caja ?? '?'} und)` });
  }
  return tipos;
}

export function precioPorTipo(producto: Producto, tipo: TipoVenta): number {
  if (tipo === 'blister') return producto.precio_blister ?? producto.precio_venta;
  if (tipo === 'caja') return producto.precio_caja ?? producto.precio_venta;
  return producto.precio_venta;
}

export function unidadesBasePorTipo(producto: Producto, tipo: TipoVenta): number {
  if (tipo === 'blister') return producto.unidades_blister ?? 1;
  if (tipo === 'caja') return producto.unidades_caja ?? 1;
  return 1;
}

// Input numérico reutilizable para precio unitario / subtotal: evita bugs
// al tipear decimales o al borrar el campo por completo.
export function PrecioInput({
  value,
  onChange,
  className = '',
  step = '0.10',
}: {
  value: number;
  onChange: (val: number) => void;
  className?: string;
  step?: string;
}) {
  const [localVal, setLocalVal] = useState(value.toString());

  useEffect(() => {
    setLocalVal(Number.isNaN(value) ? '' : value.toFixed(2));
  }, [value]);

  const commitValue = () => {
    const parsed = parseFloat(localVal);
    if (isNaN(parsed) || parsed < 0) {
      setLocalVal(value.toFixed(2));
    } else {
      onChange(parsed);
      setLocalVal(parsed.toFixed(2));
    }
  };

  return (
    <input
      type="number"
      step={step}
      min={0}
      value={localVal}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={commitValue}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          commitValue();
        }
      }}
      className={className}
    />
  );
}