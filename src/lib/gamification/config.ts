// Fonte única dos parâmetros da gamificação.
// Estes são os valores padrão; a linha de `gamification_config` no banco pode sobrescrever
// qualquer um deles (mesmo formato, em JSON) sem precisar de novo deploy.

export type Priority = 'Urgente' | 'Moderado' | 'Normal'

export interface LevelTitle {
  minLevel: number
  title: string
}

export interface GamificationConfig {
  version: number
  /** Fuso que define a virada do dia (sequência, "hoje", teto diário) */
  timeZone: string
  /** Dias que contam para a sequência (0 = domingo … 6 = sábado) */
  workdays: number[]
  task: {
    baseXp: number
    routineBaseXp: number
    priorityMultipliers: Record<Priority, number>
    /** Teto diário de XP vindo de tarefas avulsas (rotina e bônus ficam fora). 0 desliga o teto */
    dailyCap: number
    /** Teto diário de XP vindo de tarefas de rotina. 0 desliga o teto */
    routineDailyCap: number
    /** Tarefa concluída antes disso, contado da criação, não gera XP (0 desliga a regra) */
    minSecondsToComplete: number
    /** Títulos repetidos no mesmo dia geram XP só uma vez */
    dedupeTitles: boolean
  }
  streak: {
    multiplierPerDay: number
    multiplierMax: number
    /** A cada quantos dias de sequência o usuário ganha um escudo */
    shieldEvery: number
    maxShields: number
    milestones: number[]
    milestoneBonus: number
  }
  bonus: {
    dailyCheckout: number
    perfectDay: number
  }
  level: {
    coefficient: number
    exponent: number
    maxLevel: number
  }
  titles: LevelTitle[]
  achievements: {
    enabled: boolean
  }
  missions: {
    enabled: boolean
    /** XP de cada missão (0 desliga a recompensa daquela missão) */
    rewards: {
      daily_tasks_3: number
      daily_routine_2: number
      daily_full: number
      weekly_active_3: number
      weekly_active_5: number
      weekly_xp_300: number
    }
  }
  team: {
    enabled: boolean
    /**
     * Mínimo de pessoas contribuindo na semana para o progresso da equipe ser exibido.
     * Abaixo disso o total revelaria, por subtração, o número de um colega.
     */
    minContributorsToShow: number
    /** Metas semanais da equipe (alvo 0 esconde a meta; recompensa 0 mantém a meta sem XP) */
    goals: {
      team_active_days: { target: number; reward: number }
      team_activity_xp: { target: number; reward: number }
    }
  }
  backfill: {
    xpPerTask: number
  }
}

