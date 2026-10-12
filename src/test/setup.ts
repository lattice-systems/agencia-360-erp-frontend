import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { servidor } from './servidor.ts'

// Una petición a la API sin respuesta definida en la prueba la hace fallar,
// para que ninguna prueba dependa de un backend real.
beforeAll(() => {
  servidor.listen({ onUnhandledRequest: 'error' })
})

// Sin globals de Vitest, React Testing Library no limpia el DOM por su cuenta
// entre pruebas; se hace aquí para que cada prueba empiece desde cero.
afterEach(() => {
  cleanup()
  servidor.resetHandlers()
  sessionStorage.clear()
})

afterAll(() => {
  servidor.close()
})
