import { zodResolver } from '@hookform/resolvers/zod'
import { ClipboardList, Lock } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatearNumero } from '@/lib/formato'
import { useConsulta, useMensajeDeError } from '../api/useConsulta.ts'
import { Badge } from '@/components/ui/badge'
import { EncabezadoPagina } from '../componentes/EncabezadoPagina.tsx'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { TablaCargando } from '../componentes/TablaCargando.tsx'
import { useSesion } from '../sesion/useSesion.ts'
import { listarRefacciones, registrarRecepcion, type Refaccion } from './api.ts'
import { estadoExistencia, NOMBRE_EXISTENCIA, VARIANTE_EXISTENCIA } from './estados.ts'

// Decisiones del PO del 13 de octubre: la recepción guarda la fecha en que
// llegó la mercancía (si no se captura, es la del registro), el proveedor y
// notas opcionales. El backend vuelve a validar todo.
const esquema = z.object({
  refaccionId: z.string().min(1, 'Elige la refacción que llegó.'),
  cantidad: z
    .string()
    .trim()
    .regex(/^\d{1,9}$/, 'Escribe una cantidad entera.')
    .transform(Number)
    .pipe(z.number().positive('La cantidad debe ser mayor a cero.')),
  proveedor: z
    .string()
    .trim()
    .min(1, 'Escribe el proveedor.')
    .max(120, 'Usa hasta 120 caracteres.'),
  fechaLlegada: z
    .string()
    .refine((valor) => !valor || new Date(valor).getTime() <= Date.now(), {
      message: 'La fecha de llegada no puede ser futura.',
    }),
  notas: z.string().trim().max(500, 'Usa hasta 500 caracteres.'),
})

type Formulario = z.input<typeof esquema>
type Datos = z.output<typeof esquema>

/** Registro de una entrega de refacciones (ERP-2.0). Solo Inventario. */
export function RecepcionPage() {
  const { datos, cargando, error, recargar, actualizar } = useConsulta(listarRefacciones)

  return (
    <section className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Registrar recepción"
        descripcion="Registra una entrada y actualiza la existencia del artículo."
      />
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudieron cargar las refacciones</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            {error}
            <Button variant="outline" onClick={recargar}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      ) : cargando || !datos ? (
        <TablaCargando />
      ) : datos.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><ClipboardList /></EmptyMedia>
            <EmptyTitle>Aún no hay refacciones</EmptyTitle>
            <EmptyDescription>
              Primero agrega la refacción; después registra sus entradas aquí.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link to="/refacciones/nueva">Agregar refacción</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <FormularioRecepcion
          refacciones={datos}
          onRegistrada={(id, existencia) =>
            actualizar((actuales) =>
              (actuales ?? []).map((r) =>
                r.id === id ? { ...r, existencia, bajoMinimo: existencia <= r.minimo } : r,
              ),
            )
          }
        />
      )}
    </section>
  )
}

interface PropsFormulario {
  refacciones: Refaccion[]
  onRegistrada: (refaccionId: number, existencia: number) => void
}

