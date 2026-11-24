# Desenvolvimento

Guia técnico para quem vai mexer no código: como rodar, preparar o Supabase, ligar a IA e publicar.

## Stack

- **Frontend:** React 19 + TypeScript + Vite, Tailwind CSS v4, React Router e React Query
- **Banco, login e regras de acesso:** Supabase (Postgres + Auth + Row Level Security)
- **App:** web responsivo e instalável (PWA), pensado primeiro para o celular
- **Mapa:** OpenStreetMap + Leaflet. Busca de endereço pelo Nominatim, só ao tocar em "Buscar"
- **IA:** resumo semanal escrito por um modelo de linguagem (via API) numa Supabase Edge Function (Deno)
- **Testes:** Vitest (lógica) e SQL contra um Postgres local (regras de acesso)

## Como rodar

Pré-requisito: Node.js 20 ou mais novo.

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie o `.env` a partir do modelo e preencha com a URL e a **publishable key** do Supabase (Project Settings → API). Nunca coloque a secret key aqui:

   ```bash
   cp .env.example .env
   ```

3. No **SQL Editor** do Supabase, rode **em ordem**, um arquivo por vez (New query → colar → Run):
   1. as migrations de `supabase/migrations/`, na ordem do nome do arquivo
   2. os seeds `supabase/seed/01_contas_demo.sql`, `02_catalogo_demo.sql`, `03_pacientes_demo.sql`, `04_vitrine_demo.sql` e `05_mensagens_demo.sql`

   Rode cada migration uma vez só: rodar de novo dá erro "already exists" (só a `20261118000002_mensagens.sql` pode ser repetida). Se uma parar no meio, o banco fica pela metade; em projeto de teste, o mais simples é recriar o projeto ou apagar as tabelas e começar de novo. Os seeds podem ser rodados de novo quando os dados demo ficarem bagunçados: eles apagam e recriam tudo com as datas de hoje.

4. Em **Authentication → Sign In / Providers → Email**, desligue **Confirm email** (para criar contas de teste sem clicar no link do e-mail). Em **Authentication → URL Configuration**, coloque `http://localhost:5173` em **Site URL**.

5. Suba o app e abra http://localhost:5173:

   ```bash
   npm run dev
   ```

### Contas demo

Os botões "Entrar como … (demo)" da tela de login usam as três primeiras. A senha de todas é `skyro-demo-2026`.

| Conta | E-mail |
|---|---|
| Cliente (Lucas Martins) | `demo.pessoa@skyro.app` |
| Profissional (Ana Lima, nutricionista) | `demo.nutri@skyro.app` |
| Equipe Skyro (aprova registros; só mexe em perfis demo) | `demo.equipe@skyro.app` |
| Personal do Lucas (Pedro Alves) | `demo.catalogo.3@skyro.app` |
| Psicólogo do Lucas (Carlos Souza) | `demo.catalogo.1@skyro.app` |
| Fisio do Lucas (Fernanda Dias) | `demo.catalogo.8@skyro.app` |

As três últimas vêm do seed `02` e não têm botão: para entrar, digite o e-mail e a senha na aba **Entrar**.

### Ligar o resumo por IA (opcional)

Sem isto o app funciona igual: a ficha do paciente mostra o resumo **montado por regras**. Com isto, o resumo passa a ser **escrito por um modelo de linguagem**. A chave fica guardada no Supabase e nunca vai para o navegador.

