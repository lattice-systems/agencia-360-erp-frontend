import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  BALATAS_BAJO_MINIMO,
  FILTRO_ACEITE,
  FILTRO_AIRE_SIN_EXISTENCIA,
  FRONTIER_NO_DISPONIBLE,
  KICKS_VENDIDO,
  SENTRA,
} from '../inventario/datosDePrueba.ts'
import type { Liquidacion } from '../pagos/api.ts'
import { servidor } from '../test/servidor.ts'
import { API, conSesion, renderApp } from '../test/utilidades.ts'

/** Franja de números de Inicio. */
function indicadores(titulo: string) {
  return within(screen.getByRole('region', { name: titulo }))
}

function liquidacion(prospectoId: number, prospectoNombre: string, estado: Liquidacion['estado']): Liquidacion {
  return {
    prospectoId,
    prospectoNombre,
    vendedorNombre: 'Luis Vendedor',
    estado,
    total: 100000,
    pagos: [],
    enviadaEn: null,
    motivoRechazo: null,
    precioTotal: 489900,
  }
}

function conInventario() {
  servidor.use(
    http.get(`${API}/api/v1/vehiculos`, () => HttpResponse.json([SENTRA, KICKS_VENDIDO, FRONTIER_NO_DISPONIBLE])),
    http.get(`${API}/api/v1/refacciones`, () =>
      HttpResponse.json([FILTRO_ACEITE, BALATAS_BAJO_MINIMO, FILTRO_AIRE_SIN_EXISTENCIA]),
    ),
  )
}

describe('Inicio', () => {
  it('saluda por el primer nombre y lleva a Servicio a buscar un expediente', () => {
    conSesion('SERVICIO')
    renderApp('/')

    expect(screen.getByRole('heading', { level: 1, name: /, Persona$/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Buscar expediente' })).toHaveAttribute('href', '/expediente')
  })

  it('pone primero a Inventario las refacciones por resurtir, cada una con su recepción', async () => {
    conSesion('INVENTARIO')
    conInventario()
    renderApp('/')

    expect(await screen.findByText('2 refacciones están bajo su mínimo')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Registrar recepción' })).toHaveAttribute('href', '/recepciones')
    expect(screen.getByRole('link', { name: /Filtro de aire/ })).toHaveAttribute('href', '/recepciones?refaccion=4')
    expect(screen.queryByText('Filtro de aceite')).not.toBeInTheDocument()

    const unidades = indicadores('Unidades en inventario')
    expect(unidades.getByRole('link', { name: /^Disponibles: 1/ })).toHaveAttribute(
      'href',
      '/vehiculos?estatus=DISPONIBLE',
    )
    expect(unidades.getByRole('link', { name: /^Vendidas: 1/ })).toBeInTheDocument()
  })

  it('muestra al Administrador su equipo y el inventario solo en números', async () => {
    conSesion('ADMINISTRADOR')
    conInventario()
    servidor.use(
      http.get(`${API}/api/v1/usuarios`, () =>
        HttpResponse.json([
          { id: 1, usuario: 'caja1', nombre: 'Carla Cajera', rol: 'CAJA', activo: true },
          { id: 2, usuario: 'vendedor9', nombre: 'Víctor Baja', rol: 'VENTAS', activo: false },
        ]),
      ),
    )
    renderApp('/')

    expect(await screen.findByText('Tu equipo: 1 persona con acceso')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Administrar usuarios' })).toHaveAttribute('href', '/usuarios')
    expect(screen.getByRole('link', { name: /Víctor Baja/ })).toBeInTheDocument()
    expect(indicadores('Inventario').getByRole('link', { name: /^Refacciones bajo mínimo: 2/ })).toBeInTheDocument()
    expect(screen.queryByText('Balatas delanteras')).not.toBeInTheDocument()
  })

  it('le dice a Refacciones que todo está en orden si nada está bajo su mínimo', async () => {
    conSesion('REFACCIONES')
    servidor.use(http.get(`${API}/api/v1/refacciones`, () => HttpResponse.json([FILTRO_ACEITE])))
    renderApp('/')

    expect(await screen.findByText('Ninguna refacción está bajo su mínimo')).toBeInTheDocument()
    expect(indicadores('Existencias').getByRole('link', { name: /^Registradas: 1/ })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Unidades en inventario' })).not.toBeInTheDocument()
  })

  it('muestra a Contabilidad solo los pagos que esperan su validación', async () => {
    conSesion('CONTABILIDAD')
    servidor.use(
      http.get(`${API}/api/v1/liquidaciones`, () =>
        HttpResponse.json([liquidacion(1, 'Carla Cliente', 'ENVIADA'), liquidacion(2, 'Mario Abierto', 'ABIERTA')]),
      ),
    )
    renderApp('/')

    expect(await screen.findByText('Tienes 1 venta por validar')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Carla Cliente/ })).toHaveAttribute('href', '/pagos?venta=1')
    expect(screen.queryByText('Mario Abierto')).not.toBeInTheDocument()
  })

  it('pone primero a Caja las ventas que Contabilidad le regresó', async () => {
    conSesion('CAJA')
    servidor.use(
      http.get(`${API}/api/v1/liquidaciones`, () =>
        HttpResponse.json([liquidacion(2, 'Mario Abierto', 'ABIERTA'), { ...liquidacion(3, 'Rita Rechazada', 'RECHAZADA'), motivoRechazo: 'Falta el comprobante' }]),
      ),
    )
    renderApp('/')

    expect(await screen.findByText(/1 regresó de Contabilidad/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a pagos' })).toHaveAttribute('href', '/pagos?filtro=RECHAZADA')
    const filas = screen.getAllByRole('link', { name: /Rita Rechazada|Mario Abierto/ })
    expect(filas[0]).toHaveTextContent('Rita Rechazada')
    expect(filas[0]).toHaveTextContent('Motivo: Falta el comprobante')
    expect(filas[1]).toHaveTextContent('Faltan $389,900.00 de $489,900.00')
  })

  it('avisa sin detalles técnicos si no se pudo cargar el resumen', async () => {
    conSesion('FACTURACION')
    servidor.use(
      http.get(`${API}/api/v1/ventas`, () => HttpResponse.json({ message: 'Falla del servidor' }, { status: 500 })),
    )
    renderApp('/')

    expect(await screen.findByText('No pudimos cargar las ventas por facturar')).toBeInTheDocument()
    expect(screen.queryByText('Falla del servidor')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
