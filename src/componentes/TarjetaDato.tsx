import type { LucideIcon } from 'lucide-react'
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatearNumero } from '@/lib/formato'

interface Props {
  etiqueta: string
  valor: number
  icono: LucideIcon
}

/** Indicador de un número clave de la pantalla (Unidades registradas: 5). */
export function TarjetaDato({ etiqueta, valor, icono: Icono }: Props) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{etiqueta}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{formatearNumero(valor)}</CardTitle>
        <CardAction>
          <Icono aria-hidden="true" className="text-muted-foreground" />
        </CardAction>
      </CardHeader>
    </Card>
  )
}
