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

### Etapa 7: polimento
- **Avatares desenhados no próprio app** (sem serviço externo): a demo funciona mesmo com internet ruim
- **Carregamento sob demanda:** cada tela e o mapa só são baixados quando abertos. O pacote inicial caiu de 755 kB para 530 kB (de 219 para 155 kB compactado)
- **Acessibilidade WCAG 2.1 AA:** as 13 telas passam na auditoria automática (axe). Contraste corrigido, rótulos ligados aos campos e áreas de toque de no mínimo 44 px
- **Testado em 5 tamanhos de aparelho:** iPhone SE, Android 360 px, Pixel 7, iPhone 15 Pro Max e iPad, sem rolagem horizontal
- **IA desligada** deixou de aparecer como erro no console

### Etapa 8: material da submissão
- **README para os jurados:** problema, solução, prints reais, diferenciais, IA responsável, privacidade e arquitetura
- **Roteiro do vídeo de 3 minutos** (`docs/ROTEIRO-VIDEO.md`): falas cronometradas por cena e checklist de gravação
- **Pitch v2** (`docs/Skyro-Pitch-v2.pdf`) com o novo posicionamento: "sua rotina, seus dados, todos os seus profissionais vendo o mesmo quadro"
- Dados demo ajustados para o resumo mostrar o cruzamento sono × treino ("nos dias em que dormiu menos de 6h30, faltou a 2 de 3 treinos")

### Etapa 9: aprovação dos registros de conselho
- **Área da equipe** (`/equipe`), com abas **Pendentes** e **Decididos**, no mesmo visual do painel do profissional
- Cada registro tem um link para a **consulta do conselho**: CFP e CFN abrem a consulta nacional; CONFEF e COFFITO abrem o site do conselho
- **Aprovar** pede confirmação. **Recusar** pede o motivo, com 4 motivos prontos. Dá para rever uma decisão depois
- **Recusado sai da busca** e vê o motivo em **Meu perfil**, com o botão "Corrigir registro". Ao trocar o registro, volta para "em verificação" e reaparece na busca
- **Garantido pelo banco:** novo papel `admin`, dado só por SQL. O selo só muda pela função `review_professional()`, e cada decisão fica num histórico com quem decidiu e quando
- Se o profissional trocar o registro enquanto a equipe confere, a aprovação é barrada
- **Conta demo da equipe** (`demo.equipe@skyro.app`) e botão **"Entrar como equipe (demo)"**. Ela só decide sobre perfis demo: um jurado não consegue dar selo a um profissional real
- Corrigido o teste de banco `01_rls.sql`, que tinha quebrado na etapa 6
- Corrigido o menu do profissional, que deixava "Pacientes" ativa junto com Perfil, Agenda e Mensagens

### Etapa 10: Meu plano
- **Pessoa:** a aba **Plano** saiu do "em construção". Ela tem 4 abas, como no mockup: **Treino** (personal), **Nutrição** (nutri), **Mente** (psicólogo) e **Fisio** (fisioterapeuta)
- Cada profissional aparece com um card com o recado e o resumo de hoje, a lista do dia para marcar como feito (com link de vídeo, se houver) e o plano da semana inteira
- Na **Fisio**, a pessoa registra a **dor do dia de 0 a 10**
- **Profissional:** a ficha do paciente ganhou a seção **"Plano de <nome>"**. Lá ele escreve um recado geral e adiciona, edita ou remove itens
- **O formulário muda com a especialidade:**
  - **Treino:** séries, repetições e carga
  - **Refeição:** horário e alimentos
  - **Respiração:** duração
  - **Fisio:** séries e repetições
- Todos os itens têm os dias da semana em que valem, uma observação e um vídeo opcional
- O profissional vê **quanto do plano foi feito nos últimos 7 dias**, e o fisio vê **a dor de cada dia**
- **Garantido pelo banco:** cada profissional só escreve na própria área, e só no plano de quem compartilha com ele. Quando a pessoa revoga, ele perde o acesso na hora, e a pessoa continua vendo o plano com o aviso "acompanhamento encerrado"
- A tela de consentimento passou a avisar que o profissional também vê os itens do plano feitos e a dor do dia
- **Demo:** o Carlos (psicólogo) e a Fernanda (fisio) entram na equipe do Lucas, com o Pedro e a Ana. Cada um deixou um plano fictício, e a semana do Lucas já tem marcações e dor

