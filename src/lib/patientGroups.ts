// Como o painel do profissional separa os pacientes.
// "Sem registro" não é o mesmo que "teve dificuldade": ausência de registro é
// ausência de informação, e não quer dizer que a pessoa deixou de fazer a atividade.

import type { PatientStatus } from './alerts'

export type PatientGroup = 'atencao' | 'sem_registro' | 'em_dia'

/** Em qual grupo o paciente fica: alerta de rotina, só falta de registro, ou em dia. */
export function groupOf(evaluation: Pick<PatientStatus, 'status' | 'alerts'>): PatientGroup {
  if (evaluation.status !== 'atencao') return 'em_dia'
  return evaluation.alerts.some((a) => a.kind !== 'sem_registro') ? 'atencao' : 'sem_registro'
}

/** Divide a lista nos três grupos, mantendo a ordem em que veio. */
export function groupPatients<T extends { evaluation: Pick<PatientStatus, 'status' | 'alerts'> }>(
  patients: T[],
): Record<PatientGroup, T[]> {
  const groups: Record<PatientGroup, T[]> = { atencao: [], sem_registro: [], em_dia: [] }
  for (const p of patients) groups[groupOf(p.evaluation)].push(p)
  return groups
}

/** Texto do cartão azul do topo: quantos precisam de atenção e quantos só estão sem registro. */
export function attentionSummary(counts: Record<PatientGroup, number>): {
  count: number
  title: string
  subtitle: string
} {
  const { atencao, sem_registro } = counts
  const semRegistro =
    sem_registro === 0
      ? ''
      : sem_registro === 1
        ? '1 paciente sem registro recente'
        : `${sem_registro} pacientes sem registro recente`

  if (atencao === 0) {
    return {
      count: 0,
      title: sem_registro === 0 ? 'Todos os pacientes estão em dia' : 'Nenhum paciente com alerta de rotina',
      subtitle: semRegistro || 'sono, treino e água dentro do esperado',
    }
  }
  return {
    count: atencao,
    title: atencao === 1 ? 'paciente precisa de atenção hoje' : 'pacientes precisam de atenção hoje',
    subtitle: semRegistro
      ? `sono curto, treinos perdidos ou pouca água · ${semRegistro}`
      : 'sono curto, treinos perdidos ou pouca água',
  }
}
