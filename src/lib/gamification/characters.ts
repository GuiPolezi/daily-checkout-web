// Elenco de personagens 3D (Fase 1 do plano em docs/PERSONAGENS-PLANO.md).
// Cada personagem aponta para um modelo, um retrato para a grade de escolha e um "rig":
// o conjunto de nomes de animação e de material que aquele modelo entende.
// Tudo aqui é cosmético — nenhum personagem dá vantagem de XP.

export type RigId = 'robot' | 'mini'

export interface RigDefinition {
  /** Clipe de repouso */
  idle: string
  /** Clipe tocado na subida de nível */
  levelUp: string
  /** Clipe de cada comemoração do catálogo do avatar (chave = `value` do item de comemoração) */
  celebrations: Record<string, string>
  /** Comemorações que ganham um giro de 360° feito no código (o pacote não tem dança) */
  spinOn: string[]
  /** Quantas vezes o clipe de comemoração repete: clipes curtos ficam mais visíveis repetidos */
  repetitions: number
  /** O que recebe a cor do corpo: um material pelo nome, ou todos os materiais de uma malha */
  tint: { material: string } | { mesh: string }
}

export const RIGS: Record<RigId, RigDefinition> = {
  // RobotExpressive (three.js): clipes longos e expressivos, material "Main" sem textura
  robot: {
    idle: 'Idle',
    levelUp: 'Wave',
    celebrations: { ThumbsUp: 'ThumbsUp', Yes: 'Yes', Jump: 'Jump', Punch: 'Punch', Dance: 'Dance' },
    spinOn: [],
    repetitions: 1,
    tint: { material: 'Main' },
  },
  // Kenney Mini Characters: clipes curtos de jogo, textura compartilhada; a roupa fica em "body-mesh"
  mini: {
    idle: 'idle',
    levelUp: 'interact-right',
    celebrations: { ThumbsUp: 'interact-right', Yes: 'emote-yes', Jump: 'jump', Punch: 'attack-melee-right', Dance: 'jump' },
    spinOn: ['Dance'],
    repetitions: 2,
    tint: { mesh: 'body-mesh' },
  },
}

export interface CharacterDefinition {
  id: string
  title: string
  description: string
  /** Caminho do GLB em public/ */
  model: string
  /** Retrato PNG para a grade de escolha e para a versão 2D */
  portrait: string
  rig: RigId
  minLevel: number
  /** Conquista que libera o personagem (além do nível) */
  achievementId?: string
}

export const DEFAULT_CHARACTER_ID = 'robot'

const MINI = '/models/mini'
const PORTRAITS = '/models/portraits'

const mini = (
  id: string,
  file: string,
  title: string,
  description: string,
  unlock: { minLevel?: number; achievementId?: string }
): CharacterDefinition => ({
  id,
  title,
  description,
  model: `${MINI}/${file}.glb`,
  portrait: `${PORTRAITS}/${id}.png`,
  rig: 'mini',
  minLevel: unlock.minLevel ?? 1,
  ...(unlock.achievementId ? { achievementId: unlock.achievementId } : {}),
})

// Tema: a oficina. Cada personagem é um ofício, na mesma linha dos títulos (Bronze → Grão-Mestre)
// e das conquistas (forja). A ordem é a ordem da grade.
export const CHARACTERS: CharacterDefinition[] = [
  {
    id: DEFAULT_CHARACTER_ID,
    title: 'Robô',
    description: 'O ajudante original da oficina. Está com todo mundo desde o começo.',
    model: '/models/RobotExpressive.glb',
    portrait: `${PORTRAITS}/robot.png`,
    rig: 'robot',
    minLevel: 1,
  },
  mini('mini-male-a', 'character-male-a', 'Aprendiz', 'Chegou ontem e já quer martelar.', { minLevel: 1 }),
  mini('mini-male-f', 'character-male-f', 'Minerador', 'Traz o minério bruto do fundo da serra.', { minLevel: 3 }),
  mini('mini-female-c', 'character-female-c', 'Ferreira', 'Dona da bigorna. Ninguém bate mais certo.', { minLevel: 5 }),
  mini('mini-female-d', 'character-female-d', 'Vidreira', 'Sopra o vidro enquanto ele ainda brilha.', { minLevel: 5 }),
  mini('mini-male-c', 'character-male-c', 'Guarda', 'Vigia o portão da oficina, chova ou faça sol.', { minLevel: 8 }),
  mini('mini-female-b', 'character-female-b', 'Ourives', 'Transforma o ouro em fio e o fio em joia.', { minLevel: 10 }),
  mini('mini-male-e', 'character-male-e', 'Inventor', 'Engenhocas, óculos de proteção e muitas ideias.', { minLevel: 10 }),
  mini('mini-male-d', 'character-male-d', 'Mercador', 'Vende o que a oficina produz e volta com encomendas.', { minLevel: 15 }),
  mini('mini-female-a', 'character-female-a', 'Alquimista', 'Mistura ligas que ninguém mais conhece.', { minLevel: 20 }),
  mini('mini-male-b', 'character-male-b', 'Fundidor', 'Derrama o metal líquido no molde sem tremer.', { achievementId: 'routine_25' }),
  mini('mini-female-e', 'character-female-e', 'Lapidária', 'Faz da pedra bruta uma gema.', { achievementId: 'checkout_20' }),
  mini('mini-female-f', 'character-female-f', 'Exploradora', 'Mapeia minas novas onde ninguém pisou.', { achievementId: 'streak_30' }),
]

export function findCharacter(id: unknown, catalog: CharacterDefinition[] = CHARACTERS): CharacterDefinition | undefined {
  return typeof id === 'string' ? catalog.find(item => item.id === id) : undefined
}

export const defaultCharacter = (catalog: CharacterDefinition[] = CHARACTERS): CharacterDefinition =>
  findCharacter(DEFAULT_CHARACTER_ID, catalog) ?? catalog[0]
