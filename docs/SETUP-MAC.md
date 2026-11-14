# Rodando a Skyro no Mac

Passo a passo do zero, para quem nunca configurou nada. Cada bloco é um comando para colar no **Terminal** (Cmd + Espaço → digite "Terminal" → Enter). Copie um bloco, cole, aperte Enter e espere terminar antes do próximo.

Tempo total: uns 20 minutos na primeira vez.

---

## 1. Ferramentas (só na primeira vez)

### 1.1 Ferramentas de desenvolvedor da Apple (traz o `git`)

```bash
xcode-select --install
```

Se abrir uma janela, clique em **Instalar** e espere. Se aparecer "already installed", está tudo certo.

### 1.2 Homebrew (instalador de programas)

Confira se já tem:

```bash
brew -v
```

Se aparecer "command not found", instale:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Ele pede a senha do Mac (a senha não aparece enquanto você digita, é normal). **No final, ele mostra 2 ou 3 comandos em "Next steps"**: copie e rode esses também. Depois feche e abra o Terminal de novo.

### 1.3 Node.js (precisa ser versão 20 ou mais nova)

```bash
brew install node
```

Confira:

```bash
node -v
```

Tem que aparecer `v20` ou um número maior.

---

## 2. Baixar o projeto

Isto cria a pasta `skyro` dentro de `Documentos`:

```bash
cd ~/Documents && git clone https://github.com/coubit-corp/skyro.git
```

Se pedir login do GitHub e o repositório for privado, use o GitHub Desktop (desktop.github.com) para clonar, ou crie um token em GitHub → Settings → Developer settings → Personal access tokens e use como senha.

Entre na pasta e vá para a branch de desenvolvimento (enquanto o PR não entra na `main`):

```bash
cd ~/Documents/skyro && git checkout claude/modest-keller-iiuk7s
```

Instale as dependências:

```bash
npm install
```

---

## 3. Configurar o Supabase

### 3.1 Arquivo `.env`

O comando abaixo cria o arquivo com os dados do projeto (só a chave **publishable**, que é pública por natureza):

```bash
cat > .env <<'EOF'
VITE_SUPABASE_URL=https://zbiksoitegfzgoaaynrn.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_rPrbGdc7B9x278pAHUR9BQ_rc32EKIw
EOF
```

> O Finder esconde arquivos que começam com ponto. Para vê-lo, aperte **Cmd + Shift + .** dentro da pasta.
> Nunca coloque a **secret key** nesse arquivo.

### 3.2 Criar as tabelas (só uma vez)

1. Abra o painel: https://supabase.com/dashboard/project/zbiksoitegfzgoaaynrn
2. Menu lateral → **SQL Editor** → **New query**
3. Abra o arquivo `supabase/migrations/20261113000001_schema_inicial.sql` (no VS Code ou com o comando abaixo, que copia o conteúdo para a área de transferência):

   ```bash
   pbcopy < supabase/migrations/20261113000001_schema_inicial.sql
   ```

4. Cole no editor (Cmd + V) e clique em **Run**. Deve aparecer "Success. No rows returned".

5. Faça o mesmo com a segunda migration, que cria o cache dos resumos por IA:

   ```bash
   pbcopy < supabase/migrations/20261114000001_resumos_ia.sql
   ```

> Se rodar duas vezes, dá erro de "already exists". Não é problema: as tabelas já foram criadas.

### 3.3 Criar as contas demo (só uma vez)

Copie o script:

```bash
pbcopy < supabase/seed/01_contas_demo.sql
```

No **SQL Editor**, abra uma **New query**, cole e clique em **Run**. No final aparece uma tabela com **Lucas Martins** e **Ana Lima**.

| Conta | E-mail | Senha |
|---|---|---|
| Cliente (Lucas Martins) | `demo.pessoa@skyro.app` | `skyro-demo-2026` |
| Profissional (Ana Lima, nutricionista) | `demo.nutri@skyro.app` | `skyro-demo-2026` |

Depois, do mesmo jeito, rode o catálogo de profissionais fictícios do "Perto de você":

```bash
pbcopy < supabase/seed/02_catalogo_demo.sql
```

Cole numa **New query** e clique em **Run**. Aparece a contagem por especialidade (12 no total).

Por último, os pacientes da Ana no painel do profissional:

```bash
pbcopy < supabase/seed/03_pacientes_demo.sql
```

Cole numa **New query** e clique em **Run**. Aparecem 5 nomes; junto com o Lucas, a Ana fica com 6 pacientes, 3 deles em "Atenção".

