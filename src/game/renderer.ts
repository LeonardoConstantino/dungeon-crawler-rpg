import { DungeonFloor, Enemy, FloatingText, FogState, GroundItem, HazardArea, Particle, PlayerState, Projectile, TileType } from './types';
import { getItemSprite, rpgInventorySheet } from './itemSprites';

interface AmbientMote {
  x: number;
  y: number;
  size: number;
  speedY: number;
  driftSpeed: number;
  driftAmp: number;
  phase: number;
  baseAlpha: number;
  hue: number;
}

export class GameRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tileSize = 36; // rendered tile size in pixels
  private time = 0;
  private itemSpritesheet: HTMLImageElement | null = null;
  private itemSpritesheetLoaded = false;
  private ambientMotes: AmbientMote[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { willReadFrequently: true, alpha: false });
    if (!context) throw new Error('Could not get 2D context');
    this.ctx = context;

    // Initialize subtle atmospheric motes
    for (let i = 0; i < 26; i++) {
      this.ambientMotes.push({
        x: Math.random() * 1920,
        y: Math.random() * 1080,
        size: 1.2 + Math.random() * 1.8,
        speedY: 10 + Math.random() * 18,
        driftSpeed: 0.7 + Math.random() * 1.1,
        driftAmp: 8 + Math.random() * 14,
        phase: Math.random() * Math.PI * 2,
        baseAlpha: 0.16 + Math.random() * 0.22,
        hue: Math.random() > 0.45 ? 275 : 190, // ethereal void purple and cyan
      });
    }

    this.itemSpritesheet = new Image();
    this.itemSpritesheet.onload = () => {
      this.itemSpritesheetLoaded = true;
    };
    this.itemSpritesheet.onerror = (e) => {
      console.warn('Failed to load item spritesheet in GameRenderer', e);
    };
    this.itemSpritesheet.src = rpgInventorySheet;
    if (this.itemSpritesheet.complete && this.itemSpritesheet.naturalWidth > 0) {
      this.itemSpritesheetLoaded = true;
    }
  }

  public setTileSize(size: number) {
    this.tileSize = size;
  }

  public render(
    dungeon: DungeonFloor,
    player: PlayerState,
    enemies: Enemy[],
    projectiles: Projectile[],
    hazardAreas: HazardArea[],
    groundItems: GroundItem[],
    particles: Particle[],
    floatingTexts: FloatingText[],
    cameraShake: { x: number; y: number },
    reducedFlashes: boolean
  ) {
    this.time += 0.016;
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Clear canvas
    ctx.fillStyle = dungeon.ambientColor;
    ctx.fillRect(0, 0, width, height);

    // Camera centered on player
    const pX = Number.isFinite(player.x) ? player.x : 5;
    const pY = Number.isFinite(player.y) ? player.y : 5;
    const shakeX = Number.isFinite(cameraShake.x) ? cameraShake.x : 0;
    const shakeY = Number.isFinite(cameraShake.y) ? cameraShake.y : 0;
    const camX = Math.round(pX * this.tileSize - width / 2 + shakeX);
    const camY = Math.round(pY * this.tileSize - height / 2 + shakeY);

    ctx.save();
    ctx.translate(-camX, -camY);

    // 1. Render Map Tiles
    this.renderTiles(dungeon, camX, camY, width, height);

    // 2. Render Ground Items & Fissures
    this.renderGroundItems(groundItems, dungeon);

    // 3. Render Hazard Warning Areas
    this.renderHazardAreas(hazardAreas);

    // 4. Render Enemies
    this.renderEnemies(enemies, dungeon);

    // 5. Render Player
    this.renderPlayer(player);

    // 6. Render Projectiles
    this.renderProjectiles(projectiles);

    // 7. Render Particles
    this.renderParticles(particles);

    // 8. Render Fog of War Overlay & Ambient Shadows
    this.renderFogOfWar(dungeon, player, camX, camY, width, height);

    // 9. Render Floating Combat Text
    this.renderFloatingText(floatingTexts);

    ctx.restore();

    // 10. Ambient Ethereal Motes / Void Ash (Screen Space)
    this.renderAmbientMotes(width, height, dungeon);

    // 11. Permanent Dark Fantasy Cinematic Vignette (Screen Space)
    const baseVignette = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.42,
      width / 2, height / 2, Math.max(width, height) * 0.75
    );
    baseVignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    baseVignette.addColorStop(0.68, 'rgba(4, 7, 14, 0.16)');
    baseVignette.addColorStop(1, 'rgba(2, 4, 8, 0.52)');
    ctx.fillStyle = baseVignette;
    ctx.fillRect(0, 0, width, height);

    // 12. Low Health Vignette (Screen Space)
    if (player.stats.hp / player.stats.maxHp < 0.3) {
      const pulse = 0.35 + Math.sin(this.time * 6) * 0.15;
      const grad = ctx.createRadialGradient(
        width / 2, height / 2, width * 0.3,
        width / 2, height / 2, width * 0.7
      );
      grad.addColorStop(0, 'rgba(180, 20, 30, 0)');
      grad.addColorStop(1, `rgba(180, 20, 30, ${pulse})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    // 13. Abyss Hunger Atmospheric Vignette (Screen Space)
    if (dungeon.hungerLevel >= 1) {
      const hunger = dungeon.hungerLevel;
      const pulseSpeed = hunger >= 3 ? 4 : 2;
      const pulseIntensity = 0.06 + Math.sin(this.time * pulseSpeed) * 0.04;
      
      const grad = ctx.createRadialGradient(
        width / 2, height / 2, width * 0.35,
        width / 2, height / 2, width * 0.78
      );

      if (hunger === 1) {
        grad.addColorStop(0, 'rgba(10, 14, 25, 0)');
        grad.addColorStop(1, `rgba(5, 7, 15, ${0.25 + pulseIntensity})`);
      } else if (hunger === 2) {
        grad.addColorStop(0, 'rgba(80, 15, 30, 0)');
        grad.addColorStop(1, `rgba(120, 20, 45, ${0.35 + pulseIntensity})`);
      } else if (hunger === 3) {
        grad.addColorStop(0, 'rgba(140, 15, 35, 0)');
        grad.addColorStop(1, `rgba(180, 20, 50, ${0.45 + pulseIntensity * 1.5})`);
      } else {
        const flash = 0.5 + Math.sin(this.time * 6) * 0.18;
        grad.addColorStop(0, 'rgba(120, 10, 40, 0.08)');
        grad.addColorStop(1, `rgba(220, 20, 60, ${flash})`);
      }

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
  }

  private renderAmbientMotes(width: number, height: number, dungeon: DungeonFloor) {
    const ctx = this.ctx;
    const isAnomalous = dungeon.hungerLevel >= 2;

    for (let i = 0; i < this.ambientMotes.length; i++) {
      const mote = this.ambientMotes[i];
      mote.y -= mote.speedY * 0.016;
      if (mote.y < -15) {
        mote.y = height + 15;
        mote.x = Math.random() * width;
      }
      if (mote.x > width + 25) mote.x = -10;
      if (mote.x < -25) mote.x = width + 10;

      const driftX = mote.x + Math.sin(this.time * mote.driftSpeed + mote.phase) * mote.driftAmp;
      const alphaPulse = mote.baseAlpha * (0.7 + 0.3 * Math.sin(this.time * 2.5 + mote.phase));

      const hue = isAnomalous ? (i % 2 === 0 ? 285 : 345) : mote.hue;
      ctx.fillStyle = `hsla(${hue}, 80%, 70%, ${alphaPulse})`;
      ctx.beginPath();
      ctx.arc(driftX, mote.y, mote.size, 0, Math.PI * 2);
      ctx.fill();

      // Soft glow aura on slightly larger motes
      if (mote.size > 2.0) {
        ctx.fillStyle = `hsla(${hue}, 85%, 75%, ${alphaPulse * 0.3})`;
        ctx.beginPath();
        ctx.arc(driftX, mote.y, mote.size * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private renderTiles(
    dungeon: DungeonFloor,
    camX: number,
    camY: number,
    screenWidth: number,
    screenHeight: number
  ) {
    const ctx = this.ctx;
    const ts = this.tileSize;
    const { tiles, fog, width, height } = dungeon;

    const startX = Math.max(0, Math.floor(camX / ts) - 1);
    const endX = Math.min(width, Math.ceil((camX + screenWidth) / ts) + 1);
    const startY = Math.max(0, Math.floor(camY / ts) - 1);
    const endY = Math.min(height, Math.ceil((camY + screenHeight) / ts) + 1);

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const fogState = fog[y]?.[x];
        if (fogState === FogState.UNEXPLORED) continue;

        const tile = tiles[y][x];
        if (tile === TileType.VOID) continue;

        const px = x * ts;
        const py = y * ts;
        const dim = fogState === FogState.EXPLORED_HIDDEN ? 0.38 : 1;

        ctx.save();
        if (dim < 1) ctx.globalAlpha = dim;

        if (tile >= TileType.FLOOR_PLAIN && tile < TileType.WALL) {
          this._drawFloorTile(ctx, tile, px, py, ts, x, y);
        } else if (tile === TileType.WALL) {
          this._drawWall(ctx, px, py, ts, tiles, x, y, width, height);
        } else if (tile === TileType.WALL_CORNER) {
          this._drawWallCorner(ctx, px, py, ts);
        } else if (tile === TileType.PILLAR) {
          this._drawPillar(ctx, px, py, ts);
        } else if (tile === TileType.DOOR) {
          this._drawDoor(ctx, px, py, ts);
        } else if (tile === TileType.STAIRS_DOWN) {
          this._drawStairs(ctx, px, py, ts);
        } else if (tile === TileType.CHEST_CLOSED) {
          this._drawChest(ctx, px, py, ts, false);
        } else if (tile === TileType.CHEST_OPEN) {
          this._drawChest(ctx, px, py, ts, true);
        } else if (tile === TileType.ALTAR) {
          this._drawAltar(ctx, px, py, ts);
        } else if (tile === TileType.FISSURE) {
          this._drawFissure(ctx, px, py, ts);
        }

        ctx.restore();
      }
    }
  }

  // ─── tile helpers ────────────────────────────────────────────────

  private _drawFloorTile(
    ctx: CanvasRenderingContext2D,
    tile: TileType,
    px: number,
    py: number,
    ts: number,
    x: number,
    y: number
  ) {
    if (tile === TileType.FLOOR_PLAIN) {
      // Tabuleiro de pedra com variação sutil de tom
      ctx.fillStyle = (x + y) % 2 === 0 ? '#181E26' : '#141A22';
      ctx.fillRect(px, py, ts, ts);

      // Juntas de pedra com espessura variável
      ctx.strokeStyle = '#0F1319';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);

      // Detalhe de desgaste: pequeno chip aleatório por posição
      const seed = (x * 7 + y * 13) % 5;
      if (seed === 0) {
        ctx.fillStyle = '#0F1319';
        ctx.fillRect(px + 3, py + 3, 3, 2);
      } else if (seed === 2) {
        ctx.fillStyle = '#0F1319';
        ctx.fillRect(px + ts - 6, py + ts - 4, 4, 2);
      }

      // Veio diagonal suave em algumas pedras
      if ((x * 3 + y * 5) % 7 === 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.025)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px + 2, py + ts * 0.3);
        ctx.lineTo(px + ts * 0.6, py + 2);
        ctx.stroke();
      }

    } else if (tile === TileType.FLOOR_CRACKED) {
      ctx.fillStyle = '#171B23';
      ctx.fillRect(px, py, ts, ts);

      // Juntas
      ctx.strokeStyle = '#0F1218';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);

      // Fissura principal em zigue-zague
      ctx.strokeStyle = '#7A1C28';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(px + 3, py + 2);
      ctx.lineTo(px + ts * 0.38, py + ts * 0.32);
      ctx.lineTo(px + ts * 0.5, py + ts * 0.58);
      ctx.lineTo(px + ts - 3, py + ts - 2);
      ctx.stroke();

      // Fissura secundária menor
      ctx.strokeStyle = '#5A1218';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(px + ts * 0.38, py + ts * 0.32);
      ctx.lineTo(px + ts * 0.22, py + ts * 0.62);
      ctx.stroke();

      // Brilho interno da fissura (energia da fenda)
      ctx.strokeStyle = 'rgba(180, 30, 50, 0.25)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px + 3, py + 2);
      ctx.lineTo(px + ts * 0.5, py + ts * 0.58);
      ctx.lineTo(px + ts - 3, py + ts - 2);
      ctx.stroke();

    } else if (tile === TileType.FLOOR_MOSSY) {
      ctx.fillStyle = '#141C1E';
      ctx.fillRect(px, py, ts, ts);

      // Juntas levemente esverdeadas
      ctx.strokeStyle = '#0E1614';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);

      // Manchas de musgo irregulares (3 patches por tile baseado em seed)
      const mossPositions = [
        { dx: 3, dy: 4, w: 9, h: 7 },
        { dx: ts - 13, dy: ts - 10, w: 7, h: 6 },
        { dx: ts * 0.35, dy: ts * 0.4, w: 5, h: 4 },
      ];
      mossPositions.forEach(({ dx, dy, w, h }) => {
        ctx.fillStyle = 'rgba(28, 48, 30, 0.85)';
        ctx.beginPath();
        ctx.ellipse(px + dx + w / 2, py + dy + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      // Gotas de umidade
      ctx.fillStyle = 'rgba(40, 80, 60, 0.4)';
      ctx.beginPath();
      ctx.arc(px + 8, py + ts - 6, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px + ts - 7, py + 9, 1, 0, Math.PI * 2);
      ctx.fill();

    } else if (tile === TileType.FLOOR_RITUAL) {
      ctx.fillStyle = '#16101F';
      ctx.fillRect(px, py, ts, ts);

      // Base escura com granulação sutil
      ctx.fillStyle = 'rgba(80, 20, 120, 0.08)';
      ctx.fillRect(px, py, ts, ts);

      // Círculo arcano externo
      ctx.strokeStyle = 'rgba(109, 40, 217, 0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(px + ts / 2, py + ts / 2, ts * 0.42, 0, Math.PI * 2);
      ctx.stroke();

      // Círculo interno
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.35)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(px + ts / 2, py + ts / 2, ts * 0.26, 0, Math.PI * 2);
      ctx.stroke();

      // 4 runas nos quadrantes (pequenos traços)
      const runeAngle = Math.PI / 4;
      for (let i = 0; i < 4; i++) {
        const angle = runeAngle + i * (Math.PI / 2);
        const rx = px + ts / 2 + Math.cos(angle) * ts * 0.34;
        const ry = py + ts / 2 + Math.sin(angle) * ts * 0.34;
        ctx.fillStyle = 'rgba(167, 139, 250, 0.5)';
        ctx.beginPath();
        ctx.arc(rx, ry, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Triângulo central sutil
      ctx.strokeStyle = 'rgba(109, 40, 217, 0.3)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(px + ts / 2, py + ts / 2 - ts * 0.22);
      ctx.lineTo(px + ts / 2 + ts * 0.19, py + ts / 2 + ts * 0.11);
      ctx.lineTo(px + ts / 2 - ts * 0.19, py + ts / 2 + ts * 0.11);
      ctx.closePath();
      ctx.stroke();
    }
  }

  private _drawWall(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    ts: number,
    tiles: TileType[][],
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    // Detecta se tem chão abaixo (parede frontal vs parede de topo)
    const hasFrontFace = y + 1 < height && tiles[y + 1]?.[x] !== TileType.WALL
      && tiles[y + 1]?.[x] !== TileType.VOID;

    // Corpo principal da parede
    ctx.fillStyle = '#1E2530';
    ctx.fillRect(px, py, ts, ts);

    if (hasFrontFace) {
      // Parede com face visível: gradiente simulado com camadas
      // Face frontal iluminada (bloco de pedra tridimensional)
      ctx.fillStyle = '#28303E';
      ctx.fillRect(px, py, ts, ts - 5);

      // Face inferior em sombra profunda (profundidade)
      ctx.fillStyle = '#0E1118';
      ctx.fillRect(px, py + ts - 6, ts, 6);

      // Chanfro no topo (borda iluminada)
      ctx.fillStyle = '#3A4455';
      ctx.fillRect(px, py, ts, 3);

      // Divisão de blocos de tijolo
      const brickH = ts / 2;
      const offsetX = ((y % 2) * (ts / 2)) % ts;

      for (let row = 0; row < 2; row++) {
        const by = py + row * brickH;
        const bx = px + (row % 2 === 0 ? offsetX : offsetX + ts / 2) % ts;

        ctx.strokeStyle = '#141820';
        ctx.lineWidth = 1;

        // Linha horizontal entre blocos
        if (row > 0) {
          ctx.beginPath();
          ctx.moveTo(px, by);
          ctx.lineTo(px + ts, by);
          ctx.stroke();
        }

        // Linha vertical do bloco (offset alternado)
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx, by + brickH);
        ctx.stroke();
      }

      // Detalhe: pequenas irregularidades na pedra
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(px + 4, py + 5, 5, 3);
      ctx.fillRect(px + ts - 9, py + brickH + 4, 4, 2);

    } else {
      // Parede de topo (vista de cima): mais escura, sem face frontal
      ctx.fillStyle = '#191F2A';
      ctx.fillRect(px, py, ts, ts);

      // Topo da parede: borda mais clara
      ctx.fillStyle = '#2A3345';
      ctx.fillRect(px, py, ts, 3);

      // Divisão horizontal sutil
      ctx.strokeStyle = '#141820';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(px, py + ts / 2);
      ctx.lineTo(px + ts, py + ts / 2);
      ctx.stroke();

      // Divisão vertical alternada
      const vx = px + ((y % 2 === 0) ? ts * 0.5 : ts * 0.25);
      ctx.beginPath();
      ctx.moveTo(vx, py);
      ctx.lineTo(vx, py + ts);
      ctx.stroke();
    }

    // Borda geral da célula
    ctx.strokeStyle = '#111520';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);
  }

  private _drawWallCorner(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number) {
    // Base igual à parede
    ctx.fillStyle = '#1E2530';
    ctx.fillRect(px, py, ts, ts);

    // Borda superior iluminada
    ctx.fillStyle = '#3A4455';
    ctx.fillRect(px, py, ts, 3);
    ctx.fillStyle = '#3A4455';
    ctx.fillRect(px, py, 3, ts);

    // Sombra inferior e direita
    ctx.fillStyle = '#0E1118';
    ctx.fillRect(px, py + ts - 4, ts, 4);
    ctx.fillRect(px + ts - 4, py, 4, ts);

    // Pedra central de canto (quadrado de pedra aparelhada)
    ctx.fillStyle = '#252E3C';
    ctx.fillRect(px + 4, py + 4, ts - 8, ts - 8);

    ctx.strokeStyle = '#111520';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);
  }

  private _drawPillar(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number) {
    // Fundo de pedra
    ctx.fillStyle = '#141A22';
    ctx.fillRect(px, py, ts, ts);

    // Sombra ao redor do pilar
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.arc(px + ts / 2 + 3, py + ts / 2 + 4, ts * 0.42, 0, Math.PI * 2);
    ctx.fill();

    // Corpo do pilar (círculo de pedra maciça)
    ctx.fillStyle = '#2E3848';
    ctx.beginPath();
    ctx.arc(px + ts / 2, py + ts / 2, ts * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Face iluminada do pilar (esquerda-superior)
    ctx.fillStyle = '#3D4B5E';
    ctx.beginPath();
    ctx.arc(px + ts / 2, py + ts / 2, ts * 0.4, Math.PI * 1.1, Math.PI * 1.9);
    ctx.lineTo(px + ts / 2, py + ts / 2);
    ctx.closePath();
    ctx.fill();

    // Anel decorativo externo
    ctx.strokeStyle = '#4B5A70';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px + ts / 2, py + ts / 2, ts * 0.38, 0, Math.PI * 2);
    ctx.stroke();

    // Capitel: disco no topo do pilar
    ctx.fillStyle = '#3A4555';
    ctx.fillRect(px + ts * 0.18, py + ts * 0.1, ts * 0.64, ts * 0.1);
    ctx.fillRect(px + ts * 0.22, py + ts * 0.08, ts * 0.56, ts * 0.04);

    // Base do pilar
    ctx.fillStyle = '#2A3444';
    ctx.fillRect(px + ts * 0.18, py + ts * 0.8, ts * 0.64, ts * 0.1);

    // Núcleo desgastado
    ctx.fillStyle = '#232E3C';
    ctx.beginPath();
    ctx.arc(px + ts / 2, py + ts / 2, ts * 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Rachadura vertical
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + ts / 2 + 3, py + ts * 0.22);
    ctx.lineTo(px + ts / 2 + 1, py + ts * 0.75);
    ctx.stroke();
  }

  private _drawDoor(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number) {
    // Moldura de pedra
    ctx.fillStyle = '#1E2530';
    ctx.fillRect(px, py, ts, ts);

    // Batentes laterais
    ctx.fillStyle = '#2A3344';
    ctx.fillRect(px + 2, py, 5, ts);
    ctx.fillRect(px + ts - 7, py, 5, ts);

    // Verga (topo)
    ctx.fillStyle = '#2E3A4C';
    ctx.fillRect(px + 2, py + 2, ts - 4, 6);

    // Portão de madeira escura com reforço metálico
    ctx.fillStyle = '#2A1E14';
    ctx.fillRect(px + 7, py + 8, ts - 14, ts - 14);

    // Tábuas verticais
    ctx.strokeStyle = '#1E1410';
    ctx.lineWidth = 1;
    const plankW = (ts - 14) / 3;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(px + 7 + plankW * i, py + 8);
      ctx.lineTo(px + 7 + plankW * i, py + ts - 6);
      ctx.stroke();
    }

    // Reforços metálicos horizontais
    ctx.fillStyle = '#3A3030';
    ctx.fillRect(px + 7, py + ts * 0.35, ts - 14, 3);
    ctx.fillRect(px + 7, py + ts * 0.6, ts - 14, 3);

    // Dobradiças
    ctx.fillStyle = '#4A4040';
    ctx.fillRect(px + 5, py + ts * 0.28, 5, 4);
    ctx.fillRect(px + 5, py + ts * 0.62, 5, 4);
    ctx.fillRect(px + ts - 10, py + ts * 0.28, 5, 4);
    ctx.fillRect(px + ts - 10, py + ts * 0.62, 5, 4);

    // Maçaneta
    ctx.fillStyle = '#8a6030';
    ctx.beginPath();
    ctx.arc(px + ts / 2, py + ts / 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  private _drawStairs(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number) {
    // Fundo abissal
    ctx.fillStyle = '#0C0F16';
    ctx.fillRect(px, py, ts, ts);

    // 4 degraus em perspectiva isométrica simples
    const stepCount = 4;
    const stepH = ts / stepCount;
    for (let step = 0; step < stepCount; step++) {
      const shade = step % 2 === 0 ? '#18222E' : '#202C3A';
      ctx.fillStyle = shade;
      ctx.fillRect(px + 2, py + step * stepH, ts - 4, stepH - 1);

      // Aresta de cada degrau (profundidade)
      ctx.fillStyle = step % 2 === 0 ? '#101822' : '#141E28';
      ctx.fillRect(px + 2, py + step * stepH + stepH - 2, ts - 4, 2);

      // Borda iluminada do degrau
      ctx.fillStyle = 'rgba(80, 110, 160, 0.18)';
      ctx.fillRect(px + 2, py + step * stepH, ts - 4, 1);
    }

    // Abertura central escura (o vão da descida)
    ctx.fillStyle = '#08090E';
    ctx.beginPath();
    ctx.ellipse(px + ts / 2, py + ts * 0.62, ts * 0.22, ts * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Glifo espectral pulsante
    const glyphPulse = 0.5 + Math.sin(this.time * 3) * 0.4;
    const glyphFade = 0.3 + Math.sin(this.time * 3) * 0.25;

    // Quadrado externo do glifo
    ctx.strokeStyle = `rgba(56, 189, 248, ${glyphPulse})`;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px + ts * 0.28, py + ts * 0.24, ts * 0.44, ts * 0.44);

    // Cruz interna
    ctx.strokeStyle = `rgba(56, 189, 248, ${glyphFade})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + ts / 2, py + ts * 0.24);
    ctx.lineTo(px + ts / 2, py + ts * 0.68);
    ctx.moveTo(px + ts * 0.28, py + ts / 2);
    ctx.lineTo(px + ts * 0.72, py + ts / 2);
    ctx.stroke();

    // 4 pontos nos cantos do glifo
    [[0.28, 0.24], [0.72, 0.24], [0.28, 0.68], [0.72, 0.68]].forEach(([fx, fy]) => {
      ctx.fillStyle = `rgba(56, 189, 248, ${glyphPulse})`;
      ctx.beginPath();
      ctx.arc(px + ts * fx, py + ts * fy, 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private _drawChest(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    ts: number,
    open: boolean
  ) {
    // Fundo de pedra
    ctx.fillStyle = '#141A22';
    ctx.fillRect(px, py, ts, ts);

    // Sombra do baú no chão
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(px + 4, py + ts - 8, ts - 8, 6);

    if (!open) {
      // Tampa do baú (arqueada)
      ctx.fillStyle = '#4A2E18';
      ctx.beginPath();
      ctx.roundRect(px + 5, py + 6, ts - 10, ts * 0.38, [3, 3, 0, 0]);
      ctx.fill();

      // Dobradiças na tampa
      ctx.fillStyle = '#7A5C30';
      ctx.fillRect(px + 7, py + 7, 4, 3);
      ctx.fillRect(px + ts - 11, py + 7, 4, 3);

      // Corpo do baú
      ctx.fillStyle = '#3C2410';
      ctx.fillRect(px + 5, py + ts * 0.38 + 4, ts - 10, ts * 0.38);

      // Faixa de latão central
      ctx.fillStyle = '#C48A20';
      ctx.fillRect(px + 5, py + ts * 0.42, ts - 10, 3);

      // Fechadura
      ctx.fillStyle = '#D4A030';
      ctx.fillRect(px + ts / 2 - 3, py + ts * 0.38 - 1, 6, 7);
      ctx.fillStyle = '#8A6010';
      ctx.beginPath();
      ctx.arc(px + ts / 2, py + ts * 0.44, 2, 0, Math.PI * 2);
      ctx.fill();

      // Pregões decorativos nas quinas do corpo
      const nailPos = [
        [px + 8, py + ts * 0.5],
        [px + ts - 8, py + ts * 0.5],
      ] as const;
      nailPos.forEach(([nx, ny]) => {
        ctx.fillStyle = '#B08020';
        ctx.beginPath();
        ctx.arc(nx, ny, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Reflexo metálico na tampa
      ctx.fillStyle = 'rgba(255, 200, 80, 0.12)';
      ctx.fillRect(px + 7, py + 8, ts - 14, 3);

    } else {
      // Baú aberto: tampa reclinada para trás
      ctx.fillStyle = '#2E1A0C';
      ctx.fillRect(px + 5, py + 4, ts - 10, ts * 0.18);

      // Interior do baú (escuro com brilho de tesouro vazio)
      ctx.fillStyle = '#1E1008';
      ctx.fillRect(px + 5, py + ts * 0.22, ts - 10, ts * 0.48);

      // Forro interior desgastado
      ctx.fillStyle = 'rgba(80, 40, 10, 0.5)';
      ctx.fillRect(px + 7, py + ts * 0.24, ts - 14, ts * 0.44);

      // Sombra interna mais profunda
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(px + 7, py + ts * 0.42, ts - 14, ts * 0.26);

      // Faixa frontal (corpo inferior)
      ctx.fillStyle = '#3C2410';
      ctx.fillRect(px + 5, py + ts * 0.7, ts - 10, ts * 0.1);
      ctx.fillStyle = '#7A5018';
      ctx.fillRect(px + 5, py + ts * 0.7, ts - 10, 2);
    }
  }

  private _drawAltar(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number) {
    // Fundo de pedra ritual
    ctx.fillStyle = '#130E1C';
    ctx.fillRect(px, py, ts, ts);

    // Sombra da base
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(px + 3, py + ts - 7, ts - 6, 5);

    // Base do altar (bloco de pedra maciça)
    ctx.fillStyle = '#241830';
    ctx.fillRect(px + 4, py + ts * 0.45, ts - 8, ts * 0.44);

    // Frente da base (sombra inferior)
    ctx.fillStyle = '#160F20';
    ctx.fillRect(px + 4, py + ts * 0.76, ts - 8, ts * 0.13);

    // Topo iluminado da base
    ctx.fillStyle = '#302048';
    ctx.fillRect(px + 4, py + ts * 0.45, ts - 8, 3);

    // Topo do altar (superfície de oferenda)
    ctx.fillStyle = '#2A1A3C';
    ctx.fillRect(px + 2, py + ts * 0.32, ts - 4, ts * 0.16);

    // Borda do topo
    ctx.fillStyle = '#3E2A58';
    ctx.fillRect(px + 2, py + ts * 0.32, ts - 4, 2);
    ctx.fillStyle = '#1A0F28';
    ctx.fillRect(px + 2, py + ts * 0.46, ts - 4, 2);

    // Runas gravadas na frente da base
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 8, py + ts * 0.58);
    ctx.lineTo(px + 10, py + ts * 0.52);
    ctx.lineTo(px + 12, py + ts * 0.58);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px + ts - 12, py + ts * 0.55);
    ctx.lineTo(px + ts - 10, py + ts * 0.62);
    ctx.lineTo(px + ts - 8, py + ts * 0.55);
    ctx.stroke();

    // Chama arcana pulsante no topo
    const flamePulse = 0.55 + Math.sin(this.time * 4.5) * 0.35;
    const flameFlicker = 0.3 + Math.sin(this.time * 11.3) * 0.2;

    // Halo da chama (anel externo)
    ctx.strokeStyle = `rgba(109, 40, 217, ${flamePulse * 0.4})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(px + ts / 2, py + ts * 0.38, ts * 0.18, 0, Math.PI * 2);
    ctx.stroke();

    // Chama externa (violeta)
    ctx.fillStyle = `rgba(109, 40, 217, ${flamePulse * 0.6})`;
    ctx.beginPath();
    ctx.ellipse(px + ts / 2, py + ts * 0.36, ts * 0.1, ts * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chama interna (lavanda)
    ctx.fillStyle = `rgba(196, 160, 252, ${flamePulse * 0.8})`;
    ctx.beginPath();
    ctx.ellipse(px + ts / 2, py + ts * 0.35, ts * 0.055, ts * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();

    // Núcleo branco pulsante
    ctx.fillStyle = `rgba(240, 220, 255, ${flameFlicker + 0.5})`;
    ctx.beginPath();
    ctx.arc(px + ts / 2, py + ts * 0.34, ts * 0.025, 0, Math.PI * 2);
    ctx.fill();
  }

  private _drawFissure(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number) {
    // Fundo: pedra consumida pelo abismo
    ctx.fillStyle = '#0E0810';
    ctx.fillRect(px, py, ts, ts);

    // Rachadura irradiando a partir do centro (8 linhas)
    ctx.strokeStyle = 'rgba(120, 10, 30, 0.5)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const len = ts * (0.28 + ((i * 3) % 5) * 0.06);
      ctx.beginPath();
      ctx.moveTo(px + ts / 2, py + ts / 2);
      ctx.lineTo(
        px + ts / 2 + Math.cos(angle) * len,
        py + ts / 2 + Math.sin(angle) * len
      );
      ctx.stroke();
    }

    const fPulse = 0.65 + Math.sin(this.time * 4) * 0.3;
    const fPulse2 = 0.5 + Math.sin(this.time * 4 + Math.PI) * 0.3;

    // Abertura externa da fissura (oval inclinado)
    ctx.fillStyle = `rgba(100, 10, 25, ${fPulse * 0.55})`;
    ctx.beginPath();
    ctx.ellipse(px + ts / 2, py + ts / 2, ts * 0.42, ts * 0.22, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // Camada intermediária
    ctx.fillStyle = `rgba(160, 20, 45, ${fPulse * 0.65})`;
    ctx.beginPath();
    ctx.ellipse(px + ts / 2, py + ts / 2, ts * 0.28, ts * 0.14, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // Núcleo incandescente
    ctx.fillStyle = `rgba(225, 29, 72, ${fPulse})`;
    ctx.beginPath();
    ctx.ellipse(px + ts / 2, py + ts / 2, ts * 0.16, ts * 0.08, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // Centro branco-vermelho (o mais quente)
    ctx.fillStyle = `rgba(255, 100, 120, ${fPulse2})`;
    ctx.beginPath();
    ctx.ellipse(px + ts / 2, py + ts / 2, ts * 0.07, ts * 0.04, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // Partículas fixas ao redor (pontos de energia)
    const sparks = [
      [0.22, 0.3], [0.78, 0.7], [0.3, 0.72], [0.7, 0.28],
      [0.15, 0.5], [0.85, 0.5],
    ];
    sparks.forEach(([fx, fy], i) => {
      const sp = 0.4 + Math.sin(this.time * 5 + i * 1.3) * 0.35;
      ctx.fillStyle = `rgba(225, 29, 72, ${sp})`;
      ctx.beginPath();
      ctx.arc(px + ts * fx, py + ts * fy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private renderGroundItems(items: GroundItem[], dungeon: DungeonFloor) {
    const ctx = this.ctx;
    const ts = this.tileSize;

    const isSpritesheetReady = Boolean(
      this.itemSpritesheet &&
        (this.itemSpritesheetLoaded || (this.itemSpritesheet.complete && this.itemSpritesheet.naturalWidth > 0))
    );

    items.forEach((gi) => {
      if (!gi.item) return;

      const tileX = Math.floor(gi.x);
      const tileY = Math.floor(gi.y);
      const fogState = dungeon.fog[tileY]?.[tileX];

      // Hide only if completely unexplored tile
      if (fogState === FogState.UNEXPLORED || fogState === undefined) return;
      const isPartiallyHidden = fogState === FogState.EXPLORED_HIDDEN;

      const px = gi.x * ts;
      const bobOffset = Math.sin(this.time * 3.5 + gi.bobTimer) * 4;
      const py = gi.y * ts + bobOffset;

      // Glow halo and glow colors based on rarity
      let color = '#94A3B8';
      let shadowColor = 'rgba(148, 163, 184, 0.45)';
      if (gi.item.rarity === 'rare') {
        color = '#38BDF8';
        shadowColor = 'rgba(56, 189, 248, 0.75)';
      } else if (gi.item.rarity === 'legendary') {
        color = '#F59E0B';
        shadowColor = 'rgba(245, 158, 11, 0.9)';
      }

      ctx.save();
      if (isPartiallyHidden) {
        ctx.globalAlpha = 0.65;
      }

      // 1. Pillar of light / beacon for Rare & Legendary loot
      if (gi.item.rarity === 'legendary' || gi.item.rarity === 'rare') {
        const beamH = gi.item.rarity === 'legendary' ? 46 : 32;
        const beamW = gi.item.rarity === 'legendary' ? 16 : 10;
        const beamGrad = ctx.createLinearGradient(px, py + 10, px, py - beamH);
        beamGrad.addColorStop(0, color);
        beamGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = beamGrad;
        ctx.fillRect(px - beamW / 2, py - beamH, beamW, beamH);
      }

      // 2. Ground shadow under floating item
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(px, gi.y * ts + 12, 11, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 3. Pulsing aura ring
      const ringRadius = 15 + Math.sin(this.time * 4 + gi.bobTimer) * 2.5;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, py, ringRadius, 0, Math.PI * 2);
      ctx.stroke();

      // 4. Draw item sprite or fallback
      const sprite = getItemSprite(gi.item);
      const itemSize = 32; // Prominent size matching tile scale

      if (isSpritesheetReady && this.itemSpritesheet && sprite) {
        ctx.save();
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = gi.item.rarity === 'legendary' ? 14 : gi.item.rarity === 'rare' ? 9 : 4;
        ctx.drawImage(
          this.itemSpritesheet,
          sprite.frame.x,
          sprite.frame.y,
          sprite.frame.w,
          sprite.frame.h,
          px - itemSize / 2,
          py - itemSize / 2,
          itemSize,
          itemSize
        );
        ctx.restore();
      } else {
        // Fallback prominent diamond
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(px, py - 10);
        ctx.lineTo(px + 10, py);
        ctx.lineTo(px, py + 10);
        ctx.lineTo(px - 10, py);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // 5. Floating item name tag above the item
      ctx.save();
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0F172A';
      const cleanName = gi.item.name.replace(/^antigo\s+/i, '');
      const textW = ctx.measureText(cleanName).width;

      // Small background tag for legibility
      ctx.fillStyle = 'rgba(10, 15, 25, 0.75)';
      ctx.fillRect(px - textW / 2 - 4, py - 24, textW + 8, 12);
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.8;
      ctx.strokeRect(px - textW / 2 - 4, py - 24, textW + 8, 12);

      // Name text
      ctx.fillStyle = color;
      ctx.fillText(cleanName, px, py - 15);
      ctx.restore();

      ctx.restore();
    });
  }

  private renderHazardAreas(hazards: HazardArea[]) {
    const ctx = this.ctx;
    const ts = this.tileSize;

    hazards.forEach((h) => {
      const progress = h.timer / h.maxTimer;
      const px = h.x * ts;
      const py = h.y * ts;
      const radius = h.radius * ts;

      // Red/Violet danger telegraph circle
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();

      // Contracting border
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, Math.max(0, radius * (1 - progress)), 0, Math.PI * 2);
      ctx.stroke();

      // Outer static ring
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.9)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  private renderEnemies(enemies: Enemy[], dungeon: DungeonFloor) {
    const ctx = this.ctx;
    const ts = this.tileSize;

    enemies.forEach((enemy) => {
      const tileX = Math.floor(enemy.x);
      const tileY = Math.floor(enemy.y);
      if (dungeon.fog[tileY]?.[tileX] !== FogState.VISIBLE) return;

      const px = enemy.x * ts;
      const py = enemy.y * ts;
      const s = enemy.width * ts; // tamanho base

      ctx.save();
      ctx.translate(px, py);

      if (enemy.facing === 'left') ctx.scale(-1, 1);
      if (enemy.state === 'windup') ctx.translate((Math.random() - 0.5) * 5, 0);

      // Sombra no chão
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(0, s * 0.48, s * 0.3, s * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();

      // Aura elite com cor de afixo
      if (enemy.isElite) {
        ctx.save();
        const auraColor =
          enemy.affix === 'incendiary' ? '#f97316' :
          enemy.affix === 'swift' ? '#0ea5e9' :
          enemy.affix === 'vampiric' ? '#dc2626' :
          enemy.affix === 'volatile' ? '#a855f7' : '#ef4444';

        ctx.shadowColor = auraColor;
        ctx.shadowBlur = 14;
        ctx.strokeStyle = auraColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.62, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (enemy.type === 'goblin') this._drawGoblin(ctx, s, enemy.isElite);
      else if (enemy.type === 'orc') this._drawOrc(ctx, s, enemy.isElite);
      else if (enemy.type === 'archer') this._drawArcher(ctx, s, enemy.isElite);
      else if (enemy.type === 'mage') this._drawMage(ctx, s, enemy);
      else if (enemy.type === 'boss') this._drawBoss(ctx, s);

      // Fast, zero-lag hit flash overlay (no GPU stalls, 60fps)
      if (enemy.hitFlashTimer && enemy.hitFlashTimer > 0) {
        const flashAlpha = Math.min(0.7, enemy.hitFlashTimer * 7.5);
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.46, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // Badge superior de Afixo de Campeão Elite
      if (enemy.isElite && enemy.affixName) {
        const badgeText = enemy.affixName.toUpperCase();
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        const badgeColor =
          enemy.affix === 'incendiary' ? '#fdba74' :
          enemy.affix === 'swift' ? '#7dd3fc' :
          enemy.affix === 'vampiric' ? '#fca5a5' :
          enemy.affix === 'volatile' ? '#d8b4fe' : '#fecdd3';

        const textW = ctx.measureText(badgeText).width;
        const bY = py - s * 0.88;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.beginPath();
        ctx.roundRect(px - textW / 2 - 4, bY - 8, textW + 8, 11, 3);
        ctx.fill();
        ctx.strokeStyle = badgeColor;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = badgeColor;
        ctx.fillText(badgeText, px, bY);
      }

      // Barra de HP
      if (enemy.hp < enemy.maxHp) {
        const barW = s * 0.95;
        const barH = 5;
        const barX = px - barW / 2;
        const barY = py - s * 0.72;
        const hpPct = Math.max(0, enemy.hp / enemy.maxHp);

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(barX - 1, barY - 1, barW + 2, barH + 2, 3);
        ctx.fill();

        ctx.fillStyle = '#18181b';
        ctx.fillRect(barX, barY, barW, barH);

        const hpColor = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#f59e0b' : '#ef4444';
        ctx.fillStyle = enemy.isElite ? '#f43f5e' : hpColor;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW * hpPct, barH, 2);
        ctx.fill();
      }
    });
  }

  // ─── helpers de desenho ────────────────────────────────────────────

  private _drawGoblin(ctx: CanvasRenderingContext2D, s: number, isElite: boolean) {
    // Corpo triangular
    ctx.fillStyle = isElite ? '#7f1d1d' : '#2d5a3d';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.42);
    ctx.lineTo(s * 0.32, s * 0.38);
    ctx.lineTo(-s * 0.32, s * 0.38);
    ctx.closePath();
    ctx.fill();

    // Barriga
    ctx.fillStyle = isElite ? '#991b1b' : '#3d7a52';
    ctx.beginPath();
    ctx.ellipse(0, s * 0.08, s * 0.14, s * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cabeça
    ctx.fillStyle = isElite ? '#7f1d1d' : '#2d5a3d';
    ctx.beginPath();
    ctx.arc(0, -s * 0.44, s * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // Orelhas pontudas
    ctx.beginPath();
    ctx.moveTo(-s * 0.22, -s * 0.48);
    ctx.lineTo(-s * 0.34, -s * 0.68);
    ctx.lineTo(-s * 0.12, -s * 0.46);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.22, -s * 0.48);
    ctx.lineTo(s * 0.34, -s * 0.68);
    ctx.lineTo(s * 0.12, -s * 0.46);
    ctx.fill();

    // Olhos brilhantes
    ctx.fillStyle = '#ff1a1a';
    ctx.beginPath();
    ctx.ellipse(-s * 0.09, -s * 0.46, s * 0.065, s * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s * 0.09, -s * 0.46, s * 0.065, s * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-s * 0.09, -s * 0.46, s * 0.032, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s * 0.09, -s * 0.46, s * 0.032, 0, Math.PI * 2);
    ctx.fill();

    // Dentes
    ctx.fillStyle = '#f0e0c0';
    ctx.fillRect(-s * 0.06, -s * 0.34, s * 0.04, s * 0.08);
    ctx.fillRect(s * 0.02, -s * 0.34, s * 0.04, s * 0.08);
  }

  private _drawOrc(ctx: CanvasRenderingContext2D, s: number, isElite: boolean) {
    const bodyColor = isElite ? '#7f1d1d' : '#374151';
    const armorColor = isElite ? '#450a0a' : '#1e293b';

    // Pernas
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-s * 0.22, s * 0.22, s * 0.18, s * 0.26);
    ctx.fillRect(s * 0.04, s * 0.22, s * 0.18, s * 0.26);

    // Corpo
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.roundRect(-s * 0.34, -s * 0.26, s * 0.68, s * 0.52, 8);
    ctx.fill();

    // Ombros largos
    ctx.fillStyle = isElite ? '#991b1b' : '#4b5563';
    ctx.beginPath();
    ctx.arc(-s * 0.38, -s * 0.18, s * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s * 0.38, -s * 0.18, s * 0.14, 0, Math.PI * 2);
    ctx.fill();

    // Placa de armadura
    ctx.fillStyle = armorColor;
    ctx.beginPath();
    ctx.roundRect(-s * 0.24, -s * 0.2, s * 0.48, s * 0.38, 4);
    ctx.fill();
    ctx.strokeStyle = isElite ? '#7f1d1d' : '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.2);
    ctx.lineTo(0, s * 0.18);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-s * 0.24, -s * 0.02);
    ctx.lineTo(s * 0.24, -s * 0.02);
    ctx.stroke();

    // Cabeça
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.roundRect(-s * 0.24, -s * 0.6, s * 0.48, s * 0.38, 6);
    ctx.fill();

    // Presas
    ctx.fillStyle = '#f0e0a0';
    ctx.fillRect(-s * 0.12, -s * 0.28, s * 0.06, s * 0.1);
    ctx.fillRect(s * 0.06, -s * 0.28, s * 0.06, s * 0.1);

    // Olhos
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.ellipse(-s * 0.1, -s * 0.48, s * 0.07, s * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s * 0.1, -s * 0.48, s * 0.07, s * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-s * 0.1, -s * 0.48, s * 0.038, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s * 0.1, -s * 0.48, s * 0.038, 0, Math.PI * 2);
    ctx.fill();

    // Cicatriz
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-s * 0.04, -s * 0.58);
    ctx.lineTo(s * 0.04, -s * 0.38);
    ctx.stroke();
  }

  private _drawArcher(ctx: CanvasRenderingContext2D, s: number, isElite: boolean) {
    const cloakColor = isElite ? '#431407' : '#1c1814';
    const accentColor = isElite ? '#f97316' : '#92400e';

    // Capa/manto
    ctx.fillStyle = cloakColor;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.5);
    ctx.lineTo(s * 0.26, s * 0.44);
    ctx.lineTo(-s * 0.26, s * 0.44);
    ctx.closePath();
    ctx.fill();

    // Interior da capa
    ctx.fillStyle = isElite ? '#7c2d12' : '#292420';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.3);
    ctx.lineTo(s * 0.1, s * 0.44);
    ctx.lineTo(-s * 0.1, s * 0.44);
    ctx.closePath();
    ctx.fill();

    // Capuz / cabeça
    ctx.fillStyle = cloakColor;
    ctx.beginPath();
    ctx.arc(0, -s * 0.48, s * 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Rosto na sombra do capuz
    ctx.fillStyle = '#5c3d1e';
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.46, s * 0.12, s * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Olhos brilhando sob o capuz
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.ellipse(-s * 0.06, -s * 0.48, s * 0.05, s * 0.04, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s * 0.06, -s * 0.48, s * 0.05, s * 0.04, 0, 0, Math.PI * 2);
    ctx.fill();

    // Arco
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(s * 0.28, 0, s * 0.38, -Math.PI * 0.38, Math.PI * 0.38);
    ctx.stroke();

    // Corda do arco
    ctx.strokeStyle = '#d4a574';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s * 0.28, -s * 0.36);
    ctx.lineTo(s * 0.28, s * 0.36);
    ctx.stroke();

    // Flecha
    ctx.strokeStyle = '#d4a574';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, 0);
    ctx.lineTo(s * 0.28, 0);
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(s * 0.28, 0);
    ctx.lineTo(s * 0.22, -s * 0.04);
    ctx.lineTo(s * 0.22, s * 0.04);
    ctx.closePath();
    ctx.fill();
  }

  private _drawMage(ctx: CanvasRenderingContext2D, s: number, enemy: Enemy) {
    const hoverY = Math.sin(this.time * 5 + enemy.x) * 4;
    ctx.translate(0, hoverY);

    const robeColor = enemy.isElite ? '#2e0569' : '#1e0a4a';
    const glowColor = enemy.isElite ? '#a855f7' : '#7c3aed';

    // Robe
    ctx.fillStyle = robeColor;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.5);
    ctx.bezierCurveTo(s * 0.3, -s * 0.3, s * 0.34, s * 0.2, s * 0.24, s * 0.46);
    ctx.lineTo(-s * 0.24, s * 0.46);
    ctx.bezierCurveTo(-s * 0.34, s * 0.2, -s * 0.3, -s * 0.3, 0, -s * 0.5);
    ctx.fill();

    // Mangas
    ctx.fillStyle = robeColor;
    ctx.beginPath();
    ctx.ellipse(-s * 0.28, s * 0.02, s * 0.1, s * 0.22, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s * 0.28, s * 0.02, s * 0.1, s * 0.22, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Orbes nas mãos
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(-s * 0.34, s * 0.1, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e9d5ff';
    ctx.beginPath();
    ctx.arc(-s * 0.34, s * 0.1, s * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(s * 0.34, s * 0.1, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e9d5ff';
    ctx.beginPath();
    ctx.arc(s * 0.34, s * 0.1, s * 0.05, 0, Math.PI * 2);
    ctx.fill();

    // Cabeça
    ctx.fillStyle = robeColor;
    ctx.beginPath();
    ctx.arc(0, -s * 0.5, s * 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Chapéu pontudo
    ctx.fillStyle = enemy.isElite ? '#1a0336' : '#0f051d';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.88);
    ctx.lineTo(-s * 0.2, -s * 0.54);
    ctx.lineTo(s * 0.2, -s * 0.54);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-s * 0.24, -s * 0.57, s * 0.48, s * 0.06);

    // Olhos
    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.ellipse(-s * 0.08, -s * 0.52, s * 0.06, s * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s * 0.08, -s * 0.52, s * 0.06, s * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-s * 0.08, -s * 0.52, s * 0.028, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s * 0.08, -s * 0.52, s * 0.028, 0, Math.PI * 2);
    ctx.fill();

    // Runa flutuante no peito
    const pulse = Math.sin(this.time * 6 + enemy.x) * 0.2 + 0.8;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(0, -s * 0.1, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e9d5ff';
    ctx.beginPath();
    ctx.arc(0, -s * 0.1, s * 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private _drawBoss(ctx: CanvasRenderingContext2D, s: number) {
    const pulse = Math.sin(this.time * 4) * 0.06;

    // Aura externa escura
    ctx.fillStyle = '#0f051d';
    ctx.beginPath();
    ctx.arc(0, 0, s * (0.58 + pulse), 0, Math.PI * 2);
    ctx.fill();

    // Camada interna
    ctx.fillStyle = '#1a0533';
    ctx.beginPath();
    ctx.arc(0, 0, s * (0.44 + pulse), 0, Math.PI * 2);
    ctx.fill();

    // Veias de fissura
    const veins: [number, number, number, number, number][] = [
      [-s * 0.28, -s * 0.18, s * 0.26, s * 0.16, 2.5],
      [s * 0.1, -s * 0.32, 0, 0, 1.5],
      [0, 0, -s * 0.14, s * 0.3, 1.5],
      [-s * 0.3, s * 0.1, 0, 0, 1.0],
      [0, 0, s * 0.28, -s * 0.2, 1.0],
    ];
    ctx.lineCap = 'round';
    veins.forEach(([x1, y1, x2, y2, lw], i) => {
      ctx.strokeStyle = i < 2 ? '#e11d48' : '#be123c';
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2 !== 0 || y2 !== 0 ? x2 : 0, x2 !== 0 || y2 !== 0 ? y2 : 0);
      ctx.stroke();
    });

    // Núcleo
    ctx.fillStyle = '#4c0519';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fda4af';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.07, 0, Math.PI * 2);
    ctx.fill();

    // Olhos ameaçadores
    const eyePulse = Math.sin(this.time * 3) * 0.15 + 0.85;
    ctx.globalAlpha = eyePulse;
    ctx.fillStyle = '#ff0040';
    ctx.beginPath();
    ctx.ellipse(-s * 0.14, -s * 0.12, s * 0.07, s * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s * 0.14, -s * 0.12, s * 0.07, s * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-s * 0.14, -s * 0.12, s * 0.026, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s * 0.14, -s * 0.12, s * 0.026, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private renderPlayer(player: PlayerState) {
    const ctx = this.ctx;
    const ts = this.tileSize;
    const px = player.x * ts;
    const py = player.y * ts;
    const s = ts * 0.85;

    ctx.save();
    ctx.translate(px, py);

    if (player.facing === 'left') ctx.scale(-1, 1);

    if (player.invulnerableTimer > 0 && Math.floor(this.time * 20) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    const breath = Math.sin(this.time * 2.2) * (player.isAttacking ? 0 : 1.2);
    const amuletGlow = 0.45 + Math.sin(this.time * 4.5) * 0.25;

    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath();
    ctx.ellipse(0, s * 0.52, s * 0.28, s * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();

    this._drawPlayerCape(ctx, s, player, breath);
    this._drawPlayerLegs(ctx, s, breath);
    this._drawPlayerBody(ctx, s, breath);
    this._drawPlayerHood(ctx, s, breath);
    this._drawPlayerAmulet(ctx, s, player, breath, amuletGlow);
    this._drawPlayerWeapon(ctx, s, player);

    if (player.shieldHp > 0) {
      ctx.strokeStyle = 'rgba(168,85,247,0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.68, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Fast, zero-lag player hit flash overlay (no GPU stalls, 60fps)
    if (player.hitFlashTimer && player.hitFlashTimer > 0) {
      const flashAlpha = Math.min(0.7, player.hitFlashTimer * 7.5);
      ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // ─── helpers do jogador ──────────────────────────────────────────

  private _drawPlayerCape(
    ctx: CanvasRenderingContext2D,
    s: number,
    player: PlayerState,
    breath: number
  ) {
    ctx.save();
    ctx.translate(0, breath * 0.3);

    const capeDrift = player.vx !== 0
      ? (player.facing === 'right' ? -player.vx * 3 : player.vx * 3)
      : Math.sin(this.time * 2.2) * 2;

    // Capa principal (irregular, assimétrica)
    ctx.fillStyle = '#1a1a24';
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, -s * 0.3);
    ctx.bezierCurveTo(
      -s * 0.28, -s * 0.1,
      -s * 0.38 + capeDrift, s * 0.2,
      -s * 0.32 + capeDrift, s * 0.48
    );
    ctx.lineTo(-s * 0.06 + capeDrift * 0.3, s * 0.44);
    ctx.lineTo(s * 0.04, s * 0.1);
    ctx.closePath();
    ctx.fill();

    // Borda rasgada (irregular)
    ctx.fillStyle = '#13131c';
    ctx.beginPath();
    ctx.moveTo(-s * 0.32 + capeDrift, s * 0.48);
    ctx.lineTo(-s * 0.27 + capeDrift, s * 0.57);
    ctx.lineTo(-s * 0.22 + capeDrift, s * 0.46);
    ctx.lineTo(-s * 0.17 + capeDrift, s * 0.53);
    ctx.lineTo(-s * 0.06 + capeDrift * 0.3, s * 0.44);
    ctx.fill();

    // Forro interno (vermelho escuro)
    ctx.fillStyle = '#2c0a0a';
    ctx.beginPath();
    ctx.moveTo(-s * 0.06, s * 0.1);
    ctx.lineTo(-s * 0.1 + capeDrift * 0.4, s * 0.45);
    ctx.lineTo(-s * 0.06 + capeDrift * 0.3, s * 0.44);
    ctx.lineTo(s * 0.02, s * 0.14);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private _drawPlayerLegs(ctx: CanvasRenderingContext2D, s: number, breath: number) {
    ctx.save();
    ctx.translate(0, breath * 0.2);

    // Calças
    ctx.fillStyle = '#1a1a22';
    ctx.fillRect(-s * 0.14, s * 0.2, s * 0.11, s * 0.32);
    ctx.fillRect(s * 0.03, s * 0.2, s * 0.11, s * 0.32);

    // Botas
    ctx.fillStyle = '#111118';
    ctx.fillRect(-s * 0.15, s * 0.35, s * 0.13, s * 0.18);
    ctx.fillRect(s * 0.02, s * 0.35, s * 0.13, s * 0.18);

    ctx.restore();
  }

  private _drawPlayerBody(ctx: CanvasRenderingContext2D, s: number, breath: number) {
    ctx.save();
    ctx.translate(0, breath * 0.3);

    // Casaco
    ctx.fillStyle = '#0f1018';
    ctx.beginPath();
    ctx.roundRect(-s * 0.19, -s * 0.28, s * 0.38, s * 0.52, 3);
    ctx.fill();

    // Costura central
    ctx.strokeStyle = '#1e202e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.24);
    ctx.lineTo(0, s * 0.2);
    ctx.stroke();

    // Cinto
    ctx.fillStyle = '#1a0a0a';
    ctx.fillRect(-s * 0.19, s * 0.08, s * 0.38, s * 0.07);
    ctx.fillStyle = '#2a1010';
    ctx.fillRect(-s * 0.03, s * 0.08, s * 0.06, s * 0.07);

    // Ombro esquerdo maior (assimétrico)
    ctx.fillStyle = '#1a1a26';
    ctx.beginPath();
    ctx.ellipse(-s * 0.22, -s * 0.22, s * 0.12, s * 0.08, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f0f18';
    ctx.beginPath();
    ctx.ellipse(-s * 0.22, -s * 0.22, s * 0.09, s * 0.05, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Ombro direito menor (assimétrico)
    ctx.fillStyle = '#161620';
    ctx.beginPath();
    ctx.ellipse(s * 0.2, -s * 0.2, s * 0.08, s * 0.06, 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private _drawPlayerHood(ctx: CanvasRenderingContext2D, s: number, breath: number) {
    ctx.save();
    ctx.translate(0, breath * 0.3);

    // Capuz angular
    ctx.fillStyle = '#13131e';
    ctx.beginPath();
    ctx.moveTo(s * 0.05, -s * 0.44);
    ctx.lineTo(s * 0.22, -s * 0.28);
    ctx.lineTo(s * 0.2, -s * 0.1);
    ctx.lineTo(-s * 0.22, -s * 0.1);
    ctx.lineTo(-s * 0.26, -s * 0.22);
    ctx.lineTo(-s * 0.16, -s * 0.44);
    ctx.closePath();
    ctx.fill();

    // Ponta angular do capuz (levemente para a esquerda — assimétrico)
    ctx.fillStyle = '#13131e';
    ctx.beginPath();
    ctx.moveTo(-s * 0.16, -s * 0.44);
    ctx.lineTo(-s * 0.06, -s * 0.62);
    ctx.lineTo(s * 0.05, -s * 0.44);
    ctx.closePath();
    ctx.fill();

    // Rosto nas sombras do capuz
    ctx.fillStyle = '#1c1008';
    ctx.beginPath();
    ctx.ellipse(s * 0.01, -s * 0.28, s * 0.11, s * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();

    // Olhos — reflexo frio e discreto
    const eyeGlow = 0.55 + Math.sin(this.time * 3.1) * 0.15;
    ctx.fillStyle = `rgba(140, 200, 240, ${eyeGlow})`;
    ctx.beginPath();
    ctx.ellipse(-s * 0.05, -s * 0.3, s * 0.03, s * 0.02, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s * 0.07, -s * 0.3, s * 0.025, s * 0.02, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private _drawPlayerAmulet(
    ctx: CanvasRenderingContext2D,
    s: number,
    player: PlayerState,
    breath: number,
    baseGlow: number
  ) {
    ctx.save();
    ctx.translate(0, breath * 0.3);

    // Pulso mais forte ao tomar dano
    const amuletAlpha = player.invulnerableTimer > 0
      ? 0.9 + Math.sin(this.time * 18) * 0.1
      : baseGlow;

    // Corpo do amuleto (pequeno losango)
    ctx.fillStyle = `rgba(30, 50, 80, ${amuletAlpha * 0.85})`;
    ctx.beginPath();
    ctx.moveTo(s * 0.04, -s * 0.14);
    ctx.lineTo(s * 0.09, -s * 0.09);
    ctx.lineTo(s * 0.04, -s * 0.04);
    ctx.lineTo(-s * 0.01, -s * 0.09);
    ctx.closePath();
    ctx.fill();

    // Gema espectral
    ctx.fillStyle = `rgba(56, 189, 248, ${amuletAlpha})`;
    ctx.beginPath();
    ctx.arc(s * 0.04, -s * 0.09, s * 0.035, 0, Math.PI * 2);
    ctx.fill();

    // Reflexo interno
    ctx.fillStyle = `rgba(186, 230, 253, ${amuletAlpha * 0.75})`;
    ctx.beginPath();
    ctx.arc(s * 0.04, -s * 0.09, s * 0.018, 0, Math.PI * 2);
    ctx.fill();

    // Corrente
    ctx.strokeStyle = `rgba(80, 120, 160, ${amuletAlpha * 0.45})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-s * 0.06, -s * 0.24);
    ctx.quadraticCurveTo(0, -s * 0.18, s * 0.04, -s * 0.14);
    ctx.stroke();

    // Anel de pulso e aura espectral enquanto invulnerável
    if (player.invulnerableTimer > 0) {
      // Aura espectral contínua enquanto invulnerável (e.g. após teleporte ou esquiva)
      const auraPulse = 0.5 + Math.sin(this.time * 8) * 0.3;
      ctx.save();
      ctx.strokeStyle = `rgba(56, 189, 248, ${Math.max(0, auraPulse * 0.75)})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(1, s * 0.55), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Onda de impacto rápido quando próximo de expirar (últimos 0.5s de invulnerabilidade)
      if (player.invulnerableTimer <= 0.5) {
        const ringT = Math.max(0, Math.min(1, 1 - player.invulnerableTimer / 0.5));
        const pulseAlpha = Math.max(0, 0.7 - ringT * 0.8);
        const pulseRadius = Math.max(0.1, s * 0.035 * (1 + ringT * 2.5));
        if (pulseAlpha > 0 && pulseRadius > 0) {
          ctx.save();
          ctx.globalAlpha = pulseAlpha;
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(s * 0.04, -s * 0.09, pulseRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    ctx.restore();
  }

  private _drawPlayerWeapon(
    ctx: CanvasRenderingContext2D,
    s: number,
    player: PlayerState
  ) {
    ctx.save();

    if (player.isAttacking) {
      // Antecipação curta no início do combo; extensão plena depois
      const swingProgress = Math.min(player.attackTimer / 0.25, 1);
      const angle = -Math.PI * 0.55 + swingProgress * Math.PI * 0.95;

      ctx.save();
      ctx.rotate(angle);

      // Lâmina
      ctx.strokeStyle = '#b8c8d8';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s * 0.06, 0);
      ctx.lineTo(s * 0.52, 0);
      ctx.stroke();

      // Guarda cruzada
      ctx.strokeStyle = '#6a7a8a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s * 0.12, -s * 0.07);
      ctx.lineTo(s * 0.12, s * 0.07);
      ctx.stroke();

      // Brilho da lâmina
      ctx.strokeStyle = 'rgba(200,230,255,0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(s * 0.14, -s * 0.01);
      ctx.lineTo(s * 0.5, -s * 0.01);
      ctx.stroke();

      ctx.restore();

      // Arco de corte
      ctx.strokeStyle = 'rgba(147, 197, 253, 0.45)';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.74, -Math.PI * 0.55, -Math.PI * 0.55 + swingProgress * Math.PI * 0.95);
      ctx.stroke();
    } else {
      // Em repouso: lâmina inclinada no quadril
      ctx.strokeStyle = '#7a8a9a';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s * 0.12, s * 0.0);
      ctx.lineTo(s * 0.38, -s * 0.3);
      ctx.stroke();

      // Guarda
      ctx.strokeStyle = '#4a5a6a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s * 0.15, -s * 0.04);
      ctx.lineTo(s * 0.22, s * 0.06);
      ctx.stroke();

      // Reflexo sutil
      ctx.strokeStyle = 'rgba(160, 200, 230, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(s * 0.16, -s * 0.02);
      ctx.lineTo(s * 0.36, -s * 0.27);
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderProjectiles(projectiles: Projectile[]) {
    const ctx = this.ctx;
    const ts = this.tileSize;

    projectiles.forEach((p) => {
      const px = p.x * ts;
      const py = p.y * ts;

      // Glow halo
      ctx.fillStyle = p.glowColor;
      ctx.beginPath();
      ctx.arc(px, py, p.radius * ts * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Sharp core
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(px, py, p.radius * ts, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private renderParticles(particles: Particle[]) {
    const ctx = this.ctx;
    const ts = this.tileSize;

    particles.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.beginPath();
      ctx.arc(p.x * ts, p.y * ts, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;
  }

  private renderFogOfWar(
    dungeon: DungeonFloor,
    player: PlayerState,
    camX: number,
    camY: number,
    screenWidth: number,
    screenHeight: number
  ) {
    const ctx = this.ctx;
    const ts = this.tileSize;
    const { fog, width, height } = dungeon;

    const startX = Math.max(0, Math.floor(camX / ts) - 1);
    const endX = Math.min(width, Math.ceil((camX + screenWidth) / ts) + 1);
    const startY = Math.max(0, Math.floor(camY / ts) - 1);
    const endY = Math.min(height, Math.ceil((camY + screenHeight) / ts) + 1);

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const state = fog[y]?.[x];
        const px = x * ts;
        const py = y * ts;

        if (state === FogState.UNEXPLORED) {
          ctx.fillStyle = '#080A0E';
          ctx.fillRect(px, py, ts, ts);
        } else if (state === FogState.EXPLORED_HIDDEN) {
          ctx.fillStyle = 'rgba(8, 12, 18, 0.72)';
          ctx.fillRect(px, py, ts, ts);
        }
      }
    }

    // Dynamic player torch/amulet soft radial lighting
    const px = (Number.isFinite(player.x) ? player.x : 5) * ts;
    const py = (Number.isFinite(player.y) ? player.y : 5) * ts;
    const lightRadius = Math.max(1, (player.stats?.visionRadius || 7) * ts);

    const torchGrad = ctx.createRadialGradient(px, py, lightRadius * 0.25, px, py, lightRadius);
    torchGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    torchGrad.addColorStop(1, 'rgba(8, 12, 18, 0.35)');
    ctx.fillStyle = torchGrad;
    ctx.beginPath();
    ctx.arc(px, py, lightRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderFloatingText(texts: FloatingText[]) {
    const ctx = this.ctx;
    const ts = this.tileSize;

    texts.forEach((ft) => {
      const lifeRatio = Math.max(0, ft.lifetime / ft.maxLifetime);
      // Punch scale effect: start bigger (1.5x for crit, 1.25x for normal), settle smoothly to 1.0x
      const age = 1 - lifeRatio; // 0 (start) to 1 (end)
      let punchScale = 1.0;
      if (age < 0.22) {
        const t = age / 0.22;
        punchScale = ft.isCrit ? 1.5 - t * 0.5 : 1.25 - t * 0.25;
      }

      ctx.save();
      const posX = ft.x * ts;
      const posY = ft.y * ts;
      ctx.translate(posX, posY);
      ctx.scale(punchScale, punchScale);
      ctx.globalAlpha = Math.min(1, lifeRatio * 1.5);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const isHeal = ft.text.startsWith('+') && !ft.text.includes('s') && !ft.text.includes('Vel');
      const isShield = ft.text.toLowerCase().includes('escudo') || ft.color.includes('93C5FD') || ft.color.includes('A855F7');

      if (ft.isCrit) {
        // Critical hit with punch scale, double stroke and glowing gold
        ctx.font = '900 18px "JetBrains Mono", monospace';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#3F0A0A';
        ctx.strokeText(`✦ ${ft.text}!`, 0, 0);

        ctx.fillStyle = '#FDE047';
        ctx.fillText(`✦ ${ft.text}!`, 0, 0);

        // Core incandescent highlight
        ctx.fillStyle = '#FEF9C3';
        ctx.fillText(`✦ ${ft.text}!`, 0, 0);
      } else if (isHeal) {
        // Heal numbers with emerald glow and distinct cross
        ctx.font = 'bold 15px "JetBrains Mono", monospace';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#022C22';
        ctx.strokeText(ft.text, 0, 0);

        ctx.fillStyle = '#34D399';
        ctx.fillText(ft.text, 0, 0);
      } else if (isShield) {
        // Absorbed damage / Shield with amethyst aura
        ctx.font = 'bold 14px "JetBrains Mono", monospace';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#1E1B4B';
        ctx.strokeText(`⛨ ${ft.text}`, 0, 0);

        ctx.fillStyle = '#C084FC';
        ctx.fillText(`⛨ ${ft.text}`, 0, 0);
      } else {
        // Standard combat damage or text with crisp contrast outline
        ctx.font = 'bold 14px "JetBrains Mono", monospace';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 3.2;
        ctx.strokeStyle = '#05070B';
        ctx.strokeText(ft.text, 0, 0);

        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, 0, 0);
      }

      ctx.restore();
    });

    ctx.globalAlpha = 1.0;
  }
}
