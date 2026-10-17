import { DungeonFloor, Enemy, FloatingText, FogState, GroundItem, HazardArea, Particle, PlayerState, Projectile, TileType } from './types';

export class GameRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tileSize = 36; // rendered tile size in pixels
  private time = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not get 2D context');
    this.ctx = context;
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
    const camX = Math.round(player.x * this.tileSize - width / 2 + cameraShake.x);
    const camY = Math.round(player.y * this.tileSize - height / 2 + cameraShake.y);

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

    // 10. Low Health Vignette (Screen Space)
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
        const px = x * ts;
        const py = y * ts;

        if (tile === TileType.VOID) continue;

        // Base Floor
        if (tile >= TileType.FLOOR_PLAIN && tile < TileType.WALL) {
          if (tile === TileType.FLOOR_PLAIN) {
            ctx.fillStyle = ((x + y) % 2 === 0) ? '#181E26' : '#141A22';
            ctx.fillRect(px, py, ts, ts);
            // Subtle stone joint lines
            ctx.strokeStyle = '#10141B';
            ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);
          } else if (tile === TileType.FLOOR_CRACKED) {
            ctx.fillStyle = '#171B23';
            ctx.fillRect(px, py, ts, ts);
            // Red fissure vein
            ctx.strokeStyle = '#7A1C28';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(px + 4, py + 2);
            ctx.lineTo(px + ts * 0.5, py + ts * 0.6);
            ctx.lineTo(px + ts - 4, py + ts - 2);
            ctx.stroke();
            ctx.lineWidth = 1;
          } else if (tile === TileType.FLOOR_MOSSY) {
            ctx.fillStyle = '#151D20';
            ctx.fillRect(px, py, ts, ts);
            // Damp moss spots
            ctx.fillStyle = '#1D2F24';
            ctx.fillRect(px + 4, py + 4, 8, 8);
            ctx.fillRect(px + ts - 12, py + ts - 12, 6, 6);
          } else if (tile === TileType.FLOOR_RITUAL) {
            ctx.fillStyle = '#1B1424';
            ctx.fillRect(px, py, ts, ts);
            // Arcane circle motif
            ctx.strokeStyle = '#6D28D9';
            ctx.beginPath();
            ctx.arc(px + ts / 2, py + ts / 2, ts * 0.35, 0, Math.PI * 2);
            ctx.stroke();
          }
        } else if (tile === TileType.WALL) {
          // Basalt dark slate wall
          ctx.fillStyle = '#232A36';
          ctx.fillRect(px, py, ts, ts);
          // 3D bevel top edge
          ctx.fillStyle = '#343E4F';
          ctx.fillRect(px, py, ts, 4);
          // Bottom shadow
          ctx.fillStyle = '#11141B';
          ctx.fillRect(px, py + ts - 4, ts, 4);
          // Brick divider
          ctx.strokeStyle = '#181E27';
          ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);
        } else if (tile === TileType.PILLAR) {
          // Standing ancient pillar
          ctx.fillStyle = '#181E26';
          ctx.fillRect(px, py, ts, ts);
          ctx.fillStyle = '#3B4455';
          ctx.beginPath();
          ctx.arc(px + ts / 2, py + ts / 2, ts * 0.38, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#4B5563';
          ctx.beginPath();
          ctx.arc(px + ts / 2, py + ts / 2, ts * 0.22, 0, Math.PI * 2);
          ctx.fill();
        } else if (tile === TileType.STAIRS_DOWN) {
          // Descent stone stairs with glowing spectral runes
          ctx.fillStyle = '#12161F';
          ctx.fillRect(px, py, ts, ts);
          for (let step = 0; step < 4; step++) {
            ctx.fillStyle = step % 2 === 0 ? '#1C2430' : '#283344';
            ctx.fillRect(px + 2, py + step * (ts / 4), ts - 4, ts / 4 - 1);
          }
          // Glowing descent glyph
          const glyphPulse = 0.5 + Math.sin(this.time * 3) * 0.4;
          ctx.strokeStyle = `rgba(56, 189, 248, ${glyphPulse})`;
          ctx.lineWidth = 2;
          ctx.strokeRect(px + ts * 0.25, py + ts * 0.25, ts * 0.5, ts * 0.5);
          ctx.lineWidth = 1;
        } else if (tile === TileType.CHEST_CLOSED) {
          // Treasure Chest
          ctx.fillStyle = '#181E26';
          ctx.fillRect(px, py, ts, ts);
          // Chest body (wood and brass)
          ctx.fillStyle = '#5A3D28';
          ctx.fillRect(px + 6, py + 8, ts - 12, ts - 16);
          ctx.fillStyle = '#D97706';
          ctx.fillRect(px + 6, py + 12, ts - 12, 3);
          ctx.fillRect(px + ts / 2 - 2, py + 11, 4, 6);
        } else if (tile === TileType.CHEST_OPEN) {
          ctx.fillStyle = '#181E26';
          ctx.fillRect(px, py, ts, ts);
          ctx.fillStyle = '#3E2A1B';
          ctx.fillRect(px + 6, py + 12, ts - 12, ts - 20);
        } else if (tile === TileType.FISSURE) {
          // Abyss Fissure
          ctx.fillStyle = '#140D17';
          ctx.fillRect(px, py, ts, ts);
          const fPulse = 0.6 + Math.sin(this.time * 4) * 0.35;
          ctx.fillStyle = `rgba(225, 29, 72, ${fPulse})`;
          ctx.beginPath();
          ctx.ellipse(px + ts / 2, py + ts / 2, ts * 0.35, ts * 0.18, Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  private renderGroundItems(items: GroundItem[], dungeon: DungeonFloor) {
    const ctx = this.ctx;
    const ts = this.tileSize;

    items.forEach((gi) => {
      const tileX = Math.floor(gi.x);
      const tileY = Math.floor(gi.y);
      if (dungeon.fog[tileY]?.[tileX] !== FogState.VISIBLE) return;

      const px = gi.x * ts;
      const py = gi.y * ts + Math.sin(this.time * 4 + gi.bobTimer) * 4;

      // Glow halo
      let color = '#94A3B8';
      if (gi.item.rarity === 'rare') color = '#38BDF8';
      if (gi.item.rarity === 'legendary') color = '#F59E0B';

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();

      // Soft glow ring
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, py, 9 + Math.sin(this.time * 5) * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
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
      ctx.arc(px, py, radius * (1 - progress), 0, Math.PI * 2);
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
      const size = enemy.width * ts;

      ctx.save();
      ctx.translate(px, py);

      // Facing
      if (enemy.facing === 'left') {
        ctx.scale(-1, 1);
      }

      // Windup shake / telegraph
      if (enemy.state === 'windup') {
        ctx.translate((Math.random() - 0.5) * 4, 0);
      }

      // Elite aura
      if (enemy.isElite) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.65, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw Silhouette based on type
      if (enemy.type === 'goblin') {
        // Fast triangular green/gray imp
        ctx.fillStyle = enemy.isElite ? '#B91C1C' : '#334D3A';
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.4);
        ctx.lineTo(size * 0.35, size * 0.35);
        ctx.lineTo(-size * 0.35, size * 0.35);
        ctx.closePath();
        ctx.fill();

        // Glowing red eyes
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(2, -size * 0.2, 3, 3);
      } else if (enemy.type === 'orc') {
        // Heavy broad-shouldered orc
        ctx.fillStyle = enemy.isElite ? '#991B1B' : '#475569';
        ctx.fillRect(-size * 0.35, -size * 0.35, size * 0.7, size * 0.7);

        // Armor plate
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(-size * 0.25, -size * 0.2, size * 0.5, size * 0.4);

        // Eyes
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(4, -size * 0.2, 3, 3);
      } else if (enemy.type === 'archer') {
        // Slender hooded archer
        ctx.fillStyle = enemy.isElite ? '#7C2D12' : '#3B372F';
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.25, size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Bow curve
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(size * 0.25, 0, size * 0.35, -Math.PI * 0.35, Math.PI * 0.35);
        ctx.stroke();
      } else if (enemy.type === 'mage') {
        // Floating violet sorcerer
        const hoverY = Math.sin(this.time * 5 + enemy.x) * 4;
        ctx.translate(0, hoverY);

        ctx.fillStyle = enemy.isElite ? '#581C87' : '#3B0764';
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.45);
        ctx.lineTo(size * 0.35, size * 0.4);
        ctx.lineTo(-size * 0.35, size * 0.4);
        ctx.closePath();
        ctx.fill();

        // Spectral glowing core
        ctx.fillStyle = '#C084FC';
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.16, 0, Math.PI * 2);
        ctx.fill();
      } else if (enemy.type === 'boss') {
        // "A Sombra da Fome" - Boss
        const pulse = Math.sin(this.time * 4) * 0.1;
        ctx.fillStyle = '#0F051D';
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.5 + pulse * size, 0, Math.PI * 2);
        ctx.fill();

        // Fissure veins
        ctx.strokeStyle = '#E11D48';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-size * 0.3, -size * 0.2);
        ctx.lineTo(0, 0);
        ctx.lineTo(size * 0.3, size * 0.2);
        ctx.stroke();

        // Ominous core
        ctx.fillStyle = '#F43F5E';
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // Enemy Health Bar
      if (enemy.hp < enemy.maxHp) {
        const barW = size * 0.9;
        const barH = 4;
        const barX = px - barW / 2;
        const barY = py - size * 0.65;

        ctx.fillStyle = '#18181B';
        ctx.fillRect(barX, barY, barW, barH);

        const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
        ctx.fillStyle = enemy.isElite ? '#F43F5E' : '#EF4444';
        ctx.fillRect(barX, barY, barW * hpPct, barH);
      }
    });
  }

  private renderPlayer(player: PlayerState) {
    const ctx = this.ctx;
    const ts = this.tileSize;
    const px = player.x * ts;
    const py = player.y * ts;
    const pSize = ts * 0.85;

    ctx.save();
    ctx.translate(px, py);

    // Facing
    if (player.facing === 'left') {
      ctx.scale(-1, 1);
    }

    // Invulnerability blink
    if (player.invulnerableTimer > 0 && Math.floor(this.time * 20) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    // Cape with movement lag
    const capeTilt = player.vx !== 0 ? (player.facing === 'right' ? -player.vx * 2 : player.vx * 2) : 0;
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.moveTo(-pSize * 0.15, -pSize * 0.2);
    ctx.lineTo(-pSize * 0.4 + capeTilt, pSize * 0.35);
    ctx.lineTo(-pSize * 0.1, pSize * 0.3);
    ctx.closePath();
    ctx.fill();

    // Body / Coat (Charcoal & cold slate)
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(-pSize * 0.2, -pSize * 0.25, pSize * 0.4, pSize * 0.55);

    // Hood & Shoulders
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.moveTo(0, -pSize * 0.45);
    ctx.lineTo(pSize * 0.25, -pSize * 0.1);
    ctx.lineTo(-pSize * 0.25, -pSize * 0.1);
    ctx.closePath();
    ctx.fill();

    // Spectral Blue Amulet on Chest ("O Amuleto")
    const amuletGlow = 0.6 + Math.sin(this.time * 5) * 0.4;
    ctx.fillStyle = `rgba(56, 189, 248, ${amuletGlow})`;
    ctx.beginPath();
    ctx.arc(pSize * 0.05, -pSize * 0.05, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Weapon / Blade
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (player.isAttacking) {
      // Swing forward
      ctx.moveTo(pSize * 0.1, -pSize * 0.1);
      ctx.lineTo(pSize * 0.55, pSize * 0.1);
    } else {
      // Idle held blade
      ctx.moveTo(pSize * 0.15, 0);
      ctx.lineTo(pSize * 0.35, -pSize * 0.35);
    }
    ctx.stroke();

    // Attack Swing Slash Arc Effect
    if (player.isAttacking) {
      ctx.strokeStyle = 'rgba(147, 197, 253, 0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, pSize * 0.8, -Math.PI * 0.3, Math.PI * 0.35);
      ctx.stroke();
    }

    // Shield Dome if active
    if (player.shieldHp > 0) {
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, pSize * 0.65, 0, Math.PI * 2);
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
    const px = player.x * ts;
    const py = player.y * ts;
    const lightRadius = player.stats.visionRadius * ts;

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

    ctx.font = 'bold 14px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';

    texts.forEach((ft) => {
      const alpha = Math.max(0, ft.lifetime / ft.maxLifetime);
      ctx.globalAlpha = alpha;

      if (ft.isCrit) {
        ctx.font = 'bold 18px "JetBrains Mono", monospace';
        ctx.fillStyle = '#F59E0B';
      } else {
        ctx.font = 'bold 14px "JetBrains Mono", monospace';
        ctx.fillStyle = ft.color;
      }

      ctx.fillText(ft.text, ft.x * ts, ft.y * ts);
    });

    ctx.globalAlpha = 1.0;
  }
}
