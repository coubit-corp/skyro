# Skyro — especificação do MVP (Hack Brasil 2026)

Eixo escolhido: **ponte entre a rotina registrada pela pessoa e o profissional que a acompanha.**

Prazo: entrega até **30/11/2026, 23h59** (repositório público novo, demo funcionando, vídeo de até 3 min). Trilha: **04 — Saúde & bem-estar**.

---

## 1. Frase da Skyro

> A Skyro conecta a rotina que você registra no dia a dia ao profissional que cuida de você, para que ele veja o que está acontecendo entre uma consulta e outra e aja antes que você desista.

Versão curta para o vídeo: **"Seu nutricionista, psicólogo ou personal acompanhando sua rotina de verdade, não só no dia da consulta."**

## 2. Problema (sem citar a Skyro)

Quem começa a cuidar da saúde com um profissional só o encontra de tempos em tempos. Entre uma consulta e outra, o profissional não sabe se a pessoa dormiu mal, faltou ao treino ou parou de beber água, e a pessoa perde o ritmo sem ninguém perceber. Ao mesmo tempo, os dados de rotina ficam espalhados em vários apps que o profissional não vê.

> Hipótese a validar nas entrevistas (Etapas 1 e 3 do checklist). Não usar depoimentos inventados.

## 3. Solução

**Lado da pessoa (paciente/aluno):**
- monta a rotina (treino, água, foco, sono) e marca o que fez;
- mantém o strike e ganha pontos por consistência;
- encontra um profissional perto dela e escolhe **compartilhar** a rotina com ele (consentimento explícito, revogável);
- recebe dicas do profissional dentro do app.

**Lado do profissional:**
- vê a lista de pacientes ordenada por quem **precisa de atenção hoje** (sono curto, treino perdido, pouca água, sem registro);
- abre um paciente e lê um **resumo semanal gerado por IA** a partir dos registros;
- envia uma dica ou mensagem para o paciente.

## 4. Diferencial (no máximo três)

1. **Entre consultas:** o profissional acompanha a rotina real, não só o relato do dia da consulta.
2. **Alerta e resumo por IA:** o profissional não precisa ler planilhas; a IA aponta quem precisa de atenção e por quê.
3. **Rotina do jeito da pessoa:** strike e recompensas mantêm o hábito; o profissional entra quando faz sentido.

Concorrentes a comparar (Etapa 2): Doctoralia (catálogo e agenda, sem rotina), Zenklub (terapia online), apps de hábitos (sem profissional).

## 5. Escopo do MVP

### Entra (5 telas + login simples)

| # | Tela | Mockup de base |
|---|---|---|
| 1 | Início da pessoa: strike, sono, foco, checklist de hoje, card "seu profissional viu..." | MVP · Início |
| 2 | Registro do dia: marcar hábitos, horário de sono, água | MVP · Rotina |
| 3 | Perto de você + perfil do profissional + botão **Compartilhar minha rotina** | MVP · Perto de você / Perfil do profissional |
| 4 | Painel do profissional: pacientes com status "Atenção" ou "Em dia" | Profissional · Pacientes |
| 5 | Paciente (visão do profissional): resumo semanal por IA + enviar dica | Profissional · Paciente |

### Fica fora (roadmap)

Liga Skyro, Loja Skyro, check-in com foto, Gymrats, agenda real e pagamento, chat completo, integração com relógios, WhatsApp real (na demo, o aviso é simulado ou via sandbox).

## 6. Regras de alerta (sem IA, determinísticas)

Um paciente fica em **Atenção** se, nos últimos registros:
- dormiu menos de 6h na última noite; ou
- perdeu 2 ou mais treinos planejados na semana; ou
- bebeu menos de 50% da meta de água ontem; ou
- não registra nada há 2 dias ou mais.

A IA **não decide** o alerta; ela só escreve o resumo legível para o profissional. Isso mantém o comportamento previsível e explicável.

## 7. Uso da IA

Entrada: registros dos últimos 7 dias do paciente (sono, treinos, água, foco, strike) + especialidade do profissional.
Saída: resumo de 3 a 5 linhas em português, com padrões ("nos dias com menos de 6h de sono, faltou ao treino") e um ponto de atenção.
Limites: a IA não diagnostica, não prescreve e não fala com o paciente diretamente; o texto vai só para o profissional, que decide o que fazer.

