// Textos y tonos de los estados del inventario. Cada estado lleva texto, no
// solo color (guía de estilos, sección 2).
import type { Tono } from '../componentes/ChipEstado.tsx'
import type { EstatusVehiculo, Refaccion } from './api.ts'

export const NOMBRE_ESTATUS: Record<EstatusVehiculo, string> = {
  DISPONIBLE: 'Disponible',
  APARTADA: 'Apartada',
  VENDIDO: 'Vendido',
  ENTREGADO: 'Entregado',
  NO_DISPONIBLE: 'No disponible',
}

export const TONO_ESTATUS: Record<EstatusVehiculo, Tono> = {
  DISPONIBLE: 'exito',
  APARTADA: 'advertencia',
  VENDIDO: 'informacion',
  ENTREGADO: 'neutro',
  NO_DISPONIBLE: 'peligro',
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

export const TONO_EXISTENCIA: Record<EstadoExistencia, Tono> = {
  DISPONIBLE: 'exito',
  BAJO_MINIMO: 'advertencia',
  SIN_EXISTENCIA: 'peligro',
}
