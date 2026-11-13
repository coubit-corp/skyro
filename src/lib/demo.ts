// Contas de demonstração para os jurados entrarem com 1 clique.
// São públicas de propósito: só têm dados fictícios (is_demo = true).
// Elas são criadas pelo script de dados demonstrativos (próxima etapa).
export const DEMO_ACCOUNTS = {
  person: { email: 'demo.pessoa@skyro.app', password: 'skyro-demo-2026', label: 'Entrar como pessoa (demo)' },
  professional: { email: 'demo.nutri@skyro.app', password: 'skyro-demo-2026', label: 'Entrar como profissional (demo)' },
} as const
