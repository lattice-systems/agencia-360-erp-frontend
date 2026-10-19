import { zodResolver } from '@hookform/resolvers/zod'
import { Info } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ErrorApi } from '../api/cliente.ts'
import { useConsulta, useMensajeDeError } from '../api/useConsulta.ts'
import { EncabezadoPagina } from '../componentes/EncabezadoPagina.tsx'
import { TablaCargando } from '../componentes/TablaCargando.tsx'
import { useSesion } from '../sesion/useSesion.ts'
import {
  crearVehiculo,
  editarVehiculo,
  ESTATUS_DE_ENTRADA,
  ESTATUS_VEHICULO,
  obtenerVehiculo,
  type Vehiculo,
} from './api.ts'
import { NOMBRE_ESTATUS } from './estados.ts'
import { textoAPrecio } from './precio.ts'

// Mismas reglas que el backend (Vehiculo.registrar): VIN estándar de 17
// caracteres sin I, O ni Q; año desde 1900; precio mayor a cero con 2 decimales.
// En pantalla los campos se nombran como en la factura (ERP-2.2): `modelo` de
// la API es el Tipo (Sentra) y `anio` es el Modelo (2026).
const esquema = z.object({
  vin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-HJ-NPR-Z0-9]{17}$/, 'Escribe un VIN de 17 caracteres, sin las letras I, O ni Q.'),
  modelo: z.string().trim().min(1, 'Escribe el tipo.').max(80, 'Usa hasta 80 caracteres.'),
  version: z.string().trim().min(1, 'Escribe la versión.').max(80, 'Usa hasta 80 caracteres.'),
  anio: z
    .string()
    .trim()
    .regex(/^\d{4}$/, 'Escribe el modelo con 4 dígitos.')
    .refine((valor) => Number(valor) >= 1900, 'El modelo no es válido.'),
  color: z.string().trim().min(1, 'Escribe el color.').max(40, 'Usa hasta 40 caracteres.'),
  precio: z
    .string()
    .trim()
    .min(1, 'Escribe el precio.')
    .transform(textoAPrecio)
    .pipe(
      z
        .number({ error: 'Escribe el precio con hasta 2 decimales.' })
        .positive('El precio debe ser mayor a cero.'),
    ),
  estatus: z.enum(ESTATUS_VEHICULO),
})

type Formulario = z.input<typeof esquema>

const VACIO: Formulario = {
  vin: '',
  modelo: '',
  version: '',
  anio: '',
  color: '',
  precio: '',
  estatus: 'DISPONIBLE',
}

/** Alta y corrección de una unidad (ERP-2.0). Solo Inventario. */
export function VehiculoFormPage() {
  const { id } = useParams()
  if (!id) {
    return <FormularioVehiculo />
  }
  return <EdicionVehiculo id={Number(id)} />
}

function EdicionVehiculo({ id }: { id: number }) {
  const consulta = useCallback((token: string) => obtenerVehiculo(token, id), [id])
  const { datos, cargando, error } = useConsulta(consulta)

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>No se pudo abrir el vehículo</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }
  if (cargando || !datos) {
    return <TablaCargando />
  }
  return <FormularioVehiculo vehiculo={datos} />
}

