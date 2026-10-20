import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { hoyIso } from '@/lib/formato'
import { servidor } from '../test/servidor.ts'
import { API, conSesion, renderApp } from '../test/utilidades.ts'
import type { Liquidacion } from './api.ts'

const URL = `${API}/api/v1/liquidaciones`

const ANA_SIN_PAGOS: Liquidacion = {
  prospectoId: 1,
  prospectoNombre: 'Ana López',
  vendedorNombre: 'Sergio Luna',
  estado: 'ABIERTA',
  total: 0,
  pagos: [],
  enviadaEn: null,
  motivoRechazo: null,
  precioTotal: 489900,
}

const ENGANCHE = {
  id: 10,
  monto: 150000,
  fechaPago: '2026-10-15',
  referencia: 'TRF-001',
  registradoPorNombre: 'Carla Cajera',
  registradoEn: '2026-10-15T18:00:00Z',
  anulado: false,
  anuladoPorNombre: null,
}

const LUIS_ENVIADO: Liquidacion = {
  prospectoId: 2,
  prospectoNombre: 'Luis Herrera',
  vendedorNombre: 'Elena Ríos',
  estado: 'ENVIADA',
  total: 150000,
  pagos: [ENGANCHE],
  enviadaEn: '2026-10-15T19:00:00Z',
  motivoRechazo: null,
  precioTotal: 150000,
}

const MARTA_RECHAZADA: Liquidacion = {
  prospectoId: 3,
  prospectoNombre: 'Marta Hernández',
  vendedorNombre: 'Sergio Luna',
  estado: 'RECHAZADA',
  total: 150000,
  pagos: [{ ...ENGANCHE, id: 11 }],
  enviadaEn: '2026-10-15T19:00:00Z',
  motivoRechazo: 'Falta el comprobante del enganche',
  precioTotal: 489900,
}

function conLiquidaciones(lista = [ANA_SIN_PAGOS, LUIS_ENVIADO, MARTA_RECHAZADA]) {
  servidor.use(http.get(URL, () => HttpResponse.json(lista)))
}

async function filaDe(nombre: string) {
  const tabla = await screen.findByRole('table', { name: 'Ventas en Pago' })
  return within(tabla).getByText(nombre).closest('tr') as HTMLElement
}

