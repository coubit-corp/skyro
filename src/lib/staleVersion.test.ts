import { describe, expect, it } from 'vitest'
import { isStaleChunkError } from './staleVersion'

describe('isStaleChunkError', () => {
  it('reconhece arquivo do app que sumiu (Chrome, Firefox e Safari)', () => {
    expect(isStaleChunkError(new TypeError('Failed to fetch dynamically imported module: https://x/assets/a.js'))).toBe(
      true,
    )
    expect(isStaleChunkError(new TypeError('error loading dynamically imported module'))).toBe(true)
    expect(isStaleChunkError(new TypeError('Importing a module script failed.'))).toBe(true)
  })

  it('não confunde com outros erros', () => {
    expect(isStaleChunkError(new Error('Cannot read properties of undefined'))).toBe(false)
    expect(isStaleChunkError('qualquer coisa')).toBe(false)
  })
})