### Etapa 11: configurações de perfil e saudação
- **Pessoa:** tela **Meu perfil** (`/perfil`), aberta pelo avatar no topo do Início ou pela barra lateral. Edita foto, e-mail, telefone, nome completo e bio
- **Profissional:** o **Perfil** ganhou foto profissional, e-mail, telefone e **horários de atendimento** por dia da semana, além do que já editava (nome, especialidade, registro, bio, especialidades e local)
- **Foto:** enviar, trocar ou remover, com confirmação antes de remover. Ela é recortada num quadrado e reduzida no próprio aparelho, e aparece em todas as telas no lugar do avatar ilustrado
- **Salvar alterações** e **Cancelar**, aviso de sucesso depois de salvar e erro escrito em cada campo inválido
- **E-mail:** trocar manda um link de confirmação para o endereço novo; até confirmar, a pessoa continua entrando com o atual
- **Telefone sempre privado** (decisão da equipe): só a própria conta vê
- **Contas demo** não enviam foto, não trocam e-mail e não guardam telefone, porque são usadas por várias pessoas
- **Saudação no Início:** "Bom dia, Lucas!", "Boa tarde" ou "Boa noite", pelo horário do aparelho. Ela muda sozinha às 5h, 12h e 18h, sem recarregar, e aparece sem nome quando o nome não está preenchido
- O avatar do topo do Início agora abre o perfil. Antes, tocar nele saía da conta

### Etapa 12: logins demo da equipe do Lucas
- A tela de login ganhou três botões, embaixo dos que já existiam: **Personal** (Pedro), **Psicólogo** (Carlos) e **Fisio** (Fernanda)
- Com eles dá para montar **treino**, **respiração** e **exercícios de fisio** no plano do Lucas com um clique. Antes, só a Ana (nutri) tinha login, e ela só adiciona refeições
- Os três já estavam no catálogo e na equipe do Lucas; o seed `02_catalogo_demo.sql` passou a dar senha a eles (a mesma das outras contas demo)
- Corrigido o seed 02, que falhava quando era rodado de novo sozinho, sem o 01 antes

### Qualidade
| O quê | Situação |
|---|---|
| Testes automáticos (`npm test`) | 105 passando, com relógio em São Paulo e em UTC |
| Regras de acesso do banco | Testadas num Postgres local (`supabase/tests/`, 6 arquivos) |
| Tipos e lint | Sem erros nem avisos |
| Telas | Conferidas no navegador, no celular e no desktop, sem erros no console |
| Supabase real | Roteiros das etapas 1 a 8 conferidos pela equipe. Etapas 9 e 10 rodadas pela equipe em 14/11. Navegando com as contas demo, sem alterar dados, abriram sem erro: Plano, Saúde, Perto de você, Início, a ficha do Lucas com o plano e a área da equipe |
| **Etapa 11 no Supabase real** | **Ainda não rodada lá.** Falta a migration `20261116000001_perfil.sql` (veja o passo 1 abaixo). O envio de foto só foi testado com respostas simuladas e contra uma tabela que imita o Storage |
| **Ainda não testado** | No Supabase real: aprovar ou recusar pela equipe, marcar itens, registrar dor e montar o plano (testados só no Postgres local e com respostas simuladas). Também a IA real (desligada por decisão da equipe), o deploy na Vercel e o aparelho real |

### Bugs que pegamos antes de chegar até você
- Fuso horário: à noite no Brasil, "hoje" virava amanhã (no app e nos seeds)
- Lista de pacientes mais larga que a tela no celular
- Água de hoje marcada em vermelho antes de o dia acabar
- Logo escondido e falta do botão "Sair" no desktop
- Cache de uma conta aparecendo para a próxima depois de sair
- Etapa 10: a tabela do recado do plano criou um segundo caminho entre profissionais e perfis no Supabase, e as telas que mostram o nome do profissional davam erro. Pego testando a prévia contra o banco real e corrigido com a ligação indicada nas consultas, mais um teste que impede a volta do erro

---

## Como rodar tudo localmente

Todo o trabalho está na branch `etapa-12-logins-demo`, que já contém as etapas 1 a 12.

1. Baixe o projeto (ou descompacte o `.zip` em `~/Documents/skyro`):

   ```bash
   cd ~/Documents && git clone -b etapa-12-logins-demo https://github.com/coubit-corp/skyro.git
   ```

