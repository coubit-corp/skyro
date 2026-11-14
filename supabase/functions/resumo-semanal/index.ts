// Supabase Edge Function: resumo semanal do paciente escrito por IA (Claude).
//
// Segurança:
// - A chave da Anthropic fica só aqui (secret ANTHROPIC_API_KEY), nunca no navegador.
// - As consultas usam o token de quem chamou, então as regras de acesso (RLS) valem:
//   o profissional só consegue resumir quem compartilha a rotina com ele.
// - Vai para a IA apenas o primeiro nome e os números dos registros.
//
// Sem chave configurada, responde 503 e o app mostra o resumo por regras.

import Anthropic from 'npm:@anthropic-ai/sdk@1.8.0'
import { createClient } from 'npm:@supabase/supabase-js@2.119.0'
import { buildUserMessage, MODEL, OUTPUT_SCHEMA, parseRequestBody, parseSummary, SYSTEM_PROMPT, type LogRow } from './prompt.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

/** "Hoje" no horário de Brasília, igual ao app e aos seeds. */
function todayInBrazil(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}

function daysAgo(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json(405, { error: 'metodo_nao_permitido' })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json(401, { error: 'nao_autenticado' })

  let personId: string
  let alerts: string[]
  try {
    ;({ personId, alerts } = parseRequestBody(await req.json()))
  } catch (e) {
    return json(400, { error: 'pedido_invalido', message: (e as Error).message })
  }

  // Cliente do Supabase agindo como o profissional logado (RLS aplicado).
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return json(401, { error: 'nao_autenticado' })
  const proId = userData.user.id

  const { data: share } = await supabase
    .from('shares')
    .select('person_id, profiles(full_name)')
    .eq('professional_id', proId)
    .eq('person_id', personId)
    .is('revoked_at', null)
    .maybeSingle()
  if (!share) return json(403, { error: 'sem_compartilhamento' })

  const today = todayInBrazil()
  const [{ data: pro }, { data: logs, error: logsError }] = await Promise.all([
    supabase.from('professionals').select('specialty').eq('id', proId).maybeSingle(),
    supabase
      .from('daily_logs')
      .select('log_date, sleep_hours, water_liters, water_goal_liters, focus_minutes, workout_planned, workout_done, updated_at')
      .eq('user_id', personId)
      .gte('log_date', daysAgo(today, 13))
      .order('log_date'),
  ])
  if (logsError) return json(500, { error: 'erro_ao_ler_registros' })

  // Versão dos dados: muda quando o dia vira ou quando o paciente registra algo.
  const lastUpdate = (logs ?? []).reduce((max, l) => (l.updated_at > max ? l.updated_at : max), '')
  const logsVersion = `${today}|${logs?.length ?? 0}|${lastUpdate}`

  const { data: cached } = await supabase
    .from('ai_summaries')
    .select('lines, attention, model')
    .eq('professional_id', proId)
    .eq('person_id', personId)
    .eq('logs_version', logsVersion)
    .maybeSingle()
  if (cached) return json(200, { source: 'cache', lines: cached.lines, attention: cached.attention, model: cached.model })

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return json(503, { error: 'ia_desligada' })

  const fullName = (share.profiles as unknown as { full_name: string } | null)?.full_name ?? ''
  const userMessage = buildUserMessage({
    firstName: fullName.split(' ')[0] || 'Paciente',
    specialty: pro?.specialty ?? 'profissional de saúde',
    todayIso: today,
    logs: (logs ?? []) as LogRow[],
    alerts,
  })

  const anthropic = new Anthropic({ apiKey, timeout: 60_000, maxRetries: 1 })
  let response
  try {
    response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
      // Resumo curto de dados tabelados: esforço baixo basta e responde mais rápido.
      output_config: { effort: 'low', format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
      // Se o modelo recusar o pedido, a própria API tenta de novo no modelo recomendado.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    })
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return json(503, { error: 'ia_chave_invalida' })
    if (e instanceof Anthropic.RateLimitError) return json(429, { error: 'ia_ocupada' })
    if (e instanceof Anthropic.APIError) return json(502, { error: 'ia_falhou', status: e.status })
    return json(502, { error: 'ia_falhou' })
  }

  if (response.stop_reason === 'refusal') return json(502, { error: 'ia_recusou' })

  const text = response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('')
  let summary
  try {
    summary = parseSummary(text)
  } catch {
    return json(502, { error: 'ia_formato_invalido' })
  }

  // Guarda no cache. Se dois pedidos chegarem juntos, o segundo bate na
  // restrição de unicidade; não tem problema, o resumo já está salvo.
  await supabase.from('ai_summaries').insert({
    professional_id: proId,
    person_id: personId,
    logs_version: logsVersion,
    lines: summary.lines,
    attention: summary.attention,
    model: response.model,
  })

  return json(200, { source: 'ia', ...summary, model: response.model })
})
