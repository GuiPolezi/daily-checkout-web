<div align="center">

# Daily Checkout

**Planeje o dia, conclua as tarefas e veja o seu progresso virar níveis, medalhas e sequência.**

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?logo=supabase&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-3D-000000?logo=threedotjs&logoColor=white)

[Ver em produção](https://daily-checkout-team.vercel.app/) · [Guia da gamificação](#-guia-da-gamificação) · [Instalação](#-instalação)

</div>

---

## Sobre

O Daily Checkout é um quadro pessoal de tarefas para o dia a dia de trabalho. Você monta o seu dia num kanban, marca as tarefas de rotina e, no fim, envia um **checkout** com o resumo do que foi feito.

Por cima disso existe uma camada de **gamificação**: cada tarefa concluída rende XP, o XP vira nível, e a constância vira sequência. A ideia é simples — reforçar o hábito de planejar e concluir o dia, sem punição e sem comparação com ninguém.

## Funcionalidades

| | |
|---|---|
| **Meu Dia** | Kanban com três colunas (A fazer, Em andamento, Concluída), arrastar e soltar, prioridades e navegação por data |
| **Rotina** | Tarefas recorrentes por dia da semana ou para todos os dias, com progresso do dia |
| **Checkout** | Resumo do dia enviado com um clique |
| **Histórico** | Todos os checkouts enviados, com filtro por pessoa e por data |
| **Equipe** | Membros cadastrados, com foto e contagem de tarefas |
| **Meu Perfil** | Nível, sequência, missões, conquistas, personagem e o histórico de cada ponto de XP |
| **Tema** | Claro e escuro, com visual inspirado em iOS e Frutiger Aero |

---

## 🎮 Guia da gamificação

### Como ganhar XP

| O que você faz | XP |
|---|:---:|
| Concluir uma tarefa do dia (arrastar para **Concluída**) | **10** |
| Marcar uma tarefa da **Rotina** prevista para hoje | **8** |
| Enviar o **checkout** (num dia que já rendeu XP) | **+20** |
| **Dia perfeito** — marcar todas as rotinas previstas para hoje | **+30** |
| Chegar a 7, 30 ou 100 dias de sequência | **+50** |

Quem está em sequência ganha um pouco mais por tarefa: **+2% por dia de sequência**, até o máximo de +30%.

> **Mudou de ideia?** Se você desfaz uma conclusão — volta o card de coluna, apaga a tarefa ou desmarca a rotina — o XP correspondente é devolvido. Concluir de novo devolve o XP, nunca em dobro.

<details>
<summary><b>Quando uma tarefa não rende XP</b></summary>

<br>

O próprio card avisa o motivo.

- **Título repetido no dia** — duas tarefas com o mesmo título no mesmo dia rendem XP uma vez só.
- **Concluída fora do dia** — tarefa de ontem concluída hoje não rende XP.
- **Teto diário** — tarefas rendem no máximo **100 XP por dia**; a rotina tem um teto próprio de **80 XP**. Os bônus ficam fora do teto.
- **Rotina de outro dia** — só rende XP a rotina prevista para o dia da semana de hoje (ou para "Todos").

Rotina, checkout e dia perfeito só rendem XP **no próprio dia**.

</details>

### Como subir de nível

Todo XP soma no seu total, e o total define o nível. O começo é rápido; os níveis altos pedem constância.

| Nível | XP para o próximo | XP acumulado para chegar |
|:---:|:---:|:---:|
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

No ritmo de umas 80 XP por dia útil: **Prata** em 3 semanas, **Ouro** em 2 meses, **Platina** em 6 meses, **Esmeralda** em pouco mais de 1 ano, **Diamante** em 2 anos e meio, **Mestre** em 4 anos e **Grão-Mestre** em 7. Missões, checkout e conquistas aceleram esse ritmo.

> **Por que esses prazos?** A curva segue o que a pesquisa sobre hábitos mostra. O estudo de Lally (2010) mediu uma mediana de **66 dias** para um comportamento virar automático, com pessoas entre 18 e 254 dias. Uma meta-análise de 2024 (Singh e colegas) apontou de **2 a 5 meses**, com indivíduos entre 4 e 335 dias. Prata chega perto dos 18 dias, Ouro dos 66, Platina passa dos 5 meses e Esmeralda ultrapassa o maior tempo já observado: quem chega ali consolidou o hábito por qualquer medida. Os três títulos finais são de longo prazo, como os ranques do xadrez. As fontes estão no [guia da gamificação](./docs/GAMIFICACAO.md#por-que-a-curva-é-assim).

A cada faixa de nível você ganha um título novo e o personagem muda de cor:

| Níveis | Título |
|:---:|---|
| 1 – 4 | Bronze |
| 5 – 9 | Prata |
| 10 – 19 | Ouro |
| 20 – 34 | Platina |
| 35 – 49 | Esmeralda |
| 50 – 69 | Diamante |
| 70 – 99 | Mestre |
| 100+ | Grão-Mestre |

**Você nunca perde XP nem nível** por ficar sem usar o sistema.

### Sequência e escudos

A **sequência** conta quantos **dias úteis seguidos** (segunda a sexta) você ganhou XP com pelo menos uma tarefa ou rotina.

- Sábado e domingo são neutros: não contam e não quebram a sequência.
- O dia de hoje fica "em aberto" até acabar — ele só quebra a sequência se terminar sem atividade.

**Para que serve o escudo?** Ele protege a sua sequência.

- A cada **7 dias de sequência** você ganha **1 escudo**. Dá para guardar até **2**.
- Se você perder um dia útil, um escudo é gasto no lugar e a sequência continua.
- Sem escudo, perder um dia útil zera o contador — mas o seu **recorde** fica salvo.

Feriados ainda não são reconhecidos; é para esses dias que os escudos existem.

### Missões

Objetivos curtos que dão um XP extra. Ficam num painel na página **Meu Dia** e em **Meu Perfil**.

| Missão | Quando | O que pede | XP |
|---|:---:|---|:---:|
| Três Notas | Diária | Concluir 3 tarefas que rendam XP | 15 |
| Ritual Duplo | Diária | Marcar 2 tarefas de rotina | 10 |
| Dia Redondo | Diária | Uma tarefa, uma rotina e o checkout enviado | 15 |
| Constância | Semanal | 3 dias úteis ativos na semana | 20 |
| Semana Cheia | Semanal | 5 dias úteis ativos na semana | 40 |
| Colheita da Semana | Semanal | Somar 300 XP na semana | 30 |

A semana vai de segunda a domingo. As recompensas atuais são provisórias e ainda serão calibradas.

### Conquistas

Medalhas **permanentes** por marcos de uso — uma vez desbloqueada, a conquista nunca é retirada.

<details>
<summary><b>Ver as 21 conquistas</b></summary>

<br>

O tema é a forja: a tarefa é a martelada, a rotina é o fogo que não apaga, o checkout é o selo do ourives e a sequência é a chama.

| Conquista | Como desbloquear | Bônus |
|---|---|:---:|
| Primeira Faísca | Concluir a primeira tarefa | +10 XP |
| Mãos na Bigorna | Concluir 50 tarefas | +50 XP |
| Liga Temperada | Concluir 250 tarefas | +100 XP |
| Mil Marteladas | Concluir 1.000 tarefas | +200 XP |
| Ritmo da Forja | Marcar 25 tarefas de rotina | +30 XP |
| Guardião do Fogo | Marcar 200 tarefas de rotina | +100 XP |
| Primeiro Selo | Enviar o primeiro checkout | +10 XP |
| Livro da Oficina | Enviar o checkout em 20 dias | +50 XP |
| Marca Registrada | Enviar o checkout em 100 dias | +150 XP |
| Molde Perfeito | Completar toda a rotina de um dia | +10 XP |
| Semana Sem Rebarba | Completar toda a rotina em 5 dias | +40 XP |
| Peça de Mestre | Completar toda a rotina em 25 dias | +100 XP |
| Fogo Aceso | 7 dias úteis de sequência | — |
| Brasa Constante | 30 dias úteis de sequência | — |
| Hábito Forjado | 45 dias úteis de sequência (cerca de 66 dias corridos, a mediana para um hábito virar automático) | — |
| Chama Eterna | 100 dias úteis de sequência | — |
| Prata Polida | Chegar ao nível 5 | — |
| Ouro Puro | Chegar ao nível 10 | — |
| Platina Forjada | Chegar ao nível 20 | — |
| Esmeralda Lapidada | Chegar ao nível 35 | — |
| Diamante Bruto | Chegar ao nível 50 | — |

As de sequência e de nível são só reconhecimento: a sequência já paga bônus nos marcos e o nível é consequência do XP.

</details>

### Seu personagem

Na página **Meu Dia** mora o seu personagem: um robô 3D que acompanha o mouse, comemora quando você ganha XP e acena quando você sobe de nível. Em aparelhos mais simples, ou com "reduzir movimento" ligado, ele aparece em versão 2D.

Em **Meu Perfil** você personaliza três coisas. Os itens são liberados por nível e são **só visuais** — nenhum dá vantagem.

| O que muda | Opções (nível que libera) |
|---|---|
| **Cor do personagem** | Automática · Céu (1) · Menta (2) · Coral (3) · Violeta (5) · Âmbar (8) · Ônix (12) |
| **Cor da aura** | Automática · Azul (1) · Verde (2) · Rosa (4) · Lilás (6) · Dourada (10) |
| **Comemoração** | Joinha (1) · Sim! (2) · Pulo (4) · Soco no ar (6) · Dança (8) |

"Automática" segue a cor da sua faixa de título.

### Onde acompanhar

- **Meu Dia** — card com personagem, nível, título, barra de XP, sequência, escudos, XP de hoje e o painel de missões.
- **Meu Perfil** — totais, recorde de sequência, personalização do personagem, missões, conquistas, os próximos níveis e o histórico de cada ponto de XP.

---

## 🚀 Instalação

### Pré-requisitos

- [Node.js](https://nodejs.org) 20 ou superior
- Uma conta no [Supabase](https://supabase.com) (o plano gratuito basta)

### 1. Clone e instale

```bash
git clone https://github.com/GuiPolezi/daily-checkout-web.git
cd daily-checkout-web
npm install
```

### 2. Prepare o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Crie as tabelas, o bucket de fotos e rode as migrations seguindo o guia [**Banco de dados**](./docs/BANCO-DE-DADOS.md).
3. Em **Authentication → Users**, cadastre os usuários que vão acessar o sistema (login por e-mail e senha).

### 3. Configure as variáveis de ambiente

Copie o arquivo de exemplo e preencha com as chaves do seu projeto (**Supabase → Settings → API**):

```bash
cp .env.example .env.local
```

| Variável | Onde encontrar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave `anon` `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave `service_role` — **secreta**, usada só no servidor pela gamificação |

> A `service_role` nunca deve ir para o navegador nem receber o prefixo `NEXT_PUBLIC_`. Sem ela o sistema funciona normalmente, apenas sem a gamificação.

### 4. Rode

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) e entre com um dos usuários cadastrados.

### Publicar na Vercel

Importe o repositório na [Vercel](https://vercel.com) e cadastre as mesmas três variáveis em **Settings → Environment Variables**.

### Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe o ambiente de desenvolvimento |
| `npm run build` | Gera a versão de produção |
| `npm run start` | Serve a versão de produção |
| `npm test` | Roda os testes das regras de gamificação |
| `npm run typecheck` | Confere os tipos |
| `npm run lint` | Roda o ESLint |

---

## Documentação

| Documento | Conteúdo |
|---|---|
| [Gamificação](./docs/GAMIFICACAO.md) | Regras completas, modelo de dados e como ajustar valores de XP, missões e níveis |
| [Banco de dados](./docs/BANCO-DE-DADOS.md) | Tabelas, perfis, fotos e migrations |
| [Contexto e próximos passos](./docs/GAMIFICACAO-CONTEXTO.md) | Histórico das decisões e o que vem a seguir |

## Créditos

O personagem 3D é o modelo **RobotExpressive**, de Tomás Laulhé (Quaternius), com modificações de Don McCurdy, distribuído em domínio público (CC0). Detalhes em [`public/models/LICENSE.md`](./public/models/LICENSE.md).
