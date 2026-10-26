import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import { formatearNumero } from '@/lib/formato'

export interface Indicador {
  etiqueta: string
  valor: number
  /** Lista ya filtrada que explica el número; sin ella, el número no es enlace. */
  ruta?: string
  detalle?: string
}

/**
 * Los números del rol en una sola franja; cada uno abre su lista filtrada
 * cuando la pantalla la tiene. Los que están en cero quedan en segundo plano.
 */
export function Indicadores({ titulo, indicadores }: { titulo: string; indicadores: Indicador[] }) {
  return (
    <section aria-labelledby="titulo-indicadores" className="flex flex-col gap-3">
      <h2 id="titulo-indicadores" className="text-sm font-medium text-muted-foreground">
        {titulo}
      </h2>
      <ul
        className={cn(
          'grid gap-px overflow-hidden rounded-2xl border bg-border',
          indicadores.length === 4 ? 'grid-cols-2 @3xl/main:grid-cols-4' : 'grid-cols-1 @xl/main:grid-cols-3',
        )}
      >
        {indicadores.map((indicador) => {
          const contenido = (
            <>
              <span className="text-sm text-muted-foreground">{indicador.etiqueta}</span>
              <span
                className={cn(
                  'text-2xl font-semibold tabular-nums',
                  indicador.valor === 0 && 'text-muted-foreground',
                )}
              >
                {formatearNumero(indicador.valor)}
              </span>
              {indicador.detalle && (
                <span className="text-xs text-muted-foreground">{indicador.detalle}</span>
              )}
            </>
          )
          return (
            <li key={indicador.etiqueta} className="bg-card">
              {indicador.ruta ? (
                <Link
                  to={indicador.ruta}
                  aria-label={[`${indicador.etiqueta}: ${formatearNumero(indicador.valor)}`, indicador.detalle]
                    .filter(Boolean)
                    .join(', ')}
                  className="flex h-full flex-col gap-1 px-5 py-4 transition-colors outline-none hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset"
                >
                  {contenido}
                </Link>
              ) : (
                <div className="flex h-full flex-col gap-1 px-5 py-4">{contenido}</div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
