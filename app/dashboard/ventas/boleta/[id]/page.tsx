import BoletaCliente from './BoletaCliente'

// generateStaticParams vive aquí, en un Server Component (sin 'use client')
export function generateStaticParams() {
  return [{ id: '1' }];
}

export default function BoletaImprimiblePage() {
  return <BoletaCliente />;
}