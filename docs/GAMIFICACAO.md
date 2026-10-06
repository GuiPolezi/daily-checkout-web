# Gamificação do Daily Checkout

Este documento tem duas partes: a primeira explica as regras em linguagem simples, para quem usa o sistema e para gestores; a segunda é técnica.

A ideia central: a gamificação existe para **reforçar o hábito de planejar e concluir o dia**. Ela não é ferramenta de avaliação de desempenho, não tira pontos de ninguém e não compara pessoas.

---

## Parte 1 — Como funciona (para usuários e gestores)

### Como se ganha XP

| O que você faz | XP |
|---|---|
| Concluir uma tarefa do seu dia (arrastar para "Concluída") | 10 |
| Marcar uma tarefa da Rotina prevista para hoje | 8 |
| Enviar o checkout do dia (se o dia já rendeu XP de tarefa ou rotina) | +20, uma vez por dia |
| Dia perfeito: marcar todas as rotinas previstas para hoje | +30 |
| Chegar a 7, 30 ou 100 dias de sequência | +50 |

Quem está em sequência ganha um pouco mais por tarefa: +2% por dia de sequência, até o máximo de +30%.

### Quando uma tarefa não rende XP

O card da tarefa mostra o motivo. As regras existem para que o XP reflita trabalho real:

- **Título repetido no dia** — duas tarefas com o mesmo título no mesmo dia rendem XP uma vez só.
- **Concluída fora do dia** — tarefa de ontem concluída hoje não rende XP.
- **Teto diário** — tarefas avulsas rendem no máximo 100 XP por dia. A rotina tem um teto próprio de 80 XP por dia. Os bônus não entram em teto.

Se você desfaz uma conclusão (volta o card de coluna, apaga a tarefa ou desmarca a rotina), o XP correspondente é estornado. Concluir de novo devolve o XP — nunca em dobro.

Tarefas de rotina só rendem XP no dia da semana para o qual foram cadastradas (ou se forem de "Todos" os dias).

Rotina, checkout e dia perfeito só rendem XP **no próprio dia**. Marcar uma rotina ou enviar o checkout de um dia que já passou não gera XP; em dias passados o sistema só estorna o que foi desfeito.

### Níveis e títulos

O XP de cada nível cresce devagar (150 no primeiro, 597 no décimo, 2.377 no centésimo): subir de nível continua acontecendo a cada poucas semanas mesmo para quem já está alto.

| Nível | XP para o próximo nível | XP acumulado para chegar |
|---|---|---|
| 1 | 150 | 0 |
| 2 | 227 | 150 |
| 3 | 290 | 377 |
| 4 | 345 | 667 |
| 5 | 394 | 1.012 |
| 10 | 597 | 3.411 |
| 20 | 905 | 10.839 |
| 35 | 1.266 | 27.042 |
| 50 | 1.568 | 48.205 |
| 70 | 1.919 | 82.988 |
| 100 | 2.377 | 147.370 |

Com um ritmo de cerca de 80 XP por dia útil (só tarefas e rotina): Prata em 3 semanas, Ouro em 2 meses, Platina em 6 meses, Esmeralda em pouco mais de 1 ano, Diamante em 2 anos e meio, Mestre em 4 anos e Grão-Mestre em 7. Missões, checkout e conquistas aceleram esse ritmo.

| Níveis | Título |
|---|---|
| 1–4 | Bronze |
| 5–9 | Prata |
| 10–19 | Ouro |
| 20–34 | Platina |
| 35–49 | Esmeralda |
| 50–69 | Diamante |
| 70–99 | Mestre |
| 100+ | Grão-Mestre |

O personagem muda de cor a cada faixa de título. É só visual; não dá vantagem.

#### Por que a curva é assim

A curva foi calibrada em 2026-10-05 pelos prazos que a pesquisa sobre formação de hábitos mede, convertidos em dias úteis a 80 XP por dia:

| Título | Nível | XP acumulado | Dias úteis | Marco da pesquisa |
|---|---|---|---|---|
| Prata | 5 | 1.012 | 13 (~18 dias corridos) | 18 dias: o caso mais rápido de automatização observado por Lally (2010) |
| Ouro | 10 | 3.411 | 43 (~2 meses) | 66 dias: mediana de Lally; a meta-análise de 2024 achou medianas de 59 a 66 dias |
| Platina | 20 | 10.839 | 135 (~6 meses) | 2 a 5 meses: faixa típica da meta-análise (médias de 106 a 154 dias) |
| Esmeralda | 35 | 27.042 | 338 (~16 meses) | 335 dias: o maior tempo registrado; quem chega aqui consolidou o hábito por qualquer medida |
| Diamante, Mestre, Grão-Mestre | 50, 70, 100 | 48.205, 82.988, 147.370 | 2,4, 4 e 7 anos | Longo prazo, como os ranques do xadrez: reconhecem anos de constância |

