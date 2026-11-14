// Contas de demonstração para os jurados entrarem com 1 clique.
// São públicas de propósito: só têm dados fictícios (is_demo = true).
// As três primeiras são criadas por supabase/seed/01_contas_demo.sql e as da
// equipe do Lucas, por supabase/seed/02_catalogo_demo.sql (rodar no SQL Editor).
const PASSWORD = 'skyro-demo-2026'

export const DEMO_ACCOUNTS = {
  person: { email: 'demo.pessoa@skyro.app', password: PASSWORD, label: 'Entrar como pessoa (demo)' },
  professional: { email: 'demo.nutri@skyro.app', password: PASSWORD, label: 'Entrar como profissional (demo)' },
  // Equipe: o banco só deixa esta conta aprovar ou recusar perfis de demonstração.
  team: { email: 'demo.equipe@skyro.app', password: PASSWORD, label: 'Entrar como equipe (demo)' },
} as const

/**
 * Os outros profissionais que acompanham o Lucas. Cada um monta a própria área
 * do "Meu plano": treino, respiração ou fisio (a nutricionista é a conta acima).
 */
export const DEMO_TEAM_PROS = [
  { email: 'demo.catalogo.3@skyro.app', password: PASSWORD, label: 'Personal', name: 'Pedro' },
  { email: 'demo.catalogo.1@skyro.app', password: PASSWORD, label: 'Psicólogo', name: 'Carlos' },
  { email: 'demo.catalogo.8@skyro.app', password: PASSWORD, label: 'Fisio', name: 'Fernanda' },
] as const
