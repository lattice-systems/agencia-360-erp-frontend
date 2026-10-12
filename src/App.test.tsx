import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App.tsx'

describe('App', () => {
  it('muestra el título del ERP', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Agencia360 ERP' }),
    ).toBeInTheDocument()
  })
})
