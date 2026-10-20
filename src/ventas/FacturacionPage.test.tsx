import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { KICKS_VENDIDO, SENTRA } from '../inventario/datosDePrueba.ts'
import { servidor } from '../test/servidor.ts'
import { API, conSesion, renderApp } from '../test/utilidades.ts'
import type { ProspectoPorFacturar, Venta } from './api.ts'

const LUIS: ProspectoPorFacturar = {
  id: 4,
  nombre: 'Luis Herrera',
  telefono: '4775550104',
  correo: 'luis.h@example.com',
  vendedorId: 9,
  vendedor: 'Sergio Luna',
  enFacturacionDesde: '2026-10-18T16:00:00Z',
}

const CARLOS: ProspectoPorFacturar = {
  id: 9,
  nombre: 'Carlos Núñez',
  telefono: '4775550109',
  correo: null,
  vendedorId: 10,
  vendedor: 'Elena Ríos',
  enFacturacionDesde: '2026-10-19T15:00:00Z',
}

const VENTA_DE_CARLOS: Venta = {
  id: 1,
  prospectoId: 9,
  vehiculoId: KICKS_VENDIDO.id,
  vin: KICKS_VENDIDO.vin,
  modelo: 'Kicks',
  version: 'Exclusive',
  anio: 2026,
  color: 'Azul',
  precio: 529900,
  estatus: 'POR_ENTREGAR',
  asignadaEn: '2026-10-19T16:00:00Z',
  registradaEn: null,
}

function conDatos({
  prospectos = [LUIS, CARLOS],
  ventas = [VENTA_DE_CARLOS],
}: { prospectos?: ProspectoPorFacturar[]; ventas?: Venta[] } = {}) {
  servidor.use(
    http.get(`${API}/api/v1/prospectos/por-facturar`, () => HttpResponse.json(prospectos)),
    http.get(`${API}/api/v1/ventas`, () => HttpResponse.json(ventas)),
    http.get(`${API}/api/v1/vehiculos`, () => HttpResponse.json([SENTRA])),
  )
}

async function abrirAcciones(nombre: string) {
  const usuario = userEvent.setup({ delay: null })
  await usuario.click(await screen.findByRole('button', { name: `Acciones de ${nombre}` }))
  return usuario
}

