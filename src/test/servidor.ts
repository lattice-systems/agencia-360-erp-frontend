// Servidor de MSW para las pruebas: intercepta las peticiones a la API y
// responde con datos de prueba. Cada prueba define sus respuestas con
// servidor.use(...).
import { setupServer } from 'msw/node'

export const servidor = setupServer()
