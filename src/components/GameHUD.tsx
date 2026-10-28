import React, { useState, useEffect } from 'react';
import { PlayerState, DungeonFloor, Room, FogState, FloorBounty } from '../game/types';
import {
  Pause,
  Shield,
  Zap,
  Heart,
  Map,
  Maximize2,
  Minimize2,
  Flame,
  Share2,
  Sparkles,
  Target,
  Trophy,
  Swords,
  Backpack,
  Compass,
} from 'lucide-react';
import { soundManager } from '../game/audio';
import { ItemIcon } from './ItemIcon';

interface GameHUDProps {
  player: PlayerState;
  dungeon: DungeonFloor;
  seed: string;
  floor: number;
  comboCount?: number;
  comboTimer?: number;
  maxComboTimer?: number;
  currentBounty?: FloorBounty | null;
  onPause: () => void;
  onOpenInventory: () => void;
  onOpenSeedShare: () => void;
  onTriggerSkill: (index: number) => void;
  onUsePotion: () => void;
  onUseScroll?: () => void;
  onUseElixir?: () => void;
  isMobile: boolean;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  player,
  dungeon,
  seed,
  floor,
  comboCount = 0,
  comboTimer = 0,
  maxComboTimer = 3.5,
  currentBounty = null,
  onPause,
  onOpenInventory,
  onOpenSeedShare,
  onTriggerSkill,
  onUsePotion,
  onUseScroll,
  onUseElixir,
  isMobile,
}) => {
  const [minimapZoomed, setMinimapZoomed] = useState(false);
  const [mobileMinimapVisible, setMobileMinimapVisible] = useState(!isMobile);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [bountyExpanded, setBountyExpanded] = useState(false);

  useEffect(() => {
    const checkFullscreen = () => {
      setIsFullscreen(
        !!(
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
        )
      );
    };
    checkFullscreen();
    document.addEventListener('fullscreenchange', checkFullscreen);
    document.addEventListener('webkitfullscreenchange', checkFullscreen);
    return () => {
      document.removeEventListener('fullscreenchange', checkFullscreen);
      document.removeEventListener('webkitfullscreenchange', checkFullscreen);
    };
  }, []);

  const handleToggleFullscreen = async () => {
    soundManager.playButtonClick();
    try {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      if (!isCurrentlyFullscreen) {
        const docEl = document.documentElement as any;
        if (docEl.requestFullscreen) await docEl.requestFullscreen();
        else if (docEl.webkitRequestFullscreen) await docEl.webkitRequestFullscreen();
        else if (docEl.mozRequestFullScreen) await docEl.mozRequestFullScreen();
        else if (docEl.msRequestFullscreen) await docEl.msRequestFullscreen();
      } else {
        const doc = document as any;
        if (doc.exitFullscreen) await doc.exitFullscreen();
        else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
        else if (doc.mozCancelFullScreen) await doc.mozCancelFullScreen();
        else if (doc.msExitFullscreen) await doc.msExitFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen toggle failed:', err);
    }
  };

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

  const firstScroll = player.inventory.find((item) => item !== null && item.type === 'scroll');
  const scrollCount = player.inventory.filter((item) => item !== null && item.type === 'scroll').length;

  const firstElixir = player.inventory.find((item) => item !== null && item.type === 'elixir');
  const elixirCount = player.inventory.filter((item) => item !== null && item.type === 'elixir').length;

  // Render SVG Minimap
  const renderMinimapSvg = () => (
    <div className="relative w-full h-full bg-[#06080E] rounded-lg overflow-hidden border border-slate-800/90 shadow-inner">
      <svg className="w-full h-full" viewBox={`0 0 ${dungeon.width} ${dungeon.height}`}>
        {dungeon.rooms.map((room: Room) => {
          const isPlayerInside =
            Math.floor(player.x) >= room.x &&
            Math.floor(player.x) < room.x + room.width &&
            Math.floor(player.y) >= room.y &&
            Math.floor(player.y) < room.y + room.height;

          // Room explored check
          const isExplored = dungeon.fog[Math.floor(room.y + room.height / 2)]?.[
            Math.floor(room.x + room.width / 2)
          ] !== FogState.UNEXPLORED;

          if (!isExplored) return null;

          let roomFill = '#151D2A';
          let roomBorder = isPlayerInside ? '#38BDF8' : '#2A374A';
          if (room.type === 'treasure') {
            roomFill = '#92400E';
            roomBorder = '#F59E0B';
          } else if (room.type === 'anomaly') {
            roomFill = '#9F1239';
            roomBorder = '#FB7185';
          } else if (room.type === 'stairs') {
            roomFill = '#0369A1';
            roomBorder = '#38BDF8';
          } else if (room.type === 'boss') {
            roomFill = '#6B21A8';
            roomBorder = '#C084FC';
          }

          return (
            <rect
              key={room.id}
              x={room.x}
              y={room.y}
              width={room.width}
              height={room.height}
              fill={roomFill}
              stroke={roomBorder}
              strokeWidth={isPlayerInside ? '1.2' : '0.6'}
              rx="0.5"
            />
          );
        })}

        {/* Player Position Marker with Subtle Glow */}
        <circle cx={player.x} cy={player.y} r="2.2" fill="rgba(56, 189, 248, 0.25)" />
        <circle cx={player.x} cy={player.y} r="1.3" fill="#38BDF8" />
        {/* Facing Direction Tick */}
        <line
          x1={player.x}
          y1={player.y}
          x2={player.facing === 'right' ? player.x + 2.0 : player.x - 2.0}
          y2={player.y}
          stroke="#FFFFFF"
          strokeWidth="0.8"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );

  return (
    <div
      className="absolute inset-0 pointer-events-none flex flex-col justify-between select-none z-10"
      style={{
        paddingTop: 'max(0.35rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(0.5rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(0.5rem, env(safe-area-inset-right, 0px))',
      }}
    >
      {/* TOP HEADER: Clean 3-column split with clear visual hierarchy */}
      <div className="flex items-start justify-between w-full p-1.5 sm:p-2 md:p-3 gap-1.5 sm:gap-2">
        {/* 1. TOP-LEFT: Player Vitality & Level (Immediate Combat State) */}
        <div className="flex flex-col gap-1 pointer-events-auto max-w-[145px] sm:max-w-[210px] md:max-w-[240px] shrink-0">
          {/* Health Bar with Glassmorphic Bevel */}
          <div className="bg-gradient-to-b from-[#0F1523]/95 via-[#0B0E17]/95 to-[#07090F]/95 border-t border-t-slate-700/60 border-x border-x-slate-800/80 border-b border-b-black/80 rounded-xl p-1.5 sm:p-2 backdrop-blur-md shadow-[0_6px_20px_rgba(0,0,0,0.6)] ring-1 ring-white/5">
            <div className="flex items-center justify-between text-[10px] sm:text-xs mb-0.5 font-mono">
              <span className="flex items-center gap-1 text-rose-400 font-semibold tracking-wide">
                <Heart className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-rose-500/20 text-rose-500 shrink-0" />
                <span className="font-bold">VIDA</span>
              </span>
              <span className="tabular-nums text-slate-100 font-bold">
                {player.stats.hp} / {player.stats.maxHp}
              </span>
            </div>

            <div className="w-full bg-slate-950/90 h-2 sm:h-2.5 rounded-full overflow-hidden relative border border-slate-900 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-rose-700 via-rose-600 to-red-500 transition-all duration-200 shadow-[0_0_8px_rgba(244,63,94,0.4)]"
                style={{ width: `${hpPct}%` }}
              />
              {player.shieldHp > 0 && (
                <div
                  className="absolute inset-y-0 left-0 bg-purple-500/80 border-r border-purple-300 transition-all duration-200 shadow-[0_0_8px_rgba(168,85,247,0.5)]"
                  style={{ width: `${Math.min(100, (player.shieldHp / player.stats.maxHp) * 100)}%` }}
                />
              )}
            </div>

            {/* XP Bar */}
            <div className="flex items-center justify-between text-[9px] sm:text-[10px] mt-1 font-mono text-sky-400">
              <span className="flex items-center gap-1 font-bold">
                <Zap className="w-2.5 h-2.5 text-sky-400 shrink-0" />
                <span>NV {player.stats.level}</span>
              </span>
              <span className="tabular-nums text-slate-400 font-semibold">
                {player.stats.xp}/{player.stats.xpToNextLevel}
              </span>
            </div>
            <div className="w-full bg-slate-950/90 h-1 sm:h-1.5 rounded-full overflow-hidden border border-slate-900 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-sky-600 via-cyan-500 to-sky-400 transition-all duration-300 shadow-[0_0_6px_rgba(56,189,248,0.4)]"
                style={{ width: `${xpPct}%` }}
              />
            </div>
          </div>

          {/* Active Buffs (Scrolls/Elixirs) */}
          {player.activeBuffs && player.activeBuffs.length > 0 && (
            <div className="flex flex-wrap gap-1 pointer-events-none">
              {player.activeBuffs.map((buff) => (
                <span
                  key={buff.id}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[8.5px] font-mono font-bold border backdrop-blur-sm shadow ${
                    buff.type === 'fury'
                      ? 'bg-rose-950/90 text-rose-300 border-rose-700'
                      : buff.type === 'speed'
                      ? 'bg-sky-950/90 text-sky-300 border-sky-700'
                      : 'bg-cyan-950/90 text-cyan-300 border-cyan-700'
                  }`}
                >
                  <span className="truncate max-w-[55px] sm:max-w-[70px]">{buff.name}</span>
                  <span className="tabular-nums text-white">{Math.ceil(buff.timer)}s</span>
                </span>
              ))}
            </div>
          )}

          {/* Desktop Only: Stat summary (Keeps mobile clean) */}
          {!isMobile && (
            <div className="flex items-center gap-2 text-xs text-slate-400 px-1 font-mono mt-0.5">
              <span>ATQ: {player.stats.baseAttack}</span>
              <span aria-hidden="true">·</span>
              <span>DEF: {player.stats.baseDefense}</span>
            </div>
          )}
        </div>

        {/* 2. TOP-CENTER: Fome do Abismo & Floor Bounty & Combo Meter (Compact Center Capsule) */}
        <div className="flex flex-col items-center pointer-events-auto mx-auto max-w-[150px] sm:max-w-[210px] md:max-w-[250px] flex-1 gap-1">
          {/* Abyss Hunger Gauge */}
          <div
            className={`w-full bg-[#090D15]/95 border rounded-lg px-2 py-1 backdrop-blur-sm shadow-xl flex flex-col items-center transition-all ${
              dungeon.hungerLevel >= 4
                ? 'border-purple-600 ring-1 ring-purple-500 animate-pulse'
                : dungeon.hungerLevel >= 3
                ? 'border-rose-600 ring-1 ring-rose-500/50'
                : dungeon.hungerLevel >= 2
                ? 'border-orange-600/70'
                : 'border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between w-full text-[8.5px] sm:text-[10px] font-mono mb-0.5">
              <span className="flex items-center gap-1 font-bold truncate">
                <Flame
                  className={`w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0 ${
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
                {dungeon.isHungerFrozen ? '❄ CONGELADA' : formatTimer(dungeon.floorTimer || 0)}
              </span>
            </div>

            <div className="w-full bg-slate-950 h-1 sm:h-1.5 rounded overflow-hidden border border-slate-900">
              <div
                className={`h-full transition-all duration-300 bg-gradient-to-r ${hungerBarGradient}`}
                style={{ width: `${hungerProgressPct}%` }}
              />
            </div>
          </div>

          {/* Floor Bounty Widget */}
          {currentBounty && (
            <div
              onClick={() => setBountyExpanded(!bountyExpanded)}
              className={`w-full rounded-lg px-2 py-0.5 sm:py-1 border backdrop-blur-md shadow-md cursor-pointer transition-all ${
                currentBounty.isCompleted
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                  : 'bg-[#090D15]/90 border-slate-800 text-slate-300 hover:border-amber-600/50'
              }`}
              title="Toque para ver detalhes da meta"
            >
              <div className="flex items-center justify-between text-[8.5px] sm:text-[9.5px] font-mono">
                <span className="flex items-center gap-1 truncate font-semibold">
                  {currentBounty.isCompleted ? (
                    <Trophy className="w-2.5 h-2.5 text-amber-400 shrink-0 animate-bounce" />
                  ) : (
                    <Target className="w-2.5 h-2.5 text-amber-400/80 shrink-0" />
                  )}
                  <span className="truncate">{currentBounty.title}</span>
                </span>
                <span className="tabular-nums font-bold shrink-0 ml-1">
                  {currentBounty.isCompleted ? (
                    <span className="text-emerald-300">✓ Feito</span>
                  ) : (
                    <span className="text-amber-400">
                      {currentBounty.currentCount}/{currentBounty.targetCount}
                    </span>
                  )}
                </span>
              </div>

              {bountyExpanded && !currentBounty.isCompleted && (
                <div className="text-[8px] text-slate-400 mt-0.5 leading-tight line-clamp-2 border-t border-slate-800/80 pt-0.5">
                  {currentBounty.description} ({currentBounty.rewardText})
                </div>
              )}

              {!currentBounty.isCompleted && (
                <div className="w-full bg-slate-950 h-0.5 sm:h-1 rounded-full overflow-hidden mt-0.5 border border-slate-900">
                  <div
                    className="h-full bg-gradient-to-r from-amber-600 to-yellow-400 transition-all duration-200"
                    style={{
                      width: `${Math.min(
                        100,
                        (currentBounty.currentCount / Math.max(1, currentBounty.targetCount)) * 100
                      )}%`,
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Dynamic Combo Meter (Docked at Top Center, never blocking middle) */}
          {comboCount >= 2 && (
            <div
              className={`w-full flex items-center justify-between gap-1 px-2 py-0.5 rounded-lg border backdrop-blur-md transition-all shadow-lg animate-in fade-in duration-150 ${
                comboCount >= 10
                  ? 'bg-rose-950/90 border-rose-500 ring-1 ring-rose-400'
                  : comboCount >= 8
                  ? 'bg-orange-950/90 border-orange-500'
                  : comboCount >= 5
                  ? 'bg-amber-950/90 border-amber-500'
                  : 'bg-sky-950/90 border-sky-500'
              }`}
            >
              <div className="flex items-center gap-1 truncate">
                <span
                  className={`font-black font-cinzel text-xs tracking-tighter ${
                    comboCount >= 10
                      ? 'text-rose-300 drop-shadow-[0_0_6px_rgba(244,63,94,0.8)]'
                      : comboCount >= 8
                      ? 'text-orange-300'
                      : comboCount >= 5
                      ? 'text-amber-300'
                      : 'text-sky-300'
                  }`}
                >
                  {comboCount}x
                </span>
                <span className="text-[8.5px] font-mono font-bold uppercase truncate text-slate-200">
                  {comboCount >= 10 ? 'Frenesi' : comboCount >= 8 ? 'Massacre' : comboCount >= 5 ? 'Chacina' : 'Combo'}
                </span>
              </div>

              {/* Draining Timer Bar */}
              <div className="w-8 sm:w-10 bg-black/60 h-1 rounded-full overflow-hidden border border-white/10 shrink-0">
                <div
                  className={`h-full rounded-full transition-all duration-75 ${
                    comboCount >= 10
                      ? 'bg-gradient-to-r from-red-500 to-rose-400'
                      : comboCount >= 8
                      ? 'bg-gradient-to-r from-orange-500 to-amber-400'
                      : comboCount >= 5
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-300'
                      : 'bg-gradient-to-r from-sky-500 to-cyan-300'
                  }`}
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(100, (comboTimer / Math.max(0.1, maxComboTimer)) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 3. TOP-RIGHT: Global Action Buttons & Mobile Minimap Dock */}
        <div className="flex flex-col items-end gap-1.5 pointer-events-auto shrink-0">
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Seed / Floor Pill */}
            <button
              onClick={() => {
                soundManager.playButtonClick();
                onOpenSeedShare();
              }}
              title="Compartilhar Andar & Seed"
              className="flex items-center gap-1 bg-[#0F1523]/95 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl px-2 py-1.5 text-[11px] font-mono transition-all shadow-md active:scale-95"
            >
              <Share2 className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="text-amber-400 font-bold">A.{floor}</span>
            </button>

            {/* Mochila (Backpack) */}
            <button
              onClick={() => {
                soundManager.playButtonClick();
                onOpenInventory();
              }}
              title="Mochila"
              className="bg-[#0F1523]/95 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl p-1.5 sm:px-2 sm:py-1.5 transition-all shadow-md active:scale-95 relative"
            >
              <Backpack className="w-3.5 h-3.5 text-cyan-400" />
              {player.inventory.some((i) => i?.isNew) && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 border border-black shadow-[0_0_6px_#22d3ee] animate-pulse"
                  title="Novo item!"
                />
              )}
            </button>

            {/* Minimap Toggle */}
            <button
              onClick={() => {
                soundManager.playButtonClick();
                setMobileMinimapVisible(!mobileMinimapVisible);
              }}
              title={mobileMinimapVisible ? 'Ocultar Mapa' : 'Exibir Mapa'}
              className={`border rounded-xl p-1.5 transition-all shadow-md active:scale-95 ${
                mobileMinimapVisible
                  ? 'border-sky-500/80 bg-sky-950/70 text-sky-300'
                  : 'bg-[#0F1523]/95 border-slate-700/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={handleToggleFullscreen}
              title={isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}
              className="bg-[#0F1523]/95 hover:bg-slate-800 text-slate-300 border border-slate-700/80 rounded-xl p-1.5 transition-all shadow-md active:scale-95"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Pause */}
            <button
              onClick={() => {
                soundManager.playButtonClick();
                onPause();
              }}
              title="Pausar"
              className="bg-[#0F1523]/95 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl p-1.5 transition-all shadow-md active:scale-95"
            >
              <Pause className="w-3.5 h-3.5 text-slate-300" />
            </button>
          </div>

          {/* MOBILE MINIMAP (Clean, non-intrusive dock) */}
          {isMobile && mobileMinimapVisible && (
            <div
              onClick={() => {
                soundManager.playButtonClick();
                setMinimapZoomed(!minimapZoomed);
              }}
              className={`bg-[#080B12]/95 border border-slate-800 rounded-xl p-1 transition-all duration-200 cursor-pointer shadow-2xl relative ${
                minimapZoomed ? 'w-36 h-36 ring-1 ring-sky-500/50' : 'w-20 h-20'
              }`}
              title="Toque para alternar o zoom do minimapa"
            >
              {renderMinimapSvg()}
              <div className="absolute bottom-1 right-1 bg-black/75 rounded px-1 text-[7.5px] font-mono text-slate-400 pointer-events-none">
                {minimapZoomed ? 'Zoom -' : 'Zoom +'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floor Alert if Boss Floor */}
      {floor % 10 === 0 && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-rose-950/85 border border-rose-600/70 text-rose-200 px-3 py-1 rounded-lg text-xs font-cinzel font-bold tracking-widest uppercase shadow-2xl animate-pulse pointer-events-none z-20">
          CÂMARA DA FOME — ANDAR {floor}
        </div>
      )}

      {/* DESKTOP ONLY: Bottom Row (Minimap on Left & Mechanical Skill Bar on Center) */}
      {!isMobile && (
        <div className="flex items-end justify-between w-full p-2 md:p-3">
          {/* Bottom-Left Desktop Minimap */}
          <div className="pointer-events-auto">
            <div
              onClick={() => {
                soundManager.playButtonClick();
                setMinimapZoomed(!minimapZoomed);
              }}
              className={`bg-[#080B12]/95 border border-slate-800 rounded-xl p-1.5 transition-all duration-200 cursor-pointer shadow-2xl ${
                minimapZoomed ? 'w-48 h-48 md:w-56 md:h-56 ring-1 ring-sky-500/40' : 'w-28 h-28 md:w-32 md:h-32'
              }`}
              title="Clique para ampliar o minimapa"
            >
              {renderMinimapSvg()}
            </div>
          </div>

          {/* Bottom-Center Desktop Skill Bar */}
          <div className="pointer-events-auto flex items-center gap-2 bg-gradient-to-b from-[#0F1422]/95 via-[#0B0E17]/95 to-[#07090F]/95 border-t border-t-slate-700/60 border-x border-x-slate-800/80 border-b border-b-black/90 p-2 sm:p-2.5 rounded-2xl backdrop-blur-md shadow-[0_12px_32px_rgba(0,0,0,0.7)] ring-1 ring-white/5 mb-1">
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
                  className={`relative w-12 h-12 rounded-xl border flex flex-col items-center justify-center transition-all ${
                    isCooling
                      ? 'bg-slate-950/80 border-slate-800 text-slate-600 cursor-not-allowed'
                      : idx === 0
                      ? 'bg-gradient-to-b from-slate-800/90 via-[#15120F] to-amber-950/80 border-amber-500/70 hover:border-amber-400 text-amber-200 active:scale-95 shadow-[0_0_12px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/40'
                      : idx === 1
                      ? 'bg-gradient-to-b from-slate-800/90 via-[#0E171E] to-cyan-950/80 border-cyan-500/70 hover:border-cyan-400 text-cyan-200 active:scale-95 shadow-[0_0_12px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400/40'
                      : idx === 2
                      ? 'bg-gradient-to-b from-slate-800/90 via-[#160E1E] to-purple-950/80 border-purple-500/70 hover:border-purple-400 text-purple-200 active:scale-95 shadow-[0_0_12px_rgba(168,85,247,0.25)] ring-1 ring-purple-400/40'
                      : 'bg-gradient-to-b from-slate-800/90 via-[#0E1A16] to-emerald-950/80 border-emerald-500/70 hover:border-emerald-400 text-emerald-200 active:scale-95 shadow-[0_0_12px_rgba(16,185,129,0.25)] ring-1 ring-emerald-400/40'
                  }`}
                  title={`${skill.name} (${skillHotkeys[idx]}): ${skill.description}`}
                >
                  {isCooling && (
                    <div className="absolute inset-0 bg-black/75 rounded-xl flex items-center justify-center text-xs font-mono font-black text-amber-300">
                      {skill.currentCooldown.toFixed(1)}s
                    </div>
                  )}

                  <div className="flex items-center justify-center -mt-1">
                    {idx === 0 && <Swords className="w-4 h-4 text-amber-300" />}
                    {idx === 1 && <Zap className="w-4 h-4 text-cyan-300" />}
                    {idx === 2 && <Sparkles className="w-4 h-4 text-purple-300" />}
                    {idx === 3 && <Shield className="w-4 h-4 text-emerald-300" />}
                  </div>

                  <span className="text-[10px] font-bold font-mono tracking-tight text-center px-1 truncate w-full mt-0.5">
                    {skill.name.split(' ')[0]}
                  </span>

                  <span className="absolute -top-1.5 -right-1 px-1.5 py-0.5 rounded bg-[#07090E] border-t border-slate-600 border-x border-slate-800 border-b-2 border-b-black shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-[8px] font-mono font-black text-slate-300 leading-none">
                    {skillHotkeys[idx]}
                  </span>
                </button>
              );
            })}

            <div className="w-[1px] h-8 bg-slate-800/80 mx-1" />

            {/* Quick Potion slot (Q) */}
            <button
              onClick={() => {
                soundManager.playButtonClick();
                onUsePotion();
              }}
              disabled={player.potionsCount <= 0}
              className={`relative w-12 h-12 rounded-xl border flex flex-col items-center justify-center transition-all ${
                player.potionsCount <= 0
                  ? 'bg-slate-950/80 border-slate-800 text-slate-600'
                  : 'bg-gradient-to-b from-rose-950/70 via-rose-900/50 to-rose-950/90 hover:from-rose-900/80 hover:to-rose-800/80 border-rose-600/70 text-rose-300 active:scale-95 shadow-[0_0_12px_rgba(244,63,94,0.3)] ring-1 ring-rose-500/30'
              }`}
              title="Beber Frasco de Sangue Frio (Tecla Q)"
            >
              <div className="w-6 h-6 flex items-center justify-center -mt-1">
                <ItemIcon item="Frasco de Sangue Frio" size={24} />
              </div>
              <span className="text-[10px] font-mono font-black text-rose-200 mt-0.5">x{player.potionsCount}</span>
              <span className="absolute -top-1.5 -right-1 px-1.5 py-0.5 rounded bg-[#07090E] border-t border-rose-500/80 border-x border-slate-800 border-b-2 border-b-black shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-[8px] font-mono font-black text-rose-300 leading-none">
                Q
              </span>
            </button>

            {/* Quick Scroll slot (E) */}
            <button
              onClick={() => {
                if (firstScroll && onUseScroll) {
                  soundManager.playButtonClick();
                  onUseScroll();
                }
              }}
              disabled={!firstScroll}
              className={`relative w-12 h-12 rounded-xl border flex flex-col items-center justify-center transition-all ${
                !firstScroll
                  ? 'bg-slate-950/60 border-slate-800/80 text-slate-600 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-b from-amber-950/80 via-amber-900/60 to-amber-950/90 hover:from-amber-900 hover:to-amber-800 border-amber-500/80 text-amber-200 active:scale-95 shadow-[0_0_12px_rgba(245,158,11,0.3)] ring-1 ring-amber-400/40'
              }`}
              title={
                firstScroll
                  ? `Ativar ${firstScroll.name} (Tecla E): ${firstScroll.description}`
                  : 'Nenhum pergaminho na mochila (Tecla E)'
              }
            >
              {firstScroll ? (
                <div className="w-6 h-6 flex items-center justify-center -mt-1">
                  <ItemIcon item={firstScroll} size={24} showRarityGlow />
                </div>
              ) : (
                <Sparkles className="w-4 h-4 text-slate-600" />
              )}
              <span className="text-[9px] font-mono font-bold tracking-tight px-0.5 truncate w-full text-center mt-0.5">
                {firstScroll ? (scrollCount > 1 ? `x${scrollCount}` : firstScroll.name.replace(/^Pergaminho\s+(da|do|de)?\s*/i, '').split(' ')[0]) : 'Vazio'}
              </span>
              <span className={`absolute -top-1.5 -right-1 px-1.5 py-0.5 rounded bg-[#07090E] border-t ${firstScroll ? 'border-amber-400' : 'border-slate-700'} border-x border-slate-800 border-b-2 border-b-black shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-[8px] font-mono font-black ${firstScroll ? 'text-amber-300' : 'text-slate-600'} leading-none`}>
                E
              </span>
            </button>

            {/* Quick Elixir slot (R) */}
            <button
              onClick={() => {
                if (firstElixir && onUseElixir) {
                  soundManager.playButtonClick();
                  onUseElixir();
                }
              }}
              disabled={!firstElixir}
              className={`relative w-12 h-12 rounded-xl border flex flex-col items-center justify-center transition-all ${
                !firstElixir
                  ? 'bg-slate-950/60 border-slate-800/80 text-slate-600 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-b from-purple-950/80 via-purple-900/60 to-purple-950/90 hover:from-purple-900 hover:to-purple-800 border-purple-500/80 text-purple-200 active:scale-95 shadow-[0_0_12px_rgba(168,85,247,0.3)] ring-1 ring-purple-400/40'
              }`}
              title={
                firstElixir
                  ? `Consumir ${firstElixir.name} (Tecla R): ${firstElixir.description}`
                  : 'Nenhum elixir na mochila (Tecla R)'
              }
            >
              {firstElixir ? (
                <div className="w-6 h-6 flex items-center justify-center -mt-1">
                  <ItemIcon item={firstElixir} size={24} showRarityGlow />
                </div>
              ) : (
                <Zap className="w-4 h-4 text-slate-600" />
              )}
              <span className="text-[9px] font-mono font-bold tracking-tight px-0.5 truncate w-full text-center mt-0.5">
                {firstElixir ? (elixirCount > 1 ? `x${elixirCount}` : firstElixir.name.replace(/^Elixir\s+(da|do|de)?\s*/i, '').split(' ')[0]) : 'Vazio'}
              </span>
              <span className={`absolute -top-1.5 -right-1 px-1.5 py-0.5 rounded bg-[#07090E] border-t ${firstElixir ? 'border-purple-400' : 'border-slate-700'} border-x border-slate-800 border-b-2 border-b-black shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-[8px] font-mono font-black ${firstElixir ? 'text-purple-300' : 'text-slate-600'} leading-none`}>
                R
              </span>
            </button>
          </div>

          <div className="w-28 md:w-32 flex-shrink-0" />
        </div>
      )}
    </div>
  );
};