export const DEFAULT_CONFIG: GamificationConfig = {
  version: 1,
  timeZone: 'America/Sao_Paulo',
  workdays: [1, 2, 3, 4, 5],
  task: {
    baseXp: 10,
    routineBaseXp: 8,
    // A prioridade é escolhida pelo próprio usuário; multiplicar por ela premiaria marcar tudo como urgente
    priorityMultipliers: { Normal: 1, Moderado: 1, Urgente: 1 },
    // Sem teto por decisão do dono (2026-10-05): toda tarefa e rotina concluída rende XP.
    // Os tetos antigos (100 e 80) podem voltar pela gamification_config.
    dailyCap: 0,
    routineDailyCap: 0,
    // Desligada por decisão da equipe: muita gente lança no fim do dia o que já fez
    minSecondsToComplete: 0,
    dedupeTitles: true,
  },
  streak: {
    multiplierPerDay: 0.02,
    multiplierMax: 1.3,
    shieldEvery: 7,
    maxShields: 2,
    milestones: [7, 30, 100],
    milestoneBonus: 50,
  },
  bonus: {
    dailyCheckout: 20,
    perfectDay: 30,
  },
  level: {
    // XP do nível L = coefficient × L^exponent. Calibrada pelo ritmo real (~80 XP por dia útil)
    // e pelos prazos da pesquisa sobre formação de hábitos: Prata (nível 5) em ~18 dias corridos,
    // Ouro (10) em ~66 dias, Platina (20) em ~6 meses. Fontes em docs/GAMIFICACAO.md.
    coefficient: 150,
    exponent: 0.6,
    maxLevel: 200,
  },
  titles: [
    { minLevel: 1, title: 'Bronze' },
    { minLevel: 5, title: 'Prata' },
    { minLevel: 10, title: 'Ouro' },
    { minLevel: 20, title: 'Platina' },
    { minLevel: 35, title: 'Esmeralda' },
    { minLevel: 50, title: 'Diamante' },
    { minLevel: 70, title: 'Mestre' },
    { minLevel: 100, title: 'Grão-Mestre' },
  ],
  achievements: {
    enabled: true,
  },
  missions: {
    enabled: true,
    // Valores provisórios, para a mecânica poder ser testada; ajustar depois com a equipe
    rewards: {
      daily_tasks_3: 15,
      daily_routine_2: 10,
      daily_full: 15,
      weekly_active_3: 20,
      weekly_active_5: 40,
      weekly_xp_300: 30,
    },
  },
  team: {
    // Desligado: hoje o sistema tem uso individual. O código das metas de equipe fica pronto
    // e volta com {"team": {"enabled": true}} em gamification_config.
    enabled: false,
    minContributorsToShow: 3,
    // Valores provisórios, como os das missões; ajustar ao tamanho real da equipe
    goals: {
      team_active_days: { target: 10, reward: 20 },
      team_activity_xp: { target: 500, reward: 20 },
    },
  },
  backfill: {
    xpPerTask: 10,
  },
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// Aceita a sobrescrita só quando ela tem o mesmo formato do valor padrão;
// qualquer coisa fora do formato é ignorada e o padrão permanece.
function mergeValue(base: unknown, override: unknown): unknown {
  if (override === undefined || override === null) return base
  if (Array.isArray(base)) {
    if (!Array.isArray(override) || override.length === 0) return base
    const sample = base[0]
    const sameShape = override.every(item =>
      isPlainObject(sample)
        ? isPlainObject(item) && Object.keys(sample).every(k => typeof item[k] === typeof sample[k])
        : typeof item === typeof sample && (typeof item !== 'number' || Number.isFinite(item))
    )
    return sameShape ? override : base
  }
  if (isPlainObject(base)) {
    if (!isPlainObject(override)) return base
    return Object.fromEntries(
      Object.entries(base).map(([key, value]) => [key, mergeValue(value, override[key])])
    )
  }
  if (typeof base === 'number') {
    return typeof override === 'number' && Number.isFinite(override) && override >= 0 ? override : base
  }
  return typeof override === typeof base ? override : base
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone })
    return true
  } catch {
    return false
  }
}

export function mergeConfig(override: unknown): GamificationConfig {
  const merged = mergeValue(DEFAULT_CONFIG, override) as GamificationConfig
  const safe: GamificationConfig = {
    ...merged,
    timeZone: isValidTimeZone(merged.timeZone) ? merged.timeZone : DEFAULT_CONFIG.timeZone,
    level: {
      ...merged.level,
      // Coeficiente zerado ou expoente não positivo deixariam a curva sem sentido; mantém o padrão nesses casos
      coefficient: merged.level.coefficient >= 1 ? merged.level.coefficient : DEFAULT_CONFIG.level.coefficient,
      exponent: merged.level.exponent > 0 ? merged.level.exponent : DEFAULT_CONFIG.level.exponent,
      maxLevel: merged.level.maxLevel >= 1 ? Math.floor(merged.level.maxLevel) : DEFAULT_CONFIG.level.maxLevel,
    },
    titles: [...merged.titles].sort((a, b) => a.minLevel - b.minLevel),
  }
  return safe
}
