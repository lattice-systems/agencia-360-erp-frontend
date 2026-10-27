import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SENTRA } from '../inventario/datosDePrueba.ts'
import { servidor } from '../test/servidor.ts'
import { API, conSesion, renderApp } from '../test/utilidades.ts'
import type { Factura, ProspectoPorEmitir } from './api.ts'

const RECEPTOR_LUIS = {
  rfc: 'HELL800101AB1',
  nombreCompleto: 'Luis Herrera López',
  domicilioFiscal: 'Calle Hidalgo 10, Col. Centro, C.P. 37000, León, Guanajuato',
  regimenFiscal: '612',
  domicilio: {
    estado: 'Guanajuato',
    ciudad: 'León',
    colonia: 'Centro',
    calleNumero: 'Calle Hidalgo 10',
    codigoPostal: '37000',
  },
  regimenFiscalDescripcion: 'Personas Físicas con Actividades Empresariales y Profesionales',
}

const LUIS: ProspectoPorEmitir = {
  prospectoId: 4,
  nombre: 'Luis Herrera',
  vendedorId: 9,
  vendedor: 'Sergio Luna',
  total: 489900,
  saldo: 0,
  enFacturacionDesde: '2026-10-24T16:00:00Z',
  receptor: RECEPTOR_LUIS,
  bloqueo: null,
}

const CARLOS: ProspectoPorEmitir = {
  prospectoId: 9,
  nombre: 'Carlos Núñez',
  vendedorId: 10,
  vendedor: 'Elena Ríos',
  total: 329900,
  saldo: null,
  enFacturacionDesde: '2026-10-24T15:00:00Z',
  receptor: null,
  bloqueo:
    'Faltan los datos fiscales del cliente (RFC, nombre completo, domicilio fiscal y régimen fiscal); ' +
    'los captura el vendedor al pasar a Pagos',
}

const FACTURA_DE_LUIS: Factura = {
  id: 1,
  folio: 'F-000001',
  prospectoId: 4,
  cliente: 'Luis Herrera López',
  rfc: 'HELL800101AB1',
  vehiculoId: SENTRA.id,
  vin: SENTRA.vin,
  marca: 'Nissan',
  modelo: 'Sentra',
  version: 'Advance',
  anio: 2026,
  color: 'Blanco',
  subtotal: 422327.59,
  iva: 67572.41,
  total: 489900,
  emitidaEn: '2026-10-24T22:30:00Z',
}

function conDatos({
  porEmitir = [LUIS, CARLOS],
  facturas = [],
}: { porEmitir?: ProspectoPorEmitir[]; facturas?: Factura[] } = {}) {
  servidor.use(
    http.get(`${API}/api/v1/facturas/por-emitir`, () => HttpResponse.json(porEmitir)),
    http.get(`${API}/api/v1/facturas`, () => HttpResponse.json(facturas)),
    http.get(`${API}/api/v1/vehiculos`, () => HttpResponse.json([SENTRA])),
  )
}

async function abrirAcciones(nombre: string) {
  const usuario = userEvent.setup({ delay: null })
  await usuario.click(await screen.findByRole('button', { name: `Acciones de ${nombre}` }))
  return usuario
}

