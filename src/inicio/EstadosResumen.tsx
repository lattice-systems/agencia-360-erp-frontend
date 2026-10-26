import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

/** Skeleton con la forma del resumen: el bloque de pendientes y la franja de números. */
export function ResumenCargando() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <span className="sr-only">Cargando…</span>
      <Skeleton className="h-56 rounded-3xl" />
      <Skeleton className="h-24 rounded-2xl" />
    </div>
  )
}

/** El detalle técnico no le sirve a quien opera; basta con poder reintentar. */
export function ResumenConError({ que, recargar }: { que: string; recargar: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>No pudimos cargar {que}</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        Revisa tu conexión e inténtalo de nuevo.
        <Button variant="outline" onClick={recargar}>
          Reintentar
        </Button>
      </AlertDescription>
    </Alert>
  )
}
