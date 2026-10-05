# Gamificação — contexto e próximos passos

Arquivo de retomada. Registra onde o trabalho parou em **2026-10-05**, as decisões tomadas e o que pode vir depois. As regras e a parte técnica estão em [`GAMIFICACAO.md`](./GAMIFICACAO.md); aqui fica o histórico e a fila.

> Para retomar com o Claude Code: peça para ler este arquivo e o `docs/GAMIFICACAO.md` antes de qualquer mudança.

---

## 1. Onde paramos

- **Branch:** `feature/gamificacao`, criada a partir de `main` (`68be36a`). O push e a publicação são feitos pelo dono do projeto.
- **Produção (Vercel):** ainda na versão antiga até a branch ser publicada.
- **Banco (Supabase):** migrations `001`, `002` e `003` aplicadas. `004` e `005` são opcionais e não há confirmação de que foram rodadas. O ledger (`xp_events`) estava **vazio** na última conferência — ninguém ganhou XP ainda.
- **Vercel / `.env.local`:** `SUPABASE_SERVICE_ROLE_KEY` cadastrada.
- **Uso:** um único usuário de fato, que é também o dono e gestor do sistema. **O foco é o uso individual.**

| Commit | O que entrou |
|---|---|
| `30ee222` | Fase 1: ledger de XP, níveis, sequência com escudos, card de perfil com personagem 3D, página Meu Perfil, migrations 001 e 002 |
| `1b9eced` | Conquistas (18 medalhas), migration 003 |
| `00eee7f` | Missões diárias e semanais, personalização padrão do personagem, rota de avatar |
| `820e863` | Regra do tempo mínimo desligada, correções de avisos e totais, migration 004 |
| `9f52684` | Metas cooperativas da equipe, migration 005 |
| `fa63985` | Documentação: limites de privacidade das metas de equipe |
| `449666c` | Metas de equipe desligadas por padrão (foco individual) |

O pedido original (`prompt-gamificacao-daily-checkout.md`) foi removido da raiz no commit `97c8de6`; continua disponível no histórico do git, em `5ad3e21`.

---

## 2. O que nunca foi verificado

Tudo abaixo passou em testes automáticos e revisão de código, mas **ninguém viu funcionando**:

- **A tela.** Card de perfil, personagem 3D, cores e animações de comemoração, painel de missões, avisos de "+XP", modal de subida de nível e a página Meu Perfil. O enquadramento do modelo 3D e as cores dos itens foram escolhidos sem ver o resultado.
- **O fluxo completo com login.** O XP só rodou contra um banco simulado. Contra o banco real foram feitas apenas leituras.
- **As migrations 003, 004 e 005 em execução.** Foram conferidas por leitura do SQL.

**Roteiro sugerido para o primeiro teste:**

1. Abrir Meu Dia: o card aparece? O personagem 3D carrega (ou cai no 2D)?
2. Criar uma tarefa e arrastar para "Concluída": aparece "+10 XP" e o chip no card?
3. Voltar a tarefa de coluna: aparece o estorno e o total diminui?
4. Marcar rotinas na tela Rotina: rende XP? "Concluir tudo" dá o bônus de dia perfeito?
5. Enviar o checkout: +20 XP, uma vez só mesmo enviando de novo?
6. Abrir Meu Perfil: conquistas, missões, histórico e a troca de cor/aura/comemoração do personagem.
7. Tema escuro e celular.

---

## 3. Decisões tomadas (e por quê)

| Decisão | Motivo |
|---|---|
| XP calculado numa rota de servidor que reconcilia o ledger | O app grava direto no Supabase pelo navegador; o cliente só manda a data e nunca um valor de XP |
| "Hoje" segue o fuso de Brasília | Antes era UTC: depois das 21h o sistema já mostrava o dia seguinte |
| Prioridade não muda o XP | A pessoa escolhe a própria prioridade; premiar "Urgente" incentivaria marcar tudo assim |
| Sequência por dia útil ativo, não por checkout | Havia 19 checkouts em 6 meses contra 711 tarefas; por checkout a sequência viveria zerada |
| Curva com coeficiente 60 (não 100) e teto de 100 XP/dia de tarefas | O ritmo real é de 3 a 4 tarefas por dia, cerca de 80 XP |
| Nível não é gravado, é derivado do XP | Evita divergência entre banco e tela |
| Regra do tempo mínimo (1 minuto) **desligada** | O usuário lança no fim do dia o que já fez; a regra zeraria o XP |
| `three` puro, sem react-three-fiber | Mesmo resultado com menos peso; fica fora do carregamento inicial |
| Teto de 80 XP/dia para rotina | Qualquer pessoa pode criar rotinas; sem teto dava para fabricar XP |
| Metas de equipe **desligadas** e painel do gestor **não iniciado** | Só há um usuário; equipe fica em análise |
| Progresso da equipe oculto abaixo de 3 contribuidores | Com poucas pessoas, o total menos o próprio número revela o do colega |

---

## 4. Valores provisórios que precisam de definição

Tudo ajustável em `gamification_config` (ver "Como ajustar parâmetros" em `GAMIFICACAO.md`), sem mexer em código.

- **Recompensas das missões** (`missions.rewards`): 10 a 40 XP, colocadas só para a mecânica rodar. Calibrar pelo ritmo real.
- **Alvos das missões:** hoje fixos no código (`src/lib/gamification/missions.ts`): 3 tarefas, 2 rotinas, 3 e 5 dias ativos, 300 XP na semana. Se for preciso ajustá-los com frequência, vale movê-los para a configuração.
- **Itens do personagem:** conjunto padrão (7 cores, 6 auras, 5 comemorações). Os itens personalizados pelo dono ainda serão definidos.
- **Metas de equipe** (`team.goals`): 10 dias ativos e 500 XP, 20 XP de recompensa. Só importam se a equipe for religada.

