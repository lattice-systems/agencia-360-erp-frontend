// Endpoints del módulo de acceso del backend (login, usuarios y roles).
import { peticion } from './cliente.ts'

export type Rol =
  | 'ADMINISTRADOR'
  | 'GERENTE_MARKETING'
  | 'VENTAS'
  | 'FACTURACION'
  | 'INVENTARIO'
  | 'SERVICIO'
  | 'REFACCIONES'
  | 'CAJA'
  | 'CONTABILIDAD'

export interface SesionApi {
  accessToken: string
  tipo: string
  usuario: string
  nombre: string
  rol: Rol
  aplicacion: 'ERP' | 'CRM'
}

export interface UsuarioApi {
  id: number
  usuario: string
  nombre: string
  rol: Rol
  activo: boolean
}

export interface RolApi {
  nombre: Rol
  descripcion: string
  accesoErp: boolean
  accesoCrm: boolean
}

export interface NuevoUsuario {
  usuario: string
  contrasena: string
  nombre: string
  rol: Rol
}

export function iniciarSesion(usuario: string, contrasena: string) {
  return peticion<SesionApi>('/api/v1/auth/login', {
    metodo: 'POST',
    cuerpo: { usuario, contrasena, aplicacion: 'ERP' },
  })
}

export function listarUsuarios(token: string) {
  return peticion<UsuarioApi[]>('/api/v1/usuarios', { token })
}

export function listarRoles(token: string) {
  return peticion<RolApi[]>('/api/v1/roles', { token })
}

export function crearUsuario(token: string, nuevo: NuevoUsuario) {
  return peticion<UsuarioApi>('/api/v1/usuarios', {
    metodo: 'POST',
    cuerpo: nuevo,
    token,
  })
}

export function cambiarRol(token: string, usuarioId: number, rol: Rol) {
  return peticion<UsuarioApi>(`/api/v1/usuarios/${usuarioId}/rol`, {
    metodo: 'PUT',
    cuerpo: { rol },
    token,
  })
}
