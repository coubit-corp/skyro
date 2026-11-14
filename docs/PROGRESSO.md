# Skyro: o que já foi feito e os próximos passos

Situação em 14/11/2026 · Hack Brasil 2026 · Trilha Saúde & bem-estar · Entrega: **30/11, 23h59**

---

## Resumo em 30 segundos

O **MVP da especificação está completo** e funcionando de ponta a ponta:

1. A **pessoa** marca a rotina (sono, água, foco, treino), mantém o strike, encontra um profissional no mapa e **compartilha a rotina** com consentimento explícito.
2. O **profissional** vê quem **precisa de atenção hoje** (regras fixas da especificação), abre a ficha, lê o **resumo da semana** (por IA ou por regras) e **manda uma dica**.
3. A **dica aparece no Início** da pessoa.

Tudo está no código, com 40 testes automáticos, regras de acesso testadas no banco e documentação para rodar no Mac.

---

## O que já foi feito

### Etapa 1: base do projeto (PR #6)
- **Stack:** React 19 + TypeScript + Vite + Tailwind CSS v4, Supabase (banco, login e regras de acesso) e app instalável (PWA)
- **Banco:** 7 tabelas (`profiles`, `professionals`, `habits`, `habit_checks`, `daily_logs`, `shares`, `tips`) com **regras de acesso no próprio banco (RLS)**:
  - cada pessoa só mexe nos próprios dados
  - o profissional só **lê** a rotina de quem compartilhou e perde o acesso na hora em que a pessoa revoga
  - ninguém consegue trocar o próprio papel, se dar selo de verificado ou mudar a nota
- **Login e cadastro** por e-mail e senha, com botões de **conta demo** (1 clique para os jurados)
- **Navegação** igual aos mockups: embaixo no celular, barra lateral no desktop
- **Contas demo:** Lucas (pessoa) e Ana (nutricionista), senha `skyro-demo-2026`
- **Guia** `docs/SETUP-MAC.md` para rodar do zero no Mac

### Etapa 2: telas da pessoa (PR #7)
- **Início:** strike com recorde, sono, foco, dica do profissional e checklist do dia
- **Rotina:** semana, hábitos (marcar, adicionar, remover) e registro do dia
- **Saúde:** atalhos por especialidade e "Sua equipe"
- **Perto de você:** **mapa real** (OpenStreetMap), filtro e lista por distância
- **Perfil do profissional** com **Compartilhar minha rotina** (tela de consentimento) e **Parar de compartilhar**
- **Catálogo demo:** 12 profissionais fictícios em São Paulo

### Etapa 3: painel do profissional (PR #8)
- **Regras de alerta** exatamente como na especificação: sono < 6h, 2+ treinos perdidos na semana, água < 50% ontem e 2+ dias sem registro
- **Pacientes:** "N pacientes precisam de atenção hoje", busca e motivo de cada alerta
- **Ficha do paciente:** números da semana, alertas, resumo, tabela dos 7 dias, envio de dica e histórico
- **Pacientes demo:** a Ana tem 6, sendo 3 em Atenção (cada um por um motivo), como no mockup
- **Testes automáticos** (`npm test`)

### Etapa 4: resumo por IA (PR #9)
- **Edge Function** `resumo-semanal` chama o **Claude**; a chave fica só no servidor
- A IA **só escreve o texto**: quem está em Atenção continua sendo decidido pelas regras
- Envia para a IA **só o primeiro nome e os números**
- **Cache:** reabrir a ficha não gera custo; o resumo só é refeito quando há registro novo
- **Sem chave, ou se a IA falhar**, aparece o resumo por regras, e a demo nunca quebra

### Etapa 5: preparação para publicar (PR #5)
- `vercel.json` (links diretos funcionando, cache e cabeçalhos de segurança)
- `npm run smoke -- <link>` confere se o app publicado está certo
- Guia `docs/DEPLOY-VERCEL.md`

