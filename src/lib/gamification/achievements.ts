// Conquistas (Fase 2): catálogo e avaliação, em funções puras.
// Uma conquista desbloqueada é permanente — nunca é retirada, mesmo que o usuário desfaça algo depois.

export interface AchievementStats {
  /** Tarefas avulsas que renderam XP */
  tasksCompleted: number
  /** Marcações de rotina que renderam XP */
  routinesCompleted: number
  /** Dias com bônus de checkout */
  checkouts: number
  /** Dias com bônus de dia perfeito */
  perfectDays: number
  bestStreak: number
  level: number
}

export interface AchievementDefinition {
  id: string
  title: string
  description: string
  metric: keyof AchievementStats
  target: number
  /** XP concedido uma única vez ao desbloquear (0 = só o reconhecimento) */
  xpReward: number
}

export interface AchievementProgress extends AchievementDefinition {
  current: number
  unlockedAt: string | null
}

// Tema: a forja. Os títulos vão de Bronze a Grão-Mestre, e cada conquista é um passo de quem
// transforma metal bruto em peça acabada — a tarefa é a martelada, a rotina é o fogo que não apaga,
// o checkout é o selo do ourives, a sequência é a chama. Os ids não mudam: são a chave no banco.
// Sequência já paga bônus nos marcos e nível é consequência do XP: essas conquistas não dão XP extra.
export const ACHIEVEMENTS: AchievementDefinition[] = [
  { id: 'tasks_1', title: 'Primeira Faísca', description: 'Conclua sua primeira tarefa.', metric: 'tasksCompleted', target: 1, xpReward: 10 },
  { id: 'tasks_50', title: 'Mãos na Bigorna', description: 'Conclua 50 tarefas.', metric: 'tasksCompleted', target: 50, xpReward: 50 },
  { id: 'tasks_250', title: 'Liga Temperada', description: 'Conclua 250 tarefas.', metric: 'tasksCompleted', target: 250, xpReward: 100 },
  { id: 'tasks_1000', title: 'Mil Marteladas', description: 'Conclua 1.000 tarefas.', metric: 'tasksCompleted', target: 1000, xpReward: 200 },

  { id: 'routine_25', title: 'Ritmo da Forja', description: 'Marque 25 tarefas de rotina.', metric: 'routinesCompleted', target: 25, xpReward: 30 },
  { id: 'routine_200', title: 'Guardião do Fogo', description: 'Marque 200 tarefas de rotina.', metric: 'routinesCompleted', target: 200, xpReward: 100 },

  { id: 'checkout_1', title: 'Primeiro Selo', description: 'Envie seu primeiro checkout.', metric: 'checkouts', target: 1, xpReward: 10 },
  { id: 'checkout_20', title: 'Livro da Oficina', description: 'Envie o checkout em 20 dias.', metric: 'checkouts', target: 20, xpReward: 50 },
  { id: 'checkout_100', title: 'Marca Registrada', description: 'Envie o checkout em 100 dias.', metric: 'checkouts', target: 100, xpReward: 150 },

  { id: 'perfect_1', title: 'Molde Perfeito', description: 'Complete toda a rotina de um dia.', metric: 'perfectDays', target: 1, xpReward: 10 },
  { id: 'perfect_5', title: 'Semana Sem Rebarba', description: 'Complete toda a rotina em 5 dias.', metric: 'perfectDays', target: 5, xpReward: 40 },
  { id: 'perfect_25', title: 'Peça de Mestre', description: 'Complete toda a rotina em 25 dias.', metric: 'perfectDays', target: 25, xpReward: 100 },

  // 45 dias úteis ≈ 66 dias corridos: a mediana que a pesquisa mediu para um hábito virar automático
  { id: 'streak_7', title: 'Fogo Aceso', description: 'Alcance 7 dias úteis de sequência.', metric: 'bestStreak', target: 7, xpReward: 0 },
  { id: 'streak_30', title: 'Brasa Constante', description: 'Alcance 30 dias úteis de sequência.', metric: 'bestStreak', target: 30, xpReward: 0 },
  { id: 'streak_45', title: 'Hábito Forjado', description: 'Alcance 45 dias úteis de sequência: cerca de 66 dias corridos, o tempo médio para um hábito virar automático.', metric: 'bestStreak', target: 45, xpReward: 0 },
  { id: 'streak_100', title: 'Chama Eterna', description: 'Alcance 100 dias úteis de sequência.', metric: 'bestStreak', target: 100, xpReward: 0 },

  { id: 'level_5', title: 'Prata Polida', description: 'Chegue ao nível 5.', metric: 'level', target: 5, xpReward: 0 },
  { id: 'level_10', title: 'Ouro Puro', description: 'Chegue ao nível 10.', metric: 'level', target: 10, xpReward: 0 },
  { id: 'level_20', title: 'Platina Forjada', description: 'Chegue ao nível 20.', metric: 'level', target: 20, xpReward: 0 },
  { id: 'level_35', title: 'Esmeralda Lapidada', description: 'Chegue ao nível 35.', metric: 'level', target: 35, xpReward: 0 },
  { id: 'level_50', title: 'Diamante Bruto', description: 'Chegue ao nível 50.', metric: 'level', target: 50, xpReward: 0 },
]

/** Conquistas cujo alvo foi atingido e que ainda não constam como desbloqueadas */
export function findNewAchievements(
  stats: AchievementStats,
  unlockedIds: Iterable<string>,
  catalog: AchievementDefinition[] = ACHIEVEMENTS
): AchievementDefinition[] {
  const unlocked = new Set(unlockedIds)
  return catalog.filter(item => !unlocked.has(item.id) && stats[item.metric] >= item.target)
}

export function achievementProgress(
  stats: AchievementStats,
  unlocked: { id: string; unlockedAt: string }[],
  catalog: AchievementDefinition[] = ACHIEVEMENTS
): AchievementProgress[] {
  const unlockedAt = new Map(unlocked.map(item => [item.id, item.unlockedAt]))
  return catalog.map(item => ({
    ...item,
    current: Math.min(stats[item.metric], item.target),
    unlockedAt: unlockedAt.get(item.id) ?? null,
  }))
}

export const achievementSourceId = (id: string) => `achievement:${id}`
