import { matchPath } from 'react-router'
import { seccionDe } from './secciones.ts'

export interface Miga {
  texto: string
  /** Sin ruta, es la página actual. */
  ruta?: string
}

/**
 * Migas de pan de una ruta (ERP-UX-1): Inicio, la sección del menú y, si la
 * ruta es una página dentro de ella, esa página. Salen de `secciones.ts`, así
 * que una sección nueva las tiene sin hacer nada más.
 */
export function migasDe(ruta: string): Miga[] {
  const seccion = seccionDe(ruta)
  if (!seccion) {
    return [{ texto: 'Inicio' }]
  }
  const subpagina = seccion.subpaginas?.find((pagina) => matchPath(pagina.ruta, ruta))
  if (!subpagina) {
    return [{ texto: 'Inicio', ruta: '/' }, { texto: seccion.titulo }]
  }
  return [
    { texto: 'Inicio', ruta: '/' },
    { texto: seccion.titulo, ruta: seccion.ruta },
    { texto: subpagina.titulo },
  ]
}
