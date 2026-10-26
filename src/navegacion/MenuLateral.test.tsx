import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { Rol } from '../api/acceso.ts'
import { servidor } from '../test/servidor.ts'
import { API, conSesion, renderApp } from '../test/utilidades.ts'

function seccionesDelMenu(rol: Rol): string[] {
  conSesion(rol)
  renderApp('/')
  const menu = screen.getByRole('navigation', { name: 'Principal' })
  return within(menu)
    .getAllByRole('link')
    .map((enlace) => enlace.textContent ?? '')
}

describe('Menú lateral por rol (permisos del PO del 13 de octubre)', () => {
  it('Inventario opera vehículos, refacciones y recepciones', () => {
    expect(seccionesDelMenu('INVENTARIO')).toEqual(['Vehículos', 'Refacciones', 'Recepciones'])
  })

  it('Refacciones solo consulta su stock', () => {
    expect(seccionesDelMenu('REFACCIONES')).toEqual(['Refacciones'])
  })

  it('Facturación elige la unidad de cada venta (ERP-1.0)', () => {
    expect(seccionesDelMenu('FACTURACION')).toEqual(['Facturación'])
  })

  it('el Administrador consulta el inventario y el expediente, y administra usuarios', () => {
    expect(seccionesDelMenu('ADMINISTRADOR')).toEqual(['Vehículos', 'Refacciones', 'Expediente', 'Usuarios'])
  })

  it('Servicio consulta el expediente del vehículo (ERP-3.0)', () => {
    expect(seccionesDelMenu('SERVICIO')).toEqual(['Expediente'])
  })

  it('marca la sección actual, también en sus subrutas', async () => {
    conSesion('INVENTARIO')
    servidor.use(http.get(`${API}/api/v1/vehiculos`, () => HttpResponse.json([])))
    renderApp('/vehiculos')

    const menu = screen.getByRole('navigation', { name: 'Principal' })
    expect(within(menu).getByRole('link', { name: 'Vehículos' })).toHaveAttribute('aria-current', 'page')
    expect(within(menu).getByRole('link', { name: 'Refacciones' })).not.toHaveAttribute('aria-current')
    expect(await screen.findByText('Aún no hay vehículos')).toBeInTheDocument()
  })
})