async function elegirSentra(usuario: ReturnType<typeof userEvent.setup>, dialogo: HTMLElement) {
  await usuario.click(await within(dialogo).findByRole('combobox', { name: 'Unidad' }))
  await usuario.click(await screen.findByRole('option', { name: /3N1AB8CV5PY123456/ }))
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Facturas: emitir la factura de cada venta (ERP-1.3)', () => {
  it('muestra los prospectos por facturar con su total, saldo y por qué no se puede emitir', async () => {
    conSesion('FACTURACION')
    conDatos()
    renderApp('/facturas')

    const luis = (await screen.findByText('Luis Herrera')).closest('tr')!
    expect(within(luis).getByText('Vendedor: Sergio Luna')).toBeInTheDocument()
    expect(within(luis).getByText('HELL800101AB1')).toBeInTheDocument()
    expect(within(luis).getByText('$489,900.00')).toBeInTheDocument()
    expect(within(luis).getByText('Listo para facturar')).toBeInTheDocument()

    const carlos = screen.getByText('Carlos Núñez').closest('tr')!
    expect(within(carlos).getByText('Falta un requisito')).toBeInTheDocument()
    expect(within(carlos).getByText(/Faltan los datos fiscales del cliente/)).toBeInTheDocument()
    expect(screen.getByText('Aún no hay facturas emitidas')).toBeInTheDocument()
  })

  it('no deja emitir a quien le falta un requisito', async () => {
    conSesion('FACTURACION')
    conDatos()
    renderApp('/facturas')

    await abrirAcciones('Carlos Núñez')

    expect(await screen.findByRole('menuitem', { name: 'Emitir factura' })).toHaveAttribute('aria-disabled', 'true')
  })

  it('emite la factura con la unidad elegida y la pasa a Emitidas', async () => {
    conSesion('FACTURACION')
    conDatos()
    let recibido: unknown = null
    servidor.use(
      http.post(`${API}/api/v1/facturas`, async ({ request }) => {
        recibido = await request.json()
        return HttpResponse.json(FACTURA_DE_LUIS, { status: 201 })
      }),
    )
    renderApp('/facturas')
    const usuario = await abrirAcciones('Luis Herrera')

    await usuario.click(await screen.findByRole('menuitem', { name: 'Emitir factura' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Emitir la factura de Luis Herrera' })
    expect(within(dialogo).getByText('Luis Herrera López')).toBeInTheDocument()
    expect(within(dialogo).getByText('HELL800101AB1')).toBeInTheDocument()
    expect(within(dialogo).getByText('$489,900.00')).toBeInTheDocument()
    expect(
      within(dialogo).getByText('612 - Personas Físicas con Actividades Empresariales y Profesionales'),
    ).toBeInTheDocument()
    await elegirSentra(usuario, dialogo)
    await usuario.click(within(dialogo).getByRole('button', { name: 'Emitir factura' }))

    expect(await screen.findByText('Se emitió la factura F-000001 de Luis Herrera.')).toBeInTheDocument()
    expect(recibido).toEqual({ prospectoId: 4, vehiculoId: SENTRA.id })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Acciones de Luis Herrera' })).not.toBeInTheDocument()
    const emitida = screen.getByText('F-000001').closest('tr')!
    expect(within(emitida).getByText('Sentra Advance 2026')).toBeInTheDocument()
    expect(within(emitida).getByText('Luis Herrera López')).toBeInTheDocument()
  })

  it('corrige los datos fiscales con lo ya capturado y vuelve a cargar la lista', async () => {
    conSesion('FACTURACION')
    conDatos()
    let recibido: unknown = null
    servidor.use(
      http.put(`${API}/api/v1/prospectos/4/datos-fiscales`, async ({ request }) => {
        recibido = await request.json()
        return HttpResponse.json({ id: 4 })
      }),
    )
    renderApp('/facturas')
    const usuario = await abrirAcciones('Luis Herrera')

    await usuario.click(await screen.findByRole('menuitem', { name: 'Corregir datos fiscales' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Datos fiscales de Luis Herrera' })
    const rfc = within(dialogo).getByLabelText('RFC')
    expect(rfc).toHaveValue('HELL800101AB1')
    expect(within(dialogo).getByLabelText('Colonia')).toHaveValue('Centro')
    await usuario.clear(rfc)
    await usuario.type(rfc, 'hell800101ab2')
    servidor.use(
      http.get(`${API}/api/v1/facturas/por-emitir`, () =>
        HttpResponse.json([{ ...LUIS, receptor: { ...RECEPTOR_LUIS, rfc: 'HELL800101AB2' } }]),
      ),
    )
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar datos fiscales' }))

    expect(await screen.findByText('Se guardaron los datos fiscales de Luis Herrera.')).toBeInTheDocument()
    expect(recibido).toEqual({
      rfc: 'HELL800101AB2',
      nombre: 'Luis Herrera López',
      domicilio: RECEPTOR_LUIS.domicilio,
      regimenFiscal: '612',
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByText('HELL800101AB2')).toBeInTheDocument()
  })

  it('valida el RFC antes de guardar y muestra el error del backend', async () => {
    conSesion('FACTURACION')
    conDatos()
    servidor.use(
      http.put(`${API}/api/v1/prospectos/9/datos-fiscales`, () =>
        HttpResponse.json({ message: 'El prospecto ya no está en Facturación' }, { status: 409 }),
      ),
    )
    renderApp('/facturas')
    const usuario = await abrirAcciones('Carlos Núñez')

    await usuario.click(await screen.findByRole('menuitem', { name: 'Capturar datos fiscales' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Datos fiscales de Carlos Núñez' })
    expect(within(dialogo).getByLabelText('Nombre completo o razón social')).toHaveValue('Carlos Núñez')
    await usuario.type(within(dialogo).getByLabelText('RFC'), 'NO-ES-RFC')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar datos fiscales' }))
    expect(
      within(dialogo).getByText('El RFC no tiene un formato válido, por ejemplo LOHA850101AB1.'),
    ).toBeInTheDocument()

    await usuario.clear(within(dialogo).getByLabelText('RFC'))
    await usuario.type(within(dialogo).getByLabelText('RFC'), 'NUCC800101AB1')
    await usuario.click(within(dialogo).getByRole('combobox', { name: 'Estado' }))
    await usuario.click(await screen.findByRole('option', { name: 'Guanajuato' }))
    await usuario.type(within(dialogo).getByLabelText('Ciudad'), 'León')
    await usuario.type(within(dialogo).getByLabelText('Colonia'), 'Centro')
    await usuario.type(within(dialogo).getByLabelText('Calle y número'), 'Juárez 5')
    await usuario.type(within(dialogo).getByLabelText('Código postal'), '37000')
    await usuario.click(within(dialogo).getByRole('combobox', { name: 'Régimen fiscal' }))
    await usuario.click(await screen.findByRole('option', { name: /^616/ }))
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar datos fiscales' }))

    expect(await within(dialogo).findByText('El prospecto ya no está en Facturación')).toBeInTheDocument()
  })

  it('pide la unidad antes de emitir', async () => {
    conSesion('FACTURACION')
    conDatos()
    renderApp('/facturas')
    const usuario = await abrirAcciones('Luis Herrera')

    await usuario.click(await screen.findByRole('menuitem', { name: 'Emitir factura' }))
    const dialogo = await screen.findByRole('dialog')
    await within(dialogo).findByRole('combobox', { name: 'Unidad' })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Emitir factura' }))

    expect(within(dialogo).getByText('Elige la unidad que se vende.')).toBeInTheDocument()
  })

  it('si otra factura se llevó la unidad, muestra el error y vuelve a cargar las unidades', async () => {
    conSesion('FACTURACION')
    conDatos()
    let consultas = 0
    servidor.use(
      http.get(`${API}/api/v1/vehiculos`, () => {
        consultas += 1
        return HttpResponse.json(consultas === 1 ? [SENTRA] : [])
      }),
      http.post(`${API}/api/v1/facturas`, () =>
        HttpResponse.json({ message: 'La unidad 3N1AB8CV5PY123456 ya no está disponible' }, { status: 409 }),
      ),
    )
    renderApp('/facturas')
    const usuario = await abrirAcciones('Luis Herrera')

    await usuario.click(await screen.findByRole('menuitem', { name: 'Emitir factura' }))
    const dialogo = await screen.findByRole('dialog')
    await elegirSentra(usuario, dialogo)
    await usuario.click(within(dialogo).getByRole('button', { name: 'Emitir factura' }))

    expect(await within(dialogo).findByText('La unidad 3N1AB8CV5PY123456 ya no está disponible')).toBeInTheDocument()
    expect(
      await within(dialogo).findByText('No hay unidades disponibles. Pídele a Inventario que registre la unidad.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('descarga el PDF de una factura emitida', async () => {
    conSesion('FACTURACION')
    conDatos({ porEmitir: [], facturas: [FACTURA_DE_LUIS] })
    let autorizacion: string | null = null
    servidor.use(
      http.get(`${API}/api/v1/facturas/1/pdf`, ({ request }) => {
        autorizacion = request.headers.get('Authorization')
        return new HttpResponse('%PDF-1.4', { headers: { 'Content-Type': 'application/pdf' } })
      }),
    )
    const crearUrl = vi.fn(() => 'blob:factura')
    Object.assign(URL, { createObjectURL: crearUrl, revokeObjectURL: vi.fn() })
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    renderApp('/facturas')

    const usuario = await abrirAcciones('la factura F-000001')
    await usuario.click(await screen.findByRole('menuitem', { name: 'Descargar PDF' }))

    await vi.waitFor(() => expect(clic).toHaveBeenCalled())
    expect(autorizacion).toMatch(/^Bearer /)
    expect(crearUrl).toHaveBeenCalledWith(expect.objectContaining({ type: 'application/pdf' }))
    expect((clic.mock.contexts[0] as HTMLAnchorElement).download).toBe('factura-F-000001.pdf')
    expect(screen.getByText('No hay prospectos por facturar')).toBeInTheDocument()
  })

  it('avisa si no se pudo descargar el PDF', async () => {
    conSesion('FACTURACION')
    conDatos({ porEmitir: [], facturas: [FACTURA_DE_LUIS] })
    servidor.use(
      http.get(`${API}/api/v1/facturas/1/pdf`, () =>
        HttpResponse.json({ message: 'No existe la factura 1' }, { status: 404 }),
      ),
    )
    renderApp('/facturas')

    const usuario = await abrirAcciones('la factura F-000001')
    await usuario.click(await screen.findByRole('menuitem', { name: 'Descargar PDF' }))

    expect(
      await screen.findByText('No se pudo descargar la factura F-000001. No existe la factura 1'),
    ).toBeInTheDocument()
  })

  it('muestra el error al cargar y permite reintentar', async () => {
    conSesion('FACTURACION')
    conDatos()
    let intentos = 0
    servidor.use(
      http.get(`${API}/api/v1/facturas/por-emitir`, () => {
        intentos += 1
        return intentos === 1
          ? HttpResponse.json({ message: 'Servicio no disponible' }, { status: 503 })
          : HttpResponse.json([LUIS])
      }),
    )
    renderApp('/facturas')

    expect(await screen.findByText('Servicio no disponible')).toBeInTheDocument()
    await userEvent.setup({ delay: null }).click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Luis Herrera')).toBeInTheDocument()
  })

  it('solo Facturación entra a la pantalla y la ve en el menú', () => {
    conSesion('INVENTARIO')
    renderApp('/facturas')

    expect(screen.getByRole('heading', { name: 'Sin permiso' })).toBeInTheDocument()
    const menu = screen.getByRole('navigation', { name: 'Principal' })
    expect(within(menu).queryByRole('link', { name: 'Facturas' })).not.toBeInTheDocument()
  })

  it('las migas de pan muestran Facturas', async () => {
    conSesion('FACTURACION')
    conDatos({ porEmitir: [], facturas: [] })
    renderApp('/facturas')

    const migas = screen.getByRole('navigation', { name: 'Migas de pan' })
    expect(within(migas).getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/')
    expect(within(migas).getByText('Facturas')).toHaveAttribute('aria-current', 'page')
    await screen.findByText('No hay prospectos por facturar')
  })
})

describe('Facturas en celular (ERP-1.3)', () => {
  const matchMediaDeEscritorio = window.matchMedia

  afterEach(() => {
    window.matchMedia = matchMediaDeEscritorio
  })

  it('cada prospecto y cada factura se ve como tarjeta', async () => {
    window.matchMedia = ((consulta: string) => ({
      ...matchMediaDeEscritorio(consulta),
      matches: true,
    })) as typeof window.matchMedia
    conSesion('FACTURACION')
    conDatos({ facturas: [FACTURA_DE_LUIS] })
    renderApp('/facturas')

    expect(await screen.findByText('Luis Herrera')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByText('F-000001')).toBeInTheDocument()
    expect(screen.getByText('Total: $489,900.00')).toBeInTheDocument()
  })
})
