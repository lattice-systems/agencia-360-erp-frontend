import { describe, expect, it } from 'vitest'
import { crearLectorDeEventos } from './eventos.ts'

function leer(...trozos: string[]) {
  const recibidos: Array<[string, string]> = []
  const lector = crearLectorDeEventos((nombre, datos) => recibidos.push([nombre, datos]))
  trozos.forEach(lector)
  return recibidos
}

describe('Lector de Server-Sent Events', () => {
  it('entrega cada evento con su nombre y sus datos', () => {
    expect(leer('event: vehiculos\ndata: cambio\n\n')).toEqual([['vehiculos', 'cambio']])
  })

  it('arma un evento que llega partido en varios trozos', () => {
    expect(leer('event: vehi', 'culos\nda', 'ta: cambio\n', '\n')).toEqual([['vehiculos', 'cambio']])
  })

  it('ignora los comentarios del servidor, como el latido', () => {
    expect(leer(':conectado\n\n', ': latido\n\n', 'event:vehiculos\ndata:cambio\n\n')).toEqual([
      ['vehiculos', 'cambio'],
    ])
  })

  it('acepta saltos de línea de Windows y varios eventos en un trozo', () => {
    expect(leer('event: a\r\ndata: 1\r\n\r\nevent: b\r\ndata: 2\r\n\r\n')).toEqual([
      ['a', '1'],
      ['b', '2'],
    ])
  })

  it('sin nombre, el evento se llama message y junta sus líneas de datos', () => {
    expect(leer('data: uno\ndata: dos\n\n')).toEqual([['message', 'uno\ndos']])
  })

  it('no entrega un evento que todavía no termina', () => {
    expect(leer('event: vehiculos\ndata: cambio\n')).toEqual([])
  })
})