### Etapa 6: cadastro de profissional
- Quem cria conta como profissional cai em **"Complete seu perfil"** e só entra no painel depois de preencher: especialidade, registro no conselho, bio, especialidades, modalidade e local
- **Local de atendimento:** buscar o endereço **ou** tocar e arrastar o pino no mapa; o bairro é preenchido sozinho. Quem atende só online não precisa de local
- O registro fica **"em verificação"** até a equipe aprovar. Trocar registro ou especialidade tira o selo, e o banco garante isso
- O profissional aparece no "Perto de você" **assim que publica**; quem atende só online aparece numa lista própria
- Aba **Meu perfil**, com edição

### Qualidade
| O quê | Situação |
|---|---|
| Testes automáticos (`npm test`) | 53 passando, com relógio em São Paulo e em UTC |
| Regras de acesso do banco | Testadas num Postgres local (`supabase/tests/`) |
| Tipos e lint | Sem erros nem avisos |
| Telas | Conferidas no navegador, no celular e no desktop, sem erros no console |
| **Ainda não testado** | Supabase real com as etapas 2 a 5, IA real (precisa de chave) e deploy na Vercel |

### Bugs que pegamos antes de chegar até você
- Fuso horário: à noite no Brasil, "hoje" virava amanhã (no app e nos seeds)
- Lista de pacientes mais larga que a tela no celular
- Água de hoje marcada em vermelho antes de o dia acabar
- Logo escondido e falta do botão "Sair" no desktop
- Cache de uma conta aparecendo para a próxima depois de sair

---

## Como rodar tudo localmente

Todo o trabalho está na branch `claude/etapa-5-deploy-vercel`, que já contém as etapas 1 a 5 (ou no `.zip` que acompanha este documento).

1. Baixe o projeto (ou descompacte o `.zip` em `~/Documents/skyro`):

   ```bash
   cd ~/Documents && git clone -b claude/etapa-5-deploy-vercel https://github.com/coubit-corp/skyro.git
   ```

2. Instale as dependências e crie o `.env`, conforme os passos 2 e 3.1 de `docs/SETUP-MAC.md`.
3. No **SQL Editor** do Supabase, rode **nesta ordem**:
   1. `supabase/migrations/20261113000001_schema_inicial.sql` (se ainda não rodou)
   2. `supabase/migrations/20261114000001_resumos_ia.sql`
   3. `supabase/migrations/20261114000002_cadastro_profissional.sql`
   4. `supabase/seed/01_contas_demo.sql`
   5. `supabase/seed/02_catalogo_demo.sql`
   6. `supabase/seed/03_pacientes_demo.sql`
4. Confira e suba o app:

   ```bash
   npm test && npm run dev
   ```

5. Abra http://localhost:5173 e siga o **roteiro da demo**:
   1. **Entrar como pessoa (demo)**: Início → Rotina → Saúde → Ver mapa → um perfil → Compartilhar
   2. Sair → **Entrar como profissional (demo)**: 3 em Atenção → abrir o Lucas → enviar uma dica
   3. Sair → entrar como pessoa: a dica aparece no Início

---

## O que eu faria a seguir (em ordem)

Restam cerca de 16 dias. A ordem abaixo prioriza o que os jurados exigem e veem primeiro.

### 1. Validar no Supabase real · 1 dia · **urgente**
Rodar o roteiro acima no seu Mac. É o único ponto que eu não consegui testar daqui. Se algo falhar, me mande o print ou o texto do erro.

### 2. Validação com pessoas reais · em paralelo, até 21/11
O checklist do projeto pede **15 entrevistas com pessoas** e **9 com profissionais**, e isso vale ponto no pitch. Os roteiros estão em `docs/checklist-e-entrevistas.txt`.
- **Pode começar já.** Não depende de código.
- **Como eu ajudo:** monto um formulário (Google Forms ou página) e uma planilha para registrar as respostas e tirar as 3 dificuldades mais citadas.