Os botões "Entrar como … (demo)" da tela de login já usam essas contas. O Lucas já compartilha a rotina com a Ana e tem 14 dias de registros. Se os dados ficarem bagunçados depois de testes, é só rodar os três scripts de novo, nessa ordem (`01`, `02` e `03`): eles apagam os dados demo e recriam tudo, com as datas atualizadas para hoje.

### 3.4 Liberar o login sem confirmação de e-mail (para desenvolver)

Por padrão o Supabase exige clicar num link no e-mail antes do primeiro login. Para testar mais rápido:

1. Painel → **Authentication** → **Sign In / Providers** → **Email**
2. Desligue **Confirm email** → **Save**

Ainda em **Authentication** → **URL Configuration**, coloque `http://localhost:5173` em **Site URL**.

### 3.5 Ligar o resumo por IA (opcional)

Sem este passo o app funciona normalmente: a ficha do paciente mostra o resumo **montado por regras**. Com ele, o resumo passa a ser **escrito pelo Claude**. A chave da IA fica guardada no Supabase e nunca vai para o navegador.

1. Crie uma chave de API no Console da Anthropic (seção **API Keys**). Ela começa com `sk-ant-`.
2. No painel do Supabase: **Edge Functions** → **Secrets** → adicione `ANTHROPIC_API_KEY` com a chave → **Save**.
3. Instale a ferramenta do Supabase (só na primeira vez):

   ```bash
   brew install supabase/tap/supabase
   ```

4. Entre na sua conta do Supabase (abre o navegador):

   ```bash
   supabase login
   ```

5. Ligue a pasta do projeto ao seu projeto no Supabase:

   ```bash
   cd ~/Documents/skyro && supabase link --project-ref zbiksoitegfzgoaaynrn
   ```

6. Publique a função:

   ```bash
   supabase functions deploy resumo-semanal
   ```

Pronto: abra um paciente no painel e o selo do resumo muda de **Automático** para **Escrito por IA**. O resumo fica guardado e só é gerado de novo quando o paciente registrar algo novo ou o dia virar, então abrir a ficha várias vezes não gera custo a mais.

> Cada resumo novo é uma chamada paga à API da Anthropic (centavos de dólar por resumo). Para desligar, apague o secret `ANTHROPIC_API_KEY`: o app volta para o resumo por regras sozinho.

---

## 4. Rodar

```bash
npm run dev
```

Abra **http://localhost:5173** no navegador. Para parar o servidor: **Ctrl + C** no Terminal.

Teste rápido:

1. Clique em **Entrar como pessoa (demo)**: você cai em `/inicio` como Lucas. Clique em **Sair** e teste **Entrar como profissional (demo)**: você cai em `/pro` como Ana.
2. **Criar conta** como **Pessoa**: você cai em `/inicio`.
3. Clique em **Sair** e crie outra conta como **Profissional**: você cai em `/pro`.

### Ver no iPhone (mesma rede Wi-Fi)

```bash
npm run dev -- --host
```

Descubra o IP do Mac:

```bash
ipconfig getifaddr en0
```

No Safari do iPhone, abra `http://SEU-IP:5173` (ex.: `http://192.168.0.12:5173`).

---

## 5. No dia a dia

Pegar as novidades antes de começar:

```bash
cd ~/Documents/skyro && git pull && npm install
```

```bash
npm run dev
```

---

## Problemas comuns

| Sintoma | Solução |
|---|---|
| `command not found: brew` depois de instalar | Rode os comandos de "Next steps" que o instalador mostrou e reabra o Terminal |
| `command not found: npm` | Rode `brew install node` e reabra o Terminal |
| Tela "Falta configurar o Supabase" | O `.env` não existe ou está com nome errado. Repita o passo 3.1 e reinicie o `npm run dev` |
| "E-mail ou senha incorretos" nos botões demo | O script das contas demo não foi rodado. Faça o passo 3.3 |
| "Não conseguimos carregar sua conta" depois de cadastrar | As tabelas não foram criadas. Faça o passo 3.2 e crie uma conta nova |
| "Confirme seu e-mail…" | Faça o passo 3.4 ou clique no link que chegou no e-mail |
| Resumo continua "Automático" depois de ligar a IA | Confira o nome do secret (`ANTHROPIC_API_KEY`), se o deploy terminou sem erro e se a migration `20261114000001_resumos_ia.sql` foi rodada |
| `Port 5173 is in use` | Já tem um `npm run dev` aberto em outra janela: feche-o com Ctrl + C |
