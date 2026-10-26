import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useMensajeDeError } from '../api/useConsulta.ts'
import { useSesion } from '../sesion/useSesion.ts'
import { corregirVehiculo, type VehiculoDelExpediente } from './api.ts'

// Mismas reglas que el backend (VehiculoCliente.corregir): placas de hasta 15
// caracteres y kilometraje entero de 0 a 2,000,000. Vacíos quedan sin capturar.
const esquema = z.object({
  placas: z.string().trim().toUpperCase().max(15, 'Usa hasta 15 caracteres.'),
  kilometraje: z
    .string()
    .trim()
    .regex(/^\d*$/, 'Escribe el kilometraje sin puntos ni comas.')
    .refine((valor) => valor === '' || Number(valor) <= 2_000_000, 'El kilometraje no es válido.'),
})

type Formulario = z.input<typeof esquema>

interface Props {
  vehiculo: VehiculoDelExpediente
  onCerrar: () => void
  onCorregido: (vehiculo: VehiculoDelExpediente) => void
}

/** Servicio corrige las placas y el kilometraje del vehículo (ERP-3.0). */
export function DialogoCorregirVehiculo({ vehiculo, onCerrar, onCorregido }: Props) {
  const { sesion } = useSesion()
  const mensajeDeError = useMensajeDeError()
  const [errorApi, setErrorApi] = useState<string | null>(null)
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<Formulario, unknown, z.output<typeof esquema>>({
    resolver: zodResolver(esquema),
    defaultValues: {
      placas: vehiculo.placas ?? '',
      kilometraje: vehiculo.kilometraje == null ? '' : String(vehiculo.kilometraje),
    },
  })

  async function guardar(datos: z.output<typeof esquema>) {
    setErrorApi(null)
    try {
      onCorregido(
        await corregirVehiculo(sesion?.token ?? '', vehiculo.id, {
          placas: datos.placas === '' ? null : datos.placas,
          kilometraje: datos.kilometraje === '' ? null : Number(datos.kilometraje),
        }),
      )
    } catch (e) {
      setErrorApi(mensajeDeError(e))
    }
  }

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent>
        <form noValidate onSubmit={handleSubmit(guardar)} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Corregir placas y kilometraje</DialogTitle>
            <DialogDescription>Deja un campo vacío si todavía no lo conoces.</DialogDescription>
          </DialogHeader>

          {errorApi && (
            <Alert variant="destructive">
              <AlertTitle>No se pudo guardar</AlertTitle>
              <AlertDescription>{errorApi}</AlertDescription>
            </Alert>
          )}

          <FieldGroup className="gap-4">
            <Controller
              control={control}
              name="placas"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="placas">Placas</FieldLabel>
                  <Input
                    {...field}
                    id="placas"
                    autoComplete="off"
                    className="uppercase"
                    aria-invalid={fieldState.invalid}
                    aria-describedby={fieldState.error ? 'placas-error' : undefined}
                  />
                  <FieldError id="placas-error" errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              control={control}
              name="kilometraje"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="kilometraje">Kilometraje</FieldLabel>
                  <Input
                    {...field}
                    id="kilometraje"
                    inputMode="numeric"
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                    aria-describedby={fieldState.error ? 'kilometraje-error' : 'kilometraje-ayuda'}
                  />
                  {fieldState.error ? (
                    <FieldError id="kilometraje-error" errors={[fieldState.error]} />
                  ) : (
                    <FieldDescription id="kilometraje-ayuda">En kilómetros, sin puntos ni comas.</FieldDescription>
                  )}
                </Field>
              )}
            />
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
