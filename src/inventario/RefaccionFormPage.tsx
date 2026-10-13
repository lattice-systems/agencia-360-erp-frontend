import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { formatearNumero } from '@/lib/formato'
import { ErrorApi } from '../api/cliente.ts'
import { useConsulta, useMensajeDeError } from '../api/useConsulta.ts'
import { ChipEstado } from '../componentes/ChipEstado.tsx'
import { EncabezadoPagina } from '../componentes/EncabezadoPagina.tsx'
import { TablaCargando } from '../componentes/TablaCargando.tsx'
import { useSesion } from '../sesion/useSesion.ts'
import { crearRefaccion, editarRefaccion, obtenerRefaccion, type Refaccion } from './api.ts'
import { estadoExistencia, NOMBRE_EXISTENCIA, TONO_EXISTENCIA } from './estados.ts'
import { textoAPrecio } from './precio.ts'

// Mismas reglas que el backend (Refaccion.registrar). La existencia no se
// captura: una refacción nueva entra en cero y crece con las recepciones
// (decisión del PO del 13 de octubre).
const esquema = z.object({
  codigo: z.string().trim().toUpperCase().min(1, 'Escribe el código.').max(40, 'Usa hasta 40 caracteres.'),
  descripcion: z
    .string()
    .trim()
    .min(1, 'Escribe la descripción.')
    .max(200, 'Usa hasta 200 caracteres.'),
  costo: z
    .string()
    .trim()
    .min(1, 'Escribe el costo.')
    .transform(textoAPrecio)
    .pipe(z.number({ error: 'Escribe el costo con hasta 2 decimales.' }).min(0, 'El costo no puede ser negativo.')),
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
  minimo: z
    .string()
    .trim()
    .regex(/^\d{1,9}$/, 'Escribe una cantidad entera de 0 o más.')
    .transform(Number),
})

type Formulario = z.input<typeof esquema>
type Datos = z.output<typeof esquema>

const VACIO: Formulario = { codigo: '', descripcion: '', costo: '', precio: '', minimo: '' }

/** Alta y corrección de una refacción (ERP-2.0). Solo Inventario. */
export function RefaccionFormPage() {
  const { id } = useParams()
  if (!id) {
    return <FormularioRefaccion />
  }
  return <EdicionRefaccion id={Number(id)} />
}

function EdicionRefaccion({ id }: { id: number }) {
  const consulta = useCallback((token: string) => obtenerRefaccion(token, id), [id])
  const { datos, cargando, error } = useConsulta(consulta)

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>No se pudo abrir la refacción</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }
  if (cargando || !datos) {
    return <TablaCargando />
  }
  return <FormularioRefaccion refaccion={datos} />
}

function FormularioRefaccion({ refaccion }: { refaccion?: Refaccion }) {
  const { sesion } = useSesion()
  const navegar = useNavigate()
  const mensajeDeError = useMensajeDeError()
  const [errorApi, setErrorApi] = useState<string | null>(null)
  const edicion = refaccion !== undefined

  const {
    control,
    handleSubmit,
    setError,
    reset,
    formState: { isSubmitting },
  } = useForm<Formulario, unknown, Datos>({ resolver: zodResolver(esquema), defaultValues: VACIO })

  useEffect(() => {
    if (refaccion) {
      reset({
        codigo: refaccion.codigo,
        descripcion: refaccion.descripcion,
        costo: refaccion.costo.toFixed(2),
        precio: refaccion.precio.toFixed(2),
        minimo: String(refaccion.minimo),
      })
    }
  }, [refaccion, reset])

  async function guardar(datos: Datos) {
    setErrorApi(null)
    try {
      const token = sesion?.token ?? ''
      const guardada = refaccion
        ? await editarRefaccion(token, refaccion.id, datos)
        : await crearRefaccion(token, datos)
      toast.success(edicion ? 'Refacción actualizada.' : `Refacción ${guardada.codigo} agregada.`)
      navegar('/refacciones')
    } catch (e) {
      const mensaje = mensajeDeError(e)
      if (mensaje === null) {
        return
      }
      if (e instanceof ErrorApi && e.status === 409) {
        setError('codigo', { message: mensaje }, { shouldFocus: true })
      } else {
        setErrorApi(mensaje)
      }
    }
  }

  const titulo = edicion ? 'Editar refacción' : 'Agregar refacción'

  return (
    <section className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo={titulo}
        migas={[{ texto: 'Refacciones', ruta: '/refacciones' }, { texto: titulo }]}
      />

      <form noValidate onSubmit={handleSubmit(guardar)} className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-primary">Información de la refacción</CardTitle>
            <CardDescription>
              {edicion ? 'Corrige los datos del artículo.' : 'Registra el artículo y su existencia mínima.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup className="gap-4">
              {errorApi && (
                <Alert variant="destructive">
                  <AlertTitle>No se pudo guardar</AlertTitle>
                  <AlertDescription>{errorApi}</AlertDescription>
                </Alert>
              )}
              <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
                <Campo control={control} nombre="codigo" etiqueta="Código" mono />
                <Campo control={control} nombre="descripcion" etiqueta="Descripción" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo control={control} nombre="costo" etiqueta="Costo (MXN)" inputMode="decimal" />
                <Campo control={control} nombre="precio" etiqueta="Precio (MXN)" inputMode="decimal" />
              </div>
              <Campo
                control={control}
                nombre="minimo"
                etiqueta="Existencia mínima"
                inputMode="numeric"
                ayuda="Al llegar a esta cantidad, Refacciones y el Administrador ven el aviso para resurtir."
              />
            </FieldGroup>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-primary">Control de existencias</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
              {refaccion ? (
                <>
                  <p>
                    Existencia actual:{' '}
                    <span className="font-semibold text-foreground tabular-nums">
                      {formatearNumero(refaccion.existencia)}
                    </span>
                  </p>
                  <ChipEstado tono={TONO_EXISTENCIA[estadoExistencia(refaccion)]}>
                    {NOMBRE_EXISTENCIA[estadoExistencia(refaccion)]}
                  </ChipEstado>
                  <p>La existencia no se edita aquí: cambia con cada recepción.</p>
                </>
              ) : (
                <p>
                  La refacción entra con existencia en cero. Después del alta, registra sus entradas
                  desde <Link to="/recepciones" className="text-primary underline-offset-4 hover:underline">Recepciones</Link> para
                  conservar la fecha, la cantidad, el proveedor y el responsable.
                </p>
              )}
            </CardContent>
          </Card>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navegar('/refacciones')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Guardar refacción'}
            </Button>
          </div>
        </div>
      </form>
    </section>
  )
}

interface PropsCampo {
  control: ReturnType<typeof useForm<Formulario, unknown, Datos>>['control']
  nombre: keyof Formulario
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
