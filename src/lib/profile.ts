// Regras das configurações de perfil. Espelham a migration
// 20261116000001_perfil.sql para o erro aparecer na tela antes de salvar.

export const NAME_MAX = 80
export const PERSON_BIO_MAX = 300
export const PHOTO_MAX_BYTES = 10 * 1024 * 1024 // arquivo original; o app reduz antes de enviar
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// ------------------------------------------------------------- saudação

/** "Bom dia" até 11h59, "Boa tarde" até 17h59, "Boa noite" depois (e de madrugada, até 4h59). */
export function greeting(now = new Date()): string {
  const h = now.getHours()
  if (h >= 5 && h < 12) return 'Bom dia'
  if (h >= 12 && h < 18) return 'Boa tarde'
  return 'Boa noite'
}

/** Primeiro nome, com a inicial maiúscula; vazio se não houver nome. */
export function firstName(fullName: string | null | undefined): string {
  const first = (fullName ?? '').trim().split(/\s+/)[0] ?? ''
  return first ? first[0].toLocaleUpperCase('pt-BR') + first.slice(1) : ''
}

/** "Bom dia, Lucas!" ou só "Bom dia!" quando não há nome. */
export function greetingFor(fullName: string | null | undefined, now = new Date()): string {
  const name = firstName(fullName)
  return name ? `${greeting(now)}, ${name}!` : `${greeting(now)}!`
}

/** Milissegundos até a saudação mudar (5h, 12h ou 18h), para atualizar na hora certa. */
export function msUntilNextGreeting(now = new Date()): number {
  const next = new Date(now)
  const h = now.getHours()
  const target = h < 5 ? 5 : h < 12 ? 12 : h < 18 ? 18 : 29 // 29 = 5h de amanhã
  next.setHours(target, 0, 0, 0)
  return next.getTime() - now.getTime()
}

// ------------------------------------------------------------- telefone

/** Só os dígitos, sem o 55 do país quando vier junto: "+55 (11) 98765-4321" → "11987654321". */
export function phoneDigits(raw: string): string {
  const d = raw.replace(/\D/g, '')
  return d.length > 11 && d.startsWith('55') ? d.slice(2) : d
}

/** "(11) 98765-4321" enquanto a pessoa digita. */
export function formatPhone(raw: string | null | undefined): string {
  const d = phoneDigits(raw ?? '').slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  const rest = d.slice(2)
  if (rest.length <= 4) return `(${d.slice(0, 2)}) ${rest}`
  const cut = rest.length === 9 ? 5 : 4
  return `(${d.slice(0, 2)}) ${rest.slice(0, cut)}-${rest.slice(cut)}`
}

/** Erro do telefone, ou null. Vazio é permitido (o telefone é opcional). */
export function validatePhone(raw: string): string | null {
  const d = phoneDigits(raw)
  if (d.length === 0) return null
  if (d.length < 10 || d.length > 11) return 'Informe o telefone com DDD, como (11) 98765-4321.'
  if (d[0] === '0' || d[1] === '0') return 'O DDD não parece válido.'
  if (d.length === 11 && d[2] !== '9') return 'Celular com 9 dígitos começa com 9 depois do DDD.'
  return null
}

// ---------------------------------------------------------- nome e e-mail

export function validateName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, ' ')
  if (name.length < 3) return 'Informe seu nome completo.'
  if (name.length > NAME_MAX) return `Use no máximo ${NAME_MAX} caracteres.`
  if (!/\s/.test(name)) return 'Informe nome e sobrenome.'
  return null
}

export function validateEmail(raw: string): string | null {
  const email = raw.trim()
  if (!email) return 'Informe seu e-mail.'
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return 'Esse e-mail não parece válido. Ex.: nome@exemplo.com'
  return null
}

export function validatePersonBio(raw: string): string | null {
  return raw.trim().length > PERSON_BIO_MAX ? `Use no máximo ${PERSON_BIO_MAX} caracteres.` : null
}

