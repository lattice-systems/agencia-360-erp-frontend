import type { ReactNode } from 'react'
import { ChevronRight, CircleCheck, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from '@/components/ui/item'
import { cn } from '@/lib/utils'
import { iniciales } from '../sesion/iniciales.ts'

export interface FilaPendiente {
  id: number
  /** Dónde se atiende este pendiente. */
  ruta: string
  titulo: string
  detalle: string
  /** Si es una persona, se muestran sus iniciales. */
  persona?: boolean
  extra?: ReactNode
}

interface Props {
  icono: LucideIcon
  /** Frase en segunda persona: "Tienes 2 pagos por enviar". */
  titulo: string
  descripcion: string
  accion?: { texto: string; ruta: string }
  /** Lista completa para "Ver los N restantes"; por omisión, la de la acción. */
  rutaLista?: string
  filas?: FilaPendiente[]
  /** Sin pendientes: ícono de listo y sin filas. */
  alDia?: boolean
}

const MAXIMO = 5

/**
 * Lo que el rol tiene que hacer hoy, arriba de todo en Inicio: una frase, la
 * acción principal y los primeros pendientes, cada uno con su enlace.
 */
export function Pendiente({
  icono: Icono,
  titulo,
  descripcion,
  accion,
  rutaLista = accion?.ruta,
  filas = [],
  alDia = false,
}: Props) {
  const MarcaIcono = alDia ? CircleCheck : Icono
  return (
    <Card>
      <CardHeader className="gap-x-4">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-xl',
              alDia ? 'bg-success/10 text-success' : 'bg-primary text-primary-foreground',
            )}
          >
            <MarcaIcono aria-hidden="true" className="size-5" />
          </div>
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">{titulo}</CardTitle>
            <CardDescription>{descripcion}</CardDescription>
          </div>
        </div>
        {accion && (
          <CardAction className="max-sm:col-start-1 max-sm:row-start-3 max-sm:mt-2 max-sm:justify-self-start">
            <Button asChild variant={alDia ? 'outline' : 'default'}>
              <Link to={accion.ruta}>{accion.texto}</Link>
            </Button>
          </CardAction>
        )}
      </CardHeader>
      {filas.length > 0 && (
        <CardContent>
          <ItemGroup className="gap-0">
            {filas.slice(0, MAXIMO).map((fila, i) => (
              <div key={fila.id} role="listitem">
                {i > 0 && <ItemSeparator className="my-0" />}
                <Item asChild size="sm" className="rounded-xl">
                  <Link to={fila.ruta}>
                    {fila.persona && (
                      <ItemMedia>
                        <Avatar>
                          <AvatarFallback aria-hidden="true">{iniciales(fila.titulo)}</AvatarFallback>
                        </Avatar>
                      </ItemMedia>
                    )}
                    <ItemContent className="min-w-0">
                      <ItemTitle className="truncate">{fila.titulo}</ItemTitle>
                      <ItemDescription>{fila.detalle}</ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      {fila.extra}
                      <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
                    </ItemActions>
                  </Link>
                </Item>
              </div>
            ))}
          </ItemGroup>
          {filas.length > MAXIMO && rutaLista && (
            <Button asChild variant="link" className="mt-2 px-0">
              <Link to={rutaLista}>Ver los {filas.length - MAXIMO} restantes</Link>
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  )
}