2. Instale as dependências e crie o `.env`, conforme os passos 2 e 3.1 de `docs/SETUP-MAC.md`.
3. No **SQL Editor** do Supabase, rode **nesta ordem**:
   1. `supabase/migrations/20261113000001_schema_inicial.sql` (se ainda não rodou)
   2. `supabase/migrations/20261114000001_resumos_ia.sql`
   3. `supabase/migrations/20261114000002_cadastro_profissional.sql`
   4. `supabase/migrations/20261115000001_aprovacao_registros.sql`
   5. `supabase/migrations/20261115000002_planos.sql`
   6. `supabase/migrations/20261116000001_perfil.sql`
   7. `supabase/seed/01_contas_demo.sql`
   8. `supabase/seed/02_catalogo_demo.sql`
   9. `supabase/seed/03_pacientes_demo.sql`
4. Confira e suba o app:

   ```bash
   npm test && npm run dev
   ```

5. Abra http://localhost:5173 e siga o **roteiro da demo**:
   1. **Entrar como pessoa (demo)**: Início → Rotina → **Plano** (as 4 abas; marcar um item e a dor na Fisio) → Saúde → Ver mapa → um perfil → Compartilhar
   2. Sair → **Entrar como profissional (demo)**: 3 em Atenção → abrir o Lucas → ver o **Plano de Lucas** no fim da ficha, adicionar uma refeição → enviar uma dica
   3. Sair → entrar como pessoa: a dica aparece no Início
   3b. Sair → **Personal** (demo): abrir o Lucas → no **Plano de Lucas**, adicionar um exercício com séries, repetições e carga
   4. Sair → **Entrar como equipe (demo)**: aprovar o Rafael → recusar o Bruno com um motivo → ver os dois em Decididos

---

## O que eu faria a seguir (em ordem)

Restam cerca de 16 dias. A ordem abaixo prioriza o que os jurados exigem e veem primeiro.

### 1. Rodar a etapa 11 no Supabase real · 10 minutos · **urgente**
No SQL Editor, rode a migration `20261116000001_perfil.sql` e depois os seeds 01, 02 e 03 de novo, nessa ordem (eles dão horários de atendimento aos profissionais demo). Depois, crie uma conta nova, abra **Meu perfil**, envie uma foto e salve: é o único jeito de conferir o envio de fotos de verdade, porque as contas demo não enviam. Se der erro, me mande o texto.

As etapas 9 e 10 já foram rodadas em 14/11.

### 1b. ~~Rodar as etapas 9 e 10 no Supabase real~~ · feito em 14/11
Os roteiros das etapas 1 a 8 já foram conferidos no Supabase real. Faltam as etapas 9 e 10. No SQL Editor, rode as migrations `20261115000001_aprovacao_registros.sql` e `20261115000002_planos.sql`, e depois os seeds 01, 02 e 03 de novo, nessa ordem. O 01 cria a conta da equipe, e o 02 monta a equipe e os planos do Lucas. Rodar os seeds também traz os dados demo para a data de hoje. Em seguida, siga o roteiro acima. Se algo falhar, me mande o print ou o texto do erro.

### 2. Validação com pessoas reais · em paralelo, até 21/11
O checklist do projeto pede **15 entrevistas com pessoas** e **9 com profissionais**, e isso vale ponto no pitch. Os roteiros estão em `docs/checklist-e-entrevistas.txt`.
- **Pode começar já.** Não depende de código.
- **Como eu ajudo:** monto um formulário (Google Forms ou página) e uma planilha para registrar as respostas e tirar as 3 dificuldades mais citadas.

### 3. ~~Cadastro de profissional~~ · feito nas etapas 6 e 9
A equipe aprova ou recusa os registros pela área `/equipe`. Para dar o papel de equipe a uma conta real, rode no SQL Editor: `update profiles set role = 'admin' where id = '<id da conta>';`

### 4. ~~Polimento~~ · feito na etapa 7
Falta só o **teste em aparelho real** (iPhone com Safari e Android com Chrome, incluindo instalar o app), que precisa ser feito por vocês.

### 5. Publicar · meio dia · quando quiserem
Seguir `docs/DEPLOY-VERCEL.md`. Precisa estar no ar **antes de gravar o vídeo**. Se a IA for ligada, fazer o deploy da função `resumo-semanal` (passo 3.5 do `SETUP-MAC.md`).

