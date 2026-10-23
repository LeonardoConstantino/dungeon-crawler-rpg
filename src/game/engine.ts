import { soundManager } from './audio';
import { generateDungeonFloor, generateItem, PRNG } from './dungeon';
import { updateFogOfWar } from './fog';
import { Storage } from './storage';
import {
  AscensionUpgrades,
  DungeonFloor,
  Enemy,
  FloatingText,
  GameSettings,
  GroundItem,
  HazardArea,
  Item,
  LevelUpOption,
  Particle,
  PlayerState,
  Projectile,
  Skill,
  TileType,
} from './types';

export class GameEngine {
  public dungeon!: DungeonFloor;
  public player!: PlayerState;
  public enemies: Enemy[] = [];
  public projectiles: Projectile[] = [];
  public hazardAreas: HazardArea[] = [];
  public groundItems: GroundItem[] = [];
  public particles: Particle[] = [];
  public floatingTexts: FloatingText[] = [];

  public seed: string;
  public currentFloorNumber = 1;
  public settings: GameSettings;
  public ascension: AscensionUpgrades;
  public activeSlotId: string;

  public isPaused = false;
  public isGameOver = false;
  public isVictory = false;
  public cameraShake = { x: 0, y: 0 };
  public runStartTime = Date.now();
  public enemiesKilledCount = 0;
  public abyssRemnantsEarned = 0;

  // Real-time Floor Abyss Hunger state
  public floorHungerFrozenTimer = 0;
  private abyssDamageTickTimer = 0;
  private lastAnnouncedHungerStage = 0;

  // Callbacks to UI
  public onLevelUp?: (options: LevelUpOption[]) => void;
  public onPlayerDeath?: () => void;
  public onFloorChange?: (floor: number) => void;
  public onMessage?: (text: string, type: 'info' | 'rare' | 'danger') => void;

  private moveInput = { x: 0, y: 0 };
  private isAttackPressed = false;
  private prng: PRNG;

  constructor(seed: string, startFloor = 1, slotId = 'A', resumeData?: import('./storage').SaveSlotData | null) {
    this.activeSlotId = slotId;
    this.settings = Storage.getSettings();
    this.ascension = Storage.getAscension();

    soundManager.applySettings(this.settings);

    if (resumeData && resumeData.hasActiveRun) {
      this.seed = resumeData.seed || `abyss-${Math.floor(Math.random() * 900000 + 100000)}`;
      this.currentFloorNumber = resumeData.floor || 1;
      this.runStartTime = Date.now() - (resumeData.playtimeSeconds || 0) * 1000;
      this.enemiesKilledCount = resumeData.enemiesKilledCount || 0;
      this.abyssRemnantsEarned = resumeData.abyssRemnantsEarned || 0;
      this.prng = new PRNG(this.seed);

      this.initPlayer();
      if (resumeData.playerStats) {
        this.player.stats = { ...resumeData.playerStats };
      }
      if (resumeData.equipment) {
        this.player.equipment = { ...resumeData.equipment };
      }
      if (resumeData.inventory) {
        this.player.inventory = [...resumeData.inventory];
      }
      if (resumeData.potionsCount !== undefined) {
        this.player.potionsCount = resumeData.potionsCount;
      }
      this.recalculatePlayerStats();
      this.loadFloor(this.currentFloorNumber);
    } else {
      this.seed = seed || `abyss-${Math.floor(Math.random() * 900000 + 100000)}`;
      this.currentFloorNumber = startFloor;
      this.prng = new PRNG(this.seed);
      this.initPlayer();
      this.loadFloor(this.currentFloorNumber);
    }
  }

  private initPlayer() {
    const hpBonus = 1 + this.ascension.maxHpLevel * 0.10;
    const atkBonus = 1 + this.ascension.attackLevel * 0.08;
    const visionBonus = this.ascension.visionLevel;
    const cdReduction = Math.min(0.40, this.ascension.cooldownLevel * 0.05);

    const maxHp = Math.round(100 * hpBonus);

    const defaultSkills: Skill[] = [
      {
        id: 'cleave',
        name: 'Golpe em Arco',
        description: 'Um golpe circular largo que atinge múltiplos inimigos na frente.',
        icon: 'slash',
        cooldown: 2.2,
        currentCooldown: 0,
        damageMultiplier: 1.8,
        areaRadius: 1.8,
        soundName: 'cleave',
      },
      {
        id: 'dash',
        name: 'Investida Espectral',
        description: 'Deslocamento rápido que atravessa inimigos e concede invulnerabilidade.',
        icon: 'wind',
        cooldown: 4.0,
        currentCooldown: 0,
        damageMultiplier: 1.2,
        soundName: 'dash',
      },
      {
        id: 'pulse',
        name: 'Pulso do Vazio',
        description: 'O amuleto emite uma onda de choque que repele e danifica em 360°.',
        icon: 'sparkles',
        cooldown: 6.5,
        currentCooldown: 0,
        damageMultiplier: 2.2,
        areaRadius: 3.2,
        soundName: 'pulse',
      },
      {
        id: 'shield',
        name: 'Resguardo do Amuleto',
        description: 'Ergue uma barreira espiritual de absorção de dano e restaura vitalidade.',
        icon: 'shield',
        cooldown: 11.0,
        currentCooldown: 0,
        damageMultiplier: 0,
        soundName: 'shield',
      },
    ];

    const starterWeapon: Item = {
      id: 'weapon-starter',
      name: 'Gládio do Andarilho',
      type: 'weapon',
      rarity: 'common',
      description: 'Uma espada desgastada de ferro e ardósia.',
      icon: 'sword',
      stats: { attack: Math.round(10 * atkBonus), critChance: 0.05 },
      value: 10,
      isNew: false,
    };

    const starterArmor: Item = {
      id: 'armor-starter',
      name: 'Capa Esfarrapada',
      type: 'armor',
      rarity: 'common',
      description: 'Tecido escuro que amortece ventos e golpes fracos.',
      icon: 'shield',
      stats: { defense: 3, maxHp: 10 },
      value: 10,
      isNew: false,
    };

    const inventory: (Item | null)[] = Array(20).fill(null);
    inventory[0] = {
      id: 'pot-init-1',
      name: 'Frasco de Sangue Frio',
      type: 'potion',
      rarity: 'common',
      description: 'Cura 45% da vida máxima do Descendente.',
      icon: 'potion',
      value: 15,
      healAmount: 45,
      stats: {},
      isNew: false,
    };
    inventory[1] = {
      id: 'scroll-init-1',
      name: 'Pergaminho da Revelação Arcana',
      type: 'scroll',
      rarity: 'common',
      description: 'Dissipa instantaneamente toda a névoa do andar e revela salas, escadas e altares.',
      icon: 'scroll',
      scrollEffect: 'reveal_map',
      value: 25,
      stats: {},
      isNew: false,
    };

    this.player = {
      x: 5,
      y: 5,
      vx: 0,
      vy: 0,
      facing: 'right',
      stats: {
        hp: maxHp,
        maxHp: maxHp,
        level: 1,
        xp: 0,
        xpToNextLevel: 50,
        baseAttack: Math.round(12 * atkBonus),
        baseDefense: 3,
        baseSpeed: 3.8,
        critChance: 0.05,
        cooldownReduction: cdReduction,
        visionRadius: 7 + visionBonus,
      },
      equipment: {
        weapon: starterWeapon,
        armor: starterArmor,
        ring1: null,
        ring2: null,
        amulet: null,
      },
      inventory,
      skills: defaultSkills,
      activeBuffs: [],
      isAttacking: false,
      attackTimer: 0,
      attackCombo: 0,
      invulnerableTimer: 0,
      shieldHp: 0,
      maxShieldHp: 0,
      potionsCount: 2,
    };

    this.recalculatePlayerStats();
  }

