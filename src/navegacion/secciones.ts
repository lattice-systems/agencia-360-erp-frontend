// Secciones del ERP y los roles que pueden entrar a cada una, según la matriz
// de roles. Cada módulo nuevo del ERP agrega aquí su sección; con eso aparece
// en el menú lateral y su ruta queda protegida.
import { UserCog, type LucideIcon } from 'lucide-react'
import type { Rol } from '../api/acceso.ts'

/** Grupos del menú lateral, en el orden en que se muestran. */
export const GRUPOS = ['Operación', 'Administración'] as const

export type Grupo = (typeof GRUPOS)[number]

export interface Seccion {
  ruta: string
  titulo: string
  grupo: Grupo
  /** Ícono de Lucide (guía de estilos, sección 7). */
  icono: LucideIcon
  roles: Rol[]
}

export const SECCIONES: Seccion[] = [
  {
    ruta: '/usuarios',
    titulo: 'Usuarios',
    grupo: 'Administración',
    icono: UserCog,
    roles: ['ADMINISTRADOR'],
  },
]

export function seccionesPara(rol: Rol): Seccion[] {
  return SECCIONES.filter((seccion) => seccion.roles.includes(rol))
}

export function rolesDe(ruta: string): Rol[] {
  return SECCIONES.find((seccion) => seccion.ruta === ruta)?.roles ?? []
}

/** Sección a la que pertenece una ruta, incluidas sus subrutas (/vehiculos/nuevo). */
export function seccionDe(ruta: string): Seccion | undefined {
  return SECCIONES.find(
    (seccion) => ruta === seccion.ruta || ruta.startsWith(`${seccion.ruta}/`),
  )
}
