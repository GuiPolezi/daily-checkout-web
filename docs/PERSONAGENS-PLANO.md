# Personagens — análise e plano

Escrito em 2026-10-05, antes de qualquer código. Registra o pedido, o que o sistema já tem, o que é viável, a proposta refinada e as fases. Regras e parte técnica da gamificação estão em [`GAMIFICACAO.md`](./GAMIFICACAO.md); o histórico, em [`GAMIFICACAO-CONTEXTO.md`](./GAMIFICACAO-CONTEXTO.md).

---

## 1. O pedido

Na aba **Personagem** de Meu Perfil:

- escolher o personagem entre vários, numa grade parecida com a tela de seleção dos jogos LEGO (muitos retratos lado a lado, bloqueados aparecem apagados);
- desbloquear personagens conforme o nível ou o XP, e mais tarde com **moedas**;
- personalizar o personagem escolhido: chapéu, cabelo etc.;
- estilo visual de "boneco de montar" (LEGO).

## 2. O que o sistema já tem

| Hoje | Onde |
|---|---|
| Um único modelo 3D (robô `RobotExpressive`, CC0), carregado sob demanda, com fallback 2D em SVG | `app/components/gamification/Character3D.tsx`, `Character2D.tsx` |
| Cor do corpo trocada pintando o material chamado `Main` do modelo | `Character3D.tsx` |
| Animações chamadas pelo nome do clipe dentro do GLB (`Idle`, `Wave`, `ThumbsUp`, `Yes`, `Jump`, `Punch`, `Dance`) | `Character3D.tsx`, catálogo em `src/lib/gamification/avatar.ts` |
| Três slots cosméticos (`body`, `aura`, `celebration`), itens liberados por nível, salvos como JSON por slot em `user_avatar` | `avatar.ts`, `app/api/gamification/avatar/route.ts`, migration 004 |
| O servidor confere o nível pelo ledger antes de equipar; o cliente não decide o que está liberado | `service.ts` → `equipAvatarItem` |
| Tabela `avatar_items` criada na migration 001 e **não usada** (o catálogo vive no código) | `supabase/migrations/001_gamification.sql` |
| Nenhuma moeda, nenhuma loja | — |

Conclusão: a estrutura de "slot + item + nível mínimo + validação no servidor" já existe e aguenta um slot novo chamado `character` e slots de acessório. O que não existe é: vários modelos, retratos para a grade, encaixe de acessórios no esqueleto e moedas.

## 3. Alinhamento: o que é possível e o que convém mudar na ideia

### 3.1 LEGO e Marvel de verdade: não

- A **forma do boneco LEGO** (minifigure) é marca registrada tridimensional na União Europeia, confirmada pelo Tribunal Geral da UE em 2015 e de novo em dezembro de 2023. O nome e o logotipo LEGO também são marcas.
- Os personagens da imagem de referência (Homem-Aranha e os demais) são propriedade da Marvel/Disney, e o jogo é da TT Games/Warner. Não há modelo 3D legal desses personagens para uso livre.
- Para um sistema interno de uma equipe o risco prático é baixo, mas não há como obter os modelos sem copiar, e copiar deixa o projeto sem licença para os arquivos. **Recomendação: não usar nem a forma do boneco LEGO nem personagens licenciados.**

### 3.2 O que dá para fazer: a mesma sensação, com personagens livres

A sensação da tela LEGO vem de três coisas que não dependem da marca: muitos retratos numa grade, bloqueados apagados com dica de como liberar, e um boneco de proporções "quadradas" que anima ao ser escolhido. Tudo isso é reproduzível com pacotes de domínio público (CC0, sem atribuição obrigatória):

