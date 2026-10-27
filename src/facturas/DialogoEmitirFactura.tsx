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
import { listarVehiculos } from '../inventario/api.ts'
import { useSesion } from '../sesion/useSesion.ts'
import { emitirFactura, type Factura, type ProspectoPorEmitir } from './api.ts'
import { nombreDeUnidad } from './formato.ts'

interface Props {
  prospecto: ProspectoPorEmitir
  onCerrar: () => void
  onEmitida: (factura: Factura) => void
}

/**
 * Emite la factura de un prospecto (ERP-1.3): Facturación elige la unidad
 * Disponible que se vende y, al emitir, la unidad pasa a Vendido. Solo se
 * ofrecen las unidades Disponibles; el backend las regresa así para este rol.
 */
export function DialogoEmitirFactura({ prospecto, onCerrar, onEmitida }: Props) {
  const { sesion } = useSesion()
  const mensajeDeError = useMensajeDeError()
  const { datos: unidades, cargando, error, recargar } = useConsulta(listarVehiculos)
  const [vehiculoId, setVehiculoId] = useState('')
  const [falta, setFalta] = useState(false)
  const [errorApi, setErrorApi] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const receptor = prospecto.receptor

  async function emitir() {
    if (!vehiculoId) {
      setFalta(true)
      return
    }
    setGuardando(true)
    setErrorApi(null)
    try {
      onEmitida(await emitirFactura(sesion?.token ?? '', prospecto.prospectoId, Number(vehiculoId)))
    } catch (e) {
      setErrorApi(mensajeDeError(e))
      // Si otra factura se llevó la unidad, la lista ya no la debe ofrecer.
      setVehiculoId('')
      recargar()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Emitir la factura de {prospecto.nombre}</DialogTitle>
          <DialogDescription>
            Elige la unidad que se vende. Al emitir, la unidad pasa a Vendido y el prospecto pasa a
            Entrega.
          </DialogDescription>
        </DialogHeader>

        {errorApi && (
          <Alert variant="destructive">
            <AlertTitle>No se pudo emitir la factura</AlertTitle>
            <AlertDescription>{errorApi}</AlertDescription>
          </Alert>
        )}

        <dl className="grid gap-x-4 gap-y-2 rounded-lg bg-muted p-4 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-muted-foreground">Receptor</dt>
          <dd className="min-w-0 font-medium break-words">{receptor?.nombreCompleto}</dd>
          <dt className="text-muted-foreground">RFC</dt>
          <dd className="font-mono">{receptor?.rfc}</dd>
          <dt className="text-muted-foreground">Domicilio fiscal</dt>
          <dd className="min-w-0 break-words">{receptor?.domicilioFiscal}</dd>
          <dt className="text-muted-foreground">Régimen fiscal</dt>
          <dd className="min-w-0 break-words">
            {receptor?.regimenFiscal}
            {receptor?.regimenFiscalDescripcion && ` - ${receptor.regimenFiscalDescripcion}`}
          </dd>
          <dt className="text-muted-foreground">Total (IVA incluido)</dt>
          <dd className="font-semibold tabular-nums">
            {prospecto.total != null ? formatearMoneda(prospecto.total) : '—'}
          </dd>
        </dl>

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
                    {nombreDeUnidad(unidad)} · {unidad.color} · {unidad.vin}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError
              id="unidad-error"
              errors={falta ? [{ message: 'Elige la unidad que se vende.' }] : []}
            />
          </Field>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="button" onClick={emitir} disabled={guardando || unidades?.length === 0}>
            {guardando ? 'Emitiendo…' : 'Emitir factura'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
