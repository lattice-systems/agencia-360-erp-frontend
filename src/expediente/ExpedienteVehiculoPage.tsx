import { ClipboardList, Pencil } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useParams } from 'react-router'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useIsMobile } from '@/hooks/use-mobile'
import { formatearFecha, formatearMoneda, formatearNumero } from '@/lib/formato'
import { useConsulta } from '../api/useConsulta.ts'
import { EncabezadoPagina } from '../componentes/EncabezadoPagina.tsx'
import { EstadoVacio } from '../componentes/EstadoVacio.tsx'
import { TablaCargando } from '../componentes/TablaCargando.tsx'
import { useSesion } from '../sesion/useSesion.ts'
import {
  nombreDelVehiculo,
  obtenerExpediente,
  type ClienteDelExpediente,
  type Expediente,
  type ServicioResumen,
  type VehiculoDelExpediente,
} from './api.ts'
import { DialogoCorregirVehiculo } from './DialogoCorregirVehiculo.tsx'
import { DialogoDetalleServicio } from './DialogoDetalleServicio.tsx'

/**
 * Expediente del vehículo (ERP-3.0): arriba el vehículo y su dueño, abajo sus
 * servicios por fecha; "Ver detalles" muestra cada servicio como un ticket.
 * Servicio corrige placas y kilometraje; el Administrador solo consulta.
 */
export function ExpedienteVehiculoPage() {
  const vehiculoId = Number(useParams().id)
  const { sesion } = useSesion()
  const consulta = useCallback((token: string) => obtenerExpediente(token, vehiculoId), [vehiculoId])
  const { datos, error, cargando, recargar, actualizar } = useConsulta(consulta)
  const [corrigiendo, setCorrigiendo] = useState(false)
  const [viendo, setViendo] = useState<ServicioResumen | null>(null)
  const puedeCorregir = sesion?.rol === 'SERVICIO'

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>No se pudo abrir el expediente</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
          {error}
          <Button variant="outline" onClick={recargar}>
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    )
  }
  if (cargando || !datos) {
    return <TablaCargando />
  }

  const { vehiculo, cliente, servicios } = datos

  return (
    <section className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo={nombreDelVehiculo(vehiculo)}
        descripcion={`Número de serie ${vehiculo.vin}`}
        accion={
          puedeCorregir && (
            <Button variant="outline" onClick={() => setCorrigiendo(true)}>
              <Pencil aria-hidden="true" />
              Corregir placas y kilometraje
            </Button>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <DatosDelVehiculo vehiculo={vehiculo} />
        <DatosDelCliente cliente={cliente} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-primary">Servicios</h2>
        {servicios.length === 0 ? (
          <Card>
            <EstadoVacio
              icono={ClipboardList}
              titulo="Aún no hay servicios"
              descripcion="Los servicios de este vehículo aparecerán aquí, del más reciente al más antiguo."
            />
          </Card>
        ) : (
          <ListaDeServicios servicios={servicios} onVer={setViendo} />
        )}
      </div>

      {corrigiendo && (
        <DialogoCorregirVehiculo
          vehiculo={vehiculo}
          onCerrar={() => setCorrigiendo(false)}
          onCorregido={(corregido) => {
            toast.success('Placas y kilometraje actualizados.')
            actualizar((actual) => ({ ...(actual as Expediente), vehiculo: corregido }))
            setCorrigiendo(false)
          }}
        />
      )}

      {viendo && (
        <DialogoDetalleServicio vehiculoId={vehiculo.id} servicio={viendo} onCerrar={() => setViendo(null)} />
      )}
    </section>
  )
}

function Dato({ etiqueta, valor, mono }: { etiqueta: string; valor: string | null; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className={mono ? 'font-mono text-sm break-all' : 'text-sm font-medium'}>{valor ?? '—'}</dd>
    </div>
  )
}

function DatosDelVehiculo({ vehiculo }: { vehiculo: VehiculoDelExpediente }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-primary">Vehículo</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Dato etiqueta="Número de serie" valor={vehiculo.vin} mono />
          <Dato etiqueta="Marca" valor={vehiculo.marca} />
          <Dato etiqueta="Tipo" valor={vehiculo.modelo} />
          <Dato etiqueta="Modelo" valor={String(vehiculo.anio)} />
          <Dato etiqueta="Versión" valor={vehiculo.version} />
          <Dato etiqueta="Placas" valor={vehiculo.placas} />
          <Dato
            etiqueta="Kilometraje"
            valor={vehiculo.kilometraje == null ? null : `${formatearNumero(vehiculo.kilometraje)} km`}
          />
        </dl>
      </CardContent>
    </Card>
  )
}

function DatosDelCliente({ cliente }: { cliente: ClienteDelExpediente }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-primary">Cliente</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4">
          <Dato etiqueta="Nombre" valor={cliente.nombre} />
          <Dato etiqueta="Correo" valor={cliente.correo} />
          <Dato etiqueta="Teléfono" valor={cliente.telefono} />
        </dl>
      </CardContent>
    </Card>
  )
}

interface PropsServicios {
  servicios: ServicioResumen[]
  onVer: (servicio: ServicioResumen) => void
}

function ListaDeServicios({ servicios, onVer }: PropsServicios) {
  const movil = useIsMobile()
  if (!movil) {
    return (
      <Card className="py-0 md:py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Kilometraje</TableHead>
              <TableHead>Atendió</TableHead>
              <TableHead className="text-right">Total (MXN)</TableHead>
              <TableHead>
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {servicios.map((servicio) => (
              <TableRow key={servicio.id}>
                <TableCell>{formatearFecha(servicio.fecha)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatearNumero(servicio.kilometraje)} km</TableCell>
                <TableCell>{servicio.atendidoPor}</TableCell>
                <TableCell className="text-right tabular-nums">{formatearMoneda(servicio.total)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onVer(servicio)}
                    aria-label={`Ver detalles del servicio del ${formatearFecha(servicio.fecha)}`}
                  >
                    Ver detalles
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {servicios.map((servicio) => (
        <li key={servicio.id}>
          <Card className="gap-2 px-4 py-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{formatearFecha(servicio.fecha)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatearNumero(servicio.kilometraje)} km · {servicio.atendidoPor}
                </p>
              </div>
              <span className="font-semibold tabular-nums">{formatearMoneda(servicio.total)}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => onVer(servicio)}
              aria-label={`Ver detalles del servicio del ${formatearFecha(servicio.fecha)}`}
            >
              Ver detalles
            </Button>
          </Card>
        </li>
      ))}
    </ul>
  )
}
