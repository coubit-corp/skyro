// Tipos das tabelas do Supabase, espelhando supabase/migrations.
// Ao mudar uma migration, atualize aqui também (ou gere com `supabase gen types`).

/** admin = equipe Skyro (só criado por SQL; aprova os registros de conselho) */
export type Role = 'person' | 'professional' | 'admin'
export type Specialty = 'nutricionista' | 'psicologo' | 'personal' | 'fisioterapeuta'
export type Modality = 'presencial' | 'online' | 'ambos'
export type HabitKind = 'treino' | 'agua' | 'foco' | 'sono' | 'outro'

export interface Profile {
  id: string
  full_name: string
  role: Role
  avatar_seed: string | null
  is_demo: boolean
  created_at: string
}

export interface Professional {
  id: string
  specialty: Specialty
  bio: string
  registry: string | null
  verified: boolean
  tags: string[]
  city: string
  neighborhood: string | null
  lat: number | null
  lng: number | null
  modality: Modality
  rating: number | null
  reviews_count: number
  is_demo: boolean
  created_at: string
  /** Motivo da recusa do registro, escrito pela equipe. Nulo = pendente ou aprovado. */
  rejection_reason: string | null
  /** Quando a equipe decidiu pela última vez. Nulo = nunca revisado. */
  reviewed_at: string | null
}

export interface RegistryReview {
  id: string
  professional_id: string
  reviewer_id: string | null
  decision: 'aprovado' | 'recusado'
  reason: string | null
  registry: string | null
  specialty: Specialty
  created_at: string
}

export interface Habit {
  id: string
  user_id: string
  name: string
  kind: HabitKind
  scheduled_time: string | null
  goal: string | null
  active: boolean
  created_at: string
}

export interface HabitCheck {
  habit_id: string
  user_id: string
  check_date: string
  created_at: string
}

export interface DailyLog {
  id: string
  user_id: string
  log_date: string
  sleep_hours: number | null
  water_liters: number | null
  water_goal_liters: number
  focus_minutes: number | null
  workout_planned: boolean
  workout_done: boolean
  mood: string | null
  /** Dor do dia, de 0 a 10 (fisioterapia). */
  pain_level: number | null
  created_at: string
  updated_at: string
}

export interface Share {
  id: string
  person_id: string
  professional_id: string
  created_at: string
  revoked_at: string | null
}

export interface Tip {
  id: string
  professional_id: string
  person_id: string
  body: string
  created_at: string
  read_at: string | null
}

/** Tipo de item do plano: cada especialidade monta o seu. */
export type PlanKind = 'treino' | 'refeicao' | 'respiracao' | 'fisio'

export interface PlanItem {
  id: string
  professional_id: string
  person_id: string
  kind: PlanKind
  title: string
  /** 1 = segunda … 7 = domingo */
  weekdays: number[]
  sets: number | null
  reps: string | null
  load: string | null
  /** "07:30:00" */
  meal_time: string | null
  foods: string | null
  duration_min: number | null
  notes: string | null
  video_url: string | null
  position: number
  created_at: string
  updated_at: string
}

export interface PlanNote {
  professional_id: string
  person_id: string
  note: string
  updated_at: string
}

export interface PlanCheck {
  item_id: string
  person_id: string
  check_date: string
  created_at: string
}
