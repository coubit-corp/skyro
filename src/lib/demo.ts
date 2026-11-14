// Contas de demonstração para os jurados entrarem com 1 clique.
// São públicas de propósito: só têm dados fictícios (is_demo = true).
// Elas são criadas por supabase/seed/01_contas_demo.sql (rodar no SQL Editor).
// O personal, o psicólogo e a fisio do Lucas também têm login (seed 02), mas
// sem botão: entra-se digitando o e-mail e a senha (veja docs/SETUP-MAC.md).
const PASSWORD = 'skyro-demo-2026'

export const DEMO_ACCOUNTS = {
  person: { email: 'demo.pessoa@skyro.app', password: PASSWORD, label: 'Entrar como pessoa (demo)' },
  professional: { email: 'demo.nutri@skyro.app', password: PASSWORD, label: 'Entrar como profissional (demo)' },
  // Equipe: o banco só deixa esta conta aprovar ou recusar perfis de demonstração.
  team: { email: 'demo.equipe@skyro.app', password: PASSWORD, label: 'Entrar como equipe (demo)' },
} as const