## 8. Tecnologia proposta

- **Backend:** Python + Flask + SQLite (mesmo padrão do CS50).
- **Frontend:** HTML, CSS e JavaScript com templates Jinja, layout mobile.
- **IA:** API de um LLM (ex.: Claude) para o resumo semanal.
- **Avisos:** simulados na demo; WhatsApp real só se sobrar tempo (sandbox).
- **Deploy:** um serviço gratuito (Render, Railway ou similar) para a demo pública.

## 9. Modelo de dados (mínimo)

- `users` (id, nome, tipo: pessoa | profissional, e-mail, senha_hash)
- `professionals` (user_id, especialidade, bio, cidade, bairro, lat, lng, modalidade, **demo: bool**)
- `habits` (id, user_id, nome, horario, meta)
- `logs` (id, user_id, data, sono_horas, agua_litros, foco_min, treino_feito)
- `shares` (pessoa_id, profissional_id, criado_em, revogado_em)
- `tips` (id, profissional_id, pessoa_id, texto, criado_em)

## 10. Privacidade e regras profissionais

- O profissional só vê dados de quem **compartilhou** com ele; a pessoa pode revogar a qualquer momento.
- Consentimento explícito na tela de compartilhar, explicando quais dados serão vistos.
- Todos os perfis, avaliações e "registro verificado" da demo são **fictícios e identificados como demonstrativos**.
- Verificar regras do CFP, CFN e CONFEF sobre publicidade, preços e avaliações antes de exibir estrelas e notas (Etapa 3 do checklist). Na dúvida, mostrar perfil sem nota para psicólogos.
- Aviso permanente: a Skyro não substitui atendimento profissional e não faz diagnóstico.

## 11. Roteiro da demo (3 minutos)

1. **0:00–0:25 — Problema:** "entre uma consulta e outra, seu nutricionista não sabe como você está".
2. **0:25–1:10 — Pessoa:** abre o Início, marca o dia, encontra a nutricionista perto e compartilha a rotina.
3. **1:10–2:15 — Profissional:** painel mostra "3 pacientes precisam de atenção"; abre um; a IA resume a semana; envia uma dica.
4. **2:15–2:35 — Volta para a pessoa:** a dica aparece no Início ("Sua nutricionista viu seu sono").
5. **2:35–3:00 — Negócio e próximos passos:** freemium para a pessoa, assinatura para o profissional (a validar), roadmap.

## 12. Modelo de negócio (a validar)

- **Pessoa:** gratuito (rotina, strike, compartilhar com 1 profissional); Premium com recursos extras (valor fictício: R$ 14,90/mês).
- **Profissional:** assinatura do painel com alertas e resumos por IA (preço a testar com os 9 profissionais entrevistados).
- **Parcerias:** academias e clínicas, identificadas claramente como serviços.

## 13. Plano de 20 dias (10/11 a 30/11)

| Dias | Entrega |
|---|---|
| 10–12/11 | Entrevistas (pessoas e profissionais), repositório novo, esqueleto Flask + banco + dados demonstrativos |
| 13–17/11 | Telas da pessoa (Início, Registro, Perto de você, Compartilhar) |
| 18–21/11 | Painel do profissional, regras de alerta, tela do paciente |
| 22–24/11 | Resumo por IA, dica do profissional aparecendo para a pessoa |
| 25–27/11 | Deploy, testes com 10 pessoas sem ajuda, correção dos 3 maiores problemas |
| 28–29/11 | Pitch atualizado, README, gravação do vídeo |
| 30/11 | Revisão final e submissão (antes das 23h59) |

## 14. Pendências da equipe

- [ ] Confirmar se a equipe domina Flask/Python ou prefere outra stack.
- [ ] Fazer pelo menos 15 entrevistas com pessoas e 9 com profissionais.
- [ ] Conferir regras dos conselhos profissionais.
- [ ] Atualizar o pitch (PDF) para este eixo: o slide de MVP hoje deixa os profissionais para depois.
- [ ] Ler o regulamento completo em hackbrasil.com/regulamento.
