import { Banknote } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatearMoneda } from '@/lib/formato'
import { useConsulta } from '../api/useConsulta.ts'
import {
  listarLiquidaciones,
  NOMBRE_ESTADO,
  NOMBRE_FILTRO,
  VARIANTE_ESTADO,
  type EstadoLiquidacion,
  type Liquidacion,
} from '../pagos/api.ts'
import { ResumenCargando, ResumenConError } from './EstadosResumen.tsx'
import { Indicadores } from './Indicadores.tsx'
import { Pendiente } from './Pendiente.tsx'

/** Lo que atiende cada rol, en orden de urgencia, y el orden de sus números. */
const DEL_ROL: Record<'CAJA' | 'CONTABILIDAD', { atiende: EstadoLiquidacion[]; orden: EstadoLiquidacion[] }> = {
  CAJA: { atiende: ['RECHAZADA', 'ABIERTA'], orden: ['RECHAZADA', 'ABIERTA', 'ENVIADA', 'VALIDADA'] },
  CONTABILIDAD: { atiende: ['ENVIADA'], orden: ['ENVIADA', 'RECHAZADA', 'VALIDADA', 'ABIERTA'] },
}

/** "$1,200.00 pagado" en las ventas de ese estado; nada si no hay pagos. */
function resumenDe(lista: Liquidacion[]) {
  const total = lista.reduce((suma, l) => suma + l.total, 0)
  return total === 0 ? undefined : `${formatearMoneda(total)} pagado`
}

/**
 * Lo primero que hay que saber de la venta: por qué se rechazó, o cuánto
 * falta por cobrar.
 */
function detalleDe(liquidacion: Liquidacion): string {
  if (liquidacion.estado === 'RECHAZADA' && liquidacion.motivoRechazo) {
    return `Motivo: ${liquidacion.motivoRechazo}`
  }
  if (liquidacion.precioTotal === null) {
    return `Pagado ${formatearMoneda(liquidacion.total)}`
  }
  const faltan = liquidacion.precioTotal - liquidacion.total
  return faltan > 0
    ? `Faltan ${formatearMoneda(faltan)} de ${formatearMoneda(liquidacion.precioTotal)}`
    : `Pagos completos: ${formatearMoneda(liquidacion.total)}`
}

/** Inicio de Caja y Contabilidad: los pagos de venta que les toca mover. */
export function ResumenPagos({ rol }: { rol: 'CAJA' | 'CONTABILIDAD' }) {
  const { datos, cargando, error, recargar } = useConsulta(listarLiquidaciones)

  if (error) {
    return <ResumenConError que="los pagos" recargar={recargar} />
  }
  if (cargando || !datos) {
    return <ResumenCargando />
  }

  const { atiende, orden } = DEL_ROL[rol]
  const deEstado = (estado: EstadoLiquidacion) => datos.filter((l) => l.estado === estado)
  const pendientes = atiende.flatMap(deEstado)
  const rechazadas = deEstado('RECHAZADA').length
  const filtroPrincipal = atiende.find((estado) => deEstado(estado).length > 0) ?? atiende[0]

  const titulo =
    rol === 'CAJA'
      ? `Tienes ${pendientes.length} ${pendientes.length === 1 ? 'venta' : 'ventas'} con pagos por atender`
      : `Tienes ${pendientes.length} ${pendientes.length === 1 ? 'venta' : 'ventas'} por validar`
  const descripcion =
    rol === 'CAJA'
      ? rechazadas > 0
        ? `${rechazadas} ${rechazadas === 1 ? 'regresó' : 'regresaron'} de Contabilidad con un motivo: corrígelas primero.`
        : 'Registra los pagos que falten y envíalos a Contabilidad.'
      : 'Revisa que los pagos cubran la venta antes de validarlos.'

  return (
    <div className="flex flex-col gap-8">
      {pendientes.length > 0 ? (
        <Pendiente
          icono={Banknote}
          titulo={titulo}
          descripcion={descripcion}
          accion={{
            texto: rol === 'CAJA' ? 'Ir a pagos' : 'Validar pagos',
            ruta: `/pagos?filtro=${filtroPrincipal}`,
          }}
          filas={pendientes.map((l) => ({
            id: l.prospectoId,
            ruta: `/pagos?venta=${l.prospectoId}`,
            titulo: l.prospectoNombre,
            detalle: [detalleDe(l), l.vendedorNombre && `Vendedor: ${l.vendedorNombre}`].filter(Boolean).join(' · '),
            persona: true,
            extra: <Badge variant={VARIANTE_ESTADO[l.estado]}>{NOMBRE_ESTADO[l.estado]}</Badge>,
          }))}
        />
      ) : (
        <Pendiente
          alDia
          icono={Banknote}
          titulo="Estás al día con los pagos"
          descripcion={
            rol === 'CAJA'
              ? 'Cuando un vendedor pase una venta a Pago, aparecerá aquí.'
              : 'Cuando Caja envíe pagos para validar, aparecerán aquí.'
          }
          accion={{ texto: 'Ver todos los pagos', ruta: '/pagos' }}
        />
      )}

      <Indicadores
        titulo="Pagos de venta"
        indicadores={orden.map((estado) => ({
          etiqueta: NOMBRE_FILTRO[estado],
          valor: deEstado(estado).length,
          detalle: resumenDe(deEstado(estado)),
          propio: atiende.includes(estado),
          // Las validadas ya pasaron a Facturación: Pagos no tiene esa lista.
          ruta: estado === 'VALIDADA' ? undefined : `/pagos?filtro=${estado}`,
        }))}
      />
    </div>
  )
}
