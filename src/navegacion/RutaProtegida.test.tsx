import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { conSesion, renderApp } from '../test/utilidades.ts'

describe('Rutas protegidas y menú por rol', () => {
  it('manda al login a quien no ha iniciado sesión', () => {
    renderApp('/usuarios')

    expect(screen.getByRole('button', { name: 'Entrar al ERP' })).toBeInTheDocument()
  })

  it('muestra Usuarios en el menú solo al Administrador', () => {
    conSesion('ADMINISTRADOR')
    renderApp('/')

    const menu = screen.getByRole('navigation', { name: 'Principal' })
    expect(menu).toHaveTextContent('Usuarios')
  })

  it('no muestra Usuarios a otros roles', () => {
    conSesion('VENTAS')
    renderApp('/')

    const menu = screen.getByRole('navigation', { name: 'Principal' })
    expect(menu).not.toHaveTextContent('Usuarios')
    expect(screen.getByText('Todavía no hay módulos disponibles para tu rol.')).toBeInTheDocument()
  })

  it('bloquea una sección cuando el rol no tiene permiso', () => {
    conSesion('CAJA')
    renderApp('/usuarios')

    expect(screen.getByRole('heading', { name: 'Sin permiso' })).toBeInTheDocument()
  })

  it('cierra la sesión y regresa al login', async () => {
    conSesion('CAJA')
    renderApp('/')

    const usuario = userEvent.setup({ delay: null })
    await usuario.click(screen.getByRole('button', { name: 'Perfil de Persona de Prueba' }))
    await usuario.click(await screen.findByRole('menuitem', { name: 'Cerrar sesión' }))

    expect(screen.getByRole('button', { name: 'Entrar al ERP' })).toBeInTheDocument()
    expect(sessionStorage.length).toBe(0)
  })

  it('cierra la sesión cuando vence el token', async () => {
    conSesion('CAJA', 1)
    renderApp('/')

    expect(
      await screen.findByText('Tu sesión expiró. Inicia sesión de nuevo.', {}, { timeout: 3000 }),
    ).toBeInTheDocument()
    expect(sessionStorage.length).toBe(0)
  })
})