| Pacote | O que traz | Serve para |
|---|---|---|
| **Kenney — Mini Characters 1** ([kenney.nl](https://kenney.nl/assets/mini-characters-1)) | 12 personagens low-poly de proporções "boneco", **mesmo esqueleto**, 32 animações cada, acessórios (bonés, capacete, óculos, colete) em GLTF/FBX, CC0 | Elenco inicial e acessórios. É o mais próximo do visual pedido |
| **Kenney — Blocky Characters 2.0** ([kenney.nl](https://kenney.nl/assets/blocky-characters)) | Personagens em blocos (estilo voxel), animados, 20 arquivos, CC0 | Segunda leva, com visual mais "cubo" |
| **Quaternius — Universal Base Characters** ([quaternius.com](https://quaternius.com/packs/universalbasecharacters.html)) | 6 corpos base com rig humanoide e 20 cabelos para misturar, CC0 | Cabelo e corpos, se o visual low-poly "humano" agradar |
| **Quaternius — Modular Character Outfits** ([quaternius.com](https://quaternius.com/packs/modularcharacteroutfitsfantasy.html)) | 62 peças de roupa compatíveis com os corpos acima, CC0 | Roupas e chapéus temáticos |
| **Quaternius — Universal Animation Library** ([quaternius.com](https://quaternius.com/packs/universalanimationlibrary.html)) | 120+ animações num rig humanoide, com emotes, CC0 | Comemorações extras para os corpos Quaternius |
| **Robô atual (RobotExpressive)** | Já está no projeto | Continua como personagem inicial (ou como desbloqueável) |

Ponto importante: os 12 Mini Characters da Kenney compartilham o esqueleto e as animações. Isso significa **um único mapa de animações para todos**, e acessórios que encaixam no mesmo osso da cabeça em qualquer um deles. É o que torna a customização viável sem retrabalho por personagem.

### 3.3 Refinamento proposto

1. **Elenco com tema, não aleatório.** Os títulos são Bronze → Grão-Mestre e as conquistas têm tema de forja. O elenco pode seguir ofícios e figuras de uma oficina: Aprendiz, Ferreiro, Ourives, Minerador, Vidreiro, Alquimista, Guarda, Mercador, Explorador, Inventor, Robô (o atual)… Cada faixa de título libera um grupo. Nomes e temas são decisão do dono.
2. **Grade com retratos em 2D, 3D só no escolhido.** A tela LEGO mostra dezenas de ícones; renderizar dezenas de modelos 3D ao mesmo tempo é pesado. A grade usa imagens PNG geradas uma vez a partir de cada modelo (um script faz isso), e o card do perfil mostra em 3D apenas o personagem atual, que toca uma animação ao ser escolhido (como as comemorações hoje).
3. **Bloqueado aparece, com o motivo.** Como no LEGO, o retrato bloqueado fica em silhueta/cinza com a dica: "nível 10", "conquista Chama Eterna" ou, mais tarde, "120 moedas".
4. **Três formas de desbloqueio, nesta ordem de entrega:** nível (já existe), conquista (a infraestrutura existe: basta o item apontar para um id de conquista), moedas (fase própria).
5. **Customização por slots encaixados no esqueleto.** Slots novos: `character` (o modelo), `hat` (chapéu/capacete/boné), `face` (óculos), e, se os pacotes permitirem, `hair`. Os slots atuais continuam: `aura`, `celebration` e `body` (a cor passa a valer só para personagens que aceitam tinta, ver riscos).
6. **Moedas sem segundo livro-razão.** Moedas são derivadas do mesmo ledger de XP (ex.: 1 moeda a cada 10 XP de atividade), e as compras ficam numa tabela própria (`avatar_purchases`). Saldo = moedas ganhas − gastas, calculado no servidor. Assim não há como o cliente "enviar moedas", igual ao XP hoje. O valor da taxa e os preços são parâmetros em `gamification_config`.

## 4. Dificuldade e riscos técnicos

| Risco | Impacto | Como tratar |
|---|---|---|
| **Nomes de animação diferentes** por pacote. O código hoje chama clipes pelo nome (`Idle`, `Wave`, `Dance`…) | As comemorações atuais não funcionariam nos modelos novos | Cada personagem do catálogo declara seu mapa: `{ idle, wave, celebrations: { cel_thumbs: 'Cheer', … } }`. Personagens de um mesmo pacote compartilham o mapa |
| **Tinta de cor.** O robô tem um material `Main` sem textura, fácil de pintar; os Mini Characters usam **textura atlas** (arquivo externo ao GLB) | A cor do corpo pode não se aplicar, ou escurecer a textura | Decidir no spike: multiplicar a cor sobre a textura, trocar a textura por variantes, ou marcar no catálogo quais personagens aceitam tinta. Em último caso, "Cor do personagem" vale só para o robô |
| **Acessórios no osso certo.** O chapéu precisa seguir a cabeça durante a animação | Chapéu flutuando ou atravessando a cabeça | Usar o osso `Head` do rig Kenney; conferir no spike se os acessórios do pacote já vêm posicionados |
| **Peso.** Cada modelo tem centenas de KB; 12 a 24 modelos somam alguns MB na pasta `public/` | Repositório maior; nada muda para o usuário, que baixa só o modelo escolhido | Manter o carregamento sob demanda que já existe; retratos PNG pequenos (10 a 20 KB cada) |
| **Retratos.** Precisam ser gerados a partir dos modelos, com enquadramento igual | Grade inconsistente | Página de desenvolvimento que renderiza cada modelo com a mesma câmera e baixa o PNG; rodar uma vez e commitar as imagens |
| **Fallback 2D.** Hoje é um frasquinho em SVG; não representa o personagem escolhido | Quem está sem WebGL vê sempre o mesmo boneco | O 2D passa a mostrar o retrato PNG do personagem escolhido, com o pulo em CSS que já existe |
| **Mudança de modelo em tempo real** no card (trocar o GLB sem recriar a cena) | Vazamento de memória se o modelo anterior não for descartado | Reaproveitar a rotina de `dispose` que já existe no `Character3D` para o modelo antigo |
| **Licenças** | Nenhum risco com CC0; apenas documentar | Acrescentar cada pacote em `public/models/LICENSE.md` |
| **Moedas** | Nova superfície de abuso se o saldo vier do cliente | Saldo sempre calculado no servidor a partir do ledger, como o nível |

Dificuldade geral: **média**. Nada exige tecnologia nova (é o mesmo `three` e a mesma rota de equipar); o trabalho é de catálogo, assets e tela. O ponto de maior incerteza é a tinta de cor, por isso ele é o primeiro a ser testado.

## 5. Fases

### Fase 0 — Spike (uma sessão)

Objetivo: tirar as dúvidas antes de desenhar o catálogo.

1. Baixar o pacote Mini Characters 1 e colocar dois modelos em `public/models/`.
2. Carregar um deles no `Character3D` no lugar do robô e listar: nomes dos clipes, nomes dos materiais, ossos, tamanho do arquivo.
3. Testar a tinta de cor sobre a textura e o encaixe de um boné no osso da cabeça.
4. Decidir: quais animações viram as comemorações; se a cor do corpo vale para esses modelos; se o pacote basta para a primeira leva.

Saída: uma lista de decisões escritas neste arquivo e o mapa de animações.

### Fase 1 — Escolher o personagem (duas a três sessões)

- Catálogo `src/lib/gamification/characters.ts`: id, nome, arquivo do modelo, retrato, mapa de animações, aceita tinta, regra de desbloqueio (`minLevel` ou `achievementId`).
- Slot `character` em `avatar.ts`; `checkEquip` passa a aceitar desbloqueio por conquista (lê `user_achievements`, já carregado no sync).
- `Character3D` recebe a URL do modelo e o mapa de animações; troca o modelo quando o slot muda.
- `Character2D` mostra o retrato do personagem escolhido.
- Tela: grade de retratos no bloco Personagem de Meu Perfil (bloqueados apagados com a dica), personagem em 3D no card acima, animação ao escolher.
- Elenco inicial: robô + 12 Mini Characters, distribuídos pelas faixas de título.
- Sem migration: `user_avatar` já guarda um JSON por slot.
- Docs e testes (catálogo válido, desbloqueio por conquista, resolução de slot inválido).

### Fase 2 — Acessórios (uma a duas sessões)

- Slots `hat` e `face` (e `hair`, se houver peças): itens apontam para um arquivo GLB pequeno e um osso de encaixe.
- `Character3D` anexa e remove peças sem recarregar o personagem.
- Catálogo e desbloqueio como na fase 1. Itens liberados por conquista dão sentido às medalhas (ex.: capacete de forja ao completar "Guardião do Fogo").

### Fase 3 — Moedas e loja (duas sessões)

- Regra: `coins.perActivityXp` em `gamification_config` (ex.: 1 moeda a cada 10 XP de tarefa e rotina). Saldo derivado do ledger menos compras.
- Migration: tabela `avatar_purchases` (usuário, item, preço pago, data), só leitura para o cliente.
- Rota `POST /api/gamification/purchase`: confere saldo e nível no servidor, grava a compra, devolve saldo e itens.
- Tela: preço nos retratos bloqueados por moeda, saldo no card do perfil, confirmação de compra.
- Economia inicial a calibrar com o mesmo critério da curva de nível (prazos da pesquisa de hábitos): um personagem "comum" em uma a duas semanas de uso, um "raro" em um a dois meses.

### Fase 4 — Mais elenco (contínua)

- Blocky Characters 2.0 e corpos Quaternius com cabelos, se o visual for aprovado.
- Raridade visual na grade (borda bronze/prata/ouro, seguindo os títulos).
- Personagem secreto por conquista difícil (ex.: "Chama Eterna", 100 dias úteis de sequência).

## 6. Decisões que dependem do dono

1. **Estilo:** aceita personagens "de bloco" genéricos (Kenney/Quaternius) no lugar de LEGO e Marvel reais?
2. **Elenco inicial:** 12 personagens (um pacote) ou já partir para 24 com dois pacotes?
3. **Robô atual:** continua como personagem inicial de todo mundo, ou vira desbloqueável?
4. **Tema dos nomes:** ofícios de oficina (Ferreiro, Ourives…), seguindo forja e títulos, ou outro?
5. **Desbloqueio na fase 1:** só por nível, ou já por nível + conquista?
6. **Moedas:** confirma que ficam para a fase 3, depois de personagens e acessórios?
7. **Assets no repositório:** pode adicionar alguns MB de modelos em `public/models/`?

Com as respostas, a Fase 0 começa na sessão seguinte.

## 7. Fontes

- Tribunal Geral da UE sobre a marca 3D do boneco LEGO (2015): [World IP Review](https://www.worldipreview.com/trademark/lego-shape-trademark-is-valid-says-european-court-8478) · [Law360](https://www.law360.com/articles/668402/lego-figurine-is-a-trademark-eu-court-says)
- Decisão de dezembro de 2023 (BB Services vs. Lego Juris): [Lexology](https://www.lexology.com/library/detail.aspx?g=1c7ac2ae-d7eb-4fdc-94aa-dd3bd83627ed)
- Kenney, Mini Characters 1 (CC0): [kenney.nl](https://kenney.nl/assets/mini-characters-1) · [itch.io](https://kenney.itch.io/kenney-character-assets)
- Kenney, Blocky Characters (CC0): [kenney.nl](https://kenney.nl/assets/blocky-characters)
- Quaternius, Universal Base Characters, Modular Outfits e Universal Animation Library (CC0): [quaternius.com](https://quaternius.com/packs/universalbasecharacters.html)
