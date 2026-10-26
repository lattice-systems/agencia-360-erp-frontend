import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { FILTRO_ACEITE } from '../inventario/datosDePrueba.ts'
import { servidor } from '../test/servidor.ts'
import { API, conSesion, renderApp } from '../test/utilidades.ts'

/** Textos de las migas de pan, con la ruta de cada enlace (null en la página actual). */
function migas() {
  const nav = screen.getByRole('navigation', { name: 'Migas de pan' })
  return within(nav)
    .getAllByRole('listitem')
    .filter((item) => item.textContent)
    .map((item) => {
      const enlace = within(item).queryByRole('link')
      return [item.textContent, enlace?.getAttribute('href') ?? null]
    })
}

describe('Migas de pan en la barra superior (ERP-UX-1)', () => {
  it('en Inicio solo muestra Inicio como página actual', () => {
    conSesion('CAJA')
    renderApp('/')

    expect(migas()).toEqual([['Inicio', null]])
    expect(screen.getByText('Inicio', { selector: '[aria-current="page"]' })).toBeInTheDocument()
  })

  it('en una sección enlaza a Inicio y marca la sección como actual', async () => {
    conSesion('INVENTARIO')
    servidor.use(http.get(`${API}/api/v1/vehiculos`, () => HttpResponse.json([])))
    renderApp('/vehiculos')

    expect(migas()).toEqual([
      ['Inicio', '/'],
      ['Vehículos', null],
    ])
    await screen.findByText('Aún no hay vehículos')
  })

  it('en el alta de un vehículo enlaza a su sección', () => {
    conSesion('INVENTARIO')
    renderApp('/vehiculos/nuevo')

    expect(migas()).toEqual([
      ['Inicio', '/'],
      ['Vehículos', '/vehiculos'],
      ['Agregar vehículo', null],
    ])
  })

  it('en la edición de una refacción enlaza a Refacciones', async () => {
    conSesion('INVENTARIO')
    servidor.use(http.get(`${API}/api/v1/refacciones/1`, () => HttpResponse.json(FILTRO_ACEITE)))
    renderApp('/refacciones/1/editar')

    expect(migas()).toEqual([
      ['Inicio', '/'],
      ['Refacciones', '/refacciones'],
      ['Editar refacción', null],
    ])
    await screen.findByDisplayValue('REF-001')
  })

  it('cubre las demás secciones del menú', async () => {
    conSesion('INVENTARIO')
    servidor.use(http.get(`${API}/api/v1/refacciones`, () => HttpResponse.json([])))
    renderApp('/recepciones')

    expect(migas()).toEqual([
      ['Inicio', '/'],
      ['Recepciones', null],
    ])
    await screen.findByText('Aún no hay refacciones')
  })

  it('las migas quedan solo en la barra superior, no repetidas en la página', () => {
    conSesion('INVENTARIO')
    renderApp('/refacciones/nueva')

    expect(screen.getAllByRole('navigation', { name: 'Migas de pan' })).toHaveLength(1)
    expect(screen.queryByRole('navigation', { name: 'Ruta' })).not.toBeInTheDocument()
  })
})

describe('Menú de perfil (ERP-UX-1)', () => {
  it('muestra las iniciales del nombre en el ícono de perfil', () => {
    conSesion('INVENTARIO')
    renderApp('/')

    const perfil = screen.getByRole('button', { name: 'Perfil de Persona de Prueba' })
    expect(perfil).toHaveTextContent('PP')
  })

  it('al abrirlo muestra el nombre, el rol y cerrar sesión', async () => {
    conSesion('INVENTARIO')
    renderApp('/')
    const usuario = userEvent.setup({ delay: null })

    await usuario.click(screen.getByRole('button', { name: 'Perfil de Persona de Prueba' }))

    const menu = await screen.findByRole('menu')
    expect(within(menu).getByText('Persona de Prueba')).toBeInTheDocument()
    expect(within(menu).getByText('Inventario')).toBeInTheDocument()
    await usuario.click(within(menu).getByRole('menuitem', { name: 'Cerrar sesión' }))

    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    expect(sessionStorage.length).toBe(0)
  })
})

describe('Menú lateral (ERP-UX-1)', () => {
  it('muestra el logo sin el texto Agencia360 · ERP', () => {
    conSesion('INVENTARIO')
    renderApp('/')

    expect(screen.getByRole('link', { name: 'Agencia360, ir a Inicio' })).toHaveAttribute('href', '/')
    expect(screen.queryByText('Agencia360 · ERP')).not.toBeInTheDocument()
  })
})
