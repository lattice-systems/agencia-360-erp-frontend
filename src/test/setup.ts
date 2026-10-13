import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { servidor } from './servidor.ts'

// jsdom no implementa matchMedia; el menú lateral lo usa para saber si es
// celular. Las pruebas corren como escritorio.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (consulta: string) => ({
    matches: false,
    media: consulta,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
})

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
