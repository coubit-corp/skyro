import { describe, expect, it } from 'vitest'
import {
  accountErrorMessage,
  availabilityLines,
  cleanAvailability,
  firstName,
  formatPhone,
  greeting,
  greetingFor,
  msUntilNextGreeting,
  phoneDigits,
  squareCrop,
  validateAccount,
  validateAvailability,
  validateEmail,
  validateName,
  validatePersonBio,
  validatePhone,
  validatePhotoFile,
} from './profile'

const at = (h: number, m = 0) => new Date(2026, 10, 14, h, m)

describe('saudação', () => {
  it('muda conforme o horário do aparelho', () => {
    expect(greeting(at(5))).toBe('Bom dia')
    expect(greeting(at(11, 59))).toBe('Bom dia')
    expect(greeting(at(12))).toBe('Boa tarde')
    expect(greeting(at(17, 59))).toBe('Boa tarde')
    expect(greeting(at(18))).toBe('Boa noite')
    expect(greeting(at(23, 30))).toBe('Boa noite')
    expect(greeting(at(2))).toBe('Boa noite')
  })
  it('usa o primeiro nome e funciona sem nome', () => {
    expect(greetingFor('lucas martins', at(9))).toBe('Bom dia, Lucas!')
    expect(greetingFor('  Ana   Lima ', at(15))).toBe('Boa tarde, Ana!')
    expect(greetingFor('', at(20))).toBe('Boa noite!')
    expect(greetingFor(null, at(20))).toBe('Boa noite!')
    expect(firstName('érica souza')).toBe('Érica')
  })
  it('sabe quanto falta para a próxima troca', () => {
    expect(msUntilNextGreeting(at(11, 59))).toBe(60_000)
    expect(msUntilNextGreeting(at(17))).toBe(3_600_000)
    expect(msUntilNextGreeting(at(23))).toBe(6 * 3_600_000) // até as 5h de amanhã
    expect(msUntilNextGreeting(at(4, 30))).toBe(30 * 60_000)
  })
})

describe('telefone', () => {
  it('guarda só os dígitos, sem o código do país', () => {
    expect(phoneDigits('+55 (11) 98765-4321')).toBe('11987654321')
    expect(phoneDigits('(11) 3456-7890')).toBe('1134567890')
  })
  it('formata celular e fixo', () => {
    expect(formatPhone('11987654321')).toBe('(11) 98765-4321')
    expect(formatPhone('1134567890')).toBe('(11) 3456-7890')
    expect(formatPhone('119')).toBe('(11) 9')
    expect(formatPhone('')).toBe('')
  })
  it('é opcional, mas quando vem precisa de DDD', () => {
    expect(validatePhone('')).toBeNull()
    expect(validatePhone('(11) 98765-4321')).toBeNull()
    expect(validatePhone('(11) 3456-7890')).toBeNull()
    expect(validatePhone('98765-4321')).not.toBeNull()
    expect(validatePhone('(01) 98765-4321')).not.toBeNull()
    expect(validatePhone('(11) 88765-4321')).not.toBeNull()
  })
})

describe('nome, e-mail e bio', () => {
  it('nome precisa de sobrenome', () => {
    expect(validateName('Lucas')).not.toBeNull()
    expect(validateName('Lucas Martins')).toBeNull()
    expect(validateName('a'.repeat(40) + ' ' + 'b'.repeat(41))).not.toBeNull()
  })
  it('e-mail', () => {
    expect(validateEmail('lucas@exemplo.com')).toBeNull()
    expect(validateEmail('lucas@exemplo')).not.toBeNull()
    expect(validateEmail('lucas exemplo.com')).not.toBeNull()
    expect(validateEmail('')).not.toBeNull()
  })
  it('bio até 300 caracteres', () => {
    expect(validatePersonBio('a'.repeat(300))).toBeNull()
    expect(validatePersonBio('a'.repeat(301))).not.toBeNull()
  })
  it('traduz os erros do servidor', () => {
    expect(accountErrorMessage('A user with this email address has already been registered')).toMatch(/já está em uso/)
    expect(accountErrorMessage('new row violates row-level security policy')).toMatch(/não é permitida/)
    expect(accountErrorMessage('Bucket not found')).toMatch(/ainda não foi ativado/)
    expect(accountErrorMessage('outro erro')).toBe('outro erro')
  })
})

describe('foto', () => {
  it('aceita JPG, PNG e WebP de até 10 MB', () => {
    expect(validatePhotoFile({ type: 'image/jpeg', size: 2_000_000 })).toBeNull()
    expect(validatePhotoFile({ type: 'image/gif', size: 1000 })).not.toBeNull()
    expect(validatePhotoFile({ type: 'application/pdf', size: 1000 })).not.toBeNull()
    expect(validatePhotoFile({ type: 'image/png', size: 11 * 1024 * 1024 })).not.toBeNull()
  })
  it('recorta o quadrado do centro', () => {
    expect(squareCrop(1000, 600)).toEqual({ sx: 200, sy: 0, side: 600 })
    expect(squareCrop(600, 1000)).toEqual({ sx: 0, sy: 200, side: 600 })
    expect(squareCrop(512, 512)).toEqual({ sx: 0, sy: 0, side: 512 })
  })
})

describe('horários', () => {
  it('valida início e fim de cada dia', () => {
    expect(validateAvailability({ '1': ['08:00', '18:00'] })).toEqual({})
    expect(validateAvailability({ '1': ['18:00', '08:00'] })).toHaveProperty('1')
    expect(validateAvailability({ '2': ['', '12:00'] })).toHaveProperty('2')
  })
  it('junta dias seguidos com o mesmo horário', () => {
    const a = { '1': ['08:00', '18:00'], '2': ['08:00', '18:00'], '3': ['08:00', '18:00'], '5': ['08:00', '17:30'], '6': ['09:00', '12:00'] } as const
    expect(availabilityLines(a as never)).toEqual([
      { days: 'Seg a qua', hours: '8h às 18h' },
      { days: 'Sex', hours: '8h às 17h30' },
      { days: 'Sáb', hours: '9h às 12h' },
    ])
    expect(availabilityLines({ '6': ['09:00', '12:00'], '7': ['09:00', '12:00'] })).toEqual([{ days: 'Sáb e dom', hours: '9h às 12h' }])
    expect(availabilityLines({})).toEqual([])
    expect(availabilityLines(null)).toEqual([])
  })
  it('grava em ordem e sem dias vazios', () => {
    expect(Object.keys(cleanAvailability({ '5': ['08:00', '12:00'], '1': ['08:00', '12:00'], '3': undefined }))).toEqual(['1', '5'])
  })
})

describe('formulário da conta', () => {
  it('aponta e-mail e telefone inválidos', () => {
    expect(validateAccount({ email: 'a@b.com', phone: '' }, false)).toEqual({})
    const e = validateAccount({ email: 'errado', phone: '123' }, false)
    expect(e.email).toBeDefined()
    expect(e.phone).toBeDefined()
  })
  it('conta demo não valida o que está travado', () => {
    expect(validateAccount({ email: '', phone: '123' }, true)).toEqual({})
  })
})