function FormularioRecepcion({ refacciones, onRegistrada }: PropsFormulario) {
  const { sesion } = useSesion()
  const [parametros] = useSearchParams()
  const mensajeDeError = useMensajeDeError()
  const [errorApi, setErrorApi] = useState<string | null>(null)

  const preseleccionada = parametros.get('refaccion') ?? ''
  const vacio: Formulario = {
    refaccionId: refacciones.some((r) => String(r.id) === preseleccionada) ? preseleccionada : '',
    cantidad: '',
    proveedor: '',
    fechaLlegada: '',
    notas: '',
  }

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<Formulario, unknown, Datos>({ resolver: zodResolver(esquema), defaultValues: vacio })

  const refaccionId = useWatch({ control, name: 'refaccionId' })
  const cantidadTexto = useWatch({ control, name: 'cantidad' })
  const elegida = refacciones.find((r) => String(r.id) === refaccionId)

  async function registrar(datos: Datos) {
    setErrorApi(null)
    try {
      const registrada = await registrarRecepcion(sesion?.token ?? '', Number(datos.refaccionId), {
        cantidad: datos.cantidad,
        proveedor: datos.proveedor,
        notas: datos.notas || null,
        fechaLlegada: datos.fechaLlegada ? new Date(datos.fechaLlegada).toISOString() : null,
      })
      onRegistrada(registrada.refaccionId, registrada.existencia)
      toast.success('Recepción registrada', {
        description: `${registrada.codigo}: la existencia ahora es ${formatearNumero(registrada.existencia)}.`,
      })
      reset({ ...vacio, refaccionId: datos.refaccionId })
    } catch (e) {
      const mensaje = mensajeDeError(e)
      if (mensaje !== null) {
        setErrorApi(mensaje)
      }
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit(registrar)} className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <Card>
        <CardHeader>
          <CardTitle>Datos de la entrada</CardTitle>
          <CardDescription>La existencia se actualizará cuando confirmes el registro.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="gap-4">
            {errorApi && (
              <Alert variant="destructive">
                <AlertTitle>No se pudo registrar la recepción</AlertTitle>
                <AlertDescription>{errorApi}</AlertDescription>
              </Alert>
            )}
            <Controller
              control={control}
              name="refaccionId"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="refaccionId">Refacción</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange} name={field.name}>
                    <SelectTrigger
                      id="refaccionId"
                      ref={field.ref}
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                      aria-describedby={fieldState.error ? 'refaccionId-error' : undefined}
                    >
                      <SelectValue placeholder="Elige la refacción" />
                    </SelectTrigger>
                    <SelectContent>
                      {refacciones.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>
                          <span className="font-mono">{r.codigo}</span> · {r.descripcion}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError id="refaccionId-error" errors={[fieldState.error]} />
                </Field>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                control={control}
                name="cantidad"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="cantidad">Cantidad recibida</FieldLabel>
                    <Input
                      {...field}
                      id="cantidad"
                      inputMode="numeric"
                      autoComplete="off"
                      aria-invalid={fieldState.invalid}
                      aria-describedby={`cantidad-ayuda${fieldState.error ? ' cantidad-error' : ''}`}
                    />
                    <FieldDescription id="cantidad-ayuda">Solo cantidades mayores que cero.</FieldDescription>
                    <FieldError id="cantidad-error" errors={[fieldState.error]} />
                  </Field>
                )}
              />
              <Controller
                control={control}
                name="fechaLlegada"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="fechaLlegada">Fecha de llegada</FieldLabel>
                    <Input
                      {...field}
                      id="fechaLlegada"
                      type="datetime-local"
                      aria-invalid={fieldState.invalid}
                      aria-describedby={`fechaLlegada-ayuda${fieldState.error ? ' fechaLlegada-error' : ''}`}
                    />
                    <FieldDescription id="fechaLlegada-ayuda">
                      Déjala vacía si llegó ahora. Si llegó antes, indica cuándo.
                    </FieldDescription>
                    <FieldError id="fechaLlegada-error" errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </div>
            <Controller
              control={control}
              name="proveedor"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="proveedor">Proveedor</FieldLabel>
                  <Input
                    {...field}
                    id="proveedor"
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                    aria-describedby={fieldState.error ? 'proveedor-error' : undefined}
                  />
                  <FieldError id="proveedor-error" errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              control={control}
              name="notas"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="notas">Notas (opcional)</FieldLabel>
                  <Textarea
                    {...field}
                    id="notas"
                    aria-invalid={fieldState.invalid}
                    aria-describedby={`notas-ayuda${fieldState.error ? ' notas-error' : ''}`}
                  />
                  <FieldDescription id="notas-ayuda">
                    Por si la entrega trae algo especial, como piezas dañadas o faltantes.
                  </FieldDescription>
                  <FieldError id="notas-error" errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Field>
              <FieldLabel htmlFor="responsable">Responsable</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="responsable"
                  value={sesion?.nombre ?? ''}
                  readOnly
                  aria-describedby="responsable-ayuda"
                />
                <InputGroupAddon align="inline-end">
                  <Lock aria-hidden="true" />
                </InputGroupAddon>
              </InputGroup>
              <FieldDescription id="responsable-ayuda">
                Se registra desde tu sesión y no se puede modificar.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <ResumenRecepcion refaccion={elegida} cantidadTexto={cantidadTexto} />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando…' : 'Registrar recepción'}
        </Button>
      </div>
    </form>
  )
}

function ResumenRecepcion({ refaccion, cantidadTexto }: { refaccion?: Refaccion; cantidadTexto: string }) {
  const cantidad = /^\d{1,9}$/.test(cantidadTexto.trim()) ? Number(cantidadTexto) : 0
  return (
    <Card aria-live="polite">
      <CardHeader>
        <CardTitle>Resumen de recepción</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {refaccion ? (
          <>
            <div>
              <p className="font-semibold">{refaccion.descripcion}</p>
              <p className="font-mono text-sm text-muted-foreground">{refaccion.codigo}</p>
            </div>
            <dl className="grid grid-cols-[1fr_auto] gap-y-2 text-sm">
              <dt className="text-muted-foreground">Existencia actual</dt>
              <dd className="text-right font-semibold tabular-nums">{formatearNumero(refaccion.existencia)}</dd>
              <dt className="text-muted-foreground">Cantidad recibida</dt>
              <dd className="text-right font-semibold tabular-nums">+ {formatearNumero(cantidad)}</dd>
              <dt className="border-t pt-3 font-semibold">Nueva existencia</dt>
              <dd className="border-t pt-3 text-right text-3xl font-bold tabular-nums">
                {formatearNumero(refaccion.existencia + cantidad)}
              </dd>
            </dl>
            <EstadoResultante refaccion={refaccion} existencia={refaccion.existencia + cantidad} />
            <p className="text-xs text-muted-foreground">El saldo final lo confirma el servidor.</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Elige una refacción para ver cómo queda su existencia.</p>
        )}
      </CardContent>
    </Card>
  )
}

function EstadoResultante({ refaccion, existencia }: { refaccion: Refaccion; existencia: number }) {
  const estado = estadoExistencia({ existencia, bajoMinimo: existencia <= refaccion.minimo })
  return <Badge variant={VARIANTE_EXISTENCIA[estado]}>{NOMBRE_EXISTENCIA[estado]}</Badge>
}