### 3. ~~Cadastro de profissional~~ · feito na etapa 6
Falta só um jeito de a equipe aprovar registros (por enquanto, marcar `verified = true` direto no banco).

### 4. Polimento · 1 a 2 dias
- **Mapa sob demanda:** carregar o mapa só quando a tela abre. Hoje o app baixa cerca de 720 kB de uma vez; o mapa sai desse pacote inicial e o app abre mais rápido no 4G
- **Avatares:** desenhar no próprio app, sem depender de serviço externo, para a demo não quebrar sem internet boa
- **Acessibilidade:** contraste, leitor de tela e tamanho de toque (auditoria WCAG AA)
- **Teste em aparelho real:** iPhone (Safari) e Android (Chrome), incluindo instalar o app
- **Revisão de textos** e dos estados vazios

### 5. Publicar · meio dia · quando quiserem
Seguir `docs/DEPLOY-VERCEL.md`. Precisa estar no ar **antes de gravar o vídeo**. Se a IA for ligada, fazer o deploy da função `resumo-semanal` (passo 3.5 do `SETUP-MAC.md`).

### 6. Material da submissão · 2 dias · até 28/11
- **README para os jurados:** problema, solução, prints, link da demo, contas demo, arquitetura, como a IA é usada com segurança e próximos passos
- **Roteiro do vídeo de 3 min**, com falas cronometradas seguindo a seção 11 da especificação, e uma lista de cenas para gravar a tela
- **Pitch atualizado:** a especificação marca como pendente que o slide do MVP "deixa os profissionais para depois", e agora eles são o centro
- **Conferir o regulamento** (hackbrasil.com/regulamento): elegibilidade, entregáveis, repositório público e licença

### 7. Se sobrar tempo (roadmap)
- **Avisos reais no WhatsApp** (lembrete de dormir, dica nova)
- **Abas Plano e Progresso** dos mockups (Liga, Loja, XP)
- **Chat** entre pessoa e profissional
- **Agenda e consultas**

---

## Decisões em aberto (precisam de vocês)

| Decisão | Por que importa |
|---|---|
| **Trocar a secret key do Supabase** | Ela foi colada no chat. Troque em Settings → API Keys |
| **Ligar a IA real?** | Precisa de uma chave da Anthropic; cada resumo novo custa centavos |
| **Notas e estrelas para psicólogos** | A especificação pede para checar as regras do CFP; hoje eles aparecem sem nota |
| **Preço para profissionais** | Testar com os 9 profissionais entrevistados |
| **Merge dos PRs** (#6 → #7 → #8 → #9 → #5) | O deploy publica a `main` |

---

## Onde está cada coisa

| Arquivo | Para quê |
|---|---|
| `docs/SETUP-MAC.md` | Instalar e rodar no Mac, do zero |
| `docs/DEPLOY-VERCEL.md` | Publicar na Vercel |
| `docs/SKYRO-MVP.md` | Especificação original do MVP |
| `README.md` | Visão técnica do projeto |
| `src/lib/alerts.ts` | Regras de alerta (Atenção / Em dia) |
| `supabase/migrations/` | Banco e regras de acesso |
| `supabase/seed/` | Dados de demonstração |
| `supabase/functions/resumo-semanal/` | Resumo por IA |

### Pull requests (fazer o merge nesta ordem)
1. [#6 Setup, banco, login e contas demo](https://github.com/coubit-corp/skyro/pull/6)
2. [#7 Telas da pessoa](https://github.com/coubit-corp/skyro/pull/7)
3. [#8 Painel do profissional](https://github.com/coubit-corp/skyro/pull/8)
4. [#9 Resumo por IA](https://github.com/coubit-corp/skyro/pull/9)
5. [#5 Deploy na Vercel](https://github.com/coubit-corp/skyro/pull/5)

Os PRs #1 a #4 foram fechados pelo GitHub quando os commits passaram para o nome do autor e foram substituídos pelos #6 a #9, com o mesmo código.
