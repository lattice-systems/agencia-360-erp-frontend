// Secciones del ERP y los roles que pueden entrar a cada una, según la matriz
// de roles. Cada módulo nuevo del ERP agrega aquí su sección; con eso aparece
// en el menú lateral y su ruta queda protegida.
import { Banknote, Car, ClipboardList, Package, ReceiptText, UserCog, type LucideIcon } from 'lucide-react'
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
  /** Páginas dentro de la sección, para las migas de pan (ruta con :parámetros). */
  subpaginas?: { ruta: string; titulo: string }[]
}

export const SECCIONES: Seccion[] = [
  // ERP-2.0, permisos decididos por el PO el 13 de octubre: Inventario opera
  // las dos; el Administrador solo consulta; Refacciones consulta su stock.
  {
    ruta: '/vehiculos',
    titulo: 'Vehículos',
    grupo: 'Operación',
    icono: Car,
    roles: ['INVENTARIO', 'ADMINISTRADOR'],
    subpaginas: [
      { ruta: '/vehiculos/nuevo', titulo: 'Agregar vehículo' },
      { ruta: '/vehiculos/:id/editar', titulo: 'Editar vehículo' },
    ],
  },
  {
    ruta: '/refacciones',
    titulo: 'Refacciones',
    grupo: 'Operación',
    icono: Package,
    roles: ['INVENTARIO', 'REFACCIONES', 'ADMINISTRADOR'],
    subpaginas: [
      { ruta: '/refacciones/nueva', titulo: 'Agregar refacción' },
      { ruta: '/refacciones/:id/editar', titulo: 'Editar refacción' },
    ],
  },
  {
    ruta: '/recepciones',
    titulo: 'Recepciones',
    grupo: 'Operación',
    icono: ClipboardList,
    roles: ['INVENTARIO'],
  },
  // ERP-1.1: Caja registra y envía los pagos de la venta; Contabilidad los
  // valida y con eso el prospecto pasa a Facturación.
  {
    ruta: '/pagos',
    titulo: 'Pagos de ventas',
    grupo: 'Operación',
    icono: Banknote,
    roles: ['CAJA', 'CONTABILIDAD'],
  },
  // ERP-1.0: sin apartado, Facturación elige la unidad que se vendió.
  {
    ruta: '/facturacion',
    titulo: 'Facturación',
    grupo: 'Operación',
    icono: ReceiptText,
    roles: ['FACTURACION'],
  },
  {
    ruta: '/usuarios',
    titulo: 'Usuarios',
    grupo: 'Administración',
    icono: UserCog,
    roles: ['ADMINISTRADOR'],
  },
]

/** Solo Inventario da de alta, corrige y recibe artículos. */
export const ROLES_OPERACION_INVENTARIO: Rol[] = ['INVENTARIO']

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
