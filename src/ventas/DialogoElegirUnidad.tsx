import { useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatearMoneda } from '@/lib/formato'
import { useConsulta, useMensajeDeError } from '../api/useConsulta.ts'
import { listarVehiculos, type Vehiculo } from '../inventario/api.ts'
import { useSesion } from '../sesion/useSesion.ts'
import { elegirUnidad, type ProspectoPorFacturar, type Venta } from './api.ts'

interface Props {
  prospecto: ProspectoPorFacturar
  /** Venta actual del prospecto, si ya tiene unidad. */
  venta: Venta | undefined
  onCerrar: () => void
  onElegida: (venta: Venta) => void
}

/** Nombre de la unidad como en la factura: Tipo, versión y Modelo. */
function nombreDeUnidad(unidad: Pick<Vehiculo, 'modelo' | 'version' | 'anio'>) {
  return `${unidad.modelo} ${unidad.version} ${unidad.anio}`
}

/**
 * Facturación elige la unidad que se vendió (ERP-1.0). Solo se ofrecen las
 * unidades Disponibles; el backend las regresa así para este rol.
 */
export function DialogoElegirUnidad({ prospecto, venta, onCerrar, onElegida }: Props) {
  const { sesion } = useSesion()
  const mensajeDeError = useMensajeDeError()
  const { datos: unidades, cargando, error } = useConsulta(listarVehiculos)
  const [vehiculoId, setVehiculoId] = useState('')
  const [falta, setFalta] = useState(false)
  const [errorApi, setErrorApi] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const cambio = venta?.vin != null

  async function guardar() {
    if (!vehiculoId) {
      setFalta(true)
      return
    }
    setGuardando(true)
    setErrorApi(null)
    try {
      onElegida(await elegirUnidad(sesion?.token ?? '', prospecto.id, Number(vehiculoId)))
    } catch (e) {
      setErrorApi(mensajeDeError(e))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {cambio ? `Cambiar la unidad de ${prospecto.nombre}` : `Elegir unidad para ${prospecto.nombre}`}
          </DialogTitle>
          <DialogDescription>
            La unidad que elijas pasa a Vendido.
            {cambio && ` La unidad ${venta.vin} regresará a Disponible.`}
          </DialogDescription>
        </DialogHeader>

        {errorApi && (
          <Alert variant="destructive">
            <AlertTitle>No se pudo elegir la unidad</AlertTitle>
            <AlertDescription>{errorApi}</AlertDescription>
          </Alert>
        )}

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>No se pudieron cargar las unidades</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : cargando || !unidades ? (
          <Skeleton className="h-16 w-full" />
        ) : unidades.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay unidades disponibles. Pídele a Inventario que registre la unidad.
          </p>
        ) : (
          <Field data-invalid={falta} className="min-w-0">
            <FieldLabel htmlFor="unidad">Unidad</FieldLabel>
            <Select
              value={vehiculoId}
              onValueChange={(valor) => {
                setVehiculoId(valor)
                setFalta(false)
              }}
            >
              <SelectTrigger
                id="unidad"
                className="w-full min-w-0 *:data-[slot=select-value]:truncate"
                aria-invalid={falta}
                aria-describedby={falta ? 'unidad-error' : undefined}
              >
                <SelectValue placeholder="Elige una unidad disponible" />
              </SelectTrigger>
              <SelectContent>
                {unidades.map((unidad) => (
                  <SelectItem key={unidad.id} value={String(unidad.id)}>
                    {nombreDeUnidad(unidad)} · {unidad.vin} · {formatearMoneda(unidad.precio)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError id="unidad-error" errors={falta ? [{ message: 'Elige la unidad que se vendió.' }] : []} />
          </Field>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="button" onClick={guardar} disabled={guardando || unidades?.length === 0}>
            {guardando ? 'Guardando…' : 'Elegir unidad'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
