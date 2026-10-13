import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { formatearNumero } from '@/lib/formato'

interface Props {
  etiqueta: string
  valor: number
  icono: LucideIcon
}

/** Indicador de un número clave de la pantalla (Unidades registradas: 5). */
export function TarjetaDato({ etiqueta, valor, icono: Icono }: Props) {
  return (
    <Card className="gap-2 py-4 md:py-4">
      <div className="flex items-start justify-between gap-2 px-4">
        <span className="text-sm text-muted-foreground">{etiqueta}</span>
        <Icono aria-hidden="true" className="size-5 text-marca-acento-claro" />
      </div>
      <span className="px-4 text-3xl font-bold text-primary tabular-nums">
        {formatearNumero(valor)}
      </span>
    </Card>
  )
}
