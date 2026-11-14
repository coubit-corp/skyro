import { describe, expect, it } from 'vitest'
import { buildUserMessage, parseRequestBody, parseSummary, type LogRow } from './prompt'

const log = (date: string, over: Partial<LogRow> = {}): LogRow => ({
  log_date: date, sleep_hours: 7, water_liters: 2, water_goal_liters: 2, focus_minutes: 60,
  workout_planned: true, workout_done: true, ...over,
})

describe('buildUserMessage', () => {
  const msg = buildUserMessage({
    firstName: 'Lucas',
    specialty: 'nutricionista',
    todayIso: '2026-11-14',
    alerts: ['Dormiu 5h30'],
    logs: [log('2026-11-14', { sleep_hours: 5.5, workout_done: false }), log('2026-11-12', { workout_done: false })],
  })

  it('ordena os dias e marca hoje', () => {
    const table = msg.slice(msg.indexOf('<registros>'))
    expect(table.indexOf('2026-11-12')).toBeLessThan(table.indexOf('2026-11-14'))
    expect(msg).toContain('2026-11-14 (hoje) | sono 5,5h')
  })
  it('não trata o treino de hoje como falta', () => {
    expect(msg).toContain('treino ainda não feito hoje')
    expect(msg).toContain('2026-11-12 | sono 7h | água 2 L de 2 L | foco 60 min | faltou ao treino')
  })
  it('leva os alertas e só o primeiro nome', () => {
    expect(msg).toContain('- Dormiu 5h30')
    expect(msg).toContain('Paciente: Lucas')
    expect(msg).toContain('Profissional: nutricionista')
  })
  it('avisa quando não há registros', () => {
    const empty = buildUserMessage({ firstName: 'A', specialty: 'personal', todayIso: '2026-11-14', alerts: [], logs: [] })
    expect(empty).toContain('nenhum registro nos últimos 14 dias')
    expect(empty).toContain('- nenhum')
  })
})

describe('parseSummary', () => {
  it('aceita a resposta no formato certo', () => {
    expect(parseSummary('{"linhas":[" a ","b"],"ponto_de_atencao":" c "}')).toEqual({ lines: ['a', 'b'], attention: 'c' })
  })
  it('corta em 5 linhas e descarta linhas vazias', () => {
    const r = parseSummary(JSON.stringify({ linhas: ['1', '', '2', '3', '4', '5', '6'], ponto_de_atencao: 'x' }))
    expect(r.lines).toEqual(['1', '2', '3', '4', '5'])
  })
  it('recusa JSON inválido, formato errado ou resumo vazio', () => {
    expect(() => parseSummary('não é json')).toThrow()
    expect(() => parseSummary('{"linhas":"a","ponto_de_atencao":"b"}')).toThrow()
    expect(() => parseSummary('{"linhas":[],"ponto_de_atencao":"b"}')).toThrow()
  })
})

describe('parseRequestBody', () => {
  it('valida o personId e limita os alertas', () => {
    const r = parseRequestBody({ personId: 'd0000000-0000-4000-8000-000000000001', alerts: ['a', 2, 'b', 'c', 'd', 'e'] })
    expect(r.alerts).toEqual(['a', 'b', 'c', 'd'])
    expect(() => parseRequestBody({ personId: "1; drop table" })).toThrow()
    expect(() => parseRequestBody(null)).toThrow()
  })
})
