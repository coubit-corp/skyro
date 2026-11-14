# Desenvolvimento

Guia técnico para quem vai mexer no código. Para rodar do zero no Mac, veja [`SETUP-MAC.md`](SETUP-MAC.md); para publicar, [`DEPLOY-VERCEL.md`](DEPLOY-VERCEL.md).

## Stack

- **Frontend:** React 19 + TypeScript + Vite, Tailwind CSS v4, React Router e React Query
- **Banco, login e regras de acesso:** Supabase (Postgres + Auth + Row Level Security)
- **App:** web responsivo e instalável (PWA), pensado primeiro para o celular
- **Mapa:** OpenStreetMap + Leaflet. Busca de endereço pelo Nominatim, só ao tocar em "Buscar"
- **IA:** resumo semanal escrito pelo Claude (Anthropic) numa Supabase Edge Function (Deno)
- **Testes:** Vitest (lógica) e SQL contra um Postgres local (regras de acesso)

## Como rodar

Pré-requisito: Node.js 20 ou mais novo.

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie o `.env` a partir do modelo e preencha com a URL e a **publishable key** do Supabase:

   ```bash
   cp .env.example .env
   ```

3. No **SQL Editor** do Supabase, rode **em ordem**:
   1. as migrations de `supabase/migrations/`
   2. os seeds `supabase/seed/01_contas_demo.sql`, `02_catalogo_demo.sql` e `03_pacientes_demo.sql`

4. Suba o app:

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
| `npm test` | Testes automáticos (alertas, strike, datas, resumo, formulário, avatar e prompt da IA) |
| `npm run smoke -- <link>` | Confere se o app publicado está no ar e configurado |

## Estrutura

```
src/
  auth/          sessão, perfil e proteção das rotas (por tipo de conta e perfil completo)
  components/    peças reutilizáveis (navegação, avatar, mapa, formulário…)
  hooks/         consultas ao Supabase (pessoa e profissional) e localização
  lib/           regras puras e testadas: alertas, resumo, strike, datas, formulário, endereço
  pages/
    pessoa/        telas do app da pessoa
    profissional/  telas do painel do profissional
supabase/
  functions/     Edge Function resumo-semanal (resumo por IA)
  migrations/    SQL do banco (tabelas + regras de acesso)
  seed/          dados de demonstração
  tests/         testes das regras de acesso num Postgres local
docs/            especificação, pitch, análise de mercado, mockups e guias
```

## Banco de dados

| Migration | O que cria |
|---|---|
| `20261113000001_schema_inicial.sql` | Tabelas `profiles`, `professionals`, `habits`, `habit_checks`, `daily_logs`, `shares`, `tips` e as regras de acesso |
| `20261114000001_resumos_ia.sql` | Cache dos resumos por IA (`ai_summaries`) |
| `20261114000002_cadastro_profissional.sql` | Edição do perfil pelo profissional, local obrigatório no presencial e perda do selo ao trocar o registro |

Regra central, garantida pelo banco (RLS) e não só pela tela: **o profissional só lê a rotina de quem compartilhou com ele, e perde o acesso na hora em que a pessoa revoga.**

## Segurança

- Só a **publishable key** vai para o navegador. A secret key do Supabase e a chave da Anthropic nunca entram no código nem no repositório.
- O `.env` está no `.gitignore`.
- Selo de verificado, nota e marcação de demo não podem ser alterados pelo próprio usuário (permissões por coluna).

## Como a IA entra

- **Quem está em "Atenção" é decidido por regras fixas** (`src/lib/alerts.ts`), nunca pela IA.
- **A IA só escreve o texto do resumo para o profissional**: não fala com o paciente, não diagnostica e não prescreve (`supabase/functions/resumo-semanal/prompt.ts`).
- **O que vai para a IA:** só o primeiro nome e os números dos últimos 14 dias.
- **Cache:** o resumo só é refeito quando há registro novo ou o dia vira.
- **Reserva:** sem chave, ou se a IA falhar ou recusar, aparece o resumo por regras (`src/lib/weekSummary.ts`).

Como ligar: passo 3.5 de [`SETUP-MAC.md`](SETUP-MAC.md).

## Testar as regras de acesso

Com um Postgres local (nunca no Supabase de verdade):

```bash
createdb skyro_teste
```

```bash
psql -d skyro_teste -f supabase/tests/00_stub_supabase.sql -f supabase/migrations/20261113000001_schema_inicial.sql -f supabase/migrations/20261114000001_resumos_ia.sql -f supabase/migrations/20261114000002_cadastro_profissional.sql
```

```bash
psql -d skyro_teste -f supabase/seed/01_contas_demo.sql -f supabase/seed/02_catalogo_demo.sql -f supabase/seed/03_pacientes_demo.sql
```

```bash
psql -d skyro_teste -f supabase/tests/02_rls_resumos_ia.sql -f supabase/tests/03_cadastro_profissional.sql
```

As linhas marcadas com "deve FALHAR" precisam terminar em `ERROR`. O `01_rls.sql` cria os próprios usuários e deve rodar num banco novo, só com o stub e as migrations.
