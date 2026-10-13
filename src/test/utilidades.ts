import { render } from '@testing-library/react'
import { createElement } from 'react'
import { MemoryRouter } from 'react-router'
import type { Rol } from '../api/acceso.ts'
import { API_URL } from '../api/cliente.ts'
import { Toaster } from '@/components/ui/sonner'
import App from '../App.tsx'
import { guardarSesion } from '../sesion/almacen.ts'

export const API = API_URL

/** JWT de prueba (sin firma válida) que vence en los segundos indicados. */
export function tokenDePrueba(segundosParaVencer = 3600): string {
  const base64url = (valor: object) =>
    btoa(JSON.stringify(valor)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
  const exp = Math.floor(Date.now() / 1000) + segundosParaVencer
  return `${base64url({ alg: 'HS256' })}.${base64url({ sub: 'prueba', exp })}.firma`
}

/** Deja una sesión guardada, como si el usuario ya hubiera iniciado sesión. */
export function conSesion(rol: Rol, segundosParaVencer = 3600): string {
  const token = tokenDePrueba(segundosParaVencer)
  guardarSesion({
    token,
    usuario: 'usuario.prueba',
    nombre: 'Persona de Prueba',
    rol,
    expira: (Math.floor(Date.now() / 1000) + segundosParaVencer) * 1000,
  })
  return token
}

/** Renderiza la aplicación completa en la ruta indicada, con sus avisos (Sonner). */
export function renderApp(ruta = '/') {
  return render(
    createElement(
      MemoryRouter,
      { initialEntries: [ruta] },
      createElement(App),
      createElement(Toaster),
    ),
  )
}
