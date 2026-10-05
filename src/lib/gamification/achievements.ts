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

// Sequência já paga bônus nos marcos e nível é consequência do XP: essas conquistas não dão XP extra.
export const ACHIEVEMENTS: AchievementDefinition[] = [
  { id: 'tasks_1', title: 'Primeira Nota', description: 'Conclua sua primeira tarefa.', metric: 'tasksCompleted', target: 1, xpReward: 10 },
  { id: 'tasks_50', title: 'Mãos de Alquimista', description: 'Conclua 50 tarefas.', metric: 'tasksCompleted', target: 50, xpReward: 50 },
  { id: 'tasks_250', title: 'Coleção Assinada', description: 'Conclua 250 tarefas.', metric: 'tasksCompleted', target: 250, xpReward: 100 },
  { id: 'tasks_1000', title: 'Obra-Prima', description: 'Conclua 1.000 tarefas.', metric: 'tasksCompleted', target: 1000, xpReward: 200 },

  { id: 'routine_25', title: 'Ritual em Dia', description: 'Marque 25 tarefas de rotina.', metric: 'routinesCompleted', target: 25, xpReward: 30 },
  { id: 'routine_200', title: 'Guardião da Rotina', description: 'Marque 200 tarefas de rotina.', metric: 'routinesCompleted', target: 200, xpReward: 100 },

  { id: 'checkout_1', title: 'Primeiro Fechamento', description: 'Envie seu primeiro checkout.', metric: 'checkouts', target: 1, xpReward: 10 },
  { id: 'checkout_20', title: 'Diário de Bordo', description: 'Envie o checkout em 20 dias.', metric: 'checkouts', target: 20, xpReward: 50 },
  { id: 'checkout_100', title: 'Memória Olfativa', description: 'Envie o checkout em 100 dias.', metric: 'checkouts', target: 100, xpReward: 150 },

  { id: 'perfect_1', title: 'Dia Perfeito', description: 'Complete toda a rotina de um dia.', metric: 'perfectDays', target: 1, xpReward: 10 },
  { id: 'perfect_5', title: 'Semana Perfeita', description: 'Complete toda a rotina em 5 dias.', metric: 'perfectDays', target: 5, xpReward: 40 },
  { id: 'perfect_25', title: 'Harmonia Completa', description: 'Complete toda a rotina em 25 dias.', metric: 'perfectDays', target: 25, xpReward: 100 },

  { id: 'streak_7', title: 'Fixação', description: 'Alcance 7 dias úteis de sequência.', metric: 'bestStreak', target: 7, xpReward: 0 },
  { id: 'streak_30', title: 'Longa Duração', description: 'Alcance 30 dias úteis de sequência.', metric: 'bestStreak', target: 30, xpReward: 0 },
  { id: 'streak_100', title: 'Essência Eterna', description: 'Alcance 100 dias úteis de sequência.', metric: 'bestStreak', target: 100, xpReward: 0 },

  { id: 'level_5', title: 'Jaleco Novo', description: 'Chegue ao nível 5.', metric: 'level', target: 5, xpReward: 0 },
  { id: 'level_10', title: 'Bancada Própria', description: 'Chegue ao nível 10.', metric: 'level', target: 10, xpReward: 0 },
  { id: 'level_20', title: 'Casa de Perfumes', description: 'Chegue ao nível 20.', metric: 'level', target: 20, xpReward: 0 },
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