  public addBuff(buff: import('./types').PlayerBuff) {
    if (!this.player.activeBuffs) this.player.activeBuffs = [];
    const existingIndex = this.player.activeBuffs.findIndex((b) => b.type === buff.type);
    if (existingIndex !== -1) {
      this.player.activeBuffs[existingIndex] = buff;
    } else {
      this.player.activeBuffs.push(buff);
    }
    this.recalculatePlayerStats();
  }

  public recalculatePlayerStats() {
    const eq = this.player.equipment;
    let extraAtk = 0;
    let extraDef = 0;
    let extraHp = 0;
    let extraSpeed = 0;
    let extraCrit = 0;
    let extraCd = 0;

    [eq.weapon, eq.armor, eq.ring1, eq.ring2, eq.amulet].forEach((item) => {
      if (item && item.stats) {
        if (item.stats.attack) extraAtk += item.stats.attack;
        if (item.stats.defense) extraDef += item.stats.defense;
        if (item.stats.maxHp) extraHp += item.stats.maxHp;
        if (item.stats.speed) extraSpeed += item.stats.speed;
        if (item.stats.critChance) extraCrit += item.stats.critChance;
        if (item.stats.cooldownReduction) extraCd += item.stats.cooldownReduction;
      }
    });

    const hpBonus = 1 + this.ascension.maxHpLevel * 0.10;
    const baseMax = Math.round(100 * hpBonus);
    const oldMax = this.player.stats.maxHp;
    this.player.stats.maxHp = baseMax + extraHp;
    // Maintain proportional HP if max increased
    if (this.player.stats.maxHp > oldMax) {
      this.player.stats.hp = Math.min(this.player.stats.maxHp, this.player.stats.hp + (this.player.stats.maxHp - oldMax));
    }

    const atkBonus = 1 + this.ascension.attackLevel * 0.08;
    let baseAtk = Math.round(12 * atkBonus) + extraAtk;
    let baseCrit = 0.05 + extraCrit;
    let speed = 3.8 + extraSpeed;

    // Apply active buffs (Fúria Sanguínea, Vento Noturno)
    if (this.player.activeBuffs && this.player.activeBuffs.length > 0) {
      this.player.activeBuffs.forEach((buff) => {
        if (buff.type === 'fury') {
          baseAtk = Math.round(baseAtk * 1.5);
          baseCrit += 0.25;
        } else if (buff.type === 'speed') {
          speed = Number((speed * 1.4).toFixed(2));
        }
      });
    }

    this.player.stats.baseAttack = baseAtk;
    this.player.stats.baseDefense = 3 + extraDef;
    this.player.stats.baseSpeed = speed;
    this.player.stats.critChance = Math.min(1.0, Number(baseCrit.toFixed(2)));
    this.player.stats.cooldownReduction = Math.min(0.50, Number((this.ascension.cooldownLevel * 0.05 + extraCd).toFixed(2)));
  }

  public loadFloor(floorNum: number) {
    this.currentFloorNumber = floorNum;
    const deathRemnants = Storage.getDeathRemnants();

    const { dungeon, enemies, groundItems } = generateDungeonFloor(
      this.seed,
      floorNum,
      deathRemnants
    );

    this.dungeon = dungeon;
    this.enemies = enemies;
    this.groundItems = groundItems;
    this.projectiles = [];
    this.hazardAreas = [];
    this.particles = [];
    this.floatingTexts = [];

    // Place player at spawn point
    this.player.x = dungeon.playerSpawn.x + 0.5;
    this.player.y = dungeon.playerSpawn.y + 0.5;
    this.player.vx = 0;
    this.player.vy = 0;

    // Recalculate initial vision
    updateFogOfWar(this.dungeon, this.player.x, this.player.y, this.player.stats.visionRadius);

    // Reset floor hunger timers for fresh floor
    this.floorHungerFrozenTimer = 0;
    this.abyssDamageTickTimer = 0;
    this.lastAnnouncedHungerStage = 0;
    this.dungeon.floorTimer = 0;
    this.dungeon.isHungerFrozen = false;

    if (this.onFloorChange) {
      this.onFloorChange(floorNum);
    }

    // Play stair descent sound and music track
    soundManager.playStairDescent();
    if (floorNum % 10 === 0) {
      soundManager.startMusic('boss');
      if (this.onMessage) this.onMessage('Uma presença imensa ergue-se do Abismo...', 'danger');
    } else {
      soundManager.startMusic('explore');
    }

    this.saveCurrentProgress();
  }

  public setMoveInput(x: number, y: number) {
    // Normalize vector to avoid diagonal acceleration
    const len = Math.hypot(x, y);
    if (len > 0.001) {
      this.moveInput.x = x / Math.max(1, len);
      this.moveInput.y = y / Math.max(1, len);
    } else {
      this.moveInput.x = 0;
      this.moveInput.y = 0;
    }
  }

  public setAttackPressed(pressed: boolean) {
    this.isAttackPressed = pressed;
    if (pressed) {
      this.tryPrimaryAttack();
    }
  }

  public tryPrimaryAttack() {
    if (this.isPaused || this.isGameOver || this.player.attackTimer > 0) return;

    this.player.isAttacking = true;
    this.player.attackTimer = 0.28;
    soundManager.playSwing();

    // Determine attack hitbox in front of player
    const reach = 1.35;
    const swingArc = Math.PI * 0.75;
    const centerAngle = this.player.facing === 'right' ? 0 : Math.PI;

    // Aim Assist: if enabled and enemy nearby, snap aim toward closest enemy
    let targetAngle = centerAngle;
    if (this.settings.aimAssist && this.enemies.length > 0) {
      let closestDist = 2.5;
      let closestEnemy: Enemy | null = null;
      for (const e of this.enemies) {
        const d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
        if (d < closestDist) {
          closestDist = d;
          closestEnemy = e;
        }
      }
      if (closestEnemy) {
        targetAngle = Math.atan2(closestEnemy.y - this.player.y, closestEnemy.x - this.player.x);
        this.player.facing = closestEnemy.x >= this.player.x ? 'right' : 'left';
      }
    }

    let hitAny = false;
    this.enemies.forEach((enemy) => {
      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= reach + enemy.width * 0.5) {
        const enemyAngle = Math.atan2(dy, dx);
        let angleDiff = Math.abs(enemyAngle - targetAngle);
        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

        if (angleDiff <= swingArc / 2) {
          hitAny = true;
          const isCrit = Math.random() < this.player.stats.critChance;
          const baseDmg = this.player.stats.baseAttack;
          const finalDmg = Math.max(1, Math.round((baseDmg * (isCrit ? 1.8 : 1.0)) - enemy.defense * 0.5));

          this.damageEnemy(enemy, finalDmg, isCrit);

          // Knockback
          enemy.x += Math.cos(enemyAngle) * 0.35;
          enemy.y += Math.sin(enemyAngle) * 0.35;
        }
      }
    });

