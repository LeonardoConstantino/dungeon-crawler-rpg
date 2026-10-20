export type ItemRarity = 'common' | 'rare' | 'legendary';

export type ItemType = 'weapon' | 'armor' | 'ring' | 'amulet' | 'potion' | 'scroll' | 'elixir';

export type ScrollEffectType =
  | 'teleport'
  | 'reveal_map'
  | 'nova_flames'
  | 'suppress_hunger'
  | 'shield_barrier'
  | 'transmute';

export type ElixirEffectType = 'blood_fury' | 'night_wind';

export interface PlayerBuff {
  id: string;
  name: string;
  icon: string;
  timer: number;
  maxTimer: number;
  type: 'fury' | 'speed' | 'ward' | 'hunger_freeze';
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  description: string;
  icon: string;
  stats: {
    attack?: number;
    defense?: number;
    maxHp?: number;
    speed?: number;
    critChance?: number; // 0 to 1
    cooldownReduction?: number; // 0 to 1
  };
  healAmount?: number;
  scrollEffect?: ScrollEffectType;
  elixirEffect?: ElixirEffectType;
  duration?: number;
  value: number;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
  cooldown: number; // in seconds
  currentCooldown: number;
  damageMultiplier: number;
  areaRadius?: number;
  range?: number;
  duration?: number;
  soundName: 'cleave' | 'dash' | 'pulse' | 'shield';
}

export type EnemyType = 'goblin' | 'orc' | 'archer' | 'mage' | 'boss';

export interface Enemy {
  id: string;
  type: EnemyType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  attack: number;
  speed: number;
  defense: number;
  isElite: boolean;
  attackCooldown: number;
  maxAttackCooldown: number;
  attackWindup: number; // anticipation timer
  isAttacking: boolean;
  targetX?: number;
  targetY?: number;
  facing: 'left' | 'right';
  state: 'idle' | 'chase' | 'windup' | 'attack' | 'cooldown';
  telegraphRadius?: number;
  telegraphTimer?: number;
  xpReward: number;
  fissurePower: number; // scaling with Abyss Hunger
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  isHostile: boolean;
  lifetime: number;
  color: string;
  glowColor: string;
}

export interface HazardArea {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxTimer: number;
  timer: number;
  damage: number;
  exploded: boolean;
  color: string;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  lifetime: number;
  maxLifetime: number;
  vy: number;
  size: number;
  isCrit?: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  shape?: 'circle' | 'square' | 'line';
}

export interface GroundItem {
  id: string;
  item: Item;
  x: number;
  y: number;
  bobTimer: number;
}

export interface SoulRemnant {
  id: string;
  x: number;
  y: number;
  floor: number;
  xp: number;
  runSeed: string;
}

export enum TileType {
  VOID = 0,
  FLOOR_PLAIN = 1,
  FLOOR_CRACKED = 2,
  FLOOR_MOSSY = 3,
  FLOOR_RITUAL = 4,
  WALL = 10,
  WALL_CORNER = 11,
  PILLAR = 12,
  DOOR = 20,
  STAIRS_DOWN = 30,
  CHEST_CLOSED = 40,
  CHEST_OPEN = 41,
  ALTAR = 50,
  FISSURE = 60,
}

export enum FogState {
  UNEXPLORED = 0,
  EXPLORED_HIDDEN = 1,
  VISIBLE = 2,
}

export interface Room {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'start' | 'combat' | 'corridor' | 'treasure' | 'anomaly' | 'stairs' | 'boss';
  isCleared: boolean;
  hasChest?: boolean;
  hasAltar?: boolean;
  hasFissure?: boolean;
}

export interface DungeonFloor {
  floorNumber: number;
  width: number;
  height: number;
  tiles: TileType[][];
  fog: FogState[][];
  rooms: Room[];
  stairsPos: { x: number; y: number };
  playerSpawn: { x: number; y: number };
  ambientColor: string;
  hungerLevel: number; // 0 to 4 (0: Dormente, 1: Agitação, 2: Despertar, 3: Fissura Crítica, 4: Consumido)
  floorTimer: number; // real-time elapsed seconds on this floor
  isHungerFrozen?: boolean;
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  baseAttack: number;
  baseDefense: number;
  baseSpeed: number;
  critChance: number;
  cooldownReduction: number;
  visionRadius: number;
}

export interface Equipment {
  weapon: Item | null;
  armor: Item | null;
  ring1: Item | null;
  ring2: Item | null;
  amulet: Item | null;
}

export interface AscensionUpgrades {
  maxHpLevel: number;       // +10% max HP per level
  attackLevel: number;      // +8% attack per level
  visionLevel: number;      // +1 tile vision per level
  cooldownLevel: number;    // +5% cooldown reduction per level
  fortuneLevel: number;     // +10% rare drop chance per level
}

export interface RunHistoryEntry {
  id: string;
  date: string;
  seed: string;
  floorReached: number;
  level: number;
  enemiesKilled: number;
  durationSeconds: number;
  causeOfDeath: string;
  remnantsEarned: number;
}

export interface GameSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  isMuted: boolean;
  screenShake: boolean;
  reducedFlashes: boolean;
  aimAssist: boolean;
  virtualJoystickScale: number;
  virtualJoystickOpacity: number;
  fullscreen?: boolean;
}

export interface LevelUpOption {
  id: string;
  title: string;
  category: 'attack' | 'defense' | 'utility' | 'vitality' | 'spectral';
  description: string;
  effect: (player: PlayerState) => void;
  icon: string;
  rarity: ItemRarity;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 'left' | 'right';
  stats: PlayerStats;
  equipment: Equipment;
  inventory: (Item | null)[]; // 20 slots
  skills: Skill[];
  activeBuffs: PlayerBuff[];
  isAttacking: boolean;
  attackTimer: number;
  attackCombo: number;
  invulnerableTimer: number;
  shieldHp: number;
  maxShieldHp: number;
  potionsCount: number;
}
