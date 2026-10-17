import React, { useState } from 'react';
import { PlayerState, DungeonFloor, Room, TileType, FogState } from '../game/types';
import { Copy, Pause, Shield, Zap, Sparkles, Heart } from 'lucide-react';
import { soundManager } from '../game/audio';

interface GameHUDProps {
  player: PlayerState;
  dungeon: DungeonFloor;
  seed: string;
  floor: number;
  onPause: () => void;
  onOpenInventory: () => void;
  onOpenSeedShare: () => void;
  onTriggerSkill: (index: number) => void;
  onUsePotion: () => void;
  isMobile: boolean;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  player,
  dungeon,
  seed,
  floor,
  onPause,
  onOpenInventory,
  onOpenSeedShare,
  onTriggerSkill,
  onUsePotion,
  isMobile,
}) => {
  const [minimapZoomed, setMinimapZoomed] = useState(false);
  const hpPct = Math.max(0, Math.min(100, (player.stats.hp / player.stats.maxHp) * 100));
  const xpPct = Math.max(0, Math.min(100, (player.stats.xp / player.stats.xpToNextLevel) * 100));

  const skillHotkeys = ['1', '2', '3', '4'];

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 md:p-5 select-none">
      {/* Top Bar Contract: HP/XP on left, Floor/Seed/Pause on right */}
      <div className="flex items-start justify-between w-full">
        {/* Top-Left: Player Vitality & Level */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          {/* Health Bar */}
          <div className="bg-[#0B0F17]/90 border border-slate-800 rounded-lg p-2.5 backdrop-blur-sm shadow-xl min-w-[210px] md:min-w-[260px]">
            <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
              <span className="flex items-center gap-1.5 text-rose-400 font-semibold tracking-wide">
                <Heart className="w-3.5 h-3.5 fill-rose-500/20 text-rose-500" />
                <span>VIDA</span>
              </span>
              <span className="tabular-nums text-slate-300">
                {player.stats.hp} / {player.stats.maxHp}
              </span>
            </div>
            <div className="w-full bg-slate-950 h-3 rounded overflow-hidden relative border border-slate-900">
              <div
                className="h-full bg-gradient-to-r from-rose-700 to-red-500 transition-all duration-200"
                style={{ width: `${hpPct}%` }}
              />
              {player.shieldHp > 0 && (
                <div
                  className="absolute inset-y-0 left-0 bg-purple-500/70 border-r border-purple-300 transition-all duration-200"
                  style={{ width: `${Math.min(100, (player.shieldHp / player.stats.maxHp) * 100)}%` }}
                />
              )}
            </div>

            {/* XP Bar */}
            <div className="flex items-center justify-between text-[11px] mt-2 mb-1 font-mono text-sky-400">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-sky-400" />
                <span>NÍVEL {player.stats.level}</span>
              </span>
              <span className="tabular-nums text-slate-400">
                {player.stats.xp} / {player.stats.xpToNextLevel} XP
              </span>
            </div>
            <div className="w-full bg-slate-950 h-1.5 rounded overflow-hidden border border-slate-900">
              <div
                className="h-full bg-gradient-to-r from-sky-600 to-cyan-400 transition-all duration-300"
                style={{ width: `${xpPct}%` }}
              />
            </div>
          </div>

          {/* Quick Stats Strip */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400 px-1 font-mono">
            <span>ATQ: {player.stats.baseAttack}</span>
            <span aria-hidden="true">·</span>
            <span>DEF: {player.stats.baseDefense}</span>
            <span aria-hidden="true">·</span>
            <span>CRIT: {Math.round(player.stats.critChance * 100)}%</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400 font-semibold">FRASCOS: {player.potionsCount}</span>
          </div>
        </div>

        {/* Top-Right: Floor, Seed, Pause */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => {
              soundManager.playButtonClick();
              onOpenSeedShare();
            }}
            title="Compartilhar Seed"
            className="flex items-center gap-1.5 bg-[#0B0F17]/90 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono transition-colors shadow-lg"
          >
            <span className="text-amber-400 font-cinzel font-bold">A.{floor}</span>
            <span aria-hidden="true" className="text-slate-600">|</span>
            <span className="truncate max-w-[80px] md:max-w-[120px]">{seed.slice(0, 10)}</span>
            <Copy className="w-3 h-3 text-slate-400 ml-0.5" />
          </button>

          <button
            onClick={() => {
              soundManager.playButtonClick();
              onOpenInventory();
            }}
            title="Inventário (I)"
            className="hidden sm:flex items-center gap-1.5 bg-[#0B0F17]/90 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono transition-colors shadow-lg"
          >
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>MOCHILA</span>
          </button>

          <button
            onClick={() => {
              soundManager.playButtonClick();
              onPause();
            }}
            title="Pausar jogo (ESC)"
            className="bg-[#0B0F17]/90 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg p-2 transition-colors shadow-lg flex items-center justify-center"
          >
            <Pause className="w-4 h-4 text-slate-300" />
          </button>
        </div>
      </div>

      {/* Center Floor Alert if Boss */}
      {floor % 10 === 0 && (
        <div className="self-center bg-rose-950/70 border border-rose-600/60 text-rose-200 px-4 py-1.5 rounded-lg text-sm font-cinzel font-bold tracking-widest uppercase shadow-2xl animate-pulse">
          CÂMARA DA FOME — ANDAR {floor}
        </div>
      )}

      {/* Bottom Row: Minimap (Left) & Skill Bar (Center) */}
      <div className="flex items-end justify-between w-full">
        {/* Bottom-Left: Minimap */}
        <div className="pointer-events-auto">
          <div
            onClick={() => {
              soundManager.playButtonClick();
              setMinimapZoomed(!minimapZoomed);
            }}
            className={`bg-[#0B0F17]/95 border border-slate-800 rounded-lg p-1.5 transition-all duration-200 cursor-pointer shadow-2xl ${
              minimapZoomed ? 'w-48 h-48 md:w-56 md:h-56' : 'w-24 h-24 md:w-32 md:h-32'
            }`}
            title="Clique para ampliar o minimapa"
          >
            <div className="relative w-full h-full bg-[#07090E] rounded overflow-hidden">
              {/* Render Mini Grid representation */}
              <svg className="w-full h-full" viewBox={`0 0 ${dungeon.width} ${dungeon.height}`}>
                {dungeon.rooms.map((room: Room) => {
                  const isPlayerInside =
                    Math.floor(player.x) >= room.x &&
                    Math.floor(player.x) < room.x + room.width &&
                    Math.floor(player.y) >= room.y &&
                    Math.floor(player.y) < room.y + room.height;

                  // Check if room has been explored
                  const isExplored = dungeon.fog[Math.floor(room.y + room.height / 2)]?.[
                    Math.floor(room.x + room.width / 2)
                  ] !== FogState.UNEXPLORED;

                  if (!isExplored) return null;

                  let roomColor = '#1E293B';
                  if (room.type === 'treasure') roomColor = '#B45309';
                  if (room.type === 'anomaly') roomColor = '#BE123C';
                  if (room.type === 'stairs') roomColor = '#0369A1';
                  if (room.type === 'boss') roomColor = '#831843';

                  return (
                    <rect
                      key={room.id}
                      x={room.x}
                      y={room.y}
                      width={room.width}
                      height={room.height}
                      fill={roomColor}
                      stroke={isPlayerInside ? '#38BDF8' : '#334155'}
                      strokeWidth={isPlayerInside ? '1' : '0.5'}
                    />
                  );
                })}
                {/* Player Marker */}
                <circle cx={player.x} cy={player.y} r="1.5" fill="#38BDF8" />
              </svg>
            </div>
          </div>
        </div>

        {/* Bottom-Center: Desktop Skill Bar */}
        {!isMobile && (
          <div className="pointer-events-auto flex items-center gap-2 bg-[#0B0F17]/90 border border-slate-800 p-2 rounded-xl backdrop-blur-md shadow-2xl mb-1">
            {player.skills.map((skill, idx) => {
              const isCooling = skill.currentCooldown > 0;
              const cdPct = skill.currentCooldown / skill.cooldown;

              return (
                <button
                  key={skill.id}
                  onClick={() => {
                    soundManager.playButtonClick();
                    onTriggerSkill(idx);
                  }}
                  disabled={isCooling}
                  className={`relative w-12 h-12 rounded-lg border flex flex-col items-center justify-center transition-all ${
                    isCooling
                      ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                      : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200 active:scale-95 shadow-md'
                  }`}
                  title={`${skill.name} (${skillHotkeys[idx]}): ${skill.description}`}
                >
                  {/* Cooldown Mask */}
                  {isCooling && (
                    <div
                      className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center text-xs font-mono font-bold text-amber-300"
                    >
                      {skill.currentCooldown.toFixed(1)}s
                    </div>
                  )}

                  <span className="text-xs font-bold font-mono tracking-tight text-center px-1 truncate w-full">
                    {skill.name.split(' ')[0]}
                  </span>

                  <span className="absolute top-0.5 right-1 text-[9px] font-mono text-slate-400">
                    {skillHotkeys[idx]}
                  </span>
                </button>
              );
            })}

            {/* Quick Potion slot */}
            <div className="w-[1px] h-8 bg-slate-800 mx-1" />

            <button
              onClick={() => {
                soundManager.playButtonClick();
                onUsePotion();
              }}
              disabled={player.potionsCount <= 0}
              className={`relative w-12 h-12 rounded-lg border flex flex-col items-center justify-center transition-all ${
                player.potionsCount <= 0
                  ? 'bg-slate-900 border-slate-800 text-slate-600'
                  : 'bg-rose-950/50 hover:bg-rose-900/60 border-rose-800/60 text-rose-300 active:scale-95'
              }`}
              title="Beber Frasco de Vida (Q)"
            >
              <Heart className="w-4 h-4 fill-rose-500/30 text-rose-400" />
              <span className="text-[10px] font-mono font-bold text-rose-300">x{player.potionsCount}</span>
              <span className="absolute top-0.5 right-1 text-[9px] font-mono text-slate-400">Q</span>
            </button>
          </div>
        )}

        {/* Empty placeholder for balance when desktop */}
        <div className="w-24 md:w-32" />
      </div>
    </div>
  );
};
