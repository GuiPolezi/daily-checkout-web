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

- **Concluída rápido demais** — tarefa criada e concluída em menos de 1 minuto. Se você costuma lançar no fim do dia o que já fez, a tarefa aparece no checkout normalmente, só não rende XP. (Este tempo é ajustável; veja a parte técnica.)
- **Título repetido no dia** — duas tarefas com o mesmo título no mesmo dia rendem XP uma vez só.
- **Concluída fora do dia** — tarefa de ontem concluída hoje não rende XP.
- **Teto diário** — tarefas avulsas rendem no máximo 100 XP por dia. A rotina tem um teto próprio de 80 XP por dia. Os bônus não entram em teto.

Se você desfaz uma conclusão (volta o card de coluna, apaga a tarefa ou desmarca a rotina), o XP correspondente é estornado. Concluir de novo devolve o XP — nunca em dobro.

Tarefas de rotina só rendem XP no dia da semana para o qual foram cadastradas (ou se forem de "Todos" os dias).

Rotina, checkout e dia perfeito só rendem XP **no próprio dia**. Marcar uma rotina ou enviar o checkout de um dia que já passou não gera XP; em dias passados o sistema só estorna o que foi desfeito.

### Níveis e títulos

O XP necessário para subir cresce aos poucos: o começo é rápido e os níveis altos pedem mais constância.

| Nível | XP para o próximo nível | XP acumulado para chegar |
|---|---|---|
| 1 | 60 | 0 |
| 2 | 170 | 60 |
| 3 | 312 | 230 |
| 4 | 480 | 542 |
| 5 | 671 | 1.022 |
| 10 | 1.897 | 6.664 |
| 20 | 5.367 | 40.282 |

Com um ritmo de cerca de 80 XP por dia útil: nível 5 em umas 2 a 3 semanas, nível 10 em cerca de 4 meses, nível 20 em cerca de 2 anos.

| Níveis | Título |
|---|---|
| 1–4 | Aprendiz de Essências |
| 5–9 | Perfumista Júnior |
| 10–19 | Perfumista |
| 20–34 | Mestre Perfumista |
| 35+ | Nariz Lendário |

O personagem muda de cor a cada faixa de título. É só visual; não dá vantagem.

### Sequência e escudos

- A sequência conta **dias úteis seguidos** (segunda a sexta) em que você ganhou XP com pelo menos uma tarefa ou rotina.
- Sábado e domingo são neutros: não contam e não quebram a sequência.
- A cada 7 dias de sequência você ganha **1 escudo** (máximo de 2 guardados). Se você perder um dia útil, um escudo é gasto e a sequência continua.
- Sem escudo, perder um dia útil zera o contador — mas o seu recorde fica salvo.
- **Você nunca perde XP nem nível** por ficar sem usar o sistema.
- Feriados ainda não são reconhecidos; os escudos servem para cobrir esses dias.

### Onde ver

- **Meu Dia**: card com o personagem, nível, título, barra de XP, sequência, escudos e XP de hoje.
- **Meu Perfil**: totais, recorde de sequência, tabela dos próximos níveis e o histórico de cada lançamento de XP.

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
- `achievements`, `user_achievements`, `avatar_items`, `user_avatar` — criadas vazias para as próximas fases.

Segurança: as tabelas de XP só têm política de leitura. Quem escreve é o servidor, com a `SUPABASE_SERVICE_ROLE_KEY`. Cada pessoa lê apenas o próprio histórico de XP.

Como não há duplicidade: a chave de cada lançamento é `usuário:dia:origem:sequência`. Duas sincronizações simultâneas geram a mesma chave e o banco aceita só uma.

### Instalação (uma vez)

1. No **SQL Editor** do Supabase, rode `supabase/migrations/001_gamification.sql`.
2. Rode `supabase/migrations/002_fechar_leitura_sem_login.sql`. É uma correção de segurança independente da gamificação (a gamificação funciona sem ela): impede que relatórios, perfis e estatísticas sejam lidos sem login. Nenhuma tela do sistema lê essas tabelas sem sessão, e o arquivo traz o comando para desfazer.
3. Na **Vercel** (Settings → Environment Variables) e no `.env.local`, adicione `SUPABASE_SERVICE_ROLE_KEY` com a chave *service_role* do projeto (Supabase → Settings → API). Essa chave nunca deve receber o prefixo `NEXT_PUBLIC_`.
4. Faça o deploy.

Enquanto os passos 1 e 3 não forem feitos, a rota responde 503 e as telas simplesmente não mostram o card — o restante do sistema funciona como antes.

### Como ajustar parâmetros

Edite o JSON da linha única de `gamification_config`. Só é preciso informar o que muda; o resto continua com o padrão de `config.ts`. Valores com formato inválido são ignorados.

```sql
-- Desligar a regra do "rápido demais" e aumentar o bônus do checkout
update gamification_config
set params = '{"task": {"minSecondsToComplete": 0}, "bonus": {"dailyCheckout": 25}}',
    updated_at = now()
where id = 1;
```

Parâmetros disponíveis: `timeZone`, `workdays`, `task` (`baseXp`, `routineBaseXp`, `priorityMultipliers`, `dailyCap`, `routineDailyCap`, `minSecondsToComplete`, `dedupeTitles`), `streak` (`multiplierPerDay`, `multiplierMax`, `shieldEvery`, `maxShields`, `milestones`, `milestoneBonus`), `bonus` (`dailyCheckout`, `perfectDay`), `level` (`coefficient`, `exponent`, `maxLevel`), `titles` e `backfill.xpPerTask`.

Atenção: mudar a curva (`level`) muda o nível de todos imediatamente, porque o nível é derivado do XP. Mudar valores de XP vale para o dia de hoje em diante; dias já lançados só são recalculados se forem sincronizados de novo.

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

- **Fase 2**: conquistas, personalização do personagem por nível, missões.
- **Fase 3**: metas cooperativas da equipe e painel do gestor (exige papéis de usuário).
