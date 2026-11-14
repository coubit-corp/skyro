# Publicando a Skyro na Vercel

Passo a passo para deixar o app num link público (para os jurados e para o vídeo). Tempo: uns 15 minutos na primeira vez. Depois disso, **cada merge na `main` publica sozinho**.

> Antes de começar: faça o merge dos PRs na `main`. A Vercel publica o que está na `main`.

---

## 1. Criar o projeto na Vercel

1. Acesse **vercel.com** → **Sign Up** → **Continue with GitHub** (use a conta que tem acesso ao `coubit-corp/skyro`).
2. No painel: **Add New…** → **Project**.
3. Em **Import Git Repository**, procure `skyro`.
   - Se o repositório não aparecer, clique em **Adjust GitHub App Permissions** e libere o acesso à organização `coubit-corp`. Se você não for dono da organização, um dono precisa aprovar.
4. Clique em **Import**.

## 2. Configurar

Na tela **Configure Project**:

1. **Project Name:** `skyro` (o link fica `skyro.vercel.app` se o nome estiver livre; senão a Vercel adiciona um sufixo).
2. **Framework Preset:** deve aparecer **Vite** sozinho. Não mexa em Build/Output: o `vercel.json` do repositório já define tudo.
3. Abra **Environment Variables** e adicione as duas variáveis (as mesmas do seu `.env`):

   | Nome | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | `https://zbiksoitegfzgoaaynrn.supabase.co` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | a publishable key (`sb_publishable_...`) |

   > Só a **publishable** key. A **secret** key nunca vai para a Vercel nem para o navegador.

4. Clique em **Deploy** e espere (1 a 2 minutos). No fim aparece o link, algo como `https://skyro.vercel.app`.

## 3. Avisar o Supabase do novo endereço

Sem isso, links de confirmação de e-mail e de recuperação de senha apontam para o lugar errado.

No painel do Supabase → **Authentication** → **URL Configuration**:

1. **Site URL:** o link da Vercel (ex.: `https://skyro.vercel.app`).
2. **Redirect URLs** → **Add URL**, uma de cada vez:
   - `https://skyro.vercel.app/**` (troque pelo seu link)
   - `http://localhost:5173/**` (para continuar desenvolvendo no Mac)
3. **Save**.

## 4. Conferir

No Terminal, dentro da pasta do projeto (troque pelo seu link):

```bash
npm run smoke -- https://skyro.vercel.app
```

Tem que terminar com **Tudo certo.** Ele confere se as páginas abrem (inclusive links diretos como `/saude/perto`), se os arquivos do app instalável existem e se as variáveis do Supabase entraram no build.

Depois, teste à mão, de preferência no celular:

- [ ] **Entrar como pessoa (demo)** → Início mostra o strike e a dica da Ana
- [ ] **Perto de você** pede a localização e mostra o mapa
- [ ] Sair → **Entrar como profissional (demo)** → 3 pacientes em Atenção
- [ ] Abrir o Lucas, enviar uma dica, voltar para a pessoa e ver a dica no Início
- [ ] Como pessoa, abrir **Plano**: as 4 abas têm conteúdo; marcar um item e a dor na aba Fisio
- [ ] Sair → **Entrar como equipe (demo)** → aprovar o Rafael e recusar o Bruno com um motivo (rode os seeds de novo depois, para a demo voltar ao começo)
- [ ] Atualizar a página (F5) em `/saude/perto`: continua na mesma tela, sem erro 404
- [ ] **Instalar o app:** no iPhone, Safari → Compartilhar → **Adicionar à Tela de Início**; no Android, Chrome → menu → **Instalar app**

## Problemas comuns

| Sintoma | Solução |
|---|---|
| Tela "Falta configurar o Supabase" | As variáveis não estavam no build. Confira os nomes em **Settings → Environment Variables** e faça **Redeploy** (mudar variável não republica sozinho) |
| `npm run smoke` acusa "variáveis do Supabase" | Mesmo caso acima |
| 404 ao atualizar uma página | O `vercel.json` não está na `main`. Confira o merge |
| "E-mail ou senha incorretos" nos botões demo | Os seeds não foram rodados nesse projeto do Supabase (passo 3.3 do `SETUP-MAC.md`) |
| O app no celular continua com a versão antiga | O app instalável guarda a versão anterior. Feche e abra de novo; a nova versão entra sozinha |
| Repositório não aparece na Vercel | Libere a organização `coubit-corp` no GitHub App da Vercel (passo 1.3) |

## No dia a dia

- **Cada merge na `main`** gera um deploy novo em produção, sozinho.
- **Cada PR aberto** ganha um link de prévia próprio, que a Vercel comenta no PR. Dá para testar antes do merge. O login funciona na prévia, mas links de e-mail apontam para a produção.
- Os dados da demo envelhecem: antes de gravar o vídeo ou apresentar, rode de novo os seeds `01`, `02` e `03` no SQL Editor, para as datas ficarem de hoje.
