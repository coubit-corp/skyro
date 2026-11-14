import { describe, expect, it } from 'vitest'
import { toPlace } from './geocode'

describe('toPlace', () => {
  it('monta rótulo, bairro e cidade a partir da resposta do Nominatim', () => {
    const p = toPlace({
      lat: '-23.5614',
      lon: '-46.6819',
      display_name: 'Rua dos Pinheiros, 1000, Pinheiros, São Paulo, ...',
      address: { road: 'Rua dos Pinheiros', house_number: '1000', suburb: 'Pinheiros', city: 'São Paulo' },
    })
    expect(p).toEqual({ label: 'Rua dos Pinheiros, 1000 · Pinheiros · São Paulo', lat: -23.5614, lng: -46.6819, neighborhood: 'Pinheiros', city: 'São Paulo' })
  })
  it('usa alternativas quando não há suburb/city', () => {
    const p = toPlace({ lat: '1', lon: '2', display_name: 'X', address: { neighbourhood: 'Vila Madalena', town: 'Cotia' } })
    expect(p.neighborhood).toBe('Vila Madalena')
    expect(p.city).toBe('Cotia')
  })
  it('cai no display_name quando não há endereço', () => {
    expect(toPlace({ lat: '1', lon: '2', display_name: 'Algum lugar' }).label).toBe('Algum lugar')
  })
})