/** Traduz os erros mais comuns do Supabase ao salvar o perfil. */
export function accountErrorMessage(message: string): string {
  if (/already (been )?registered|already exists|email_exists/i.test(message)) return 'Esse e-mail já está em uso por outra conta.'
  if (/rate limit|too many/i.test(message)) return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.'
  if (/invalid.*email|email.*invalid/i.test(message)) return 'O servidor não aceitou esse e-mail. Confira se digitou certo.'
  if (/row-level security|violates/i.test(message)) return 'Essa alteração não é permitida para esta conta.'
  if (/payload too large|exceeded the maximum/i.test(message)) return 'A foto ficou grande demais. Tente outra imagem.'
  if (/mime type|not supported/i.test(message)) return 'Esse tipo de imagem não é aceito. Use JPG, PNG ou WebP.'
  if (/bucket not found/i.test(message)) return 'O envio de fotos ainda não foi ativado no servidor.'
  if (/failed to fetch|network/i.test(message)) return 'Sem conexão com o servidor. Verifique sua internet.'
  return message
}

// ----------------------------------------------------------------- foto

export function validatePhotoFile(file: { type: string; size: number }): string | null {
  if (!PHOTO_TYPES.includes(file.type)) return 'Escolha uma imagem JPG, PNG ou WebP.'
  if (file.size > PHOTO_MAX_BYTES) return 'A imagem é muito grande (máximo de 10 MB).'
  return null
}

/** Recorte quadrado central de uma imagem w × h: de onde copiar e com que lado. */
export function squareCrop(w: number, h: number): { sx: number; sy: number; side: number } {
  const side = Math.min(w, h)
  return { sx: Math.round((w - side) / 2), sy: Math.round((h - side) / 2), side }
}

// ------------------------------------------------------------- horários

/** {"1": ["08:00", "18:00"]}: 1 = segunda … 7 = domingo; dia ausente = não atende. */
export type Availability = Partial<Record<string, [string, string]>>

export const DAY_NAMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'] as const
const DAY_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as const
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

/** Erros por dia ("1".."7"); objeto vazio se estiver tudo certo. */
export function validateAvailability(a: Availability): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const [day, range] of Object.entries(a)) {
    if (!range) continue
    const [start, end] = range
    if (!TIME.test(start) || !TIME.test(end)) errors[day] = 'Informe o início e o fim.'
    else if (start >= end) errors[day] = 'O fim precisa ser depois do início.'
  }
  return errors
}

/** Tira dias vazios e ordena, para gravar. */
export function cleanAvailability(a: Availability): Availability {
  const out: Availability = {}
  for (const day of ['1', '2', '3', '4', '5', '6', '7']) if (a[day]) out[day] = a[day]
  return out
}

const hour = (t: string) => (t.endsWith(':00') ? `${Number(t.slice(0, 2))}h` : `${Number(t.slice(0, 2))}h${t.slice(3)}`)

/**
 * Linhas para mostrar no perfil, juntando dias seguidos com o mesmo horário:
 * [{ days: "Seg a qui", hours: "8h às 18h" }, { days: "Sex", hours: "8h às 17h" }]
 */
export function availabilityLines(a: Availability | null | undefined): { days: string; hours: string }[] {
  const lines: { from: number; to: number; key: string }[] = []
  for (let d = 1; d <= 7; d++) {
    const r = a?.[String(d)]
    if (!r) continue
    const key = `${r[0]}-${r[1]}`
    const last = lines[lines.length - 1]
    if (last && last.key === key && last.to === d - 1) last.to = d
    else lines.push({ from: d, to: d, key })
  }
  return lines.map((l) => {
    const [s, e] = l.key.split('-')
    const from = DAY_SHORT[l.from - 1]
    const to = DAY_SHORT[l.to - 1].toLowerCase()
    const days = l.from === l.to ? from : l.to === l.from + 1 ? `${from} e ${to}` : `${from} a ${to}`
    return { days, hours: `${hour(s)} às ${hour(e)}` }
  })
}

// ------------------------------------------------------ formulário da conta

/** O que fazer com a foto ao salvar. */
export type PhotoChange = { kind: 'keep' } | { kind: 'new'; blob: Blob; previewUrl: string } | { kind: 'remove' }

export interface AccountValues {
  email: string
  phone: string
  photo: PhotoChange
}

export type AccountErrors = Partial<Record<'email' | 'phone', string>>

/** Conta demo tem e-mail e telefone travados, então não há o que validar. */
export function validateAccount(v: Pick<AccountValues, 'email' | 'phone'>, demo: boolean): AccountErrors {
  if (demo) return {}
  const e: AccountErrors = {}
  const email = validateEmail(v.email)
  const phone = validatePhone(v.phone)
  if (email) e.email = email
  if (phone) e.phone = phone
  return e
}