function FormularioVehiculo({ vehiculo }: { vehiculo?: Vehiculo }) {
  const { sesion } = useSesion()
  const navegar = useNavigate()
  const mensajeDeError = useMensajeDeError()
  const [errorApi, setErrorApi] = useState<string | null>(null)
  const edicion = vehiculo !== undefined
  // Vendido y Entregado los pone la venta; Inventario no los cambia.
  const estatusDeVenta =
    vehiculo !== undefined &&
    !(ESTATUS_DE_ENTRADA as readonly string[]).includes(vehiculo.estatus)

  const {
    control,
    handleSubmit,
    setError,
    reset,
    formState: { isSubmitting },
  } = useForm<Formulario, unknown, z.output<typeof esquema>>({
    resolver: zodResolver(esquema),
    defaultValues: VACIO,
  })

  useEffect(() => {
    if (vehiculo) {
      reset({
        vin: vehiculo.vin,
        modelo: vehiculo.modelo,
        version: vehiculo.version,
        anio: String(vehiculo.anio),
        color: vehiculo.color,
        precio: vehiculo.precio.toFixed(2),
        estatus: vehiculo.estatus,
      })
    }
  }, [vehiculo, reset])

  async function guardar(datos: z.output<typeof esquema>) {
    setErrorApi(null)
    const cuerpo = {
      vin: datos.vin,
      modelo: datos.modelo,
      version: datos.version,
      anio: Number(datos.anio),
      color: datos.color,
      precio: datos.precio,
      estatus: estatusDeVenta ? null : datos.estatus,
    }
    try {
      const token = sesion?.token ?? ''
      const guardado = vehiculo
        ? await editarVehiculo(token, vehiculo.id, cuerpo)
        : await crearVehiculo(token, cuerpo)
      toast.success(edicion ? 'Vehículo actualizado.' : `Vehículo ${guardado.vin} agregado.`)
      navegar('/vehiculos')
    } catch (e) {
      const mensaje = mensajeDeError(e)
      if (mensaje === null) {
        return
      }
      if (e instanceof ErrorApi && e.status === 409) {
        setError('vin', { message: mensaje }, { shouldFocus: true })
      } else {
        setErrorApi(mensaje)
      }
    }
  }

  const titulo = edicion ? 'Editar vehículo' : 'Agregar vehículo'

  return (
    <section className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo={titulo}
      />

      <form
        noValidate
        onSubmit={handleSubmit(guardar)}
        className="grid gap-6 lg:grid-cols-[1fr_20rem]"
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-primary">Datos de la unidad</CardTitle>
            <CardDescription>Completa los datos del vehículo. Todos los campos son obligatorios.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup className="gap-4">
              {errorApi && (
                <Alert variant="destructive">
                  <AlertTitle>No se pudo guardar</AlertTitle>
                  <AlertDescription>{errorApi}</AlertDescription>
                </Alert>
              )}
              <Campo
                control={control}
                nombre="vin"
                etiqueta="Número de serie (VIN)"
                mono
                ayuda="17 caracteres. Verifica que coincida con la unidad."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo control={control} nombre="modelo" etiqueta="Tipo" ayuda="Por ejemplo, Sentra." />
                <Campo control={control} nombre="version" etiqueta="Versión" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Campo
                  control={control}
                  nombre="anio"
                  etiqueta="Modelo"
                  inputMode="numeric"
                  ayuda="Año del modelo, por ejemplo 2026."
                />
                <Campo control={control} nombre="color" etiqueta="Color" />
                <Campo control={control} nombre="precio" etiqueta="Precio (MXN)" inputMode="decimal" />
                <Controller
                  control={control}
                  name="estatus"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="estatus">Estatus</FieldLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={estatusDeVenta}
                      >
                        <SelectTrigger id="estatus" className="w-full" aria-invalid={fieldState.invalid}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(estatusDeVenta ? ESTATUS_VEHICULO : ESTATUS_DE_ENTRADA).map((valor) => (
                            <SelectItem key={valor} value={valor}>
                              {NOMBRE_ESTATUS[valor]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {estatusDeVenta && <FieldDescription>Este estatus lo cambia Facturación.</FieldDescription>}
                    </Field>
                  )}
                />
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-primary">Antes de guardar</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
              <p>
                Verifica el número de serie y el precio.{' '}
                {edicion
                  ? 'Los cambios se verán en el listado al guardar.'
                  : 'La unidad aparecerá en el listado al guardarse.'}
              </p>
              <p>Una unidad con daños u otro problema entra como No disponible.</p>
              <Alert variant="informacion">
                <Info aria-hidden="true" />
                <AlertTitle>Moneda: MXN</AlertTitle>
                <AlertDescription>Importe en pesos mexicanos.</AlertDescription>
              </Alert>
            </CardContent>
          </Card>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navegar('/vehiculos')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Guardar vehículo'}
            </Button>
          </div>
        </div>
      </form>
    </section>
  )
}

interface PropsCampo {
  control: ReturnType<typeof useForm<Formulario, unknown, z.output<typeof esquema>>>['control']
  nombre: Exclude<keyof Formulario, 'estatus'>
  etiqueta: string
  ayuda?: string
  mono?: boolean
  inputMode?: 'numeric' | 'decimal'
}

function Campo({ control, nombre, etiqueta, ayuda, mono, inputMode }: PropsCampo) {
  return (
    <Controller
      control={control}
      name={nombre}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={nombre}>{etiqueta}</FieldLabel>
          <Input
            {...field}
            id={nombre}
            inputMode={inputMode}
            autoComplete="off"
            className={mono ? 'font-mono uppercase' : undefined}
            aria-invalid={fieldState.invalid}
            aria-describedby={
              [ayuda && `${nombre}-ayuda`, fieldState.error && `${nombre}-error`]
                .filter(Boolean)
                .join(' ') || undefined
            }
          />
          {ayuda && <FieldDescription id={`${nombre}-ayuda`}>{ayuda}</FieldDescription>}
          <FieldError id={`${nombre}-error`} errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}
