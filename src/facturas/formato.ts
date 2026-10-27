import type { Vehiculo } from '../inventario/api.ts'

/** Nombre de la unidad como en la factura: Tipo, versión y Modelo. */
export function nombreDeUnidad(unidad: Pick<Vehiculo, 'modelo' | 'version' | 'anio'>) {
  return `${unidad.modelo} ${unidad.version} ${unidad.anio}`
}