Três outras conclusões da mesma pesquisa aparecem nas regras:

- **Perder um dia isolado não atrapalha** a formação do hábito; o que atrapalha é desistir depois da falha. Por isso os escudos protegem a sequência e o sistema nunca tira XP nem nível.
- **Recompensa cedo importa**: o primeiro nível custa 150 XP, o que um dia completo (tarefas, rotina, checkout e missões) já cobre.
- **Hábitos escolhidos pela própria pessoa são mais fortes**: a prioridade e as rotinas continuam nas mãos de quem usa.

A curva antiga (`60 × nível^1,5`) deixava o nível 35 a mais de 8 anos de distância e o 100 a mais de um século. Fontes:

- Lally, P. et al. (2010), *How are habits formed: Modelling habit formation in the real world*, European Journal of Social Psychology — [artigo](https://www.researchgate.net/publication/32898894_How_are_habits_formed_Modeling_habit_formation_in_the_real_world) · [resumo da autora](https://www.surrey.ac.uk/news/does-it-really-take-66-days-form-habit-we-asked-expert-dr-pippa-lally)
- Singh, B. et al. (2024), *Time to Form a Habit: A Systematic Review and Meta-Analysis of Health Behaviour Habit Formation and Its Determinants*, Healthcare — [artigo](https://www.mdpi.com/2227-9032/12/23/2488) · [resumo](https://www.sciencedaily.com/releases/2025/01/250124151347.htm)

### Sequência e escudos

- A sequência conta **dias úteis seguidos** (segunda a sexta) em que você ganhou XP com pelo menos uma tarefa ou rotina.
- Sábado e domingo são neutros: não contam e não quebram a sequência.
- A cada 7 dias de sequência você ganha **1 escudo** (máximo de 2 guardados). Se você perder um dia útil, um escudo é gasto e a sequência continua.
- Sem escudo, perder um dia útil zera o contador — mas o seu recorde fica salvo.
- **Você nunca perde XP nem nível** por ficar sem usar o sistema.
- Feriados ainda não são reconhecidos; os escudos servem para cobrir esses dias.

### Conquistas

Medalhas permanentes por marcos de uso: tarefas concluídas (1, 50, 250, 1.000), rotinas marcadas (25, 200), checkouts enviados (1, 20, 100), dias perfeitos (1, 5, 25), sequência (7, 30, 45, 100 dias úteis) e nível (5, 10, 20, 35, 50). São 21 ao todo; a lista com os nomes está no README.

O tema é a forja, em linha com os títulos de Bronze a Grão-Mestre: a tarefa é a martelada, a rotina é o fogo que não apaga, o checkout é o selo do ourives e a sequência é a chama. A conquista "Hábito Forjado" (45 dias úteis, cerca de 66 corridos) marca a mediana que a pesquisa mede para um hábito virar automático.

- Uma conquista desbloqueada **nunca é retirada**, mesmo que você desfaça algo depois.
- As de tarefas, rotina, checkout e dia perfeito dão um bônus único de XP (de 10 a 200). As de sequência e de nível são só reconhecimento, porque a sequência já paga bônus nos marcos e o nível é consequência do XP.
- Só conta o que rendeu XP: uma tarefa que ficou "sem XP" não avança as conquistas.
- A lista completa, com o seu progresso em cada uma, fica em **Meu Perfil**.

### Missões

Objetivos curtos que dão um XP extra. **As recompensas atuais são provisórias**, só para a mecânica poder ser testada; os valores definitivos ainda serão combinados.

| Missão | O que pede | XP (provisório) |
|---|---|---|
| Três Notas (diária) | Concluir 3 tarefas que rendam XP no dia | 15 |
| Ritual Duplo (diária) | Marcar 2 tarefas de rotina no dia | 10 |
| Dia Redondo (diária) | Uma tarefa com XP, uma rotina e o checkout enviado | 15 |
| Constância (semanal) | 3 dias úteis ativos na semana | 20 |
| Semana Cheia (semanal) | 5 dias úteis ativos na semana | 40 |
| Colheita da Semana (semanal) | Somar 300 XP na semana | 30 |

- A semana vai de segunda a domingo.
- Missão **diária** funciona como o resto do XP do dia: se você desfaz o que a cumpriu, o XP dela é estornado.
- Missão **semanal** é paga uma vez por semana e não é retirada depois.
- O XP de missão não conta como "dia ativo" para a sequência — a sequência depende de tarefa ou rotina de verdade.

### Metas da equipe (desligadas)

> **Estado atual: desligadas.** O sistema tem hoje um único usuário ativo, então o foco é o uso individual. O código das metas de equipe está pronto e testado, mas não aparece na tela. Para ligar: `update gamification_config set params = jsonb_set(params, '{team,enabled}', 'true'::jsonb, true) where id = 1;` (esse comando muda só essa chave e preserva o resto da configuração)

Metas semanais que valem para a equipe inteira, mostradas junto das missões. **Alvos e recompensas são provisórios.**

| Meta | O que pede | XP (provisório) |
|---|---|---|
| Semana em Conjunto | Somando todo mundo, 10 dias úteis ativos na semana | 20 |
| Colheita Coletiva | A equipe soma 500 XP de tarefas e rotinas na semana | 20 |

- O painel mostra só o total da equipe e quantas pessoas contribuíram. Não há ranking nem lista por pessoa.
- **O progresso só aparece quando pelo menos 3 pessoas contribuíram na semana.** Com menos gente, o total da equipe menos o seu próprio número revelaria o de um colega; nesse caso o painel mostra apenas se a meta foi batida ou não.
- **Limites dessa proteção, para ficar claro:**
  - Com exatamente 3 pessoas contribuindo, o total mostrado é exato: quem contribuiu consegue calcular a soma das outras duas (não o número de cada uma). Se isso for sensível para a equipe, aumente `team.minContributorsToShow`.
  - Mesmo com o progresso oculto, o painel mostra quando a meta passa de "não batida" para "batida". Numa equipe de duas pessoas, isso indica que a outra teve atividade na semana.
  - Quem acompanha o painel de perto percebe quando o total sobe.
  - Nada disso é mais detalhado do que o que as telas Equipe e Histórico já mostram por pessoa, mas a meta da equipe não deve ser lida como "anônima" em equipes muito pequenas.
- Quando a meta é batida, quem teve pelo menos uma tarefa ou rotina com XP na semana recebe a recompensa, uma vez, **na próxima vez que abrir o sistema naquela mesma semana (até domingo)**. Quem não abrir o sistema depois que a meta foi batida não recebe a daquela semana.
- Quem não contribuiu vê a meta, mas não recebe.

### Personagem

Em **Meu Perfil** dá para escolher a cor do personagem, a cor da aura e a comemoração que ele faz quando você ganha XP. Os itens são liberados por nível e são só visuais. A opção "Automática" segue a cor da sua faixa de título. Este é um conjunto padrão inicial; itens personalizados entram depois.

### Onde ver

- **Meu Dia**: card com o personagem, nível, título, barra de XP, sequência, escudos e XP de hoje, e o painel de missões (recolhido por padrão; inclui as metas da equipe quando elas estão ligadas).
- **Meu Perfil**: totais, recorde de sequência, personalização do personagem, missões, conquistas, tabela dos próximos níveis e o histórico de cada lançamento de XP.

### Limitações conhecidas (para gestores)

- **Dia perfeito é fácil de obter**: o botão "Concluir tudo" marca todas as rotinas de uma vez, e qualquer pessoa pode criar ou apagar rotinas da equipe. Enquanto o sistema não tiver papéis (gestor × colaborador), esse bônus depende de boa-fé. O valor é ajustável.
- **A prioridade não muda o XP**. Como cada pessoa escolhe a prioridade da própria tarefa, premiar "Urgente" incentivaria marcar tudo como urgente.

---

## Parte 2 — Técnica

### Visão geral

```
tela (cliente)  ──POST /api/gamification/sync { date }──►  rota de servidor
                                                              │ lê o dia no banco (service role)
                                                              │ calcula o XP que o dia deveria ter
                                                              │ lança só a diferença no ledger
                                                              ▼
                                                    xp_events  →  user_progress
```

O cliente envia apenas a data. Todo valor é recalculado no servidor a partir do banco, então não há como "enviar XP". A sincronização é idempotente: chamá-la de novo sem mudanças não lança nada.

A tela Meu Dia sincroniza ao abrir um dia e depois de mover, editar ou apagar tarefa e de enviar o checkout. A tela Rotina sincroniza depois de marcar ou desmarcar uma rotina. Meu Perfil sincroniza ao abrir.

### Arquivos

| Caminho | Papel |
|---|---|
| `src/lib/gamification/config.ts` | Todos os parâmetros e seus valores padrão |
| `src/lib/gamification/levels.ts` | `xpForLevel`, `levelFromXp`, títulos (funções puras) |
| `src/lib/gamification/xp.ts` | `xpForTask`, `computeDesiredAwards` (regras de XP, puras) |
| `src/lib/gamification/streak.ts` | `computeStreak`, multiplicador (puras) |
| `src/lib/gamification/reconcile.ts` | Diferença entre o desejado e o ledger |
| `src/lib/gamification/service.ts` | `syncDay`: orquestra tudo por meio de `GamificationRepo` |
| `src/lib/gamification/supabaseRepo.ts` | Acesso ao Supabase (somente servidor) |
| `app/api/gamification/sync/route.ts` | Rota que valida o login e chama o serviço |
| `app/components/gamification/` | Card, personagem 3D/2D, avisos de XP, hook |
| `app/perfil/page.tsx` | Página "Meu Perfil" |
| `supabase/migrations/` | SQL das tabelas e da correção de segurança |
| `scripts/backfill-xp.mjs` | XP retroativo opcional |

### Modelo de dados

- **`xp_events`** — ledger imutável. Cada linha é um lançamento: `user_id`, `type`, `amount` (negativo em estornos), `source_id` (ex.: `task:123`, `routine:7`, `checkout`, `perfect_day`, `streak_milestone:7`), `day`, `idempotency_key` (única) e `metadata` com a memória de cálculo.
- **`user_progress`** — projeção: XP total, sequência atual, recorde, escudos. É regravada a cada sincronização a partir do ledger. O **nível não é gravado**; é sempre derivado do XP total.
- **`gamification_config`** — uma linha com um JSON de sobrescritas dos parâmetros.
- **`xp_day_totals`** — view com o XP por dia (base do total e da sequência).
- **`tasks.completed_at`** — preenchida por trigger no banco quando a tarefa entra em "Concluída". O cliente não consegue forjar essa data, nem `created_at`.
- **`user_achievements`** — conquistas desbloqueadas por pessoa. O catálogo fica no código (`src/lib/gamification/achievements.ts`); a tabela `achievements` é espelhada pelo servidor conforme as conquistas são desbloqueadas.
- **`xp_user_stats`** — view com as contagens usadas para desbloquear conquistas (migration 003).
- **`user_avatar`** — o que cada pessoa tem equipado (JSON por slot). O catálogo de itens fica no código (`src/lib/gamification/avatar.ts`); a tabela `avatar_items` ainda não é usada. Quem grava é a rota `POST /api/gamification/avatar`, que confere no ledger se o nível libera o item.
- **Metas da equipe** também não têm tabela: o servidor lê `xp_day_totals` de toda a equipe na semana (com a service role) e devolve só os agregados; a recompensa é um evento `TEAM_GOAL` sem dia, com chave `usuário:team:<id>:<segunda-feira da semana>`. O código fica em `src/lib/gamification/team.ts`.
- **Missões** não têm tabela própria: as diárias são origens `mission:<id>` na reconciliação do dia; as semanais são eventos `MISSION_COMPLETED` sem dia, com chave `usuário:mission:<id>:<segunda-feira da semana>`. O catálogo fica em `src/lib/gamification/missions.ts`.

Segurança: as tabelas de XP só têm política de leitura. Quem escreve é o servidor, com a `SUPABASE_SERVICE_ROLE_KEY`. Cada pessoa lê apenas o próprio histórico de XP.

Como não há duplicidade: a chave de cada lançamento é `usuário:dia:origem:sequência`. Duas sincronizações simultâneas geram a mesma chave e o banco aceita só uma.

### Instalação (uma vez)

1. No **SQL Editor** do Supabase, rode `supabase/migrations/001_gamification.sql`.
2. Rode `supabase/migrations/002_fechar_leitura_sem_login.sql`. É uma correção de segurança independente da gamificação (a gamificação funciona sem ela): impede que relatórios, perfis e estatísticas sejam lidos sem login. Nenhuma tela do sistema lê essas tabelas sem sessão, e o arquivo traz o comando para desfazer.
3. Na **Vercel** (Settings → Environment Variables) e no `.env.local`, adicione `SUPABASE_SERVICE_ROLE_KEY` com a chave *service_role* do projeto (Supabase → Settings → API). Essa chave nunca deve receber o prefixo `NEXT_PUBLIC_`.
4. Rode `supabase/migrations/003_conquistas.sql` para ligar as conquistas. Sem ela, XP, níveis e sequência funcionam normalmente e a seção de conquistas simplesmente não aparece.
5. Opcional: rode `supabase/migrations/005_indice_metas_equipe.sql`, um índice que mantém rápida a leitura das metas da equipe quando o histórico crescer. Só importa com as metas de equipe ligadas.
6. Opcional: rode `supabase/migrations/004_personagem_equip.sql`. A personalização do personagem funciona sem ela; a migration só impede que duas trocas feitas ao mesmo tempo (duas abas) se sobrescrevam.
7. Faça o deploy.

Enquanto os passos 1 e 3 não forem feitos, a rota responde 503 e as telas simplesmente não mostram o card — o restante do sistema funciona como antes.

### Como ajustar parâmetros

Edite o JSON da linha única de `gamification_config`. Só é preciso informar o que muda; o resto continua com o padrão de `config.ts`. Valores com formato inválido são ignorados.

```sql
-- Aumentar o bônus do checkout e exigir 60 s entre criar e concluir uma tarefa
update gamification_config
set params = '{"task": {"minSecondsToComplete": 60}, "bonus": {"dailyCheckout": 25}}',
    updated_at = now()
where id = 1;
```

Parâmetros disponíveis: `timeZone`, `workdays`, `task` (`baseXp`, `routineBaseXp`, `priorityMultipliers`, `dailyCap`, `routineDailyCap`, `minSecondsToComplete`, `dedupeTitles`), `streak` (`multiplierPerDay`, `multiplierMax`, `shieldEvery`, `maxShields`, `milestones`, `milestoneBonus`), `bonus` (`dailyCheckout`, `perfectDay`), `level` (`coefficient`, `exponent`, `maxLevel`), `titles`, `achievements.enabled`, `missions` (`enabled` e `rewards` por missão), `team` (`enabled`, `minContributorsToShow` e, por meta, `target` e `reward`) e `backfill.xpPerTask`.

Atenção: mudar a curva (`level`) muda o nível de todos imediatamente, porque o nível é derivado do XP. Mudar valores de XP vale para o dia de hoje em diante; dias já lançados só são recalculados se forem sincronizados de novo.

Existe uma regra opcional de tempo mínimo (`task.minSecondsToComplete`): com ela ligada, tarefa criada e concluída em menos de N segundos não rende XP. Ela vem **desligada** (valor 0), porque a equipe costuma lançar no fim do dia o que já fez. O teto diário e a regra de título repetido continuam limitando o abuso.

### Como recalcular o progresso

`user_progress` é refeita sozinha na próxima vez que a pessoa abrir o sistema. Para conferir o XP total direto do ledger:

```sql
select user_id, sum(amount) as total_xp from xp_events group by user_id;
```

### Backfill (opcional)

Dá um valor fixo (10 XP) por tarefa concluída antes da gamificação existir. Não gera bônus nem sequência, porque não há data de conclusão no histórico.

```bash
node scripts/backfill-xp.mjs           # simulação: mostra o que faria
node scripts/backfill-xp.mjs --apply   # grava
```

Pode ser executado mais de uma vez; cada pessoa recebe no máximo um lançamento.

### Personagem 3D

- `three` puro (sem bibliotecas adicionais), carregado sob demanda: fica fora do bundle inicial e só é baixado quando o navegador está ocioso.
- Modelo `public/models/RobotExpressive.glb` (464 KB), licença CC0 — detalhes em `public/models/LICENSE.md`.
- Renderiza a no máximo 30 quadros por segundo e pausa quando o card sai da tela ou a aba fica oculta.
- Volta para o personagem 2D (SVG) quando não há WebGL, o aparelho tem pouca memória, a economia de dados está ligada, "reduzir movimento" está ativo ou o modelo falha ao carregar.

### Testes

```bash
npm test          # regras e serviço (Vitest)
npm run typecheck
npm run build
```

### Próximas fases

- **Fase 2 (em andamento)**: conquistas, missões (com recompensas provisórias) e um conjunto padrão de personalização já entregues; faltam os valores definitivos das missões e os itens personalizados do personagem.
- **Fase 3 (em análise, sem desenvolvimento por enquanto)**: o foco atual é o uso individual.
  - Metas cooperativas da equipe: implementadas e desligadas (ver "Metas da equipe"). Religar quando houver mais pessoas usando; antes disso, calibrar alvos e recompensas pelo tamanho real da equipe.
  - Painel do gestor: não iniciado. O gestor é o dono do sistema (hoje, o único usuário). Quando fizer sentido, definir o que o painel mostra — a recomendação é só números agregados, sem ranking por pessoa, para não virar avaliação de desempenho — e como identificar o gestor (ex.: lista de e-mails na configuração).
