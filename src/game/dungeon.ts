import { DungeonFloor, Enemy, GroundItem, Item, ItemRarity, Room, SoulRemnant, TileType, FogState } from './types';

// Deterministic Mulberry32 PRNG
export class PRNG {
  private state: number;

  constructor(seedStr: string) {
    let h = 1779033703 ^ seedStr.length;
    for (let i = 0; i < seedStr.length; i++) {
      h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    this.state = h >>> 0;
  }

  public next(): number {
    this.state = (this.state + 0x6D2B79F5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  public range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  public rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  public pick<T>(arr: T[]): T {
    return arr[this.rangeInt(0, arr.length - 1)];
  }
}

// Procedural Item Generation based on seed and floor depth
const WEAPON_NAMES = [
  'Lâmina de Ferro Frio', 'Espada de Basalto', 'Gládio Espectral',
  'Cutelo do Executor', 'Adaga da Fenda', 'Espada Longa do Abismo',
  'Foice da Memória', 'Lança Rúnica', 'Lâmina do Esquecimento'
];

const ARMOR_NAMES = [
  'Gibão de Couro Escuro', 'Manto de Cinzas', 'Cota de Malha Fria',
  'Armadura de Basalto', 'Túnica Espectral', 'Peitoral da Ruína',
  'Armadura de Pedra Negra', 'Veste do Andarilho'
];

const RING_NAMES = [
  'Anel de Pirita', 'Elos de Sangue', 'Banda de Obsidiana',
  'Selo do Abismo', 'Anel Espectral', 'Gema da Fome'
];

const AMULET_NAMES = [
  'Amuleto de Ardósia', 'Talismã da Alma', 'Pingente das Profundezas',
  'Olho do Vazio', 'Coração Rúnico'
];

export function generateItem(prng: PRNG, floor: number, guaranteedRarity?: ItemRarity): Item {
  const roll = prng.next();
  let rarity: ItemRarity = 'common';
  if (guaranteedRarity) {
    rarity = guaranteedRarity;
  } else if (roll > 0.88 || (floor >= 10 && roll > 0.75)) {
    rarity = 'legendary';
  } else if (roll > 0.60) {
    rarity = 'rare';
  }

  const types: ('weapon' | 'armor' | 'ring' | 'amulet' | 'potion' | 'scroll' | 'elixir')[] = [
    'weapon', 'armor', 'ring', 'amulet', 'potion', 'scroll', 'elixir'
  ];
  const type = prng.pick(types);

  const rarityMult = rarity === 'legendary' ? 2.5 : rarity === 'rare' ? 1.6 : 1.0;
  const floorMult = 1 + (floor - 1) * 0.15;

  if (type === 'potion') {
    return {
      id: `potion-${prng.rangeInt(1000, 9999)}`,
      name: 'Frasco de Sangue Frio',
      type: 'potion',
      rarity: 'common',
      description: 'Cura 45% da vida máxima do Descendente.',
      icon: 'potion',
      value: 15,
      healAmount: 45,
      stats: {},
    };
  }

  if (type === 'scroll') {
    const scrollEffects: {
      effect: import('./types').ScrollEffectType;
      name: string;
      desc: string;
      rarity: ItemRarity;
    }[] = [
      {
        effect: 'reveal_map',
        name: 'Pergaminho da Revelação Arcana',
        desc: 'Dissipa instantaneamente toda a névoa do andar e revela salas, escadas e altares.',
        rarity: 'common',
      },
      {
        effect: 'teleport',
        name: 'Pergaminho do Salto Espectral',
        desc: 'Teleporta você em segurança próximo às escadas da masmorra com 2s de invulnerabilidade.',
        rarity: 'rare',
      },
      {
        effect: 'nova_flames',
        name: 'Pergaminho da Nova Cósmica',
        desc: 'Detona uma onda estelar em 360° que causa dano colossal a todos os inimigos à vista.',
        rarity: 'legendary',
      },
      {
        effect: 'suppress_hunger',
        name: 'Pergaminho da Calmaria Abissal',
        desc: 'Retrocede 60s do relógio da Fome do Abismo e congela o tempo do andar por 20 segundos.',
        rarity: 'rare',
      },
      {
        effect: 'shield_barrier',
        name: 'Pergaminho da Égide Espiritual',
        desc: 'Ergue uma barreira espiritual impenetrável que absorve até 80 de dano.',
        rarity: 'rare',
      },
      {
        effect: 'transmute',
        name: 'Pergaminho da Transmutação',
        desc: 'Condensa o vácuo ao redor em +15 Vestígios do Abismo e forja um tesouro no chão.',
        rarity: 'legendary',
      },
    ];

    const chosen = prng.pick(scrollEffects);
    return {
      id: `scroll-${prng.rangeInt(10000, 99999)}`,
      name: chosen.name,
      type: 'scroll',
      rarity: chosen.rarity,
      description: chosen.desc,
      icon: 'scroll',
      scrollEffect: chosen.effect,
      stats: {},
      value: chosen.rarity === 'legendary' ? 50 : 25,
      isNew: true,
    };
  }

  if (type === 'elixir') {
    const elixirs: {
      effect: import('./types').ElixirEffectType;
      name: string;
      desc: string;
      rarity: ItemRarity;
    }[] = [
      {
        effect: 'blood_fury',
        name: 'Elixir da Fúria Sanguínea',
        desc: '+50% de Ataque e +25% de Chance Crítica durante 15 segundos.',
        rarity: 'rare',
      },
      {
        effect: 'night_wind',
        name: 'Elixir do Vento Noturno',
        desc: '+40% de Velocidade de Movimento e esquiva aprimorada durante 15 segundos.',
        rarity: 'common',
      },
    ];

    const chosen = prng.pick(elixirs);
    return {
      id: `elixir-${prng.rangeInt(10000, 99999)}`,
      name: chosen.name,
      type: 'elixir',
      rarity: chosen.rarity,
      description: chosen.desc,
      icon: 'elixir',
      elixirEffect: chosen.effect,
      duration: 15,
      stats: {},
      value: 30,
      isNew: true,
    };
  }

  let name = '';
  let icon = '';
  const stats: Item['stats'] = {};

  if (type === 'weapon') {
    name = prng.pick(WEAPON_NAMES);
    icon = 'sword';
    stats.attack = Math.round((8 + prng.range(2, 6) * floorMult) * rarityMult);
    if (rarity !== 'common') {
      stats.critChance = Number((0.05 + prng.range(0.02, 0.08) * rarityMult).toFixed(2));
    }
  } else if (type === 'armor') {
    name = prng.pick(ARMOR_NAMES);
    icon = 'shield';
    stats.defense = Math.round((4 + prng.range(1, 4) * floorMult) * rarityMult);
    stats.maxHp = Math.round((15 + prng.range(5, 15) * floorMult) * rarityMult);
  } else if (type === 'ring') {
    name = prng.pick(RING_NAMES);
    icon = 'ring';
    if (prng.next() > 0.5) {
      stats.attack = Math.round((3 + prng.range(1, 3) * floorMult) * rarityMult);
      stats.critChance = Number((0.04 + prng.range(0.02, 0.05) * rarityMult).toFixed(2));
    } else {
      stats.defense = Math.round((2 + prng.range(1, 3) * floorMult) * rarityMult);
      stats.speed = Number((0.15 * rarityMult).toFixed(2));
    }
  } else {
    name = prng.pick(AMULET_NAMES);
    icon = 'amulet';
    stats.maxHp = Math.round((20 + prng.range(10, 25) * floorMult) * rarityMult);
    stats.cooldownReduction = Number((0.06 + prng.range(0.02, 0.06) * rarityMult).toFixed(2));
  }

  return {
    id: `item-${prng.rangeInt(10000, 99999)}`,
    name: rarity === 'legendary' ? `Antigo ${name}` : name,
    type,
    rarity,
    description: `Forjado nas profundezas do andar ${floor}. ${rarity === 'legendary' ? 'Imbuído de vestígios da Fome.' : ''}`,
    icon,
    stats,
    value: Math.round(20 * rarityMult * floorMult),
    isNew: true,
  };
}

// Generate complete dungeon level
export function generateDungeonFloor(
  seed: string,
  floorNumber: number,
  remnants: SoulRemnant[] = []
): {
  dungeon: DungeonFloor;
  enemies: Enemy[];
  groundItems: GroundItem[];
} {
  const floorSeed = `${seed}-F${floorNumber}`;
  const prng = new PRNG(floorSeed);

  const width = 42;
  const height = 42;

  // Initialize grid with VOID
  const tiles: TileType[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => TileType.VOID)
  );

  const fog: FogState[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => FogState.UNEXPLORED)
  );

  const isBossFloor = floorNumber % 10 === 0;
  const rooms: Room[] = [];

  // Room generation configuration
  const numRooms = isBossFloor ? 3 : prng.rangeInt(6, 9);

  for (let attempt = 0; attempt < 80 && rooms.length < numRooms; attempt++) {
    const rw = prng.rangeInt(6, 10);
    const rh = prng.rangeInt(6, 9);
    const rx = prng.rangeInt(2, width - rw - 3);
    const ry = prng.rangeInt(2, height - rh - 3);

    // Check collision with existing rooms (with 2 tiles buffer)
    let overlap = false;
    for (const r of rooms) {
      if (
        rx <= r.x + r.width + 2 &&
        rx + rw + 2 >= r.x &&
        ry <= r.y + r.height + 2 &&
        ry + rh + 2 >= r.y
      ) {
        overlap = true;
        break;
      }
    }

    if (!overlap) {
      let roomType: Room['type'] = 'combat';
      if (rooms.length === 0) {
        roomType = 'start';
      } else if (isBossFloor && rooms.length === 2) {
        roomType = 'boss';
      }

      rooms.push({
        id: rooms.length,
        x: rx,
        y: ry,
        width: rw,
        height: rh,
        type: roomType,
        isCleared: roomType === 'start',
      });
    }
  }

  // Assign special room types if not boss
  if (!isBossFloor && rooms.length >= 4) {
    rooms[rooms.length - 1].type = 'stairs';
    rooms[prng.rangeInt(1, Math.max(1, rooms.length - 2))].type = 'treasure';
    if (rooms.length >= 6) {
      rooms[prng.rangeInt(2, rooms.length - 2)].type = 'anomaly';
    }
  } else if (isBossFloor && rooms.length >= 2) {
    rooms[rooms.length - 1].type = 'boss';
  }

  // Carve rooms into tile grid
  rooms.forEach((r) => {
    for (let y = r.y; y < r.y + r.height; y++) {
      for (let x = r.x; x < r.x + r.width; x++) {
        const isBorder =
          y === r.y ||
          y === r.y + r.height - 1 ||
          x === r.x ||
          x === r.x + r.width - 1;

        if (isBorder) {
          tiles[y][x] = TileType.WALL;
        } else {
          // Inner floor texture variation
          const roll = prng.next();
          if (r.type === 'anomaly' && roll > 0.6) {
            tiles[y][x] = TileType.FLOOR_RITUAL;
          } else if (roll > 0.85) {
            tiles[y][x] = TileType.FLOOR_CRACKED;
          } else if (roll > 0.72) {
            tiles[y][x] = TileType.FLOOR_MOSSY;
          } else {
            tiles[y][x] = TileType.FLOOR_PLAIN;
          }

          // Add pillars around perimeter of combat rooms
          if (
            r.type === 'combat' &&
            r.width >= 8 &&
            r.height >= 7 &&
            ((x === r.x + 2 && y === r.y + 2) ||
              (x === r.x + r.width - 3 && y === r.y + 2) ||
              (x === r.x + 2 && y === r.y + r.height - 3) ||
              (x === r.x + r.width - 3 && y === r.y + r.height - 3))
          ) {
            tiles[y][x] = TileType.PILLAR;
          }
        }
      }
    }

    // Place room centerpieces
    const centerX = Math.floor(r.x + r.width / 2);
    const centerY = Math.floor(r.y + r.height / 2);

    if (r.type === 'treasure') {
      tiles[centerY][centerX] = TileType.CHEST_CLOSED;
      r.hasChest = true;
    } else if (r.type === 'anomaly') {
      tiles[centerY][centerX] = TileType.FISSURE;
      r.hasFissure = true;
    } else if (r.type === 'stairs') {
      tiles[centerY][centerX] = TileType.STAIRS_DOWN;
    }
  });

  // Connect rooms with corridors
  for (let i = 0; i < rooms.length - 1; i++) {
    const rA = rooms[i];
    const rB = rooms[i + 1];

    let ax = Math.floor(rA.x + rA.width / 2);
    let ay = Math.floor(rA.y + rA.height / 2);
    const bx = Math.floor(rB.x + rB.width / 2);
    const by = Math.floor(rB.y + rB.height / 2);

    // Carve horizontal corridor
    while (ax !== bx) {
      carveCorridorTile(tiles, ax, ay);
      ax += ax < bx ? 1 : -1;
    }
    // Carve vertical corridor
    while (ay !== by) {
      carveCorridorTile(tiles, ax, ay);
      ay += ay < by ? 1 : -1;
    }
  }

  // Ensure walls surrounding carved corridors
  ensureCorridorWalls(tiles, width, height);

  // Player spawn in start room center
  const startRoom = rooms[0];
  const playerSpawn = {
    x: Math.floor(startRoom.x + startRoom.width / 2),
    y: Math.floor(startRoom.y + startRoom.height / 2),
  };

  // Stairs location
  const stairsRoom = rooms.find((r) => r.type === 'stairs') || rooms[rooms.length - 1];
  const stairsPos = {
    x: Math.floor(stairsRoom.x + stairsRoom.width / 2),
    y: Math.floor(stairsRoom.y + stairsRoom.height / 2),
  };
  tiles[stairsPos.y][stairsPos.x] = TileType.STAIRS_DOWN;

  // Calculate Abyss Hunger (increases with floor level)
  const hungerLevel = Math.min(10, Math.floor((floorNumber - 1) / 2));

  // Generate Enemies
  const enemies: Enemy[] = [];
  const groundItems: GroundItem[] = [];

  rooms.forEach((r) => {
    if (r.type === 'start') return;

    if (r.type === 'boss') {
      // Spawn Boss: "A Sombra da Fome"
      const bx = Math.floor(r.x + r.width / 2);
      const by = Math.floor(r.y + r.height / 2);
      enemies.push({
        id: `boss-${floorNumber}`,
        type: 'boss',
        name: `A Sombra da Fome (Andar ${floorNumber})`,
        x: bx,
        y: by,
        width: 1.6,
        height: 1.6,
        hp: 400 + floorNumber * 70,
        maxHp: 400 + floorNumber * 70,
        attack: 18 + floorNumber * 2.2,
        defense: 12 + floorNumber * 1.5,
        speed: 1.8,
        isElite: true,
        attackCooldown: 0,
        maxAttackCooldown: 2.2,
        attackWindup: 0,
        isAttacking: false,
        facing: 'left',
        state: 'idle',
        telegraphRadius: 3.2,
        telegraphTimer: 0,
        xpReward: 350 + floorNumber * 60,
        fissurePower: hungerLevel,
      });
      return;
    }

    // Normal combat rooms enemy count
    const enemyCount = prng.rangeInt(2, 3 + Math.min(4, Math.floor(floorNumber / 3)));
    for (let e = 0; e < enemyCount; e++) {
      const ex = prng.rangeInt(r.x + 2, r.x + r.width - 3);
      const ey = prng.rangeInt(r.y + 2, r.y + r.height - 3);

      // Verify tile is walkable
      if (tiles[ey]?.[ex] >= TileType.WALL) continue;

      // Enemy type selection
      const typeRoll = prng.next();
      let type: Enemy['type'] = 'goblin';
      if (floorNumber >= 3 && typeRoll > 0.75) {
        type = 'mage';
      } else if (floorNumber >= 2 && typeRoll > 0.50) {
        type = 'archer';
      } else if (typeRoll > 0.30) {
        type = 'orc';
      }

      const isElite = prng.next() < 0.15 + hungerLevel * 0.03;
      const eliteMult = isElite ? 1.8 : 1.0;
      const depthMult = 1 + (floorNumber - 1) * 0.18;

      let hp = 30;
      let attack = 6;
      let defense = 2;
      let speed = 2.4;
      let cd = 1.2;
      let xp = 20;

      if (type === 'goblin') {
        hp = Math.round(24 * depthMult * eliteMult);
        attack = Math.round(7 * depthMult * eliteMult);
        defense = 1;
        speed = 3.2;
        cd = 0.9;
        xp = 18;
      } else if (type === 'orc') {
        hp = Math.round(55 * depthMult * eliteMult);
        attack = Math.round(14 * depthMult * eliteMult);
        defense = Math.round(4 * depthMult);
        speed = 1.6;
        cd = 1.8;
        xp = 35;
      } else if (type === 'archer') {
        hp = Math.round(30 * depthMult * eliteMult);
        attack = Math.round(9 * depthMult * eliteMult);
        defense = 2;
        speed = 2.0;
        cd = 1.6;
        xp = 28;
      } else if (type === 'mage') {
        hp = Math.round(38 * depthMult * eliteMult);
        attack = Math.round(13 * depthMult * eliteMult);
        defense = 2;
        speed = 1.7;
        cd = 2.2;
        xp = 42;
      }

      enemies.push({
        id: `enemy-${floorNumber}-${e}-${ex}-${ey}`,
        type,
        name: isElite ? `Elite ${type.toUpperCase()}` : type.toUpperCase(),
        x: ex + 0.5,
        y: ey + 0.5,
        width: isElite ? 1.2 : 0.9,
        height: isElite ? 1.2 : 0.9,
        hp,
        maxHp: hp,
        attack,
        defense,
        speed,
        isElite,
        attackCooldown: prng.range(0.2, 1.0),
        maxAttackCooldown: cd,
        attackWindup: 0,
        isAttacking: false,
        facing: prng.next() > 0.5 ? 'right' : 'left',
        state: 'idle',
        xpReward: Math.round(xp * depthMult * (isElite ? 2.2 : 1.0)),
        fissurePower: hungerLevel,
      });
    }
  });

  // Check for saved soul remnants on this floor
  const relevantRemnant = remnants.find(
    (rem) => rem.floor === floorNumber && rem.runSeed === seed
  );
  if (relevantRemnant) {
    groundItems.push({
      id: relevantRemnant.id,
      x: relevantRemnant.x,
      y: relevantRemnant.y,
      bobTimer: 0,
      item: {
        id: `remnant-item-${floorNumber}`,
        name: 'Vestígio de Alma Perdida',
        type: 'scroll',
        rarity: 'legendary',
        description: `As marcas da sua queda anterior. Recupera ${relevantRemnant.xp} XP acumulado.`,
        icon: 'remnant',
        value: 100,
        stats: {},
      },
    });
  }

  return {
    dungeon: {
      floorNumber,
      width,
      height,
      tiles,
      fog,
      rooms,
      stairsPos,
      playerSpawn,
      ambientColor: getAmbientColor(floorNumber, hungerLevel),
      hungerLevel,
      floorTimer: 0,
      isHungerFrozen: false,
    },
    enemies,
    groundItems,
  };
}

function carveCorridorTile(tiles: TileType[][], x: number, y: number) {
  if (tiles[y]?.[x] !== undefined) {
    if (tiles[y][x] === TileType.VOID || tiles[y][x] === TileType.WALL) {
      tiles[y][x] = TileType.FLOOR_PLAIN;
    }
  }
}

function ensureCorridorWalls(tiles: TileType[][], width: number, height: number) {
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (tiles[y][x] >= TileType.FLOOR_PLAIN && tiles[y][x] < TileType.WALL) {
        // Check 8 neighbors; if VOID, convert to WALL
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (tiles[y + dy][x + dx] === TileType.VOID) {
              tiles[y + dy][x + dx] = TileType.WALL;
            }
          }
        }
      }
    }
  }
}

function getAmbientColor(floor: number, hunger: number): string {
  if (floor % 10 === 0) return '#1A0815'; // Boss floor purple/dark violet
  if (hunger >= 4) return '#140A0D';     // Deep fissure dark crimson
  return '#080C14';                     // Cold slate blue
}