### 6. Material da submissão · feito na etapa 8 (falta preencher links, equipe e gravar o vídeo)
- **README para os jurados:** problema, solução, prints, link da demo, contas demo, arquitetura, como a IA é usada com segurança e próximos passos
- **Roteiro do vídeo de 3 min**, com falas cronometradas seguindo a seção 11 da especificação, e uma lista de cenas para gravar a tela
- **Pitch atualizado:** a especificação marca como pendente que o slide do MVP "deixa os profissionais para depois", e agora eles são o centro
- **Conferir o regulamento** (hackbrasil.com/regulamento): elegibilidade, entregáveis, repositório público e licença

### 7. Se sobrar tempo (roadmap)
- **Avisos reais no WhatsApp** (lembrete de dormir, dica nova)
- **Aba Progresso** dos mockups (Liga, Loja, XP). A aba Plano foi feita na etapa 10
- **Chat** entre pessoa e profissional, inclusive direto do plano (o botão "Conversar com o fisio" do mockup)
- **Agenda e consultas**

---

## Decisões em aberto (precisam de vocês)

| Decisão | Por que importa |
|---|---|
| ~~Ligar a IA real?~~ | **Decidido: fica desligada por enquanto.** O app mostra o resumo por regras. Para ligar depois, veja o passo 3.5 do `SETUP-MAC.md` |
| **Quem da equipe vira admin** | O papel é dado por SQL (passo 3 acima). Só quem for conferir registros de verdade |
| **Notas e estrelas para psicólogos** | A especificação pede para checar as regras do CFP; hoje eles aparecem sem nota |
| **Preço para profissionais** | Testar com os 9 profissionais entrevistados |
| **Merge dos PRs** (#6 → #7 → #8 → #9 → #5 → #10 → #11 → #12 → #13 → #14 → #15 → #16) | O deploy publica a `main` |

---

## Onde está cada coisa

| Arquivo | Para quê |
|---|---|
| `docs/SETUP-MAC.md` | Instalar e rodar no Mac, do zero |
| `docs/DEPLOY-VERCEL.md` | Publicar na Vercel |
| `docs/SKYRO-MVP.md` | Especificação original do MVP |
| `README.md` | Visão técnica do projeto |
| `src/lib/alerts.ts` | Regras de alerta (Atenção / Em dia) |
| `src/lib/registry.ts` | Regras da verificação de registro (conselhos, motivos, listas da equipe) |
| `src/pages/equipe/` | Área da equipe para aprovar ou recusar registros |
| `src/lib/profile.ts` | Regras do perfil (saudação, telefone, foto, horários) |
| `src/pages/pessoa/Perfil.tsx` e `src/pages/profissional/MeuPerfil.tsx` | Configurações de perfil da pessoa e do profissional |
| `src/lib/plan.ts` | Regras do "Meu plano" (abas, dias, adesão, formulário) |
| `src/pages/pessoa/Plano.tsx` e `src/components/PlanEditor.tsx` | "Meu plano" da pessoa e o plano na ficha do paciente |
| `supabase/migrations/` | Banco e regras de acesso |
| `supabase/seed/` | Dados de demonstração |
| `supabase/functions/resumo-semanal/` | Resumo por IA |

### Pull requests (fazer o merge nesta ordem)
1. [#6 Setup, banco, login e contas demo](https://github.com/coubit-corp/skyro/pull/6)
2. [#7 Telas da pessoa](https://github.com/coubit-corp/skyro/pull/7)
3. [#8 Painel do profissional](https://github.com/coubit-corp/skyro/pull/8)
4. [#9 Resumo por IA](https://github.com/coubit-corp/skyro/pull/9)
5. [#5 Deploy na Vercel](https://github.com/coubit-corp/skyro/pull/5)
6. [#10 Cadastro e perfil do profissional](https://github.com/coubit-corp/skyro/pull/10)
7. [#11 Polimento](https://github.com/coubit-corp/skyro/pull/11)
8. [#12 Material da submissão](https://github.com/coubit-corp/skyro/pull/12)
9. [#13 Aprovação dos registros de conselho](https://github.com/coubit-corp/skyro/pull/13)
10. [#14 Meu plano](https://github.com/coubit-corp/skyro/pull/14)
11. [#15 Configurações de perfil e saudação](https://github.com/coubit-corp/skyro/pull/15)
12. [#16 Logins demo da equipe do Lucas](https://github.com/coubit-corp/skyro/pull/16)

Os PRs #1 a #4 foram fechados pelo GitHub quando os commits passaram para o nome do autor e foram substituídos pelos #6 a #9, com o mesmo código.