describe('Facturación: elegir la unidad de cada venta (ERP-1.0)', () => {
  it('muestra los prospectos en Facturación con su vendedor y su unidad', async () => {
    conSesion('FACTURACION')
    conDatos()
    renderApp('/facturacion')

    const luis = (await screen.findByText('Luis Herrera')).closest('tr')!
    expect(within(luis).getByText('Sergio Luna')).toBeInTheDocument()
    expect(within(luis).getByText('Sin unidad')).toBeInTheDocument()

    const carlos = screen.getByText('Carlos Núñez').closest('tr')!
    expect(within(carlos).getByText('Kicks Exclusive 2026')).toBeInTheDocument()
    expect(within(carlos).getByText('3N1CP5CV6RL123458')).toBeInTheDocument()
    expect(within(carlos).getByText('$529,900.00')).toBeInTheDocument()
  })

  it('elige una unidad disponible y la muestra en la lista', async () => {
    conSesion('FACTURACION')
    conDatos()
    let recibido: unknown = null
    servidor.use(
      http.put(`${API}/api/v1/ventas/4/unidad`, async ({ request }) => {
        recibido = await request.json()
        return HttpResponse.json({
          ...VENTA_DE_CARLOS,
          id: 2,
          prospectoId: 4,
          vehiculoId: SENTRA.id,
          vin: SENTRA.vin,
          modelo: 'Sentra',
          version: 'Advance',
          precio: 489900,
        })
      }),
    )
    renderApp('/facturacion')
    const usuario = await abrirAcciones('Luis Herrera')

    await usuario.click(await screen.findByRole('menuitem', { name: 'Elegir unidad' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Elegir unidad para Luis Herrera' })
    await usuario.click(within(dialogo).getByRole('combobox', { name: 'Unidad' }))
    await usuario.click(await screen.findByRole('option', { name: /Sentra Advance 2026/ }))
    await usuario.click(within(dialogo).getByRole('button', { name: 'Elegir unidad' }))

    expect(await screen.findByText('La unidad 3N1AB8CV5PY123456 quedó vendida a Luis Herrera.')).toBeInTheDocument()
    expect(recibido).toEqual({ vehiculoId: SENTRA.id })
    const luis = screen.getByText('Luis Herrera').closest('tr')!
    expect(within(luis).getByText('Sentra Advance 2026')).toBeInTheDocument()
  })

  it('si ya tiene unidad, ofrece cambiarla', async () => {
    conSesion('FACTURACION')
    conDatos()
    renderApp('/facturacion')
    const usuario = await abrirAcciones('Carlos Núñez')

    await usuario.click(await screen.findByRole('menuitem', { name: 'Cambiar unidad' }))

    const dialogo = await screen.findByRole('dialog', { name: 'Cambiar la unidad de Carlos Núñez' })
    expect(within(dialogo).getByText(/La unidad 3N1CP5CV6RL123458 regresará a Disponible\./)).toBeInTheDocument()
  })

  it('muestra tal cual el error del backend y no cierra el diálogo', async () => {
    conSesion('FACTURACION')
    conDatos()
    servidor.use(
      http.put(`${API}/api/v1/ventas/4/unidad`, () =>
        HttpResponse.json({ message: 'La unidad 3N1AB8CV5PY123456 ya no está disponible' }, { status: 409 }),
      ),
    )
    renderApp('/facturacion')
    const usuario = await abrirAcciones('Luis Herrera')

    await usuario.click(await screen.findByRole('menuitem', { name: 'Elegir unidad' }))
    const dialogo = await screen.findByRole('dialog')
    await usuario.click(within(dialogo).getByRole('combobox', { name: 'Unidad' }))
    await usuario.click(await screen.findByRole('option', { name: /Sentra Advance 2026/ }))
    await usuario.click(within(dialogo).getByRole('button', { name: 'Elegir unidad' }))

    expect(
      await within(dialogo).findByText('La unidad 3N1AB8CV5PY123456 ya no está disponible'),
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('pide elegir una unidad antes de guardar', async () => {
    conSesion('FACTURACION')
    conDatos()
    renderApp('/facturacion')
    const usuario = await abrirAcciones('Luis Herrera')

    await usuario.click(await screen.findByRole('menuitem', { name: 'Elegir unidad' }))
    const dialogo = await screen.findByRole('dialog')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Elegir unidad' }))

    expect(within(dialogo).getByText('Elige la unidad que se vendió.')).toBeInTheDocument()
  })

  it('sin unidades disponibles lo avisa en el diálogo', async () => {
    conSesion('FACTURACION')
    conDatos()
    servidor.use(http.get(`${API}/api/v1/vehiculos`, () => HttpResponse.json([])))
    renderApp('/facturacion')
    const usuario = await abrirAcciones('Luis Herrera')

    await usuario.click(await screen.findByRole('menuitem', { name: 'Elegir unidad' }))

    expect(await screen.findByText('No hay unidades disponibles. Pídele a Inventario que registre la unidad.')).toBeInTheDocument()
  })

  it('pasa a Entrega solo a quien ya tiene unidad, después de confirmar', async () => {
    conSesion('FACTURACION')
    conDatos()
    let recibido: unknown = null
    servidor.use(
      http.patch(`${API}/api/v1/prospectos/9/etapa`, async ({ request }) => {
        recibido = await request.json()
        return HttpResponse.json({ ...CARLOS, etapa: 'ENTREGA' })
      }),
    )
    renderApp('/facturacion')

    let usuario = await abrirAcciones('Luis Herrera')
    expect(await screen.findByRole('menuitem', { name: 'Pasar a Entrega' })).toHaveAttribute('aria-disabled', 'true')
    await usuario.keyboard('{Escape}')

    usuario = await abrirAcciones('Carlos Núñez')
    await usuario.click(await screen.findByRole('menuitem', { name: 'Pasar a Entrega' }))
    const confirmacion = await screen.findByRole('alertdialog', { name: '¿Pasar a Carlos Núñez a Entrega?' })
    servidor.use(http.get(`${API}/api/v1/prospectos/por-facturar`, () => HttpResponse.json([LUIS])))
    await usuario.click(within(confirmacion).getByRole('button', { name: 'Pasar a Entrega' }))

    expect(await screen.findByText('Carlos Núñez pasó a Entrega.')).toBeInTheDocument()
    expect(recibido).toEqual({ etapa: 'ENTREGA' })
    await vi.waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Acciones de Carlos Núñez' })).not.toBeInTheDocument(),
    )
  })

  it('sin prospectos por facturar muestra el estado vacío', async () => {
    conSesion('FACTURACION')
    conDatos({ prospectos: [], ventas: [] })
    renderApp('/facturacion')

    expect(await screen.findByText('No hay prospectos por facturar')).toBeInTheDocument()
  })

  it('muestra el error al cargar y permite reintentar', async () => {
    conSesion('FACTURACION')
    conDatos()
    let intentos = 0
    servidor.use(
      http.get(`${API}/api/v1/prospectos/por-facturar`, () => {
        intentos += 1
        return intentos === 1
          ? HttpResponse.json({ message: 'Servicio no disponible' }, { status: 503 })
          : HttpResponse.json([LUIS])
      }),
    )
    renderApp('/facturacion')

    expect(await screen.findByText('Servicio no disponible')).toBeInTheDocument()
    await userEvent.setup({ delay: null }).click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Luis Herrera')).toBeInTheDocument()
  })

  it('solo Facturación entra a la pantalla y la ve en el menú', () => {
    conSesion('INVENTARIO')
    renderApp('/facturacion')

    expect(screen.getByRole('heading', { name: 'Sin permiso' })).toBeInTheDocument()
    const menu = screen.getByRole('navigation', { name: 'Principal' })
    expect(within(menu).queryByRole('link', { name: 'Facturación' })).not.toBeInTheDocument()
  })
})
