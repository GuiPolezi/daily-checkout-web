# Banco de dados

O Daily Checkout usa o [Supabase](https://supabase.com) para banco de dados, login e armazenamento de fotos. Este arquivo reúne o que é preciso criar no projeto do Supabase.

> **Atenção:** o SQL de criação das quatro tabelas originais (`tasks`, `reports`, `team_tasks`, `team_task_completions`) nunca foi versionado neste repositório — elas foram criadas direto no painel. A seção 1 lista as colunas que o código usa, para servir de guia. Confira os tipos e as políticas de acesso no seu próprio projeto antes de recriá-las do zero.

## 1. Tabelas originais

Colunas que a aplicação lê e grava:

| Tabela | Colunas usadas | Para que serve |
|---|---|---|
| `tasks` | `id`, `title`, `priority`, `status`, `user_id`, `task_date`, `position`, `created_at` | Tarefas do kanban de cada dia |
| `reports` | `id`, `user_id`, `user_email`, `summary` (JSON com `date` e `tasks`), `created_at` | Checkouts enviados |
| `team_tasks` | `id`, `title`, `day_of_week`, `created_by`, `created_at` | Tarefas de rotina |
| `team_task_completions` | `id`, `team_task_id`, `user_id`, `user_email`, `completion_date` | Quem marcou cada rotina em cada dia |

Valores esperados: `status` é `A Fazer`, `Em Andamento` ou `Concluída`; `priority` é `Normal`, `Moderado` ou `Urgente`; `day_of_week` é `Todos` ou o nome do dia (`Segunda` … `Domingo`).

Recomendação: habilite RLS em todas e permita que cada pessoa escreva apenas as próprias linhas (`auth.uid() = user_id`).

### Ordenação manual dos cards

A ordem dos cards dentro de cada coluna fica em `tasks.position` (menor valor = topo):

```sql
alter table tasks add column position double precision;

-- Mantém a ordem atual (mais recentes no topo) para as tarefas já existentes
update tasks set position = -extract(epoch from created_at);

alter table tasks alter column position set default 0;
alter table tasks alter column position set not null;
```

## 2. Perfis e fotos

```sql
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  avatar_url text
);

alter table profiles enable row level security;

create policy "Todos veem perfis"
on profiles for select
using (true);

create policy "Usuário atualiza próprio perfil"
on profiles for update
using (auth.uid() = id);

create policy "Sistema insere perfil automático"
on profiles for insert
with check (true);
```

View usada pela página **Equipe**:

```sql
create or replace view user_task_stats as
select
  p.id,
  p.email,
  p.avatar_url,
  (select count(*) from tasks t where t.user_id = p.id) as total_tasks,
  (select count(*) from tasks t where t.user_id = p.id and t.task_date = current_date) as tasks_today
from profiles p;
```

No painel do Supabase, em **Storage**, crie um bucket chamado `avatars` e marque-o como público.

## 3. Gamificação e segurança

Rode os arquivos de `supabase/migrations/` no **SQL Editor**, nesta ordem. Todos podem ser executados mais de uma vez sem problema.

| Arquivo | O que faz | Obrigatório? |
|---|---|---|
| `001_gamification.sql` | Tabelas de XP, progresso e configuração; data de conclusão das tarefas | Sim, para a gamificação |
| `002_fechar_leitura_sem_login.sql` | Impede que os dados sejam lidos sem login | Recomendado |
| `003_conquistas.sql` | Liga as conquistas | Sim, para as conquistas |
| `004_personagem_equip.sql` | Evita conflito ao trocar itens do personagem em duas abas | Opcional |
| `005_indice_metas_equipe.sql` | Índice para as metas de equipe | Opcional (só com equipe ligada) |

Sem as migrations a aplicação continua funcionando como antes; apenas a parte de gamificação não aparece.

Detalhes do modelo de dados da gamificação: [`GAMIFICACAO.md`](./GAMIFICACAO.md).
