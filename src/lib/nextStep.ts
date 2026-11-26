// "Seu próximo passo" no Início: o hábito pendente que faz mais sentido agora.

export interface HabitLike {
  id: string
  name: string
  /** "HH:MM" ou "HH:MM:SS"; null = o dia todo */
  scheduled_time: string | null
}

export type NextStepStatus = 'proximo' | 'dia_todo' | 'atrasado'

function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/**
 * Ordem de escolha entre os hábitos que ainda não foram marcados hoje:
 * 1. o próximo com horário que ainda não passou;
 * 2. se não houver, um de "dia todo";
 * 3. se não houver, o último com horário que já passou (o mais recente ainda faz sentido retomar).
 * Devolve null quando tudo foi marcado.
 */
export function nextStep<T extends HabitLike>(
  habits: T[],
  doneIds: Set<string>,
  nowMinutes: number,
): { habit: T; status: NextStepStatus } | null {
  const pending = habits.filter((h) => !doneIds.has(h.id))
  const timed = pending
    .filter((h) => h.scheduled_time)
    .sort((a, b) => minutesOf(a.scheduled_time!) - minutesOf(b.scheduled_time!))
  const untimed = pending.filter((h) => !h.scheduled_time)

  const upcoming = timed.find((h) => minutesOf(h.scheduled_time!) >= nowMinutes)
  if (upcoming) return { habit: upcoming, status: 'proximo' }
  if (untimed.length > 0) return { habit: untimed[0], status: 'dia_todo' }
  if (timed.length > 0) return { habit: timed[timed.length - 1], status: 'atrasado' }
  return null
}
