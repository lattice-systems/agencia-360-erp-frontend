import { render } from '@testing-library/react'
import { http } from 'msw'
import { createElement } from 'react'
import { MemoryRouter } from 'react-router'
import type { Rol } from '../api/acceso.ts'
import { API_URL } from '../api/cliente.ts'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import App from '../App.tsx'
import { guardarSesion } from '../sesion/almacen.ts'
import { conexionAbierta, servidor } from './servidor.ts'

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
      // Igual que en main.tsx: los tooltips del menú lateral necesitan el provider.
      createElement(TooltipProvider, null, createElement(App), createElement(Toaster)),
    ),
  )
}

/**
 * Responde la ruta de Server-Sent Events con una conexión abierta y devuelve
 * cómo mandar eventos por ella, como lo haría el backend.
 */
export function conEventos(ruta: string) {
  const conexiones: ReadableStreamDefaultController<Uint8Array>[] = []
  servidor.use(http.get(`${API}${ruta}`, () => conexionAbierta((c) => conexiones.push(c))))
  return {
    emitir(evento: string) {
      const texto = new TextEncoder().encode(`event: ${evento}\ndata: cambio\n\n`)
      conexiones.forEach((c) => c.enqueue(texto))
    },
  }
}
