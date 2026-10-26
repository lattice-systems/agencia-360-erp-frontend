import { ReceiptText } from 'lucide-react'
import { formatearFechaHora } from '@/lib/formato'
import { useConsulta } from '../api/useConsulta.ts'
import { listarProspectosPorFacturar, listarVentas, type EstatusVenta } from '../ventas/api.ts'
import { ResumenCargando, ResumenConError } from './EstadosResumen.tsx'
import { Indicadores } from './Indicadores.tsx'
import { Pendiente } from './Pendiente.tsx'

async function cargar(token: string) {
  const [prospectos, ventas] = await Promise.all([listarProspectosPorFacturar(token), listarVentas(token)])
  return { prospectos, ventas }
}

/** Inicio de Facturación: las ventas que esperan su unidad y su factura. */
export function ResumenFacturacion() {
  const { datos, cargando, error, recargar } = useConsulta(cargar)

  if (error) {
    return <ResumenConError que="las ventas por facturar" recargar={recargar} />
  }
  if (cargando || !datos) {
    return <ResumenCargando />
  }

  const { prospectos, ventas } = datos
  const deEstatus = (estatus: EstatusVenta) => ventas.filter((v) => v.estatus === estatus).length

  return (
    <div className="flex flex-col gap-8">
      {prospectos.length > 0 ? (
        <Pendiente
          icono={ReceiptText}
          titulo={`Tienes ${prospectos.length} ${prospectos.length === 1 ? 'venta' : 'ventas'} por facturar`}
          descripcion="Contabilidad ya validó sus pagos. Elige la unidad de cada una y pásala a entrega."
          accion={{ texto: 'Ir a facturación', ruta: '/facturacion' }}
          filas={prospectos.map((p) => ({
            id: p.id,
            ruta: '/facturacion',
            titulo: p.nombre,
            detalle: [`Validada el ${formatearFechaHora(p.enFacturacionDesde)}`, p.vendedor && `Vendedor: ${p.vendedor}`]
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
          accion={{ texto: 'Ir a facturación', ruta: '/facturacion' }}
        />
      )}

      <Indicadores
        titulo="Ventas"
        indicadores={[
          { etiqueta: 'Por facturar', valor: prospectos.length, ruta: '/facturacion' },
          { etiqueta: 'Por entregar', valor: deEstatus('POR_ENTREGAR') },
          { etiqueta: 'Registradas', valor: deEstatus('REGISTRADA') },
        ]}
      />
    </div>
  )
}
