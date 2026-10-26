import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { servidor } from '../test/servidor.ts'
import { API, renderApp, tokenDePrueba } from '../test/utilidades.ts'

function errorApi(status: number, message: string) {
  return HttpResponse.json(
    { timestamp: new Date().toISOString(), status, error: 'Error', message, path: '/api/v1/auth/login' },
    { status },
  )
}

async function llenarYEnviar(usuario: string, contrasena: string) {
  const usuarioEvento = userEvent.setup()
  await usuarioEvento.type(screen.getByLabelText('Usuario'), usuario)
  await usuarioEvento.type(screen.getByLabelText('Contraseña'), contrasena)
  await usuarioEvento.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('Inicio de sesión', () => {
  it('entra al ERP con credenciales correctas y guarda la sesión', async () => {
    let cuerpoEnviado: unknown
    servidor.use(
      http.post(`${API}/api/v1/auth/login`, async ({ request }) => {
        cuerpoEnviado = await request.json()
        return HttpResponse.json({
          accessToken: tokenDePrueba(),
          tipo: 'Bearer',
          usuario: 'admin',
          nombre: 'Ana Admin',
          rol: 'ADMINISTRADOR',
          aplicacion: 'ERP',
        })
      }),
    )
    renderApp('/login')

    await llenarYEnviar('admin', 'Secreta123')

    expect(await screen.findByRole('heading', { name: 'Hola, Ana Admin' })).toBeInTheDocument()
    expect(cuerpoEnviado).toEqual({ usuario: 'admin', contrasena: 'Secreta123', aplicacion: 'ERP' })
    expect(sessionStorage.length).toBe(1)
  })

  it('muestra el mensaje del backend si las credenciales son incorrectas', async () => {
    servidor.use(
      http.post(`${API}/api/v1/auth/login`, () =>
        errorApi(401, 'Usuario o contraseña incorrectos'),
      ),
    )
    renderApp('/login')

    await llenarYEnviar('admin', 'otra')

    expect(await screen.findByRole('alert')).toHaveTextContent('Usuario o contraseña incorrectos')
    expect(sessionStorage.length).toBe(0)
  })

  it('avisa cuando el rol no tiene acceso al ERP', async () => {
    servidor.use(
      http.post(`${API}/api/v1/auth/login`, () => errorApi(403, 'Tu rol no tiene acceso al ERP')),
    )
    renderApp('/login')

    await llenarYEnviar('vendedor1', 'Secreta123')

    expect(await screen.findByRole('alert')).toHaveTextContent('Tu rol no tiene acceso al ERP')
  })

  it('avisa cuando no hay conexión con el servidor', async () => {
    servidor.use(http.post(`${API}/api/v1/auth/login`, () => HttpResponse.error()))
    renderApp('/login')

    await llenarYEnviar('admin', 'Secreta123')

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar con el servidor.')
  })

  it('muestra y oculta la contraseña', async () => {
    renderApp('/login')
    const usuarioEvento = userEvent.setup()
    const campo = screen.getByLabelText('Contraseña')
    expect(campo).toHaveAttribute('type', 'password')

    await usuarioEvento.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
    expect(campo).toHaveAttribute('type', 'text')

    await usuarioEvento.click(screen.getByRole('button', { name: 'Ocultar contraseña' }))
    expect(campo).toHaveAttribute('type', 'password')
  })

  it('pide usuario y contraseña antes de llamar al backend', async () => {
    renderApp('/login')

    await userEvent.setup().click(screen.getByRole('button', { name: 'Entrar' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Escribe tu usuario y tu contraseña.')
  })
})
