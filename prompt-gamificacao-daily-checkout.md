# Prompt — Gamificação do Daily Checkout (XP, Níveis e Personagem 3D)

> Cole este prompt inteiro no Claude Code, na raiz do repositório do Daily Checkout.
> Recomendação: inicie em **modo de planejamento** (plan mode) e só autorize o desenvolvimento depois de aprovar o plano da Etapa 5.

---

## Contexto

Você vai trabalhar no **Daily Checkout** (produção: https://daily-checkout-team.vercel.app/), sistema web de uso diário de uma equipe de uma empresa de perfumaria e cosméticos. Pelo que se vê em produção, é uma aplicação Next.js hospedada na Vercel, com login por e-mail e senha.

Funcionalidades atuais (confirme tudo no código):

- **Página inicial / Kanban**: o usuário cadastra as tarefas do dia e arrasta os cards entre **"A fazer" → "Em andamento" → "Concluída"**.
- **Rotina**: tarefas pré-definidas por dia da semana ou marcadas como **"todos os dias"**, que alimentam o dia do usuário.
- **Membros**: lista dos usuários cadastrados.
- **Histórico**: visualização dos checkouts diários (tarefas realizadas).

## Objetivo

Criar a **base de gamificação** do sistema, começando simples mas com arquitetura preparada para evoluir:

1. Cada usuário tem um **perfil de jogador** com **XP**, **nível** e **título**.
2. O XP é ganho ao concluir tarefas e manter consistência, com **regras de cálculo claras, justas e à prova de abuso**.
3. Na **página inicial**, o usuário vê um **card de perfil com "seu personagem"** — idealmente **3D, animado, se mexendo dentro do próprio quadro** — além da barra de XP e do nível.
4. Tudo deve ser **configurável** (valores de XP, curva de nível) para ajustarmos com o tempo sem reescrever código.

**Regra de ouro:** a gamificação deve **reforçar o hábito de planejar e concluir o dia**, nunca incentivar a criação de tarefas fictícias, gerar culpa ou virar ferramenta de avaliação de desempenho. Prefira mecânicas positivas (progresso, conquista, autonomia, colaboração) a mecânicas de punição ou ansiedade.

---

## Etapa 1 — Análise do sistema

Antes de escrever qualquer código, entenda o produto:

- Liste as **funcionalidades existentes** e os **fluxos do usuário** (login → montar o dia → mover cards → checkout → histórico).
- Identifique **como uma tarefa é criada, movida e concluída**, e **como o checkout diário é registrado**.
- Identifique **como as tarefas de rotina viram tarefas do dia** (geração automática? cópia? referência?).
- Verifique **perfis/papéis de usuário** (existe admin/gestor? todos iguais?).
- Aponte **riscos e limitações atuais** que afetem a gamificação (ex.: tarefa pode ser desmarcada? há fuso horário definido? existe edição retroativa de dias anteriores?).

**Entrega:** resumo objetivo do sistema e dos fluxos, em português.

## Etapa 2 — Análise da estrutura técnica

- Stack completa: framework e versão, roteamento (App Router / Pages Router), linguagem, UI/estilização, biblioteca de drag-and-drop do kanban, gerenciamento de estado, autenticação.
- **Banco de dados e ORM**: schema/modelos das entidades (usuário, tarefa, rotina, checkout, histórico), migrations existentes, onde ficam as regras de negócio (server actions, API routes, client?).
- **Campos disponíveis na tarefa** que possam influenciar XP: prioridade, estimativa de tempo, categoria, data, origem (rotina × avulsa), timestamps de criação/conclusão.
- Como os **dias** são delimitados (fuso horário, virada do dia) — essencial para sequências (streaks).
- Padrões do projeto: organização de pastas, componentes reutilizáveis, convenções de nome, testes existentes, lint, deploy.
- Desempenho: tamanho do bundle atual da página inicial (o personagem 3D não pode deixar o kanban lento).

**Entrega:** mapa da arquitetura com os arquivos-chave e onde a gamificação vai se encaixar.

## Etapa 3 — Análise de como implementar a funcionalidade

Avalie e proponha:

1. **Onde o XP é concedido**: o cálculo deve acontecer **no servidor**, disparado pelos eventos de domínio (tarefa movida para "Concluída", checkout enviado), nunca confiando em valores enviados pelo cliente.
2. **Modelo de dados** (ajuste aos padrões do projeto):
   - `xp_events` (ledger/livro-razão imutável): `id`, `user_id`, `type` (ex.: `TASK_COMPLETED`, `TASK_REVERTED`, `DAILY_CHECKOUT`, `PERFECT_DAY`, `STREAK_BONUS`, `ACHIEVEMENT`…), `amount` (pode ser negativo para estornos), `source_id` (ex.: id da tarefa), `idempotency_key` **única**, `metadata` (JSON com a memória do cálculo), `created_at`.
   - `user_progress` (projeção/cache): `user_id`, `total_xp`, `level`, `current_streak`, `best_streak`, `streak_shields`, `last_active_day`, `updated_at`. Deve poder ser **recalculado a partir do ledger** a qualquer momento.
   - `gamification_config` (tabela ou arquivo de configuração versionado) com todos os parâmetros numéricos.
   - Preparar (sem necessariamente implementar agora) estruturas para `achievements` / `user_achievements` e `avatar_items` / `user_avatar`.
3. **Idempotência e consistência**: mover um card para "Concluída", voltar e concluir de novo **não pode gerar XP duplicado**. Use a `idempotency_key` + estorno (`TASK_REVERTED`) e transações.
4. **Retroatividade**: proponha um script de **backfill** opcional que gere XP a partir do histórico existente (com flag para rodar ou não), para que usuários antigos não comecem do zero — ou justifique se for melhor começar zerado.
5. **Feedback em tempo real**: ao concluir uma tarefa, o usuário deve ver o ganho ("+12 XP") e, se subir de nível, uma celebração. Defina como o front recebe isso (retorno da action/API, revalidação, otimista com reconciliação).

## Etapa 4 — Análise das funções de gamificação

Use como base as boas práticas de mercado (Habitica, Duolingo, framework Octalysis, Self-Determination Theory) e **valide/ajuste estes parâmetros iniciais** à realidade dos dados do sistema. Todos os números abaixo são **ponto de partida configurável**, não regra fixa.

### 4.1 Ganho de XP por tarefa

```
xp_tarefa = round( base × mult_prioridade × mult_sequencia )
```

- `base`: tarefa avulsa concluída = **10 XP**; tarefa de rotina = **8 XP** (são repetitivas e previsíveis).
- `mult_prioridade` (só se existir campo de prioridade/dificuldade; caso contrário = 1): baixa 0,8 · média 1,0 · alta 1,3.
- `mult_sequencia` = `min(1 + 0,02 × dias_de_sequência, 1,3)` — recompensa consistência com teto, sem explodir.
- XP só é concedido na **primeira** transição para "Concluída" no dia da tarefa. Concluir tarefa de dia passado (retroativo) concede XP reduzido ou zero — proponha a regra.
- Voltar a tarefa de "Concluída" para outro status **estorna** o XP correspondente.

### 4.2 Bônus diários

- **Checkout diário enviado**: +20 XP (reforça o hábito central do produto).
- **Dia perfeito** (100% das tarefas de rotina do dia concluídas): +30 XP.
- **Marco de sequência**: +50 XP ao atingir 7, 30, 100 dias.

### 4.3 Antiabuso (anti-farming)

- **Teto diário** de XP vindo de tarefas avulsas criadas pelo próprio usuário (ex.: 150 XP/dia). Rotina e bônus não entram no teto.
- Tarefa criada e concluída em menos de N segundos (ex.: 60 s) não gera XP — avalie se isso faz sentido com o uso real.
- Duplicatas óbvias (mesmo título no mesmo dia) geram XP apenas uma vez.
- Toda concessão grava em `metadata` a memória de cálculo, para auditoria.

### 4.4 Curva de nível

```
xp_para_proximo_nivel(L) = round( 100 × L^1,5 )
```

- Nível 1→2 = 100 XP; a curva cresce de forma suave (progressão rápida no começo, mais esforço depois).
- Com ~150 XP por dia útil, a referência esperada é: nível 5 em ~2 semanas, nível 10 em ~3–4 meses, nível 20 em mais de um ano. **Gere uma tabela de simulação** (nível, XP do nível, XP acumulado, dias estimados) com base no volume real de tarefas do banco e ajuste os coeficientes se a progressão ficar lenta ou rápida demais.
- Implemente `xpForLevel(level)` e `levelFromXp(totalXp)` como **funções puras**, testadas, num único módulo.
- **Títulos por faixa de nível** (sugestão, temática de perfumaria — sinta-se livre para propor): 1–4 *Aprendiz de Essências*, 5–9 *Perfumista Júnior*, 10–19 *Perfumista*, 20–34 *Mestre Perfumista*, 35+ *Nariz Lendário*.

### 4.5 Sequência (streak) — versão saudável

- Conta **dias úteis** consecutivos com checkout enviado (ou com ao menos uma tarefa concluída — proponha a melhor definição). Dias sem rotina prevista (fim de semana, por exemplo) **não quebram** a sequência.
- **Escudo de sequência**: o usuário ganha 1 escudo a cada 7 dias de sequência (máximo 2 guardados); um dia perdido consome um escudo em vez de zerar.
- **Nunca** remover XP ou nível por inatividade. Perder a sequência apenas zera o contador atual (o recorde fica salvo).

### 4.6 O que fica para fases seguintes (apenas preparar a arquitetura)

- **Conquistas/medalhas** (ex.: "Primeira semana perfeita", "50 tarefas concluídas", "Madrugador").
- **Personalização do personagem** com itens desbloqueados por nível (cosméticos apenas, sem vantagem).
- **Missões diárias/semanais** opcionais.
- **Metas cooperativas da equipe** (ex.: "a equipe concluiu 300 tarefas na semana") — preferir colaboração a ranking competitivo.
- **Painel do gestor** com indicadores de engajamento (taxa de conclusão, sequências, evolução), para tomada de decisão.
- **Ranking**: se for implementado no futuro, deve ser opcional, comparar o usuário com ele mesmo (recordes pessoais) ou em pequenos grupos, para não desmotivar quem está atrás.

### 4.7 Personagem 3D no card de perfil

Avalie a viabilidade e proponha a melhor solução:

- **Abordagem sugerida**: `three` + `@react-three/fiber` + `@react-three/drei`, carregando um modelo **GLB** low-poly com animações (idle/respiração, aceno ao subir de nível, comemoração ao concluir tarefa). O personagem gira levemente ou acompanha o mouse dentro do quadro.
- **Fonte do modelo**: usar personagens com licença livre para uso comercial (ex.: pacotes CC0 de personagens low-poly animados) ou um modelo próprio. **Verifique e documente a licença.** Não usar Ready Player Me (serviço encerrado em jan/2026); evite depender de qualquer serviço externo de avatar — os arquivos devem ficar no próprio projeto.
- **Evolução visual**: o personagem muda conforme a faixa de nível (cor da aura, acessórios, pedestal), via troca de materiais/objetos no mesmo modelo, sem precisar de vários modelos pesados.
- **Desempenho (obrigatório)**: carregar o canvas 3D com `next/dynamic` e `ssr: false`, lazy loading, modelo comprimido (Draco/meshopt, alvo < 1–2 MB), `frameloop="demand"` ou FPS limitado quando fora da tela, pausar animação com a aba oculta. O kanban deve continuar carregando primeiro e rápido.
- **Fallbacks**: sem WebGL, dispositivo fraco ou `prefers-reduced-motion` → mostrar versão 2D (imagem/ilustração ou animação CSS leve) com as mesmas informações.
- **Acessibilidade**: o card deve expor nível, XP e título como texto (leitores de tela), contraste adequado e animações discretas.
- Se o 3D se mostrar inviável no prazo, entregue primeiro a versão 2D animada com a arquitetura pronta para trocar pelo 3D depois — e explique o motivo.

### 4.8 Interface do card de perfil (página inicial)

- Personagem (3D/2D), nome do usuário, **nível + título**, **barra de progresso de XP** ("340 / 520 XP para o nível 6"), **sequência atual** com escudos, XP ganho hoje.
- Animação de "+XP" ao concluir tarefa e modal/efeito de **subida de nível** (ex.: confete discreto).
- Layout responsivo (desktop e celular), consistente com o tema claro/escuro já existente.
- Uma página ou aba **"Meu perfil"** com histórico de XP (do ledger), recorde de sequência e evolução de nível.

---

## Etapa 5 — Planejamento

Com base nas etapas anteriores, entregue um **plano de implementação** contendo:

1. **Decisões** tomadas e justificativas (inclusive onde você divergiu destas sugestões).
2. **Fases**:
   - **Fase 1 (MVP — este pedido)**: ledger de XP, progresso do usuário, regras de cálculo, curva de nível, sequência com escudos, card de perfil com personagem na página inicial, feedback de +XP e subida de nível, página "Meu perfil".
   - **Fase 2**: conquistas, personalização do personagem, missões.
   - **Fase 3**: metas de equipe e painel do gestor.
3. **Lista de arquivos** a criar/alterar, migrations e dependências novas (com peso estimado no bundle).
4. **Tabela de simulação da curva de XP** com os dados reais.
5. **Riscos** e como mitigá-los (duplicidade de XP, fuso horário, desempenho do 3D, backfill).
6. **Plano de testes**: unitários para funções de cálculo (`xpForTask`, `xpForLevel`, `levelFromXp`, regras de sequência e teto diário), testes de integração para concluir/estornar tarefa, e checklist de teste manual.

**Pare aqui e aguarde minha aprovação do plano antes de desenvolver.**

## Etapa 6 — Desenvolvimento

Após a aprovação:

- Implemente a **Fase 1** em passos pequenos e verificáveis, seguindo os padrões do projeto.
- Centralize toda a lógica de gamificação num módulo de domínio próprio (ex.: `lib/gamification/`), com funções puras para cálculo e uma camada de serviço para persistência.
- Todos os parâmetros num **único arquivo/tabela de configuração**.
- Crie as **migrations** e, se aprovado, o **script de backfill** (idempotente, com modo de simulação/dry-run).
- Escreva os **testes** e rode lint, typecheck e build antes de concluir.
- Garanta que nenhuma funcionalidade atual (kanban, rotina, membros, histórico, checkout) quebre.
- Crie a documentação **`docs/GAMIFICACAO.md`** explicando, em linguagem simples para usuários e gestores: como se ganha XP, a curva de níveis, os títulos, a sequência e os escudos — e, separadamente, a parte técnica (modelo de dados, como ajustar parâmetros, como recalcular o progresso).
- Ao final, entregue um **resumo**: o que foi feito, como testar, prints ou descrição do card, e sugestões para a Fase 2.

---

## Critérios de aceite da Fase 1

- [ ] Concluir uma tarefa gera XP uma única vez; desfazer a conclusão estorna o XP.
- [ ] Checkout diário e dia perfeito geram bônus corretos, sem duplicidade.
- [ ] Nível, título e barra de progresso batem com o XP total (recalculável a partir do ledger).
- [ ] Sequência conta dias úteis, usa escudos e nunca remove XP.
- [ ] Teto diário e regras antiabuso funcionando e cobertos por testes.
- [ ] Card de perfil com personagem visível na página inicial, com fallback 2D e sem piorar perceptivelmente o carregamento do kanban.
- [ ] Animação de +XP e de subida de nível.
- [ ] Parâmetros ajustáveis sem alterar código de regra.
- [ ] Lint, typecheck, testes e build passando; documentação criada.
