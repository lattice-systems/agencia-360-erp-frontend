import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from './test/utilidades.ts'

describe('App', () => {
  it('muestra el inicio de sesión del ERP a quien no ha entrado', () => {
    renderApp('/')

    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('redirige una ruta desconocida al inicio', () => {
    renderApp('/no-existe')

    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
  })
})
