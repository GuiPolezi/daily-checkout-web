#### Metadados | Projeto 
{ Passo 1: O Backend (Supabase) }

Vamos usar o Supabase para o Banco de Dados e Autenticação.

- Crie uma conta em supabase.com e crie um novo projeto
- Vá até a aba SQL Editor
- Crie as tabelas

Vá em Settings > API e copie:
- Project URL
- anon public key.

{ Passo 2: O Frontend (Next.js) }
- Clone o repositorio

"git clone ...."

- Entre na pasta e instale a biblioteca do Supabase:
npm install @supabase/supabase-js

- Crie um arquivo na raiz do projeto chamado .env.local e coloque suas chaves:

{ Passo 3: O Código (A Lógica) }

Estrutura simplificada para funcionar em um único arquivo principal para facilitar o entendimento

- arquivo src/lib/supabaseClient.ts
- Arquivo Page.tsx



### Sistema Atributos
1. Integração do sistema: Permite enviar e-mail ao clicar em submit

Observação: Adicionar todas as Variaveis de Ambiente do .env no Vercel também.


    - Instalação do nodemailer (npm install nodemailer)

    - Criação da Route.ts (api\send-email)
    - Implementação na função submitCheckout

    - Adição de informações do e-mail (SMTP) no .env.local
    - E-mail recebedor também no .env

|

2. Adicionando Rotina da Equipe.
Tarefas compartilhadas e Recorrentes.

    - Procedimento: Criar a tabela team_tasks no Supabase

|

3. accountability (responsabilidade) na equipe
Para que vários usuários possam marcar a mesma tarefa e todos sejam identificados

    - Procedimento: Criar a tabela de Conclusões (SQL)

    - Criado: app/suporte/page.tsx -> pagina do suporte



## 👥 Página de Usuários

Página para **visualizar os usuários do sistema** e demais informações.



### 🧩 Passo 1: Preparação do Banco de Dados e Storage (SQL)

O **Supabase** gerencia usuários na tabela `auth.users`, que é protegida.  
Por isso, criaremos uma tabela pública chamada **`profiles`** para armazenar as fotos, e um **Storage Bucket** para os arquivos.

### 📦 Criar tabela de perfis

```sql
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  avatar_url text
);
```

### 🔐 Habilitar RLS e Políticas

```sql
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

### 📊 Criar uma VIEW para estatísticas

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
⚠️ Importante:
Vá em Storage no menu lateral do Supabase, clique em “New Bucket”,
nomeie como avatars e marque a opção Public.

### 🖼️ Passo 2: Permitir que o Usuário Suba a Foto
**Arquivo:** src/app/page.tsx

Essa é a funcionalidade que vai dar “rosto” ao seu sistema!
Para implementá-la, precisamos resolver três desafios:

.Onde salvar a foto

.Como vincular a foto ao usuário

.Como calcular estatísticas de tarefas de forma eficiente

### 🚀 Plano de Ação

1. Configurar o banco e storage | 2. Criar upload da imagem de perfil no frontend | 3. Atualizar o campo avatar_url do usuário | 4. Exibir estatísticas com base na view user_task_stats

### 🧭 Passo 3: Criar a Página de Usuários

**Arquivo:** src/app/usuarios/page.tsx

Página responsável por listar os usuários, exibir suas fotos, e mostrar as estatísticas retornadas pela view user_task_stats.
