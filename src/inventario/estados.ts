// Textos y variantes de Badge de los estados del inventario. Cada estado lleva texto, no
// solo color.
import type { ComponentProps } from 'react'
import type { Badge } from '@/components/ui/badge'
import type { EstatusVehiculo, Refaccion } from './api.ts'

type Variante = ComponentProps<typeof Badge>['variant']

export const NOMBRE_ESTATUS: Record<EstatusVehiculo, string> = {
  DISPONIBLE: 'Disponible',
  VENDIDO: 'Vendido',
  ENTREGADO: 'Entregado',
  NO_DISPONIBLE: 'No disponible',
}

export const VARIANTE_ESTATUS: Record<EstatusVehiculo, Variante> = {
  DISPONIBLE: 'success',
  VENDIDO: 'outline',
  ENTREGADO: 'secondary',
  NO_DISPONIBLE: 'destructive',
}

export type EstadoExistencia = 'DISPONIBLE' | 'BAJO_MINIMO' | 'SIN_EXISTENCIA'

/** "Bajo mínimo" incluye las que no tienen existencia (mockup de refacciones). */
export function estadoExistencia(refaccion: Pick<Refaccion, 'existencia' | 'bajoMinimo'>): EstadoExistencia {
  if (refaccion.existencia === 0) {
    return 'SIN_EXISTENCIA'
  }
  return refaccion.bajoMinimo ? 'BAJO_MINIMO' : 'DISPONIBLE'
}

export const NOMBRE_EXISTENCIA: Record<EstadoExistencia, string> = {
  DISPONIBLE: 'Disponible',
  BAJO_MINIMO: 'Bajo mínimo',
  SIN_EXISTENCIA: 'Sin existencia',
}

export const VARIANTE_EXISTENCIA: Record<EstadoExistencia, Variante> = {
  DISPONIBLE: 'success',
  BAJO_MINIMO: 'warning',
  SIN_EXISTENCIA: 'destructive',
}
