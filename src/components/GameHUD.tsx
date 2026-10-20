import React, { useState } from 'react';
import { PlayerState, DungeonFloor, Room, FogState } from '../game/types';
import { Copy, Pause, Shield, Zap, Heart, Map, Maximize2, Minimize2, Eye, EyeOff, Flame, Share2 } from 'lucide-react';
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
  const [mobileMinimapVisible, setMobileMinimapVisible] = useState(true);

  const hpPct = Math.max(0, Math.min(100, (player.stats.hp / player.stats.maxHp) * 100));
  const xpPct = Math.max(0, Math.min(100, (player.stats.xp / player.stats.xpToNextLevel) * 100));

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = Math.floor(totalSecs % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const hungerStageNames = ['Sombra Calma', 'Agitação', 'Despertar', 'Fissura Crítica', 'Consumido!'];
  const hungerStageName = hungerStageNames[Math.min(hungerStageNames.length - 1, dungeon.hungerLevel || 0)];
  const hungerProgressPct = Math.min(100, Math.max(4, (((dungeon.floorTimer || 0) / 240) * 100)));
  const hungerBarGradient =
    dungeon.hungerLevel >= 4
      ? 'from-red-600 via-rose-600 to-purple-600 animate-pulse'
      : dungeon.hungerLevel >= 3
      ? 'from-orange-500 via-rose-500 to-red-600'
      : dungeon.hungerLevel >= 2
      ? 'from-amber-500 to-orange-500'
      : dungeon.hungerLevel >= 1
      ? 'from-teal-500 to-amber-500'
      : 'from-emerald-500 to-teal-400';

  const skillHotkeys = ['1', '2', '3', '4'];

  // Helper to render the SVG Minimap Content
  const renderMinimapSvg = () => (
    <div className="relative w-full h-full bg-[#07090E] rounded overflow-hidden">
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
  );

  return (
    <div
      className="absolute inset-0 pointer-events-none flex flex-col justify-between select-none z-10"
      style={{
        paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(0.5rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(0.5rem, env(safe-area-inset-right, 0px))',
      }}
    >
      {/* Top Bar: HP/XP on left, Fome do Abismo in center, Floor/Seed/Mochila/Pause on right */}
      <div className="flex items-start justify-between w-full p-2 md:p-4 gap-2">
        {/* Top-Left: Player Vitality, Level & Active Buffs */}
        <div className="flex flex-col gap-1 pointer-events-auto max-w-[180px] sm:max-w-[240px] flex-1">
          {/* Health Bar */}
          <div className="bg-[#0B0F17]/90 border border-slate-800 rounded-lg p-2 sm:p-2.5 backdrop-blur-sm shadow-xl">
            <div className="flex items-center justify-between text-[11px] sm:text-xs mb-1 font-mono">
              <span className="flex items-center gap-1 text-rose-400 font-semibold tracking-wide">
                <Heart className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-rose-500/20 text-rose-500 shrink-0" />
                <span>VIDA</span>
              </span>
              <span className="tabular-nums text-slate-300 font-semibold">
                {player.stats.hp} / {player.stats.maxHp}
              </span>
            </div>
            <div className="w-full bg-slate-950 h-2 sm:h-2.5 rounded overflow-hidden relative border border-slate-900">
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
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] mt-1.5 mb-0.5 font-mono text-sky-400">
              <span className="flex items-center gap-1">
                <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-sky-400 shrink-0" />
                <span>NV {player.stats.level}</span>
              </span>
              <span className="tabular-nums text-slate-400">
                {player.stats.xp}/{player.stats.xpToNextLevel}
              </span>
            </div>
            <div className="w-full bg-slate-950 h-1 sm:h-1.5 rounded overflow-hidden border border-slate-900">
              <div
                className="h-full bg-gradient-to-r from-sky-600 to-cyan-400 transition-all duration-300"
                style={{ width: `${xpPct}%` }}
              />
            </div>
          </div>

          {/* Active Buffs Strip (Scrolls & Elixirs active) */}
          {player.activeBuffs && player.activeBuffs.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5 pointer-events-none">
              {player.activeBuffs.map((buff) => (
                <span
                  key={buff.id}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border backdrop-blur-sm shadow ${
                    buff.type === 'fury'
                      ? 'bg-rose-950/90 text-rose-300 border-rose-700'
                      : buff.type === 'speed'
                      ? 'bg-sky-950/90 text-sky-300 border-sky-700'
                      : 'bg-cyan-950/90 text-cyan-300 border-cyan-700'
                  }`}
                >
                  <span className="truncate max-w-[70px]">{buff.name}</span>
                  <span className="tabular-nums text-white">{Math.ceil(buff.timer)}s</span>
                </span>
              ))}
            </div>
          )}

          {/* Quick Stats Strip (Desktop only) */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 px-1 font-mono">
            <span>ATQ: {player.stats.baseAttack}</span>
            <span aria-hidden="true">·</span>
            <span>DEF: {player.stats.baseDefense}</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400 font-semibold">FRASCOS: {player.potionsCount}</span>
          </div>
        </div>

        {/* Top-Center: FOME DO ABISMO Floor Real-Time Gauge */}
        <div className="flex flex-col items-center pointer-events-auto mx-1 max-w-[130px] sm:max-w-[200px] flex-1">
          <div
            className={`w-full bg-[#0B0F17]/95 border rounded-lg p-1.5 sm:p-2 backdrop-blur-sm shadow-xl flex flex-col items-center transition-all ${
              dungeon.hungerLevel >= 4
                ? 'border-purple-600 ring-1 ring-purple-500 animate-pulse'
                : dungeon.hungerLevel >= 3
                ? 'border-rose-600 ring-1 ring-rose-500/50'
                : dungeon.hungerLevel >= 2
                ? 'border-orange-600/70'
                : 'border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between w-full text-[9px] sm:text-[11px] font-mono mb-1">
              <span className="flex items-center gap-1 font-bold truncate">
                <Flame
                  className={`w-3 h-3 shrink-0 ${
                    dungeon.hungerLevel >= 3
                      ? 'text-rose-500 animate-bounce'
                      : dungeon.hungerLevel >= 2
                      ? 'text-orange-400'
                      : 'text-amber-400'
                  }`}
                />
                <span className="truncate">FOME: {hungerStageName}</span>
              </span>
              <span
                className={`tabular-nums font-bold ${
                  dungeon.isHungerFrozen
                    ? 'text-cyan-400'
                    : dungeon.hungerLevel >= 3
                    ? 'text-rose-400'
                    : 'text-slate-300'
                }`}
              >
                {dungeon.isHungerFrozen ? '❄ CONGELADO' : formatTimer(dungeon.floorTimer || 0)}
              </span>
            </div>

            {/* Gauge fill */}
            <div className="w-full bg-slate-950 h-1.5 sm:h-2 rounded overflow-hidden border border-slate-900 relative">
              <div
                className={`h-full transition-all duration-300 bg-gradient-to-r ${hungerBarGradient}`}
                style={{ width: `${hungerProgressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Top-Right: Controls & (on Mobile) Minimap Dock */}
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          {/* Header Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Social Share / Seed Indicator */}
            <button
              onClick={() => {
                soundManager.playButtonClick();
                onOpenSeedShare();
              }}
              title="Compartilhar Desafio & Seed"
              className="flex items-center gap-1 bg-[#0B0F17]/90 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg px-2 sm:px-2.5 py-1.5 text-xs font-mono transition-colors shadow-lg active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-amber-400 font-cinzel font-bold">A.{floor}</span>
              <span aria-hidden="true" className="text-slate-600 hidden sm:inline">|</span>
              <span className="truncate max-w-[60px] hidden sm:inline">{seed.slice(0, 6)}</span>
            </button>

            {/* Mochila (Backpack) - Available on Mobile & Desktop */}
            <button
              onClick={() => {
                soundManager.playButtonClick();
                onOpenInventory();
              }}
              title="Inventário (Mochila)"
              className="flex items-center gap-1.5 bg-[#0B0F17]/90 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-mono transition-colors shadow-lg active:scale-95"
            >
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">MOCHILA</span>
            </button>

            {/* Mobile Minimap Toggle Button */}
            {isMobile && (
              <button
                onClick={() => {
                  soundManager.playButtonClick();
                  setMobileMinimapVisible(!mobileMinimapVisible);
                }}
                title={mobileMinimapVisible ? 'Ocultar Minimapa' : 'Exibir Minimapa'}
                className="bg-[#0B0F17]/90 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg p-2 transition-colors shadow-lg active:scale-95"
              >
                <Map className={`w-4 h-4 ${mobileMinimapVisible ? 'text-sky-400' : 'text-slate-500'}`} />
              </button>
            )}

            {/* Pause Button */}
            <button
              onClick={() => {
                soundManager.playButtonClick();
                onPause();
              }}
              title="Pausar jogo"
              className="bg-[#0B0F17]/90 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg p-2 transition-colors shadow-lg flex items-center justify-center active:scale-95"
            >
              <Pause className="w-4 h-4 text-slate-300" />
            </button>
          </div>

          {/* MOBILE MINIMAP DOCK (Top-Right, completely free from joystick on bottom-left and attack on bottom-right) */}
          {isMobile && mobileMinimapVisible && (
            <div
              onClick={() => {
                soundManager.playButtonClick();
                setMinimapZoomed(!minimapZoomed);
              }}
              className={`bg-[#0B0F17]/95 border border-slate-800 rounded-xl p-1.5 transition-all duration-200 cursor-pointer shadow-2xl relative ${
                minimapZoomed ? 'w-44 h-44 sm:w-52 sm:h-52 ring-1 ring-sky-500/50' : 'w-24 h-24'
              }`}
              title="Toque para alternar o tamanho do minimapa"
            >
              {renderMinimapSvg()}
              <div className="absolute bottom-1 right-1 bg-black/60 rounded px-1 text-[8px] font-mono text-slate-400 pointer-events-none">
                {minimapZoomed ? 'Zoom -' : 'Zoom +'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center Floor Alert if Boss */}
      {floor % 10 === 0 && (
        <div className="self-center bg-rose-950/80 border border-rose-600/70 text-rose-200 px-4 py-1.5 rounded-lg text-xs sm:text-sm font-cinzel font-bold tracking-widest uppercase shadow-2xl animate-pulse">
          CÂMARA DA FOME — ANDAR {floor}
        </div>
      )}

      {/* Bottom Row: Desktop Minimap (Left) & Desktop Skill Bar (Center) */}
      {!isMobile && (
        <div className="flex items-end justify-between w-full p-2 md:p-4">
          {/* Bottom-Left: Desktop Minimap */}
          <div className="pointer-events-auto">
            <div
              onClick={() => {
                soundManager.playButtonClick();
                setMinimapZoomed(!minimapZoomed);
              }}
              className={`bg-[#0B0F17]/95 border border-slate-800 rounded-lg p-1.5 transition-all duration-200 cursor-pointer shadow-2xl ${
                minimapZoomed ? 'w-48 h-48 md:w-56 md:h-56' : 'w-28 h-28 md:w-32 md:h-32'
              }`}
              title="Clique para ampliar o minimapa"
            >
              {renderMinimapSvg()}
            </div>
          </div>

          {/* Bottom-Center: Desktop Skill Bar */}
          <div className="pointer-events-auto flex items-center gap-2 bg-[#0B0F17]/90 border border-slate-800 p-2 rounded-xl backdrop-blur-md shadow-2xl mb-1">
            {player.skills.map((skill, idx) => {
              const isCooling = skill.currentCooldown > 0;

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
                    <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center text-xs font-mono font-bold text-amber-300">
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

          {/* Empty placeholder for balance when desktop */}
          <div className="w-28 md:w-32" />
        </div>
      )}
    </div>
  );
};
