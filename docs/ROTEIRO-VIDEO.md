# Roteiro do vídeo · 3 minutos

Vídeo de demonstração da Skyro para o Hack Brasil 2026. **Duração máxima: 3:00.** A narração abaixo tem cerca de 400 palavras, o que dá 3 minutos falando com calma. Se passar do tempo, corte primeiro as falas marcadas com _(opcional)_.

---

## Antes de gravar (checklist)

- [ ] **Dados da demo com a data de hoje:** no SQL Editor do Supabase, rode `01_contas_demo.sql`, `02_catalogo_demo.sql` e `03_pacientes_demo.sql`, nessa ordem, **no dia da gravação**. Os registros são relativos a "hoje"; com dados velhos, ninguém aparece em "Atenção".
- [ ] **App publicado** (Vercel) e testado com `npm run smoke -- <link>`.
- [ ] **Duas janelas lado a lado:**
  - uma normal, logada como **pessoa (demo)**;
  - uma anônima, logada como **profissional (demo)**.
- [ ] **Modo celular no navegador:** Chrome → DevTools → ícone de celular → iPhone 13, para as telas da pessoa.
- [ ] **Localização:** permitir a localização no navegador, ou deixar negar (o app usa Pinheiros, SP).
- [ ] **IA:** se a chave estiver ligada, abra a ficha do Lucas uma vez antes de gravar, para o resumo já estar pronto (vem do cache, sem espera).
- [ ] **Tela limpa:** notificações do Mac desligadas, abas extras fechadas, zoom do navegador em 100%.
- [ ] **Gravação:** QuickTime (Arquivo → Nova Gravação de Tela) ou OBS, em 1080p, com microfone externo ou fone com microfone.
- [ ] **Ensaiar a narração 2 vezes com cronômetro.**

> **Nada de depoimento inventado.** Se as entrevistas já tiverem sido feitas, uma fala real (com permissão da pessoa) pode entrar na cena 1, no lugar da frase genérica.

---

## Cenas

### Cena 1 · O problema · 0:00 a 0:20

**Na tela:** capa (`docs/screenshots/capa.png`) ou slide do problema do pitch.

**Fala:**
> Quem começa a cuidar da saúde com um nutricionista, um personal ou um psicólogo só encontra esse profissional de tempos em tempos. Entre uma consulta e outra, ninguém vê que a pessoa dormiu mal, faltou ao treino ou parou de beber água. E quando são vários profissionais, cada um enxerga só um pedaço.

### Cena 2 · A solução · 0:20 a 0:35

**Na tela:** capa com a frase.

**Fala:**
> A Skyro resolve isso: sua rotina, seus dados, todos os seus profissionais vendo o mesmo quadro. A pessoa registra o dia, escolhe com quem compartilhar, e o profissional age antes que ela desista.

### Cena 3 · O lado da pessoa · 0:35 a 1:15

**Na tela (janela da pessoa, modo celular):**
1. **Início:** mostrar o strike de 14 dias, o sono de 5h30 e o checklist; **marcar "Beber 2 L de água"**.
2. **Rotina:** subir o foco com o botão **+** e tocar em **Atualizar registro**.
3. **Saúde → Ver mapa:** os profissionais perto.
4. Abrir um profissional que ainda não está na equipe, como o **Carlos (psicólogo)**, tocar em **Compartilhar minha rotina** e mostrar a tela de consentimento, **sem confirmar**.

**Fala:**
> Este é o Lucas. No Início ele vê o strike, o sono da noite e o que falta fazer hoje. Ele marca a água e registra o tempo de foco. Em "Perto de você" ele encontra profissionais no mapa. Para alguém acompanhar a rotina, ele precisa autorizar: a Skyro mostra exatamente o que o profissional vai ver, e ele pode revogar quando quiser. O Lucas já compartilha com a nutricionista Ana e com o personal Pedro.

### Cena 4 · O lado do profissional · 1:15 a 2:05

**Na tela (janela anônima, profissional):**
1. **Pacientes:** destacar o card **"3 pacientes precisam de atenção hoje"** e o motivo de cada um.
2. Abrir o **Lucas**: alertas, os últimos 7 dias, o **resumo da semana** (selo "Escrito por IA" ou "Automático").
3. Escrever e **enviar uma dica**: _"Lucas, vi que você dormiu pouco. Hoje tente jantar até as 20h e evitar café depois das 16h."_

**Fala:**
> Agora o lado da Ana, a nutricionista. Ela não precisa ler planilhas: o painel mostra quem precisa de atenção hoje e por quê. O Lucas dormiu 5h30 e faltou a dois treinos. Quem decide esse alerta são regras fixas e explicáveis, não a IA. A IA entra para resumir a semana e cruzar as áreas: as faltas no treino vieram depois das noites mais curtas. Isso a nutricionista sozinha não veria. Ela manda uma dica, ali mesmo.

> **Se a IA ainda não estiver ligada** (selo "Automático"), troque a frase da IA por: _"O resumo da semana cruza as áreas: nos dias em que dormiu menos de 6h30, ele faltou a 2 de 3 treinos. Com a IA ligada, esse texto é escrito pelo Claude."_ Não diga que foi a IA quando o selo mostrar "Automático".

### Cena 5 · A dica chega · 2:05 a 2:25

**Na tela (janela da pessoa):** recarregar o **Início**: o card "Nutricionista Ana viu sua rotina" com o ponto de novo; tocar em **Ver**.

**Fala:**
> E a dica chega no Início do Lucas, no mesmo dia, não na próxima consulta.

### Cena 6 · Por que dá para confiar · 2:25 a 2:45

**Na tela:** slide de privacidade e IA do pitch, ou o README no GitHub.

**Fala:**
> Os dados são da pessoa. O consentimento é por profissional, e o próprio banco de dados garante que ninguém vê o que não foi autorizado. A IA recebe só o primeiro nome e os números, não diagnostica nem prescreve, e sem ela o app continua funcionando.

### Cena 7 · Negócio e próximos passos · 2:45 a 3:00

**Na tela:** slide de modelo de negócio, e depois a capa com o link da demo.

**Fala:**
> Para a pessoa, a Skyro é gratuita; o profissional assina o painel com alertas e resumos. _(opcional: Nos próximos passos, validamos o preço com profissionais e trazemos avisos pelo WhatsApp.)_ Skyro: sua rotina, seus dados, todos os seus profissionais vendo o mesmo quadro.

---

## Dicas de gravação

- **Grave por cena** e junte depois (iMovie ou CapCut). Errou? Regrava só aquela cena.
- **Grave a tela primeiro, a voz depois**, em silêncio e com a cena na sua frente. Fica mais natural e é fácil acertar o tempo.
- **Mouse devagar.** Pare 1 segundo em cima do que está sendo falado.
- **Zoom em detalhes** (o card de atenção, o selo da IA, a tela de consentimento): no editor, dê 120 a 150% de zoom por 2 a 3 segundos.
- **Legendas:** o CapCut gera automaticamente em português. Ajudam quem assiste sem som.
- **Exporte em 1080p**, MP4, e confira se o vídeo tem **no máximo 3:00**.
