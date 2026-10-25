import type { LucideIcon } from 'lucide-react'
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatearNumero } from '@/lib/formato'

interface Props {
  etiqueta: string
  valor: number
  icono: LucideIcon
}

/**
 * Indicador de un número clave de la pantalla (Unidades registradas: 5), con
 * el degradado de las tarjetas del bloque dashboard-01.
 */
export function TarjetaDato({ etiqueta, valor, icono: Icono }: Props) {
  return (
    <Card
      size="sm"
      className="@container/card bg-gradient-to-t from-primary/5 to-card shadow-xs dark:bg-card"
    >
      <CardHeader>
        <CardDescription>{etiqueta}</CardDescription>
        <CardTitle className="text-2xl tabular-nums @[200px]/card:text-3xl">
          {formatearNumero(valor)}
        </CardTitle>
        <CardAction>
          <Icono aria-hidden="true" className="size-4 text-muted-foreground" />
        </CardAction>
      </CardHeader>
    </Card>
  )
}