    if (hitAny) {
      this.triggerScreenShake(4);
    }
  }

  public triggerSkill(index: number) {
    if (this.isPaused || this.isGameOver) return;
    const skill = this.player.skills[index];
    if (!skill || skill.currentCooldown > 0) return;

    // Put on cooldown
    skill.currentCooldown = Math.max(1.0, skill.cooldown * (1 - this.player.stats.cooldownReduction));

    if (skill.id === 'cleave') {
      soundManager.playSwing();
      this.player.isAttacking = true;
      this.player.attackTimer = 0.35;

      const cleaveRadius = skill.areaRadius || 2.2;
      const centerAngle = this.player.facing === 'right' ? 0 : Math.PI;

      this.enemies.forEach((enemy) => {
        const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
        if (dist <= cleaveRadius) {
          const dmg = Math.round(this.player.stats.baseAttack * skill.damageMultiplier);
          this.damageEnemy(enemy, dmg, true);
        }
      });
      this.triggerScreenShake(7);
    } else if (skill.id === 'dash') {
      soundManager.playDash();
      const dirX = this.moveInput.x !== 0 ? this.moveInput.x : (this.player.facing === 'right' ? 1 : -1);
      const dirY = this.moveInput.y;
      const dashDist = 3.2;

      // Check wall collisions along dash path
      const targetX = this.player.x + dirX * dashDist;
      const targetY = this.player.y + dirY * dashDist;

      if (!this.isTileWall(targetX, targetY)) {
        this.player.x = targetX;
        this.player.y = targetY;
      }

      this.player.invulnerableTimer = 0.45;
      this.createParticles(this.player.x, this.player.y, '#38BDF8', 12);

      // Damage enemies passed through
      this.enemies.forEach((enemy) => {
        const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
        if (dist <= 1.8) {
          const dmg = Math.round(this.player.stats.baseAttack * skill.damageMultiplier);
          this.damageEnemy(enemy, dmg, false);
        }
      });
    } else if (skill.id === 'pulse') {
      soundManager.playVoidPulse();
      const radius = skill.areaRadius || 3.5;
      this.triggerScreenShake(9);

      this.createParticles(this.player.x, this.player.y, '#C084FC', 25);

      this.enemies.forEach((enemy) => {
        const dx = enemy.x - this.player.x;
        const dy = enemy.y - this.player.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= radius) {
          const dmg = Math.round(this.player.stats.baseAttack * skill.damageMultiplier);
          this.damageEnemy(enemy, dmg, true);

          // Push enemies back outward
          const pushAngle = Math.atan2(dy, dx);
          enemy.x += Math.cos(pushAngle) * 1.5;
          enemy.y += Math.sin(pushAngle) * 1.5;
        }
      });
    } else if (skill.id === 'shield') {
      soundManager.playAmuletShield();
      this.player.maxShieldHp = Math.round(this.player.stats.maxHp * 0.35);
      this.player.shieldHp = this.player.maxShieldHp;

      // Heal a portion of HP
      const heal = Math.round(this.player.stats.maxHp * 0.15);
      this.player.stats.hp = Math.min(this.player.stats.maxHp, this.player.stats.hp + heal);
      this.addFloatingText(this.player.x, this.player.y - 0.5, `+${heal} HP`, '#10B981');
      this.createParticles(this.player.x, this.player.y, '#10B981', 10);
    }
  }

  public usePotion(): boolean {
    if (this.isPaused || this.isGameOver) return false;
    if (this.player.potionsCount <= 0) {
      if (this.onMessage) this.onMessage('Nenhum frasco de vida restante!', 'info');
      return false;
    }

    if (this.player.stats.hp >= this.player.stats.maxHp) {
      if (this.onMessage) this.onMessage('Vida já está no máximo.', 'info');
      return false;
    }

    this.player.potionsCount--;
    const heal = Math.round(this.player.stats.maxHp * 0.45);
    this.player.stats.hp = Math.min(this.player.stats.maxHp, this.player.stats.hp + heal);

    soundManager.playAmuletShield();
    this.addFloatingText(this.player.x, this.player.y - 0.5, `+${heal} HP`, '#10B981');
    this.createParticles(this.player.x, this.player.y, '#10B981', 12);
    return true;
  }

  public useFirstScroll(): boolean {
    if (this.isPaused || this.isGameOver) return false;
    const scrollIndex = this.player.inventory.findIndex(
      (item) => item !== null && item.type === 'scroll'
    );
    if (scrollIndex === -1) {
      if (this.onMessage) this.onMessage('Nenhum pergaminho na mochila! (Tecla E)', 'info');
      return false;
    }
    return this.useItem(scrollIndex);
  }

  public useFirstElixir(): boolean {
    if (this.isPaused || this.isGameOver) return false;
    const elixirIndex = this.player.inventory.findIndex(
      (item) => item !== null && item.type === 'elixir'
    );
    if (elixirIndex === -1) {
      if (this.onMessage) this.onMessage('Nenhum elixir na mochila! (Tecla R)', 'info');
      return false;
    }
    return this.useItem(elixirIndex);
  }

  public update(dt: number) {
    if (this.isPaused || this.isGameOver) return;

    // Decay screen shake
    this.cameraShake.x *= 0.85;
    this.cameraShake.y *= 0.85;

    // 0. Update Floor Real-Time Timer & Abyss Hunger
    if (this.floorHungerFrozenTimer > 0) {
      this.floorHungerFrozenTimer -= dt;
      this.dungeon.isHungerFrozen = true;
    } else {
      this.dungeon.isHungerFrozen = false;
      this.dungeon.floorTimer += dt;
    }

    // Hunger Stages:
    // Stage 0: 0 - 60s (Sombra Dormente)
    // Stage 1: 60 - 120s (Agitação das Sombras)
    // Stage 2: 120 - 180s (Despertar da Fome)
    // Stage 3: 180 - 240s (Fissura Crítica)
    // Stage 4: > 240s (Consumido pelo Abismo)
    const fTimer = this.dungeon.floorTimer;
    let newStage = 0;
    if (fTimer >= 240) newStage = 4;
    else if (fTimer >= 180) newStage = 3;
    else if (fTimer >= 120) newStage = 2;
    else if (fTimer >= 60) newStage = 1;
    else newStage = 0;

    this.dungeon.hungerLevel = newStage;

    if (newStage > this.lastAnnouncedHungerStage) {
      this.lastAnnouncedHungerStage = newStage;
      soundManager.playAbyssWarning();
      this.triggerScreenShake(8);
      if (newStage === 1) {
        if (this.onMessage) this.onMessage('A Fome do Abismo se agita... Inimigos estão mais rápidos.', 'info');
      } else if (newStage === 2) {
        if (this.onMessage) this.onMessage('O Abismo desperta! Inimigos causam dano amplificado.', 'rare');
      } else if (newStage === 3) {
        if (this.onMessage) this.onMessage('ALERTA: Fissura Crítica no andar! A Fome está insaciável!', 'danger');
      } else if (newStage === 4) {
        if (this.onMessage) this.onMessage('O ANDAR FOI CONSUMIDO! O vazio devora sua vida — Encontre as escadas!', 'danger');
      }
    }

    // Stage 4 Penalty: void damage tick if staying too long
    if (newStage >= 4) {
      this.abyssDamageTickTimer += dt;
      if (this.abyssDamageTickTimer >= 3.5) {
        this.abyssDamageTickTimer = 0;
        this.damagePlayer(4);
        this.addFloatingText(this.player.x, this.player.y - 0.7, 'Dano do Vazio (-4)', '#9333EA');
        this.triggerScreenShake(5);
      }
    }

    // Update Player Active Buffs
    if (this.player.activeBuffs && this.player.activeBuffs.length > 0) {
      let buffChanged = false;
      this.player.activeBuffs.forEach((b) => {
        b.timer -= dt;
        if (b.timer <= 0) buffChanged = true;
      });
      this.player.activeBuffs = this.player.activeBuffs.filter((b) => b.timer > 0);
      if (buffChanged) {
        this.recalculatePlayerStats();
      }
    }

    // 1. Update Player Movement
    const speed = this.player.stats.baseSpeed;
    const moveX = this.moveInput.x * speed * dt;
    const moveY = this.moveInput.y * speed * dt;

    if (this.moveInput.x !== 0 || this.moveInput.y !== 0) {
      if (this.moveInput.x > 0.05) this.player.facing = 'right';
      else if (this.moveInput.x < -0.05) this.player.facing = 'left';

      // Horizontal move check
      const newX = this.player.x + moveX;
      if (!this.isTileWall(newX, this.player.y)) {
        this.player.x = newX;
      }
      // Vertical move check
      const newY = this.player.y + moveY;
      if (!this.isTileWall(this.player.x, newY)) {
        this.player.y = newY;
      }

      // Footstep sound tick
      if (Math.random() < 0.06) {
        soundManager.playFootstep();
      }
    }

    // Update vision
    updateFogOfWar(this.dungeon, this.player.x, this.player.y, this.player.stats.visionRadius);

    // Timers
    if (this.player.attackTimer > 0) {
      this.player.attackTimer -= dt;
      if (this.player.attackTimer <= 0) {
        this.player.isAttacking = false;
        if (this.isAttackPressed) {
          this.tryPrimaryAttack();
        }
      }
    }

    if (this.player.invulnerableTimer > 0) {
      this.player.invulnerableTimer -= dt;
    }

    // Cooldowns
    this.player.skills.forEach((s) => {
      if (s.currentCooldown > 0) {
        s.currentCooldown = Math.max(0, s.currentCooldown - dt);
      }
    });

    // 2. Update Ground Items & Interaction
    this.groundItems.forEach((gi) => {
      gi.bobTimer += dt;

      const dist = Math.hypot(gi.x - this.player.x, gi.y - this.player.y);

      // If item was dropped/discarded by the player, they must walk away first before it can ever be picked back up
      if (gi.requireWalkAway) {
        if (dist > 1.5) {
          gi.requireWalkAway = false; // Player stepped away, can now be picked up if they return
        }
        return;
      }

      if (gi.pickupDelay && gi.pickupDelay > 0) {
        gi.pickupDelay -= dt;
        return;
      }

      if (dist <= 0.85) {
        // Collect item
        this.collectGroundItem(gi);
      }
    });
    this.groundItems = this.groundItems.filter((gi) => gi.item !== null);

    // 3. Tile Triggers (Stairs, Chests, Fissures)
    const pTileX = Math.floor(this.player.x);
    const pTileY = Math.floor(this.player.y);
    const currentTile = this.dungeon.tiles[pTileY]?.[pTileX];

    if (currentTile === TileType.STAIRS_DOWN) {
      // Descend floor
      this.loadFloor(this.currentFloorNumber + 1);
      return;
    } else if (currentTile === TileType.CHEST_CLOSED) {
      this.openChest(pTileX, pTileY);
    } else if (currentTile === TileType.FISSURE) {
      this.interactFissure(pTileX, pTileY);
    }

    // 4. Update Hazard Areas
    this.hazardAreas.forEach((h) => {
      h.timer += dt;
      if (h.timer >= h.maxTimer && !h.exploded) {
        h.exploded = true;
        // Check if player inside hazard
        const dist = Math.hypot(h.x - this.player.x, h.y - this.player.y);
        if (dist <= h.radius) {
          this.damagePlayer(h.damage);
        }
        this.createParticles(h.x, h.y, h.color, 16);
      }
    });
    this.hazardAreas = this.hazardAreas.filter((h) => !h.exploded);

    // 5. Update Projectiles
    this.projectiles.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.lifetime -= dt;

      // Hit wall check
      if (this.isTileWall(p.x, p.y)) {
        p.lifetime = 0;
        return;
      }

      // Hit player check
      if (p.isHostile) {
        const dist = Math.hypot(p.x - this.player.x, p.y - this.player.y);
        if (dist <= p.radius + 0.35) {
          this.damagePlayer(p.damage);
          p.lifetime = 0;
          this.createParticles(p.x, p.y, p.color, 6);
        }
      }
    });
    this.projectiles = this.projectiles.filter((p) => p.lifetime > 0);

    // 6. Update Enemies AI & Combat
    let combatActive = false;
    this.enemies.forEach((enemy) => {
      const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);

      // Detection
      if (dist < 9.0) {
        combatActive = true;
        enemy.state = 'chase';
        enemy.facing = enemy.x > this.player.x ? 'left' : 'right';

        if (enemy.attackCooldown > 0) {
          enemy.attackCooldown -= dt;
        }

        // Behavior by Type scaled by Abyss Hunger
        const hungerSpeedMult = 1 + (this.dungeon.hungerLevel * 0.12);
        const hungerAtkMult = 1 + (this.dungeon.hungerLevel * 0.18);
        const effectiveSpeed = enemy.speed * hungerSpeedMult;
        const effectiveAttack = Math.round(enemy.attack * hungerAtkMult);

        if (enemy.type === 'archer') {
          // Keep distance (3.5 to 6.0 tiles)
          if (dist < 3.5) {
            // Back away
            const awayAngle = Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x);
            const nx = enemy.x + Math.cos(awayAngle) * effectiveSpeed * dt;
            const ny = enemy.y + Math.sin(awayAngle) * effectiveSpeed * dt;
            if (!this.isTileWall(nx, ny)) {
              enemy.x = nx;
              enemy.y = ny;
            }
          } else if (dist > 5.5) {
            // Approach
            const angle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
            const nx = enemy.x + Math.cos(angle) * effectiveSpeed * dt;
            const ny = enemy.y + Math.sin(angle) * effectiveSpeed * dt;
            if (!this.isTileWall(nx, ny)) {
              enemy.x = nx;
              enemy.y = ny;
            }
          }

          // Shoot arrow if in line of sight and off cooldown
          if (enemy.attackCooldown <= 0 && dist < 7.0) {
            enemy.attackCooldown = enemy.maxAttackCooldown;
            soundManager.playEnemyAlert('archer');
            const angle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
            this.projectiles.push({
              id: `arrow-${Date.now()}-${Math.random()}`,
              x: enemy.x,
              y: enemy.y,
              vx: Math.cos(angle) * 7.5,
              vy: Math.sin(angle) * 7.5,
              radius: 0.15,
              damage: effectiveAttack,
              isHostile: true,
              lifetime: 1.8,
              color: '#F59E0B',
              glowColor: 'rgba(245, 158, 11, 0.4)',
            });
          }
        } else if (enemy.type === 'mage') {
          // Mage drops circular hazard zones under player
          if (enemy.attackCooldown <= 0 && dist < 8.0) {
            enemy.attackCooldown = enemy.maxAttackCooldown;
            soundManager.playEnemyAlert('mage');
            this.hazardAreas.push({
              id: `hazard-${Date.now()}`,
              x: this.player.x,
              y: this.player.y,
              radius: 1.4,
              maxTimer: 1.1,
              timer: 0,
              damage: Math.round(effectiveAttack * 1.5),
              exploded: false,
              color: '#C084FC',
            });
          }
        } else {
          // Melee (Goblin, Orc, Boss)
          const attackRange = enemy.type === 'boss' ? 1.6 : 1.0;
          if (dist > attackRange) {
            const angle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
            const nx = enemy.x + Math.cos(angle) * effectiveSpeed * dt;
            const ny = enemy.y + Math.sin(angle) * effectiveSpeed * dt;
            if (!this.isTileWall(nx, ny)) {
              enemy.x = nx;
              enemy.y = ny;
            }
          } else if (enemy.attackCooldown <= 0) {
            // Melee strike
            enemy.attackCooldown = enemy.maxAttackCooldown;
            this.damagePlayer(effectiveAttack);
            soundManager.playEnemyAlert(enemy.type);
          }
        }
      }
    });

    // Dynamic music switching based on combat proximity
    if (this.currentFloorNumber % 10 !== 0) {
      if (combatActive) {
        soundManager.startMusic('combat');
      } else {
        soundManager.startMusic('explore');
      }
    }

    // 7. Update Particles & Floating Text
    this.particles.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= p.decay * dt;
    });
    this.particles = this.particles.filter((p) => p.alpha > 0);

    this.floatingTexts.forEach((ft) => {
      ft.y += ft.vy * dt;
      ft.lifetime -= dt;
    });
    this.floatingTexts = this.floatingTexts.filter((ft) => ft.lifetime > 0);
  }

  public damageEnemy(enemy: Enemy, damage: number, isCrit = false) {
    enemy.hp -= damage;
    soundManager.playHit(isCrit);

    this.addFloatingText(enemy.x, enemy.y - 0.5, `-${damage}`, isCrit ? '#F59E0B' : '#FFFFFF', isCrit);
    this.createParticles(enemy.x, enemy.y, isCrit ? '#F59E0B' : '#EF4444', isCrit ? 10 : 5);

    if (enemy.hp <= 0) {
      this.killEnemy(enemy);
    }
  }

  private killEnemy(enemy: Enemy) {
    this.enemiesKilledCount++;
    this.addXp(enemy.xpReward);

    // Satiate the floor hunger
    const satiateSec = enemy.isElite ? 8 : 4;
    this.dungeon.floorTimer = Math.max(0, this.dungeon.floorTimer - satiateSec);
    this.addFloatingText(enemy.x, enemy.y - 0.3, `-${satiateSec}s Fome`, '#38BDF8');

    // Chance to drop items
    const dropRoll = Math.random();
    const fortuneBonus = this.ascension.fortuneLevel * 0.08;
    if (dropRoll < 0.25 + fortuneBonus || enemy.isElite) {
      const item = generateItem(this.prng, this.currentFloorNumber, enemy.type === 'boss' ? 'legendary' : undefined);
      this.groundItems.push({
        id: `drop-${Date.now()}-${Math.random()}`,
        item,
        x: enemy.x + (Math.random() - 0.5) * 0.4,
        y: enemy.y + (Math.random() - 0.5) * 0.4,
        bobTimer: Math.random() * 5,
        pickupDelay: 0.6,
      });
      soundManager.playChestOpen(item.rarity !== 'common');
    }

    // Remnants reward
    if (enemy.isElite || enemy.type === 'boss') {
      const remnants = enemy.type === 'boss' ? 25 : 4;
      this.abyssRemnantsEarned += remnants;
      Storage.addAbyssRemnants(remnants);
      this.addFloatingText(enemy.x, enemy.y - 0.8, `+${remnants} Vestígios`, '#C084FC');
    }

    // Remove from enemy list
    this.enemies = this.enemies.filter((e) => e.id !== enemy.id);
  }

  public damagePlayer(damage: number) {
    if (this.player.invulnerableTimer > 0 || this.isGameOver) return;

    soundManager.playPlayerHurt();
    this.triggerScreenShake(7);

    // Defense reduction
    const absorbedDamage = Math.max(1, Math.round(damage - this.player.stats.baseDefense * 0.4));

    // Shield absorption first
    if (this.player.shieldHp > 0) {
      if (this.player.shieldHp >= absorbedDamage) {
        this.player.shieldHp -= absorbedDamage;
        this.addFloatingText(this.player.x, this.player.y - 0.5, `Absorvido (-${absorbedDamage})`, '#A855F7');
        return;
      } else {
        const remaining = absorbedDamage - this.player.shieldHp;
        this.player.shieldHp = 0;
        this.player.stats.hp -= remaining;
        this.addFloatingText(this.player.x, this.player.y - 0.5, `-${remaining}`, '#EF4444');
      }
    } else {
      this.player.stats.hp -= absorbedDamage;
      this.addFloatingText(this.player.x, this.player.y - 0.5, `-${absorbedDamage}`, '#EF4444');
    }

    this.player.invulnerableTimer = 0.35;
    this.createParticles(this.player.x, this.player.y, '#EF4444', 8);

    if (this.player.stats.hp <= 0) {
      this.handlePlayerDeath();
    }
  }

  private handlePlayerDeath() {
    this.isGameOver = true;
    soundManager.startMusic('death');

    // Create persistent Soul Remnant for subsequent descents
    Storage.addDeathRemnant({
      id: `remnant-${Date.now()}`,
      x: this.player.x,
      y: this.player.y,
      floor: this.currentFloorNumber,
      xp: Math.round(this.player.stats.xp * 0.6),
      runSeed: this.seed,
    });

    // Record run in history
    const durationSec = Math.round((Date.now() - this.runStartTime) / 1000);
    Storage.addHistoryEntry({
      id: `run-${Date.now()}`,
      date: new Date().toLocaleDateString('pt-BR'),
      seed: this.seed,
      floorReached: this.currentFloorNumber,
      level: this.player.stats.level,
      enemiesKilled: this.enemiesKilledCount,
      durationSeconds: durationSec,
      causeOfDeath: 'Consumido pela Fome do Abismo',
      remnantsEarned: this.abyssRemnantsEarned,
    });

    // Mark slot as not having an active run
    Storage.saveSlot({
      id: this.activeSlotId,
      lastPlayed: new Date().toISOString(),
      hasActiveRun: false,
      seed: this.seed,
      floor: this.currentFloorNumber,
      playtimeSeconds: durationSec,
      playerStats: null,
      equipment: null,
      inventory: Array(20).fill(null),
    });

    if (this.onPlayerDeath) {
      this.onPlayerDeath();
    }
  }

  public addXp(amount: number) {
    this.player.stats.xp += amount;
    soundManager.playXpPickup();
    this.addFloatingText(this.player.x, this.player.y - 0.5, `+${amount} XP`, '#38BDF8');

    while (this.player.stats.xp >= this.player.stats.xpToNextLevel) {
      this.player.stats.xp -= this.player.stats.xpToNextLevel;
      this.player.stats.level++;
      this.player.stats.xpToNextLevel = Math.round(this.player.stats.xpToNextLevel * 1.45);

      soundManager.playLevelUp();
      this.createParticles(this.player.x, this.player.y, '#F59E0B', 25);
      this.triggerScreenShake(8);

      // Offer 3 Level Up Options
      this.generateLevelUpChoices();
    }
  }

  private generateLevelUpChoices() {
    this.isPaused = true;

    const options: LevelUpOption[] = [
      {
        id: 'vigor',
        title: 'Coração de Basalto',
        category: 'vitality',
        description: '+25 de Vida Máxima e cura instantânea.',
        rarity: 'rare',
        icon: 'heart',
        effect: (p) => {
          p.stats.maxHp += 25;
          p.stats.hp = p.stats.maxHp;
        },
      },
      {
        id: 'strike',
        title: 'Gume Espectral',
        category: 'attack',
        description: '+4 de Ataque e +4% de Chance Crítica.',
        rarity: 'rare',
        icon: 'sword',
        effect: (p) => {
          p.stats.baseAttack += 4;
          p.stats.critChance = Number((p.stats.critChance + 0.04).toFixed(2));
        },
      },
      {
        id: 'ward',
        title: 'Manto da Noite',
        category: 'defense',
        description: '+3 de Defesa e +15 de Barreira de Proteção.',
        rarity: 'common',
        icon: 'shield',
        effect: (p) => {
          p.stats.baseDefense += 3;
          p.shieldHp = Math.min(p.stats.maxHp, p.shieldHp + 15);
        },
      },
      {
        id: 'celerity',
        title: 'Passo Sem Peso',
        category: 'utility',
        description: '+12% de Velocidade de Movimento e +1 Frasco de Vida.',
        rarity: 'common',
        icon: 'wind',
        effect: (p) => {
          p.stats.baseSpeed = Number((p.stats.baseSpeed + 0.45).toFixed(2));
          p.potionsCount++;
        },
      },
      {
        id: 'transcendence',
        title: 'Ressonância do Amuleto',
        category: 'spectral',
        description: '-10% de Recarga em todas as Habilidades.',
        rarity: 'legendary',
        icon: 'sparkles',
        effect: (p) => {
          p.stats.cooldownReduction = Math.min(0.5, p.stats.cooldownReduction + 0.1);
        },
      },
    ];

    // Pick 3 random
    const shuffled = [...options].sort(() => 0.5 - Math.random()).slice(0, 3);
    if (this.onLevelUp) {
      this.onLevelUp(shuffled);
    }
  }

  public applyLevelUpChoice(option: LevelUpOption) {
    option.effect(this.player);
    this.recalculatePlayerStats();
    this.isPaused = false;
    if (this.onMessage) this.onMessage(`Bênção adquirida: ${option.title}`, 'rare');
  }

  private collectGroundItem(gi: GroundItem) {
    // If it's a soul remnant from a previous death
    if (gi.item.icon === 'remnant') {
      soundManager.playLevelUp();
      this.addXp(120);
      Storage.removeDeathRemnant(gi.id);
      gi.item = null as unknown as Item;
      if (this.onMessage) this.onMessage('Você recuperou vestígios da sua alma anterior!', 'rare');
      return;
    }

    if (gi.item.type === 'potion') {
      this.player.potionsCount++;
      soundManager.playChestOpen(false);
      this.addFloatingText(this.player.x, this.player.y - 0.5, '+1 Frasco de Vida', '#10B981');
      gi.item = null as unknown as Item;
      return;
    }

    // Find empty slot in inventory
    const emptyIndex = this.player.inventory.findIndex((slot) => slot === null);
    if (emptyIndex !== -1) {
      gi.item.isNew = true;
      this.player.inventory[emptyIndex] = gi.item;
      soundManager.playChestOpen(gi.item.rarity !== 'common');
      if (this.onMessage) {
        this.onMessage(`Item obtido: ${gi.item.name}`, gi.item.rarity === 'legendary' ? 'rare' : 'info');
      }
      gi.item = null as unknown as Item;
    } else {
      if (this.onMessage) this.onMessage('Inventário cheio! O item permanece no chão.', 'info');
    }
  }

  private openChest(tileX: number, tileY: number) {
    this.dungeon.tiles[tileY][tileX] = TileType.CHEST_OPEN;
    soundManager.playChestOpen(true);
    this.triggerScreenShake(5);
    this.createParticles(tileX + 0.5, tileY + 0.5, '#F59E0B', 20);

    // Spawn 1-2 items around chest with pickupDelay so player sees them
    const item1 = generateItem(this.prng, this.currentFloorNumber, 'rare');
    this.groundItems.push({
      id: `chest-item-${Date.now()}-1`,
      item: item1,
      x: tileX + 0.5,
      y: tileY + 1.2,
      bobTimer: 0,
      pickupDelay: 0.8,
    });

    if (Math.random() > 0.4) {
      const item2 = generateItem(this.prng, this.currentFloorNumber);
      this.groundItems.push({
        id: `chest-item-${Date.now()}-2`,
        item: item2,
        x: tileX + 1.2,
        y: tileY + 0.5,
        bobTimer: 1.5,
        pickupDelay: 0.8,
      });
    }

    if (this.onMessage) this.onMessage('Baú antigo aberto!', 'rare');
  }

  private interactFissure(tileX: number, tileY: number) {
    // Only once per floor
    this.dungeon.tiles[tileY][tileX] = TileType.FLOOR_RITUAL;
    soundManager.playVoidPulse();
    this.triggerScreenShake(8);
    this.createParticles(tileX + 0.5, tileY + 0.5, '#E11D48', 25);

    const bonusRemnants = 6;
    this.abyssRemnantsEarned += bonusRemnants;
    Storage.addAbyssRemnants(bonusRemnants);
    this.dungeon.floorTimer = Math.max(0, this.dungeon.floorTimer - 20);
    this.addFloatingText(tileX + 0.5, tileY - 0.5, `+${bonusRemnants} Vestígios (-20s Fome)`, '#E11D48');
    if (this.onMessage) this.onMessage('A Fissura do Abismo reagiu à sua presença e saciou a Fome temporariamente!', 'danger');
  }

  public useItem(inventoryIndex: number): boolean {
    const item = this.player.inventory[inventoryIndex];
    if (!item) return false;

    if (item.type === 'potion') {
      if (this.player.stats.hp >= this.player.stats.maxHp) {
        if (this.onMessage) this.onMessage('Sua vida já está no máximo!', 'info');
        return false;
      }
      const heal = Math.round(this.player.stats.maxHp * 0.45);
      this.player.stats.hp = Math.min(this.player.stats.maxHp, this.player.stats.hp + heal);
      this.player.inventory[inventoryIndex] = null;
      soundManager.playAmuletShield();
      this.addFloatingText(this.player.x, this.player.y - 0.5, `+${heal} HP`, '#10B981');
      this.createParticles(this.player.x, this.player.y, '#10B981', 14);
      if (this.onMessage) this.onMessage('Frasco de Sangue Frio consumido (+45% HP).', 'info');
      return true;
    }

    if (item.type === 'elixir') {
      soundManager.playElixirDrink();
      this.player.inventory[inventoryIndex] = null;

      if (item.elixirEffect === 'blood_fury') {
        this.addBuff({
          id: `buff-fury-${Date.now()}`,
          name: 'Fúria Sanguínea',
          icon: 'sword',
          timer: item.duration || 15,
          maxTimer: item.duration || 15,
          type: 'fury',
        });
        this.addFloatingText(this.player.x, this.player.y - 0.5, '+50% ATQ / +25% CRIT', '#EF4444');
        this.createParticles(this.player.x, this.player.y, '#EF4444', 20);
        if (this.onMessage) this.onMessage('Fúria Sanguínea ativada! Poder devastador durante 15s.', 'rare');
      } else if (item.elixirEffect === 'night_wind') {
        this.addBuff({
          id: `buff-speed-${Date.now()}`,
          name: 'Vento Noturno',
          icon: 'wind',
          timer: item.duration || 15,
          maxTimer: item.duration || 15,
          type: 'speed',
        });
        this.addFloatingText(this.player.x, this.player.y - 0.5, '+40% VELOCIDADE', '#38BDF8');
        this.createParticles(this.player.x, this.player.y, '#38BDF8', 20);
        if (this.onMessage) this.onMessage('Vento Noturno ativado! Velocidade extrema durante 15s.', 'info');
      }

      this.recalculatePlayerStats();
      return true;
    }

    if (item.type === 'scroll') {
      soundManager.playScrollCast();
      this.player.inventory[inventoryIndex] = null;

      if (item.scrollEffect === 'reveal_map') {
        for (let y = 0; y < this.dungeon.height; y++) {
          for (let x = 0; x < this.dungeon.width; x++) {
            if (this.dungeon.fog[y]?.[x] !== undefined) {
              this.dungeon.fog[y][x] = 2; // FogState.VISIBLE
            }
          }
        }
        this.createParticles(this.player.x, this.player.y, '#38BDF8', 30);
        this.triggerScreenShake(5);
        this.addFloatingText(this.player.x, this.player.y - 0.5, 'Todo o Andar Revelado!', '#38BDF8');
        if (this.onMessage) this.onMessage('A Revelação Arcana expôs todas as salas, tesouros e escadas da masmorra.', 'rare');
      } else if (item.scrollEffect === 'teleport') {
        const stairs = this.dungeon.stairsPos;
        let targetX = -1;
        let targetY = -1;

        // BFS outward from stairs to find a safe, open floor tile
        // (never a wall, void, pillar, chest, fissure, or the stairs tile itself)
        const visited = new Set<string>();
        const queue: Array<{ x: number; y: number; dist: number }> = [
          { x: stairs.x, y: stairs.y, dist: 0 },
        ];
        visited.add(`${stairs.x},${stairs.y}`);

        while (queue.length > 0) {
          const curr = queue.shift()!;
          if (curr.dist > 12) break;

          // Check if curr tile is valid floor and not the stairs
          if (curr.dist >= 1) {
            const tile = this.dungeon.tiles[curr.y]?.[curr.x];
            if (
              tile !== undefined &&
              !this.isTileWall(curr.x, curr.y) &&
              tile !== TileType.STAIRS_DOWN &&
              tile !== TileType.CHEST_CLOSED &&
              tile !== TileType.CHEST_OPEN &&
              tile !== TileType.FISSURE &&
              tile !== TileType.WALL &&
              tile !== TileType.VOID &&
              tile !== TileType.PILLAR
            ) {
              // Ensure at least 2 open neighbor tiles for comfortable movement
              let openNeighbors = 0;
              const nOffsets = [
                { nx: curr.x + 1, ny: curr.y },
                { nx: curr.x - 1, ny: curr.y },
                { nx: curr.x, ny: curr.y + 1 },
                { nx: curr.x, ny: curr.y - 1 },
              ];
              for (const n of nOffsets) {
                if (!this.isTileWall(n.nx, n.ny)) openNeighbors++;
              }

              if (openNeighbors >= 2) {
                targetX = curr.x;
                targetY = curr.y;
                break;
              }
            }
          }

          // Expand to 4 directions
          const dirs = [
            { dx: 0, dy: 1 },
            { dx: 0, dy: -1 },
            { dx: 1, dy: 0 },
            { dx: -1, dy: 0 },
          ];
          for (const d of dirs) {
            const nx = curr.x + d.dx;
            const ny = curr.y + d.dy;
            const key = `${nx},${ny}`;
            if (
              nx >= 0 &&
              nx < this.dungeon.width &&
              ny >= 0 &&
              ny < this.dungeon.height &&
              !visited.has(key)
            ) {
              visited.add(key);
              if (!this.isTileWall(nx, ny)) {
                queue.push({ x: nx, y: ny, dist: curr.dist + 1 });
              }
            }
          }
        }

        // Guaranteed fallback if stairs room was somehow sealed
        if (targetX === -1 || targetY === -1) {
          targetX = this.dungeon.playerSpawn.x;
          targetY = this.dungeon.playerSpawn.y;
        }

        this.player.x = targetX + 0.5;
        this.player.y = targetY + 0.5;
        this.player.vx = 0;
        this.player.vy = 0;
        this.moveInput = { x: 0, y: 0 };
        this.player.isAttacking = false;
        this.player.attackTimer = 0;
        this.isAttackPressed = false;
        this.player.invulnerableTimer = 3.0;

        // Push away any enemies close to the landing spot
        this.enemies.forEach((enemy) => {
          const d = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
          if (d < 3.2) {
            const angle = Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x) || Math.random() * Math.PI * 2;
            for (const dist of [3.5, 3.0, 2.5, 2.0]) {
              const ex = this.player.x + Math.cos(angle) * dist;
              const ey = this.player.y + Math.sin(angle) * dist;
              if (!this.isTileWall(ex, ey)) {
                enemy.x = ex;
                enemy.y = ey;
                break;
              }
            }
          }
        });

        updateFogOfWar(this.dungeon, this.player.x, this.player.y, this.player.stats.visionRadius);
        this.createParticles(this.player.x, this.player.y, '#A855F7', 35);
        this.createParticles(stairs.x + 0.5, stairs.y + 0.5, '#38BDF8', 25);
        this.triggerScreenShake(7);
        this.addFloatingText(this.player.x, this.player.y - 0.5, 'Salto Espectral Realizado!', '#C084FC');
        if (this.onMessage) this.onMessage('Você rompeu as dimensões e surgiu diante das escadas!', 'rare');
      } else if (item.scrollEffect === 'nova_flames') {
        const novaDmg = Math.round(120 + this.currentFloorNumber * 25);
        let countHit = 0;
        this.enemies.forEach((enemy) => {
          const d = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
          if (d <= 9.0) {
            this.damageEnemy(enemy, novaDmg, true);
            countHit++;
          }
        });
        soundManager.playVoidPulse();
        this.triggerScreenShake(14);
        this.createParticles(this.player.x, this.player.y, '#F59E0B', 40);
        this.createParticles(this.player.x, this.player.y, '#EF4444', 30);
        this.addFloatingText(this.player.x, this.player.y - 0.5, `NOVA CÓSMICA (${countHit} Atingidos)`, '#F59E0B', true);
        if (this.onMessage) this.onMessage(`A Nova Cósmica pulverizou os monstros (${novaDmg} de dano)!`, 'danger');
      } else if (item.scrollEffect === 'suppress_hunger') {
        this.dungeon.floorTimer = Math.max(0, this.dungeon.floorTimer - 60);
        this.floorHungerFrozenTimer = 20;
        this.dungeon.isHungerFrozen = true;
        this.addBuff({
          id: `buff-freeze-${Date.now()}`,
          name: 'Calmaria Abissal',
          icon: 'shield',
          timer: 20,
          maxTimer: 20,
          type: 'hunger_freeze',
        });
        this.createParticles(this.player.x, this.player.y, '#06B6D4', 25);
        this.addFloatingText(this.player.x, this.player.y - 0.5, '-60s Fome (Congelada 20s)', '#06B6D4');
        if (this.onMessage) this.onMessage('A Calmaria Abissal retrocedeu o relógio da Fome e congelou o tempo!', 'rare');
      } else if (item.scrollEffect === 'shield_barrier') {
        this.player.shieldHp = Math.min(this.player.stats.maxHp * 2, this.player.shieldHp + 80);
        this.player.maxShieldHp = Math.max(this.player.maxShieldHp, this.player.shieldHp);
        soundManager.playAmuletShield();
        this.createParticles(this.player.x, this.player.y, '#8B5CF6', 25);
        this.addFloatingText(this.player.x, this.player.y - 0.5, '+80 Barreira Espiritual', '#A78BFA');
        if (this.onMessage) this.onMessage('Égide Espiritual ativa! Barreira absorverá 80 de dano.', 'rare');
      } else if (item.scrollEffect === 'transmute') {
        const bonusRem = 15;
        this.abyssRemnantsEarned += bonusRem;
        Storage.addAbyssRemnants(bonusRem);
        const rareLoot = generateItem(this.prng, this.currentFloorNumber, 'legendary');
        this.groundItems.push({
          id: `transmuted-${Date.now()}`,
          item: rareLoot,
          x: this.player.x + 0.8,
          y: this.player.y,
          bobTimer: 0,
        });
        this.createParticles(this.player.x, this.player.y, '#E11D48', 30);
        this.addFloatingText(this.player.x, this.player.y - 0.5, '+15 Vestígios & Tesouro Lendário', '#E11D48');
        if (this.onMessage) this.onMessage(`A Alquimia do Vazio materializou: ${rareLoot.name}!`, 'danger');
      }

      return true;
    }

    return false;
  }

  public equipItem(inventoryIndex: number, targetSlot?: keyof PlayerState['equipment']) {
    const item = this.player.inventory[inventoryIndex];
    if (!item) return;

    if (item.type === 'potion' || item.type === 'scroll' || item.type === 'elixir') {
      this.useItem(inventoryIndex);
      return;
    }

    soundManager.playButtonClick();

    if (item.type === 'weapon') {
      const old = this.player.equipment.weapon;
      this.player.equipment.weapon = item;
      this.player.inventory[inventoryIndex] = old;
    } else if (item.type === 'armor') {
      const old = this.player.equipment.armor;
      this.player.equipment.armor = item;
      this.player.inventory[inventoryIndex] = old;
    } else if (item.type === 'ring') {
      const chosenSlot: 'ring1' | 'ring2' =
        targetSlot === 'ring2'
          ? 'ring2'
          : targetSlot === 'ring1'
          ? 'ring1'
          : !this.player.equipment.ring1
          ? 'ring1'
          : !this.player.equipment.ring2
          ? 'ring2'
          : 'ring1';

      const old = this.player.equipment[chosenSlot];
      this.player.equipment[chosenSlot] = item;
      this.player.inventory[inventoryIndex] = old;
    } else if (item.type === 'amulet') {
      const old = this.player.equipment.amulet;
      this.player.equipment.amulet = item;
      this.player.inventory[inventoryIndex] = old;
    }

    this.recalculatePlayerStats();
  }

  public unequipItem(slot: keyof PlayerState['equipment']) {
    const item = this.player.equipment[slot];
    if (!item) return;

    const emptyIdx = this.player.inventory.findIndex((s) => s === null);
    if (emptyIdx !== -1) {
      this.player.inventory[emptyIdx] = item;
      this.player.equipment[slot] = null;
      soundManager.playButtonClick();
      this.recalculatePlayerStats();
    } else {
      if (this.onMessage) this.onMessage('Inventário cheio para desequipar.', 'info');
    }
  }

  public discardItem(inventoryIndex: number) {
    const item = this.player.inventory[inventoryIndex];
    if (!item) return;
    this.player.inventory[inventoryIndex] = null;

    // Drop onto ground at player location with requireWalkAway
    const dropOffset = this.player.facing === 'right' ? 0.7 : -0.7;
    this.groundItems.push({
      id: `drop-discard-${Date.now()}-${Math.random()}`,
      item,
      x: this.player.x + dropOffset,
      y: this.player.y,
      bobTimer: 0,
      pickupDelay: 0.5,
      requireWalkAway: true,
    });

    soundManager.playButtonClick();
    if (this.onMessage) this.onMessage(`Item largado no chão: ${item.name}`, 'info');
  }

  public discardEquippedItem(slot: keyof PlayerState['equipment']) {
    const item = this.player.equipment[slot];
    if (!item) return;
    this.player.equipment[slot] = null;
    this.recalculatePlayerStats();

    // Drop onto ground at player location with requireWalkAway
    const dropOffset = this.player.facing === 'right' ? 0.7 : -0.7;
    this.groundItems.push({
      id: `drop-discard-${Date.now()}-${Math.random()}`,
      item,
      x: this.player.x + dropOffset,
      y: this.player.y,
      bobTimer: 0,
      pickupDelay: 0.5,
      requireWalkAway: true,
    });

    soundManager.playButtonClick();
    if (this.onMessage) this.onMessage(`Item desequipado e largado no chão: ${item.name}`, 'info');
  }

  public saveCurrentProgress() {
    Storage.saveSlot({
      id: this.activeSlotId,
      lastPlayed: new Date().toISOString(),
      hasActiveRun: !this.isGameOver,
      seed: this.seed,
      floor: this.currentFloorNumber,
      playtimeSeconds: Math.round((Date.now() - this.runStartTime) / 1000),
      playerStats: this.player.stats,
      equipment: this.player.equipment,
      inventory: this.player.inventory,
      potionsCount: this.player.potionsCount,
      enemiesKilledCount: this.enemiesKilledCount,
      abyssRemnantsEarned: this.abyssRemnantsEarned,
    });
  }

  private isTileWall(x: number, y: number): boolean {
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    if (tx < 0 || tx >= this.dungeon.width || ty < 0 || ty >= this.dungeon.height) return true;
    const tile = this.dungeon.tiles[ty]?.[tx];
    return tile === undefined || tile === TileType.VOID || tile === TileType.WALL || tile === TileType.PILLAR;
  }

  private triggerScreenShake(intensity: number) {
    if (!this.settings.screenShake) return;
    this.cameraShake.x = (Math.random() - 0.5) * intensity * 2;
    this.cameraShake.y = (Math.random() - 0.5) * intensity * 2;
  }

  private createParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 2 + Math.random() * 3,
        alpha: 1.0,
        decay: 1.5 + Math.random() * 1.5,
      });
    }
  }

  private addFloatingText(x: number, y: number, text: string, color: string, isCrit = false) {
    this.floatingTexts.push({
      id: `ft-${Date.now()}-${Math.random()}`,
      x,
      y,
      text,
      color,
      lifetime: 1.0,
      maxLifetime: 1.0,
      vy: -1.2,
      size: isCrit ? 18 : 14,
      isCrit,
    });
  }
}
