# Skyro

Seu nutricionista, psicólogo ou personal acompanhando sua rotina de verdade, não só no dia da consulta.

Projeto do **Hack Brasil 2026**, trilha 04 (Saúde & bem-estar). A especificação completa do MVP está em [`docs/SKYRO-MVP.md`](docs/SKYRO-MVP.md) e os mockups em [`docs/mockups/`](docs/mockups).

## Stack

- **Frontend:** React 19 + TypeScript + Vite, Tailwind CSS v4 e React Router
- **Banco, login e regras de acesso:** Supabase (Postgres + Auth + Row Level Security)
- **App:** web responsivo e instalável (PWA), pensado primeiro para o celular

## Como rodar

> **No Mac, do zero?** Siga o passo a passo completo em [`docs/SETUP-MAC.md`](docs/SETUP-MAC.md).

Pré-requisito: Node.js 20 ou mais novo.

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie o arquivo `.env` a partir do modelo e preencha com a URL e a **publishable key** do Supabase (painel → Project Settings → API):

   ```bash
   cp .env.example .env
   ```

3. Crie as tabelas: no painel do Supabase, abra o **SQL Editor**, cole o conteúdo de cada arquivo de `supabase/migrations/` (em ordem) e clique em **Run**.

4. Crie os dados demo: no mesmo SQL Editor, rode, nessa ordem, `supabase/seed/01_contas_demo.sql`, `02_catalogo_demo.sql` e `03_pacientes_demo.sql`. Pessoa: `demo.pessoa@skyro.app`; profissional: `demo.nutri@skyro.app`. A senha das duas é `skyro-demo-2026`.

5. Suba o app:

   ```bash
   npm run dev
   ```

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com recarga automática |
| `npm run build` | Checa os tipos e gera a versão de produção em `dist/` |
| `npm run preview` | Serve a versão de produção localmente |
| `npm run lint` | Procura problemas no código (oxlint) |
| `npm test` | Roda os testes automáticos (regras de alerta, strike, datas e resumo) |

## Estrutura

```
src/
  auth/          sessão, perfil e proteção das rotas por tipo de conta
  components/    peças reutilizáveis (navegação, avatar, logo…)
  lib/           cliente do Supabase e tipos das tabelas
  pages/
    pessoa/        telas do app da pessoa
    profissional/  telas do painel do profissional
supabase/
  migrations/    SQL do banco (tabelas + regras de acesso)
  seed/          dados de demonstração (contas demo)
  tests/         teste das regras de acesso num Postgres local
docs/            especificação, pitch, análise de mercado e mockups
```

## Segurança

- Só a **publishable key** vai para o navegador. A secret key do Supabase nunca entra no código nem no repositório.
- O arquivo `.env` está no `.gitignore`.
- O profissional só enxerga os dados de quem compartilhou a rotina com ele, e a pessoa pode revogar quando quiser. Essa regra é garantida pelo banco (RLS), não só pela tela.

## Testar as regras de acesso (opcional)

Com um Postgres local (não use o Supabase de verdade para isso):

```bash
createdb skyro_teste
psql -d skyro_teste -f supabase/tests/00_stub_supabase.sql -f supabase/migrations/20261113000001_schema_inicial.sql
psql -d skyro_teste -f supabase/seed/01_contas_demo.sql -f supabase/seed/02_catalogo_demo.sql -f supabase/seed/03_pacientes_demo.sql
psql -d skyro_teste -f supabase/tests/01_rls.sql
```

As linhas marcadas com "deve FALHAR" precisam terminar em `ERROR`; as demais mostram o que cada pessoa enxerga.

---

Versão de demonstração: perfis, avaliações e registros são fictícios. A Skyro não substitui atendimento profissional e não faz diagnóstico.
