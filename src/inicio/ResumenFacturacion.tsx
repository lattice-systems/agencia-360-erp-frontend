import { ReceiptText } from 'lucide-react'
import { formatearFechaHora } from '@/lib/formato'
import { useConsulta } from '../api/useConsulta.ts'
import { listarFacturas, listarPorEmitir } from '../facturas/api.ts'
import { ResumenCargando, ResumenConError } from './EstadosResumen.tsx'
import { Indicadores } from './Indicadores.tsx'
import { Pendiente } from './Pendiente.tsx'

async function cargar(token: string) {
  const [porEmitir, facturas] = await Promise.all([listarPorEmitir(token), listarFacturas(token)])
  return { porEmitir, facturas }
}

/** Inicio de Facturación (ERP-1.3): las ventas que esperan su factura. */
export function ResumenFacturacion() {
  const { datos, cargando, error, recargar } = useConsulta(cargar)

  if (error) {
    return <ResumenConError que="las ventas por facturar" recargar={recargar} />
  }
  if (cargando || !datos) {
    return <ResumenCargando />
  }

  const { porEmitir, facturas } = datos
  const listos = porEmitir.filter((p) => !p.bloqueo).length

  return (
    <div className="flex flex-col gap-8">
      {porEmitir.length > 0 ? (
        <Pendiente
          icono={ReceiptText}
          titulo={`Tienes ${porEmitir.length} ${porEmitir.length === 1 ? 'venta' : 'ventas'} por facturar`}
          descripcion="Contabilidad ya validó sus pagos. Emite su factura y elige la unidad que se vende."
          accion={{ texto: 'Ir a facturas', ruta: '/facturas' }}
          filas={porEmitir.map((p) => ({
            id: p.prospectoId,
            ruta: '/facturas',
            titulo: p.nombre,
            detalle: [
              p.bloqueo ?? 'Listo para facturar',
              `Validada el ${formatearFechaHora(p.enFacturacionDesde)}`,
              p.vendedor && `Vendedor: ${p.vendedor}`,
            ]
              .filter(Boolean)
              .join(' · '),
            persona: true,
          }))}
        />
      ) : (
        <Pendiente
          alDia
          icono={ReceiptText}
          titulo="No hay ventas por facturar"
          descripcion="Cuando Contabilidad valide los pagos de una venta, aparecerá aquí."
          accion={{ texto: 'Ir a facturas', ruta: '/facturas' }}
        />
      )}

      <Indicadores
        titulo="Facturas"
        indicadores={[
          { etiqueta: 'Por facturar', valor: porEmitir.length, ruta: '/facturas' },
          { etiqueta: 'Listas para emitir', valor: listos, ruta: '/facturas' },
          { etiqueta: 'Emitidas', valor: facturas.length, ruta: '/facturas' },
        ]}
      />
    </div>
  )
}
