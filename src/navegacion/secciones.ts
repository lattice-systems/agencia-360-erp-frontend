// Secciones del ERP y los roles que pueden entrar a cada una, según la matriz
// de roles. Cada módulo nuevo del ERP agrega aquí su sección.
import type { Rol } from '../api/acceso.ts'

export interface Seccion {
  ruta: string
  titulo: string
  roles: Rol[]
}

export const SECCIONES: Seccion[] = [
  { ruta: '/usuarios', titulo: 'Usuarios', roles: ['ADMINISTRADOR'] },
]

export function seccionesPara(rol: Rol): Seccion[] {
  return SECCIONES.filter((seccion) => seccion.roles.includes(rol))
}

export function rolesDe(ruta: string): Rol[] {
  return SECCIONES.find((seccion) => seccion.ruta === ruta)?.roles ?? []
}