---

## 5. Fila de próximos passos

### Próximo, já combinado

- **Novo layout da página inicial.** O design será montado pelo dono do projeto. Ao implementar:
  - O card de perfil e o painel de missões hoje ficam entre o cabeçalho de data e o campo de nova tarefa (`app/page.tsx`), empurrando o kanban para baixo.
  - O kanban precisa ficar dentro de `.panel`, nunca de `.glass`: `backdrop-filter` num ancestral desloca o card durante o arrastar.
  - Os avisos de XP e o modal (`XpFeedback`) usam `position: fixed` e devem ficar fora de qualquer `.glass`.
  - O personagem 3D é carregado sob demanda; manter isso para não atrasar o kanban.
  - O projeto ainda não tem um `DESIGN.md`. Se o novo design virar referência, vale criar um na raiz com cores, espaçamentos e componentes.

### Decidir antes do primeiro uso real

- **Backfill.** Há 711 tarefas antigas. `node scripts/backfill-xp.mjs` simula; com `--apply`, grava cerca de 10 XP por tarefa já concluída. Começar do zero ou não é mais fácil de decidir antes de acumular XP novo.

### Ideias para o uso individual

- **Calibrar missões e conquistas** depois de uma ou duas semanas de uso real.
- **Resumo semanal pessoal:** XP da semana, dias ativos, comparação com a semana anterior (recordes pessoais, sem ranking).
- **Itens personalizados do personagem** e, se desejado, acessórios 3D (exige modelar ou baixar peças e conferir a licença).
- **Missões configuráveis:** mover alvos para a configuração e permitir missões novas sem código.
- **Feriados:** hoje não são reconhecidos; os escudos cobrem. Uma lista de feriados na configuração evitaria gastar escudo.
- **Conquista "Madrugador"** e outras baseadas em horário: exigem guardar a hora de conclusão nos metadados (o dado já existe em `tasks.completed_at`).

### Em análise (equipe e gestor)

- **Metas de equipe:** prontas e desligadas. Religar quando houver mais gente usando; calibrar alvos pelo tamanho da equipe.
- **Painel do gestor:** não iniciado. Recomendações registradas: mostrar só números agregados, sem ranking por pessoa; identificar o gestor por uma lista de e-mails na configuração.
- **Papéis de usuário:** não existem. Hoje qualquer pessoa cria e apaga rotinas da equipe.

---

## 6. Pendências técnicas conhecidas

Nenhuma é grave; todas foram apontadas em revisão e deixadas para depois.

**Gamificação**

- Com o mínimo de contribuidores em 1, o texto sai "1 pessoas contribuíram" (só aparece com a equipe ligada).
- Com o progresso da equipe oculto, a barra fica em 0% mesmo perto da meta.
- O índice da migration 005 ajuda menos do que poderia (faltam `type` e `amount`).
- A função SQL da migration 004 não valida o slot e o item; quem valida é o servidor.
- Não há limite de frequência nas rotas `/api/gamification/*`.
- Missão semanal e meta de equipe pagas não são estornadas se a atividade for desfeita depois (intencional).
- Desligar as missões ou zerar uma recompensa estorna o XP de missão diária do dia que for sincronizado em seguida.

**Anteriores à gamificação**

- **Next.js 16.1.6** tem alertas críticos no `npm audit`. Vale atualizar em uma mudança separada.
- **Políticas das tabelas antigas:** não foi possível conferir se `tasks`, `team_task_completions` e `reports` exigem `auth.uid() = user_id` para escrita. Com um só usuário o risco é teórico; a consulta de conferência está no fim de `supabase/migrations/002_fechar_leitura_sem_login.sql`.
- **Lint:** 23 problemas antigos nas telas originais (uso de `any`, funções chamadas antes da declaração). Nenhum em arquivo de gamificação.
- **README:** descreve um envio de e-mail (`api/send-email`) que não existe mais no código.

---

## 7. Como o trabalho foi conduzido

- **Testes:** 103 testes (`npm test`) cobrindo regras de XP, níveis, sequência, missões, conquistas, personagem e o serviço com um banco em memória.
- **A cada mudança de comportamento:** `npm test`, `npm run typecheck`, `npm run build`, e uma revisão independente por um revisor que não escreveu o código. Mudanças que tocam segurança ou acesso passaram por duas revisões.
- **Banco real:** nunca foi escrito por automação; só leituras de conferência. As migrations são rodadas manualmente no SQL Editor.
- **Commits:** feitos na branch `feature/gamificacao`; o push é do dono do projeto.

### Mapa rápido do código

| Onde | O quê |
|---|---|
| `src/lib/gamification/config.ts` | Todos os parâmetros e padrões |
| `src/lib/gamification/xp.ts`, `levels.ts`, `streak.ts` | Regras de XP, curva de nível, sequência |
| `src/lib/gamification/missions.ts`, `achievements.ts`, `avatar.ts`, `team.ts` | Catálogos e regras de cada extra |
| `src/lib/gamification/reconcile.ts`, `service.ts` | Reconciliação do ledger e orquestração |
| `src/lib/gamification/supabaseRepo.ts` | Acesso ao banco (somente servidor) |
| `app/api/gamification/sync`, `avatar` | Rotas de servidor |
| `app/components/gamification/` | Card, personagem 3D/2D, missões, avisos, seletor de itens, hook |
| `app/perfil/page.tsx` | Página Meu Perfil |
| `supabase/migrations/` | SQL (001 a 005) |
| `scripts/backfill-xp.mjs` | XP retroativo opcional |
