import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { servidor } from '../test/servidor.ts'
import { API, conSesion, renderApp } from '../test/utilidades.ts'
import { BALATAS_BAJO_MINIMO, KICKS_VENDIDO, SENTRA } from './datosDePrueba.ts'

// Menos de 1024 px: el menú lateral se abre como Sheet y los listados pasan a
// tarjetas (guía de estilos, sección 6; mockup 12).
const matchMediaDeEscritorio = window.matchMedia

beforeEach(() => {
  window.matchMedia = ((consulta: string) => ({
    ...matchMediaDeEscritorio(consulta),
    matches: true,
  })) as typeof window.matchMedia
})

afterEach(() => {
  window.matchMedia = matchMediaDeEscritorio
})

describe('Inventario en el celular', () => {
  it('muestra cada vehículo como tarjeta, sin tabla', async () => {
    conSesion('INVENTARIO')
    servidor.use(http.get(`${API}/api/v1/vehiculos`, () => HttpResponse.json([SENTRA, KICKS_VENDIDO])))
    renderApp('/vehiculos')

    const tarjeta = (await screen.findByText('Sentra Advance')).closest('li')!
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(within(tarjeta).getByText('3N1AB8CV5PY123456')).toBeInTheDocument()
    expect(within(tarjeta).getByText('$489,900.00 MXN')).toBeInTheDocument()
    expect(within(tarjeta).getByText('Disponible')).toBeInTheDocument()
    expect(within(tarjeta).getByText('Blanco · Modelo 2026')).toBeInTheDocument()
    expect(within(tarjeta).getByRole('button', { name: 'Acciones de 3N1AB8CV5PY123456' })).toBeInTheDocument()
  })

  it('muestra cada refacción como tarjeta con su existencia y mínimo', async () => {
    conSesion('REFACCIONES')
    servidor.use(http.get(`${API}/api/v1/refacciones`, () => HttpResponse.json([BALATAS_BAJO_MINIMO])))
    renderApp('/refacciones')

    const tarjeta = (await screen.findByText('Balatas delanteras')).closest('li')!
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(within(tarjeta).getByText('3 (mín. 5)')).toBeInTheDocument()
    expect(within(tarjeta).getByText('Bajo mínimo')).toBeInTheDocument()
  })

  it('abre el menú lateral como Sheet y lo cierra al elegir una sección', async () => {
    conSesion('INVENTARIO')
    servidor.use(http.get(`${API}/api/v1/refacciones`, () => HttpResponse.json([])))
    renderApp('/')
    const usuario = userEvent.setup({ delay: null })

    expect(screen.queryByRole('navigation', { name: 'Principal' })).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Mostrar u ocultar el menú' }))

    const menu = await screen.findByRole('navigation', { name: 'Principal' })
    await usuario.click(within(menu).getByRole('link', { name: 'Refacciones' }))

    expect(await screen.findByText('Aún no hay refacciones')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Principal' })).not.toBeInTheDocument()
  })
})
