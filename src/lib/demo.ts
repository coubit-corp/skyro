// Contas de demonstração para os jurados entrarem com 1 clique.
// São públicas de propósito: só têm dados fictícios (is_demo = true).
// Elas são criadas por supabase/seed/01_contas_demo.sql (rodar no SQL Editor).
export const DEMO_ACCOUNTS = {
  person: { email: 'demo.pessoa@skyro.app', password: 'skyro-demo-2026', label: 'Entrar como pessoa (demo)' },
  professional: { email: 'demo.nutri@skyro.app', password: 'skyro-demo-2026', label: 'Entrar como profissional (demo)' },
  // Equipe: o banco só deixa esta conta aprovar ou recusar perfis de demonstração.
  team: { email: 'demo.equipe@skyro.app', password: 'skyro-demo-2026', label: 'Entrar como equipe (demo)' },
} as const
