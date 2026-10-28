import React, { useRef, useState, useEffect } from 'react';
import { PlayerState } from '../game/types';
import { Shield, Heart, Sword, Zap, Sparkles, Swords, Flame, Backpack } from 'lucide-react';
import { soundManager } from '../game/audio';
import { ItemIcon } from './ItemIcon';

interface MobileGamepadProps {
  player: PlayerState;
  onMove: (x: number, y: number) => void;
  onAttack: (pressed: boolean) => void;
  onTriggerSkill: (index: number) => void;
  onUsePotion: () => void;
  onUseConsumable?: (index: number) => void;
  onOpenInventory: () => void;
  scale?: number;
  opacity?: number;
}

export const MobileGamepad: React.FC<MobileGamepadProps> = ({
  player,
  onMove,
  onAttack,
  onTriggerSkill,
  onUsePotion,
  onUseConsumable,
  onOpenInventory,
  scale = 1.0,
  opacity = 0.85,
}) => {
  const joystickZoneRef = useRef<HTMLDivElement>(null);
  const [joystickActive, setJoystickActive] = useState(false);
  const [stickOrigin, setStickOrigin] = useState({ x: 0, y: 0 });
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
  const [isAttackPressed, setIsAttackPressed] = useState(false);

  // Dedicated touch IDs to ensure robust multitouch isolation
  const joystickTouchIdRef = useRef<number | null>(null);
  const attackTouchIdRef = useRef<number | null>(null);

  // Scaled radius for joystick movement range
  const radius = Math.max(42, 54 * scale);
  const DEADZONE = 0.12;

  const triggerHaptic = (ms = 12) => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(ms);
      } catch {
        // Safe fallback if unsupported or blocked
      }
    }
  };

  // Joystick Touch Handlers with Independent Identifier Tracking
  const handleJoystickTouchStart = (e: React.TouchEvent) => {
    if (joystickTouchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    joystickTouchIdRef.current = touch.identifier;

    const rect = joystickZoneRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Origin within zone, clamped safely away from extreme edges
    const rawX = touch.clientX - rect.left;
    const rawY = touch.clientY - rect.top;
    const clampedOx = Math.max(radius, Math.min(rect.width - radius, rawX));
    const clampedOy = Math.max(radius, Math.min(rect.height - radius, rawY));

    setStickOrigin({ x: clampedOx, y: clampedOy });
    setStickPos({ x: 0, y: 0 });
    setJoystickActive(true);
    onMove(0, 0);
  };

  const handleJoystickTouchMove = (e: React.TouchEvent) => {
    if (joystickTouchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchIdRef.current) {
        const rect = joystickZoneRef.current?.getBoundingClientRect();
        if (!rect) return;

        const currentX = touch.clientX - rect.left;
        const currentY = touch.clientY - rect.top;

        const dx = currentX - stickOrigin.x;
        const dy = currentY - stickOrigin.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= radius * DEADZONE) {
          setStickPos({ x: 0, y: 0 });
          onMove(0, 0);
        } else {
          // Linear analog response beyond deadzone
          const effectiveRadius = radius * (1 - DEADZONE);
          const effectiveDist = Math.min(radius, dist) - radius * DEADZONE;
          const factor = Math.min(1, effectiveDist / effectiveRadius);

          const clampedX = (dx / dist) * Math.min(radius, dist);
          const clampedY = (dy / dist) * Math.min(radius, dist);

          setStickPos({ x: clampedX, y: clampedY });
          onMove((dx / dist) * factor, (dy / dist) * factor);
        }
        break;
      }
    }
  };

  const handleJoystickTouchEnd = (e: React.TouchEvent | TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchIdRef.current) {
        joystickTouchIdRef.current = null;
        setJoystickActive(false);
        setStickPos({ x: 0, y: 0 });
        onMove(0, 0);
        break;
      }
    }
  };

  // Window-level safety listeners to ensure neither joystick nor attack ever gets stuck
  useEffect(() => {
    const handleGlobalTouchEnd = (e: TouchEvent) => {
      // Check joystick touch
      if (joystickTouchIdRef.current !== null) {
        handleJoystickTouchEnd(e);
      }
      // Check attack touch
      if (attackTouchIdRef.current !== null) {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === attackTouchIdRef.current) {
            attackTouchIdRef.current = null;
            setIsAttackPressed(false);
            onAttack(false);
            break;
          }
        }
      }
    };

    const handleGlobalBlur = () => {
      joystickTouchIdRef.current = null;
      attackTouchIdRef.current = null;
      setJoystickActive(false);
      setStickPos({ x: 0, y: 0 });
      setIsAttackPressed(false);
      onMove(0, 0);
      onAttack(false);
    };

    window.addEventListener('touchend', handleGlobalTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleGlobalTouchEnd, { passive: true });
    window.addEventListener('blur', handleGlobalBlur);

    return () => {
      window.removeEventListener('touchend', handleGlobalTouchEnd);
      window.removeEventListener('touchcancel', handleGlobalTouchEnd);
      window.removeEventListener('blur', handleGlobalBlur);
      onMove(0, 0);
      onAttack(false);
    };
  }, [onMove, onAttack]);

  const isLowHp = player.stats.hp <= player.stats.maxHp * 0.35;

  const quickConsumableIndex = player.inventory.findIndex(
    (item) => item !== null && (item.type === 'scroll' || item.type === 'elixir')
  );
  const quickConsumable = quickConsumableIndex !== -1 ? player.inventory[quickConsumableIndex] : null;

  // Radial cooldown indicator ring with amber progress
  const renderCooldownRing = (currentCooldown: number, maxCooldown: number, size = 48) => {
    if (currentCooldown <= 0) return null;
    const r = (size - 6) / 2;
    const circumference = 2 * Math.PI * r;
    const progress = Math.max(0, Math.min(1, currentCooldown / Math.max(0.1, maxCooldown)));
    const strokeDashoffset = circumference * (1 - progress);

    return (
      <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="rgba(5, 7, 13, 0.82)"
          stroke="rgba(30, 41, 59, 0.7)"
          strokeWidth="3.5"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#F59E0B"
          strokeWidth="3.5"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
    );
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 pointer-events-none select-none z-20 flex justify-between items-end touch-none"
      style={{
        opacity,
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))',
      }}
    >
      {/* LEFT: Dynamic Touch Joystick with Arcane Runic Theme */}
      <div
        ref={joystickZoneRef}
        onTouchStart={handleJoystickTouchStart}
        onTouchMove={handleJoystickTouchMove}
        onTouchEnd={handleJoystickTouchEnd}
        onTouchCancel={handleJoystickTouchEnd}
        className="pointer-events-auto w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48 relative touch-none flex items-center justify-center m-1"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'bottom left',
        }}
      >
        {joystickActive ? (
          <div
            className="absolute rounded-full border border-cyan-400/50 bg-[#070B14]/85 pointer-events-none shadow-[0_0_24px_rgba(6,182,212,0.3)] ring-1 ring-cyan-500/30 backdrop-blur-sm"
            style={{
              left: stickOrigin.x - radius,
              top: stickOrigin.y - radius,
              width: radius * 2,
              height: radius * 2,
            }}
          >
            {/* Concentric Runic Rings */}
            <div className="absolute inset-2 rounded-full border border-slate-700/50" />
            <div className="absolute inset-5 rounded-full border border-dashed border-cyan-500/25" />

            {/* Guide Crosshairs */}
            <div className="absolute inset-x-2 top-1/2 h-[1px] bg-cyan-500/30 -translate-y-1/2" />
            <div className="absolute inset-y-2 left-1/2 w-[1px] bg-cyan-500/30 -translate-x-1/2" />
            <span className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[8px] text-cyan-400/70 font-mono">✦</span>
            <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] text-cyan-400/70 font-mono">✦</span>
            <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] text-cyan-400/70 font-mono">✦</span>
            <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] text-cyan-400/70 font-mono">✦</span>

            {/* Connecting Beam */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <line
                x1={radius}
                y1={radius}
                x2={radius + stickPos.x}
                y2={radius + stickPos.y}
                stroke="#22D3EE"
                strokeWidth="2"
                strokeOpacity="0.45"
                strokeDasharray="3 3"
              />
            </svg>

            {/* Inner Thumb Knob */}
            <div
              className="absolute w-12 h-12 rounded-full bg-gradient-to-br from-slate-900 via-[#0B1528] to-cyan-950 border-2 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.7)] flex items-center justify-center"
              style={{
                left: radius - 24 + stickPos.x,
                top: radius - 24 + stickPos.y,
              }}
            >
              <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-cyan-400 to-sky-200 shadow-[0_0_8px_#38bdf8] flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />
              </div>
            </div>
          </div>
        ) : (
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border border-slate-700/60 bg-[#070B14]/65 flex flex-col items-center justify-center backdrop-blur-sm shadow-xl ring-1 ring-cyan-500/20 group">
            <div className="w-16 h-16 rounded-full border border-dashed border-cyan-500/30 flex flex-col items-center justify-center">
              <span className="text-cyan-400 text-xs font-mono font-bold animate-pulse">✦</span>
              <span className="text-[9px] font-cinzel text-slate-300 uppercase tracking-widest font-bold mt-0.5">
                Mover
              </span>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Ergonomic Combat Cluster & Radial Skill Arc */}
      <div
        className="pointer-events-auto flex items-end justify-end touch-none m-1 gap-2"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'bottom right',
        }}
      >
        {/* Quick Utility Column: Potion, Consumable & Backpack */}
        <div className="flex flex-col gap-2 mb-1 items-center">
          {/* Quick Consumable (Scroll or Elixir) if held */}
          {quickConsumable && (
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                if (onUseConsumable && quickConsumableIndex !== -1) {
                  triggerHaptic(20);
                  soundManager.playButtonClick();
                  onUseConsumable(quickConsumableIndex);
                }
              }}
              className={`w-11 h-11 rounded-full border flex flex-col items-center justify-center shadow-lg active:scale-90 transition-transform overflow-hidden ${
                quickConsumable.type === 'scroll'
                  ? 'bg-gradient-to-tr from-amber-950 via-amber-900 to-amber-700 border-amber-500 text-amber-200 ring-1 ring-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                  : 'bg-gradient-to-tr from-purple-950 via-purple-900 to-indigo-800 border-purple-500 text-purple-200 ring-1 ring-purple-400/60 shadow-[0_0_12px_rgba(168,85,247,0.35)]'
              }`}
              title={`Ativar ${quickConsumable.name}`}
            >
              <ItemIcon item={quickConsumable} size={22} showRarityGlow />
              <span className="text-[7px] font-mono font-bold uppercase truncate max-w-[38px] leading-none mt-0.5">
                {quickConsumable.type === 'scroll' ? 'Perg' : 'Elixir'}
              </span>
            </button>
          )}

          {/* Quick Potion Button */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              if (player.potionsCount > 0) {
                triggerHaptic(18);
                soundManager.playButtonClick();
                onUsePotion();
              }
            }}
            disabled={player.potionsCount <= 0}
            className={`w-12 h-12 rounded-full border flex flex-col items-center justify-center shadow-xl active:scale-90 transition-all relative ${
              player.potionsCount <= 0
                ? 'bg-slate-950/80 border-slate-800 text-slate-600 opacity-60'
                : isLowHp
                ? 'bg-gradient-to-tr from-rose-950 via-rose-900 to-red-600 border-rose-500 text-rose-100 animate-pulse ring-2 ring-rose-500 shadow-[0_0_18px_rgba(244,63,94,0.6)]'
                : 'bg-gradient-to-tr from-[#16060A] via-rose-950 to-rose-900/90 border-rose-700/80 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.35)]'
            }`}
            title="Beber Frasco de Vida"
          >
            <div className="w-5 h-5 flex items-center justify-center -mt-0.5">
              <ItemIcon item="Frasco de Sangue Frio" size={22} />
            </div>
            <span className="text-[10px] font-mono font-extrabold leading-none text-rose-200">
              x{player.potionsCount}
            </span>
          </button>

          {/* Backpack Shortcut Button */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              triggerHaptic(10);
              soundManager.playButtonClick();
              onOpenInventory();
            }}
            className="w-10 h-10 rounded-full bg-[#0D131F]/90 active:bg-slate-700 border border-slate-700/80 text-slate-300 flex items-center justify-center shadow-md active:scale-90 transition-transform relative"
            title="Abrir Mochila"
          >
            <Backpack className="w-4 h-4 text-cyan-400" />
            {player.inventory.some((i) => i?.isNew) && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-cyan-400 border border-black shadow-[0_0_8px_#22d3ee] animate-pulse" />
            )}
          </button>
        </div>

        {/* Ergonomic Natural Thumb Sweep Arc: 4 Skills + Large Primary Attack Button */}
        <div className="relative w-44 h-44 sm:w-48 sm:h-48">
          {/* Skill 1 (Cleave / Talho Giratório) — Top of the primary button */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              if (player.skills[0]?.currentCooldown <= 0) {
                triggerHaptic(15);
                soundManager.playButtonClick();
                onTriggerSkill(0);
              }
            }}
            disabled={player.skills[0]?.currentCooldown > 0}
            className={`absolute top-0 right-10 sm:right-12 w-12 h-12 rounded-full border flex items-center justify-center text-xs font-bold font-mono shadow-md active:scale-90 transition-all overflow-hidden ${
              player.skills[0]?.currentCooldown > 0
                ? 'bg-slate-950 border-slate-800 text-slate-600'
                : 'bg-gradient-to-tr from-slate-950 via-slate-900 to-amber-950/90 border-amber-500/80 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.35)] ring-1 ring-amber-400/40'
            }`}
            title={player.skills[0]?.name}
          >
            {renderCooldownRing(player.skills[0]?.currentCooldown || 0, player.skills[0]?.cooldown || 1, 48)}
            {player.skills[0]?.currentCooldown > 0 ? (
              <span className="text-[10px] text-amber-300 font-mono font-bold relative z-10">
                {player.skills[0].currentCooldown.toFixed(1)}
              </span>
            ) : (
              <Swords className="w-5 h-5 text-amber-300 relative z-10" />
            )}
          </button>

          {/* Skill 2 (Dash / Investida Sombria) — Upper-left arc */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              if (player.skills[1]?.currentCooldown <= 0) {
                triggerHaptic(15);
                soundManager.playButtonClick();
                onTriggerSkill(1);
              }
            }}
            disabled={player.skills[1]?.currentCooldown > 0}
            className={`absolute top-5 left-4 sm:top-6 sm:left-5 w-12 h-12 rounded-full border flex items-center justify-center text-xs font-bold font-mono shadow-md active:scale-90 transition-all overflow-hidden ${
              player.skills[1]?.currentCooldown > 0
                ? 'bg-slate-950 border-slate-800 text-slate-600'
                : 'bg-gradient-to-tr from-slate-950 via-slate-900 to-cyan-950/90 border-cyan-500/80 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.35)] ring-1 ring-cyan-400/40'
            }`}
            title={player.skills[1]?.name}
          >
            {renderCooldownRing(player.skills[1]?.currentCooldown || 0, player.skills[1]?.cooldown || 1, 48)}
            {player.skills[1]?.currentCooldown > 0 ? (
              <span className="text-[10px] text-cyan-300 font-mono font-bold relative z-10">
                {player.skills[1].currentCooldown.toFixed(1)}
              </span>
            ) : (
              <Zap className="w-5 h-5 text-cyan-300 relative z-10" />
            )}
          </button>

          {/* Skill 3 (Pulse / Pulso do Vazio) — Mid-left arc */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              if (player.skills[2]?.currentCooldown <= 0) {
                triggerHaptic(15);
                soundManager.playButtonClick();
                onTriggerSkill(2);
              }
            }}
            disabled={player.skills[2]?.currentCooldown > 0}
            className={`absolute bottom-14 left-0 sm:bottom-16 sm:left-0 w-12 h-12 rounded-full border flex items-center justify-center text-xs font-bold font-mono shadow-md active:scale-90 transition-all overflow-hidden ${
              player.skills[2]?.currentCooldown > 0
                ? 'bg-slate-950 border-slate-800 text-slate-600'
                : 'bg-gradient-to-tr from-slate-950 via-slate-900 to-purple-950/90 border-purple-500/80 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.35)] ring-1 ring-purple-400/40'
            }`}
            title={player.skills[2]?.name}
          >
            {renderCooldownRing(player.skills[2]?.currentCooldown || 0, player.skills[2]?.cooldown || 1, 48)}
            {player.skills[2]?.currentCooldown > 0 ? (
              <span className="text-[10px] text-purple-300 font-mono font-bold relative z-10">
                {player.skills[2].currentCooldown.toFixed(1)}
              </span>
            ) : (
              <Sparkles className="w-5 h-5 text-purple-300 relative z-10" />
            )}
          </button>

          {/* Skill 4 (Shield / Égide Espiritual) — Lower-left arc */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              if (player.skills[3]?.currentCooldown <= 0) {
                triggerHaptic(15);
                soundManager.playButtonClick();
                onTriggerSkill(3);
              }
            }}
            disabled={player.skills[3]?.currentCooldown > 0}
            className={`absolute bottom-0 left-10 sm:bottom-0 sm:left-12 w-12 h-12 rounded-full border flex items-center justify-center text-xs font-bold font-mono shadow-md active:scale-90 transition-all overflow-hidden ${
              player.skills[3]?.currentCooldown > 0
                ? 'bg-slate-950 border-slate-800 text-slate-600'
                : 'bg-gradient-to-tr from-slate-950 via-slate-900 to-emerald-950/90 border-emerald-500/80 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.35)] ring-1 ring-emerald-400/40'
            }`}
            title={player.skills[3]?.name}
          >
            {renderCooldownRing(player.skills[3]?.currentCooldown || 0, player.skills[3]?.cooldown || 1, 48)}
            {player.skills[3]?.currentCooldown > 0 ? (
              <span className="text-[10px] text-emerald-300 font-mono font-bold relative z-10">
                {player.skills[3].currentCooldown.toFixed(1)}
              </span>
            ) : (
              <Shield className="w-5 h-5 text-emerald-300 relative z-10" />
            )}
          </button>

          {/* Primary Attack Button (Large prominent strike pad in natural thumb rest zone) */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              if (attackTouchIdRef.current === null && e.changedTouches[0]) {
                attackTouchIdRef.current = e.changedTouches[0].identifier;
              }
              setIsAttackPressed(true);
              triggerHaptic(16);
              onAttack(true);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              attackTouchIdRef.current = null;
              setIsAttackPressed(false);
              onAttack(false);
            }}
            onTouchCancel={(e) => {
              e.preventDefault();
              attackTouchIdRef.current = null;
              setIsAttackPressed(false);
              onAttack(false);
            }}
            onContextMenu={(e) => e.preventDefault()}
            className={`absolute bottom-0 right-0 w-20 h-20 sm:w-22 sm:h-22 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-75 overflow-hidden ${
              isAttackPressed
                ? 'bg-gradient-to-tr from-rose-600 via-red-500 to-amber-500 border-2 border-amber-300 scale-92 ring-4 ring-rose-400 shadow-[0_0_32px_rgba(244,63,94,0.9)]'
                : 'bg-gradient-to-tr from-[#1E0911] via-rose-950 to-rose-900 border-2 border-rose-500/90 shadow-[0_0_24px_rgba(244,63,94,0.45)] ring-2 ring-rose-400/30'
            }`}
            title="Golpear (Segure para ataque contínuo)"
          >
            {/* Concentric etched inner ring */}
            <div className="absolute inset-1.5 rounded-full border border-rose-400/25 pointer-events-none" />

            <Sword
              className={`w-8 h-8 transition-transform duration-75 ${
                isAttackPressed ? 'scale-115 -rotate-12 text-amber-100 drop-shadow-[0_0_8px_#fbbf24]' : 'text-rose-100'
              }`}
            />
            <span
              className={`text-[9px] sm:text-[10px] font-mono tracking-wider uppercase font-extrabold mt-0.5 transition-colors ${
                isAttackPressed ? 'text-amber-100' : 'text-white'
              }`}
            >
              Golpear
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