1. Crie uma chave de API no console do provedor do modelo (a função usa a API da Anthropic).
2. No painel do Supabase: **Edge Functions → Secrets** → adicione `ANTHROPIC_API_KEY` com a chave.
3. Instale a [Supabase CLI](https://supabase.com/docs/guides/cli), entre na conta e publique a função:

   ```bash
   supabase login
   ```

   ```bash
   supabase link --project-ref <ref-do-seu-projeto>
   ```

   ```bash
   supabase functions deploy resumo-semanal
   ```

Pronto: ao abrir um paciente, o selo do resumo muda de **Automático** para **Escrito por IA**. O resumo é guardado e só é gerado de novo quando há registro novo ou o dia vira. Cada resumo novo é uma chamada paga à API; para desligar, apague o secret e o app volta para o resumo por regras.

### Publicar na Vercel

1. Em vercel.com, importe o repositório (**Add New → Project**). O `vercel.json` já define build, saída e as regras de rotas; o preset é **Vite**.
2. Em **Environment Variables**, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (as mesmas do `.env`). Só a publishable key.
3. Em **Settings → Deployment Protection**, desligue a proteção se o link precisa abrir para qualquer pessoa.
4. No Supabase, em **Authentication → URL Configuration**, coloque o link da Vercel em **Site URL** e `https://seu-link.vercel.app/**` em **Redirect URLs**. Sem isso, links de confirmação e de recuperação de senha apontam para o lugar errado.
5. Confira o que foi publicado (deve terminar com **Tudo certo.**):

   ```bash
   npm run smoke -- https://seu-link.vercel.app
   ```

Com o repositório ligado à Vercel, cada merge na `main` publica sozinho.

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
    equipe/        área da equipe Skyro (aprovar ou recusar registros)
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
| `20261115000001_aprovacao_registros.sql` | Papel `admin` (equipe), aprovação e recusa do registro pela função `review_professional()`, histórico em `registry_reviews` e recusado fora da busca |
| `20261115000002_planos.sql` | "Meu plano": itens por especialidade (`plan_items`), recado (`plan_notes`), marcações (`plan_checks`) e dor do dia (`daily_logs.pain_level`) |
| `20261116000001_perfil.sql` | Configurações de perfil: `profiles.bio` e `avatar_path`, telefone privado (`private_contacts`), horários (`professionals.availability`) e o bucket `avatars` |
| `20261118000001_vitrine_profissional.sql` | Vitrine do profissional: formação, anos na área, ano de nascimento, experiências e redes sociais (`professionals`), galeria (`professional_media` e bucket `portfolio`) e avaliações (`professional_reviews`), com nota e total recalculados pelo banco |
| `20261118000002_mensagens.sql` | Mensagens entre a pessoa e o profissional (`messages`), só com compartilhamento ativo |

Regra central, garantida pelo banco (RLS) e não só pela tela: **o profissional só lê a rotina de quem compartilhou com ele, e perde o acesso na hora em que a pessoa revoga.**

## Segurança

- Só a **publishable key** vai para o navegador. A secret key do Supabase e a chave da API de IA nunca entram no código nem no repositório.
- O `.env` está no `.gitignore`.
- Selo de verificado, nota e marcação de demo não podem ser alterados pelo próprio usuário (permissões por coluna).
- **Telefone:** fica em `private_contacts`, que só o dono lê e escreve.
- **Fotos:** bucket `avatars`. Cada conta só envia e apaga na própria pasta, e o perfil só aponta para um arquivo dessa pasta. Contas demo não enviam foto nem guardam telefone.
- **Galeria do profissional:** bucket `portfolio` (fotos reduzidas no aparelho e vídeos de até 50 MB). Mesma regra da pasta própria; no máximo 12 itens. Vídeos do YouTube, Google Drive e Vimeo guardam só o código do vídeo, e o app monta o endereço do player oficial.
- **Redes sociais:** o banco só aceita links `https` do próprio site de cada rede (Instagram, Facebook, TikTok, YouTube, LinkedIn) e `https` para o site. Contas demo não colocam links.
- **Avaliações:** só avalia quem já compartilhou a rotina com o profissional (mesmo que tenha parado), uma por pessoa. A avaliação mostra só o primeiro nome e a inicial do sobrenome, gravados pelo banco. Psicólogos não recebem avaliações públicas (regras do CFP). Conta demo só avalia profissional demo.
- **Mensagens:** só conversa quem tem compartilhamento ativo. Quando a pessoa para de compartilhar, o profissional perde o acesso à conversa (inclusive ao histórico) e ninguém manda mensagem nova; a pessoa continua lendo o próprio histórico. Ninguém edita nem apaga mensagens, e só quem recebeu marca como lida. Contas demo só conversam com contas demo. Sem tempo real: a conversa aberta é buscada de novo a cada 8 s.
- **Equipe (admin):** o papel só é dado por SQL; o cadastro pelo app nunca cria admin. O selo só muda pela função `review_professional()`, que confere o papel de quem chama. A conta demo da equipe só decide sobre perfis demo.

## Como a IA entra

- **Quem está em "Atenção" é decidido por regras fixas** (`src/lib/alerts.ts`), nunca pela IA.
- **A IA só escreve o texto do resumo para o profissional**: não fala com o paciente, não diagnostica e não prescreve (`supabase/functions/resumo-semanal/prompt.ts`).
- **O que vai para a IA:** só o primeiro nome e os números dos últimos 14 dias.
- **Cache:** o resumo só é refeito quando há registro novo ou o dia vira.
- **Reserva:** sem chave, ou se a IA falhar ou recusar, aparece o resumo por regras (`src/lib/weekSummary.ts`).

Como ligar: seção "Ligar o resumo por IA", acima.

## Testar as regras de acesso

Com um Postgres local (nunca no Supabase de verdade):

```bash
createdb skyro_teste
```

```bash
psql -d skyro_teste -f supabase/tests/00_stub_supabase.sql -f supabase/migrations/20261113000001_schema_inicial.sql -f supabase/migrations/20261114000001_resumos_ia.sql -f supabase/migrations/20261114000002_cadastro_profissional.sql -f supabase/migrations/20261115000001_aprovacao_registros.sql -f supabase/migrations/20261115000002_planos.sql -f supabase/migrations/20261116000001_perfil.sql -f supabase/migrations/20261118000001_vitrine_profissional.sql -f supabase/migrations/20261118000002_mensagens.sql
```

```bash
psql -d skyro_teste -f supabase/seed/01_contas_demo.sql -f supabase/seed/02_catalogo_demo.sql -f supabase/seed/03_pacientes_demo.sql -f supabase/seed/04_vitrine_demo.sql -f supabase/seed/05_mensagens_demo.sql
```

```bash
psql -d skyro_teste -f supabase/tests/02_rls_resumos_ia.sql
```

```bash
psql -d skyro_teste -f supabase/tests/03_cadastro_profissional.sql
```

```bash
psql -d skyro_teste -f supabase/tests/04_aprovacao_registros.sql
```

```bash
psql -d skyro_teste -f supabase/tests/05_planos.sql
```

```bash
psql -d skyro_teste -f supabase/tests/06_perfil.sql
```

```bash
psql -d skyro_teste -f supabase/tests/07_vitrine.sql
```

```bash
psql -d skyro_teste -f supabase/tests/08_mensagens.sql
```

Rode um arquivo por comando: cada teste muda o papel da sessão, e o seguinte precisa começar do zero. O 04, o 05 e o 06 mudam dados, então rode cada um num banco recém-criado (com o stub, as migrations e os seeds).

As linhas marcadas com "deve FALHAR" precisam terminar em `ERROR`. O `01_rls.sql` cria os próprios usuários e deve rodar num banco novo, só com o stub e as migrations.
