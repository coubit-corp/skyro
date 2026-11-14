import { describe, expect, it } from 'vitest'
import { addTag, toProfessionalRow, validateProfessional, type ProfessionalFormValues } from './professionalForm'

const ok: ProfessionalFormValues = {
  fullName: 'Ana Lima',
  specialty: 'nutricionista',
  registry: 'CRN-3 12345',
  bio: 'Trabalho com alimentação para quem treina.',
  tags: ['Nutrição esportiva'],
  modality: 'ambos',
  lat: -23.56,
  lng: -46.68,
  neighborhood: 'Pinheiros',
  city: 'São Paulo',
}

describe('validateProfessional', () => {
  it('aceita um perfil completo', () => {
    expect(validateProfessional(ok)).toEqual({})
  })
  it('exige local quando atende presencialmente', () => {
    const e = validateProfessional({ ...ok, modality: 'presencial', lat: null, lng: null, neighborhood: '' })
    expect(e.location).toBeDefined()
    expect(e.neighborhood).toBeDefined()
  })
  it('não exige local quando é só online', () => {
    expect(validateProfessional({ ...ok, modality: 'online', lat: null, lng: null, neighborhood: '' })).toEqual({})
  })
  it('registro precisa ter número', () => {
    expect(validateProfessional({ ...ok, registry: 'CRN' }).registry).toBeDefined()
    expect(validateProfessional({ ...ok, registry: 'CRP 06/123456' }).registry).toBeUndefined()
  })
  it('bio entre 20 e 400 caracteres', () => {
    expect(validateProfessional({ ...ok, bio: 'curta' }).bio).toBeDefined()
    expect(validateProfessional({ ...ok, bio: 'a'.repeat(401) }).bio).toBeDefined()
    expect(validateProfessional({ ...ok, bio: 'a'.repeat(400) }).bio).toBeUndefined()
  })
  it('exige especialidade e nome', () => {
    const e = validateProfessional({ ...ok, specialty: '', fullName: 'A' })
    expect(e.specialty).toBeDefined()
    expect(e.fullName).toBeDefined()
  })
})

describe('addTag', () => {
  it('não repete, ignora maiúsculas e espaços extras', () => {
    expect(addTag(['Ganho de massa'], '  ganho   de MASSA ')).toEqual(['Ganho de massa'])
    expect(addTag([], '  Corrida  ')).toEqual(['Corrida'])
  })
  it('respeita o limite de 6 e ignora tags muito curtas', () => {
    const six = ['a1', 'b2', 'c3', 'd4', 'e5', 'f6']
    expect(addTag(six, 'Nova')).toEqual(six)
    expect(addTag([], 'x')).toEqual([])
  })
})

describe('toProfessionalRow', () => {
  it('apaga o local quando é só online', () => {
    const row = toProfessionalRow({ ...ok, modality: 'online' })
    expect(row.lat).toBeNull()
    expect(row.lng).toBeNull()
    expect(row.neighborhood).toBeNull()
  })
  it('limpa espaços e usa São Paulo como cidade padrão', () => {
    const row = toProfessionalRow({ ...ok, registry: '  CRN-3 1  ', city: ' ' })
    expect(row.registry).toBe('CRN-3 1')
    expect(row.city).toBe('São Paulo')
  })
})