describe('Pagos de ventas · Caja', () => {
  it('está en el menú y muestra las ventas en Pago con su total y estado', async () => {
    conSesion('CAJA')
    conLiquidaciones()
    renderApp('/pagos')

    expect(await screen.findByRole('heading', { level: 1, name: 'Pagos de ventas' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pagos de ventas' })).toHaveAttribute('href', '/pagos')
    const luis = await filaDe('Luis Herrera')
    expect(luis).toHaveTextContent('Elena Ríos')
    expect(luis).toHaveTextContent('$150,000.00')
    expect(luis).toHaveTextContent('Por validar')
    expect(await filaDe('Ana López')).toHaveTextContent('Por enviar')
    expect(screen.getByRole('button', { name: 'Todos 3' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('registra un pago y lo ve en la lista de pagos', async () => {
    let recibido: unknown
    conSesion('CAJA')
    conLiquidaciones()
    servidor.use(
      http.post(`${URL}/1/pagos`, async ({ request }) => {
        recibido = await request.json()
        return HttpResponse.json(
          { ...ANA_SIN_PAGOS, total: 150000, pagos: [{ ...ENGANCHE, fechaPago: hoyIso(), referencia: null }] },
          { status: 201 },
        )
      }),
    )
    renderApp('/pagos')
    const usuario = userEvent.setup()

    await usuario.click(await screen.findByRole('button', { name: 'Registrar pagos de Ana López' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Pagos de la venta' })
    expect(dialogo).toHaveTextContent('Aún no hay pagos registrados.')
    expect(dialogo).toHaveTextContent('Falta$489,900.00')
    expect(within(dialogo).getByRole('button', { name: 'Enviar a Contabilidad' })).toBeDisabled()

    await usuario.type(within(dialogo).getByLabelText('Monto (MXN)'), '$150,000')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Agregar pago' }))

    expect(await screen.findByText('Se registró el pago de $150,000.00.')).toBeInTheDocument()
    expect(recibido).toEqual({ monto: 150000, fechaPago: hoyIso(), referencia: null })
    const pagos = within(dialogo).getByRole('table', { name: 'Pagos registrados' })
    expect(pagos).toHaveTextContent('Total pagado$150,000.00')
    expect(within(dialogo).getByLabelText('Monto (MXN)')).toHaveValue('')
    expect(within(dialogo).getByRole('button', { name: 'Enviar a Contabilidad' })).toBeEnabled()
  })

  it('no manda un monto vacío ni una fecha futura', async () => {
    conSesion('CAJA')
    conLiquidaciones()
    renderApp('/pagos')
    const usuario = userEvent.setup()

    await usuario.click(await screen.findByRole('button', { name: 'Registrar pagos de Ana López' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Pagos de la venta' })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Agregar pago' }))

    expect(within(dialogo).getByText('Escribe un monto mayor a cero.')).toBeInTheDocument()
  })

  it('conserva lo capturado si el servidor rechaza el pago', async () => {
    conSesion('CAJA')
    conLiquidaciones()
    servidor.use(
      http.post(`${URL}/1/pagos`, () =>
        HttpResponse.json({ message: 'Solo se registran pagos de un prospecto en Pago' }, { status: 409 }),
      ),
    )
    renderApp('/pagos')
    const usuario = userEvent.setup()

    await usuario.click(await screen.findByRole('button', { name: 'Registrar pagos de Ana López' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Pagos de la venta' })
    await usuario.type(within(dialogo).getByLabelText('Monto (MXN)'), '1000')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Agregar pago' }))

    expect(
      await within(dialogo).findByText('Solo se registran pagos de un prospecto en Pago'),
    ).toBeInTheDocument()
    expect(within(dialogo).getByLabelText('Monto (MXN)')).toHaveValue('1000')
  })

  it('envía los pagos a Contabilidad', async () => {
    conSesion('CAJA')
    conLiquidaciones([{ ...ANA_SIN_PAGOS, total: 150000, pagos: [ENGANCHE] }])
    servidor.use(
      http.post(`${URL}/1/enviar`, () =>
        HttpResponse.json({ ...ANA_SIN_PAGOS, estado: 'ENVIADA', total: 150000, pagos: [ENGANCHE] }),
      ),
    )
    renderApp('/pagos')
    const usuario = userEvent.setup()

    await usuario.click(await screen.findByRole('button', { name: 'Registrar pagos de Ana López' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Pagos de la venta' })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Enviar a Contabilidad' }))

    expect(await screen.findByText('Se enviaron los pagos de Ana López a Contabilidad.')).toBeInTheDocument()
    // Ya enviados, Caja no los cambia.
    expect(within(dialogo).queryByRole('button', { name: 'Agregar pago' })).not.toBeInTheDocument()
    expect(within(dialogo).queryByRole('button', { name: /^Anular el pago/ })).not.toBeInTheDocument()
    await usuario.click(within(dialogo).getAllByRole('button', { name: 'Cerrar' })[0])
    expect(await filaDe('Ana López')).toHaveTextContent('Por validar')
  })

  it('ve por qué Contabilidad rechazó los pagos y puede corregirlos', async () => {
    conSesion('CAJA')
    conLiquidaciones()
    renderApp('/pagos')
    const usuario = userEvent.setup()

    await usuario.click(await screen.findByRole('button', { name: 'Registrar pagos de Marta Hernández' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Pagos de la venta' })

    expect(dialogo).toHaveTextContent('Contabilidad regresó los pagos')
    expect(dialogo).toHaveTextContent('Falta el comprobante del enganche')
    expect(within(dialogo).getByRole('button', { name: 'Anular el pago de $150,000.00' })).toBeInTheDocument()
  })

  it('anula un pago con confirmación y lo sigue mostrando como anulado', async () => {
    let anulado = false
    conSesion('CAJA')
    conLiquidaciones([{ ...ANA_SIN_PAGOS, total: 150000, pagos: [ENGANCHE] }])
    servidor.use(
      http.post(`${URL}/1/pagos/10/anular`, () => {
        anulado = true
        return HttpResponse.json({
          ...ANA_SIN_PAGOS,
          total: 0,
          pagos: [{ ...ENGANCHE, anulado: true, anuladoPorNombre: 'Carla Cajera' }],
        })
      }),
    )
    renderApp('/pagos')
    const usuario = userEvent.setup()

    await usuario.click(await screen.findByRole('button', { name: 'Registrar pagos de Ana López' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Pagos de la venta' })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Anular el pago de $150,000.00' }))
    const confirmacion = await screen.findByRole('alertdialog', { name: '¿Anular este pago?' })
    expect(anulado).toBe(false)
    await usuario.click(within(confirmacion).getByRole('button', { name: 'Anular pago' }))

    expect(
      await screen.findByText('Se anuló el pago. Queda en el registro, pero ya no cuenta en el total.'),
    ).toBeInTheDocument()
    expect(anulado).toBe(true)
    const pagos = within(dialogo).getByRole('table', { name: 'Pagos registrados' })
    expect(pagos).toHaveTextContent('Anulado por Carla Cajera')
    expect(pagos).toHaveTextContent('Total pagado$0.00')
    expect(within(dialogo).queryByRole('button', { name: /^Anular el pago/ })).not.toBeInTheDocument()
  })
})

describe('Pagos de ventas · Contabilidad', () => {
  it('empieza en lo que está por validar', async () => {
    conSesion('CONTABILIDAD')
    conLiquidaciones()
    renderApp('/pagos')

    expect(await screen.findByRole('button', { name: 'Por validar 1' })).toHaveAttribute('aria-pressed', 'true')
    expect(await filaDe('Luis Herrera')).toBeInTheDocument()
    expect(screen.queryByText('Ana López')).not.toBeInTheDocument()
  })

  it('valida los pagos y el prospecto sale de la lista porque pasa a Facturación', async () => {
    let validado = false
    conSesion('CONTABILIDAD')
    conLiquidaciones()
    servidor.use(
      http.post(`${URL}/2/validar`, () => {
        validado = true
        return HttpResponse.json({ ...LUIS_ENVIADO, estado: 'VALIDADA' })
      }),
    )
    renderApp('/pagos')
    const usuario = userEvent.setup()

    await usuario.click(await screen.findByRole('button', { name: 'Revisar pagos de Luis Herrera' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Pagos de la venta' })
    expect(within(dialogo).queryByRole('button', { name: 'Agregar pago' })).not.toBeInTheDocument()
    await usuario.click(within(dialogo).getByRole('button', { name: 'Validar pagos' }))

    expect(
      await screen.findByText('Se validaron los pagos de Luis Herrera. Pasó a Facturación.'),
    ).toBeInTheDocument()
    expect(validado).toBe(true)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.queryByText('Luis Herrera')).not.toBeInTheDocument()
  })

  it('ve el precio total y valida sin mandarlo si no lo corrige', async () => {
    let recibido: unknown = 'sin llamada'
    conSesion('CONTABILIDAD')
    conLiquidaciones()
    servidor.use(
      http.post(`${URL}/2/validar`, async ({ request }) => {
        recibido = await request.text()
        return HttpResponse.json({ ...LUIS_ENVIADO, estado: 'VALIDADA' })
      }),
    )
    renderApp('/pagos')
    const usuario = userEvent.setup()

    await usuario.click(await screen.findByRole('button', { name: 'Revisar pagos de Luis Herrera' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Pagos de la venta' })
    expect(dialogo).toHaveTextContent('Precio total$150,000.00')
    expect(dialogo).toHaveTextContent('Cubre el precio')
    expect(within(dialogo).getByLabelText('Precio total según el catálogo (MXN)')).toHaveValue('150000.00')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Validar pagos' }))

    expect(
      await screen.findByText('Se validaron los pagos de Luis Herrera. Pasó a Facturación.'),
    ).toBeInTheDocument()
    expect(recibido).toBe('')
  })

  it('corrige el precio total según el catálogo al validar', async () => {
    let recibido: unknown
    conSesion('CONTABILIDAD')
    conLiquidaciones()
    servidor.use(
      http.post(`${URL}/2/validar`, async ({ request }) => {
        recibido = await request.json()
        return HttpResponse.json({ ...LUIS_ENVIADO, estado: 'VALIDADA', precioTotal: 145000 })
      }),
    )
    renderApp('/pagos')
    const usuario = userEvent.setup()

    await usuario.click(await screen.findByRole('button', { name: 'Revisar pagos de Luis Herrera' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Pagos de la venta' })
    const precio = within(dialogo).getByLabelText('Precio total según el catálogo (MXN)')
    await usuario.clear(precio)
    await usuario.click(within(dialogo).getByRole('button', { name: 'Validar pagos' }))
    expect(within(dialogo).getByText('Escribe el precio total de la venta.')).toBeInTheDocument()

    await usuario.type(precio, '$145,000')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Validar pagos' }))

    expect(
      await screen.findByText('Se validaron los pagos de Luis Herrera. Pasó a Facturación.'),
    ).toBeInTheDocument()
    expect(recibido).toEqual({ precioTotal: 145000 })
  })

  it('rechaza los pagos con un motivo obligatorio', async () => {
    let recibido: unknown
    conSesion('CONTABILIDAD')
    conLiquidaciones()
    servidor.use(
      http.post(`${URL}/2/rechazar`, async ({ request }) => {
        recibido = await request.json()
        return HttpResponse.json({ ...LUIS_ENVIADO, estado: 'RECHAZADA', motivoRechazo: 'No cubre el precio' })
      }),
    )
    renderApp('/pagos')
    const usuario = userEvent.setup()

    await usuario.click(await screen.findByRole('button', { name: 'Revisar pagos de Luis Herrera' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Pagos de la venta' })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Rechazar' }))
    await usuario.click(within(dialogo).getByRole('button', { name: 'Confirmar rechazo' }))
    expect(within(dialogo).getByText('Escribe por qué se rechazan los pagos.')).toBeInTheDocument()

    await usuario.type(within(dialogo).getByLabelText('¿Por qué se rechazan?'), 'No cubre el precio')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Confirmar rechazo' }))

    expect(await screen.findByText('Se regresaron los pagos de Luis Herrera a Caja.')).toBeInTheDocument()
    expect(recibido).toEqual({ motivo: 'No cubre el precio' })
  })
})

describe('Pagos de ventas · acceso', () => {
  it('Inventario no la ve en el menú', async () => {
    conSesion('INVENTARIO')
    renderApp('/')

    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('link', { name: 'Pagos de ventas' })).not.toBeInTheDocument()
  })
})
