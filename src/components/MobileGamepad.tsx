import React, { useRef, useState, useEffect } from 'react';
import { PlayerState } from '../game/types';
import { Shield, Heart, Sword } from 'lucide-react';
import { soundManager } from '../game/audio';

interface MobileGamepadProps {
  player: PlayerState;
  onMove: (x: number, y: number) => void;
  onAttack: (pressed: boolean) => void;
  onTriggerSkill: (index: number) => void;
  onUsePotion: () => void;
  onOpenInventory: () => void;
  scale: number;
  opacity: number;
}

export const MobileGamepad: React.FC<MobileGamepadProps> = ({
  player,
  onMove,
  onAttack,
  onTriggerSkill,
  onUsePotion,
  onOpenInventory,
  scale = 1.0,
  opacity = 0.75,
}) => {
  const joystickZoneRef = useRef<HTMLDivElement>(null);
  const [joystickActive, setJoystickActive] = useState(false);
  const [stickOrigin, setStickOrigin] = useState({ x: 0, y: 0 });
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
  const touchIdRef = useRef<number | null>(null);

  const radius = 55 * scale;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;

    const rect = joystickZoneRef.current?.getBoundingClientRect();
    if (!rect) return;

    const ox = touch.clientX - rect.left;
    const oy = touch.clientY - rect.top;

    setStickOrigin({ x: ox, y: oy });
    setStickPos({ x: 0, y: 0 });
    setJoystickActive(true);
    onMove(0, 0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        const rect = joystickZoneRef.current?.getBoundingClientRect();
        if (!rect) return;

        const currentX = touch.clientX - rect.left;
        const currentY = touch.clientY - rect.top;

        const dx = currentX - stickOrigin.x;
        const dy = currentY - stickOrigin.y;
        const dist = Math.hypot(dx, dy);

        let clampedX = dx;
        let clampedY = dy;
        if (dist > radius) {
          clampedX = (dx / dist) * radius;
          clampedY = (dy / dist) * radius;
        }

        setStickPos({ x: clampedX, y: clampedY });
        onMove(clampedX / radius, clampedY / radius);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setJoystickActive(false);
        setStickPos({ x: 0, y: 0 });
        onMove(0, 0);
        break;
      }
    }
  };

  return (
    <div
      className="absolute inset-x-0 bottom-0 pointer-events-none select-none z-20 flex justify-between items-end p-4 pb-6"
      style={{ opacity }}
    >
      {/* Left: Dynamic Joystick Zone */}
      <div
        ref={joystickZoneRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="pointer-events-auto w-48 h-48 sm:w-56 sm:h-56 relative touch-none flex items-center justify-center"
      >
        {/* Resting or active joystick visual */}
        {joystickActive ? (
          <div
            className="absolute rounded-full border-2 border-slate-600/60 bg-slate-900/40 pointer-events-none transition-transform"
            style={{
              left: stickOrigin.x - radius,
              top: stickOrigin.y - radius,
              width: radius * 2,
              height: radius * 2,
            }}
          >
            {/* Inner Knob */}
            <div
              className="absolute w-12 h-12 rounded-full bg-slate-300/80 border border-white/60 shadow-lg"
              style={{
                left: radius - 24 + stickPos.x,
                top: radius - 24 + stickPos.y,
              }}
            />
          </div>
        ) : (
          <div className="w-24 h-24 rounded-full border border-dashed border-slate-700/60 bg-slate-900/20 flex items-center justify-center">
            <span className="text-[10px] font-mono text-slate-500 tracking-wider uppercase">Mover</span>
          </div>
        )}
      </div>

      {/* Right: Action Buttons (Attack, 4 Skills, Potion, Inventory) */}
      <div className="pointer-events-auto flex items-end justify-end gap-3 touch-none">
        {/* Quick Utility Column: Potion & Bag */}
        <div className="flex flex-col gap-2 mb-2">
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              soundManager.playButtonClick();
              onOpenInventory();
            }}
            className="w-12 h-12 rounded-full bg-[#18202F] active:bg-slate-700 border border-slate-700 text-slate-300 flex items-center justify-center shadow-lg"
            title="Mochila"
          >
            <Shield className="w-5 h-5 text-slate-300" />
          </button>

          <button
            onTouchStart={(e) => {
              e.preventDefault();
              soundManager.playButtonClick();
              onUsePotion();
            }}
            disabled={player.potionsCount <= 0}
            className={`w-12 h-12 rounded-full border flex flex-col items-center justify-center shadow-lg active:scale-95 ${
              player.potionsCount <= 0
                ? 'bg-slate-900 border-slate-800 text-slate-600'
                : 'bg-rose-950/80 border-rose-700 text-rose-300'
            }`}
          >
            <Heart className="w-4 h-4 fill-rose-500/40 text-rose-400" />
            <span className="text-[9px] font-mono font-bold">{player.potionsCount}</span>
          </button>
        </div>

        {/* 4 Skills in Arc + Primary Attack Button */}
        <div className="relative w-44 h-44 sm:w-52 sm:h-52">
          {/* Skill 1 (Cleave) */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              soundManager.playButtonClick();
              onTriggerSkill(0);
            }}
            disabled={player.skills[0]?.currentCooldown > 0}
            className={`absolute top-0 right-16 w-11 h-11 rounded-full border flex items-center justify-center text-xs font-bold font-mono shadow-md ${
              player.skills[0]?.currentCooldown > 0
                ? 'bg-slate-900 border-slate-800 text-slate-600'
                : 'bg-slate-800 border-slate-600 text-slate-200 active:bg-slate-700'
            }`}
          >
            {player.skills[0]?.currentCooldown > 0 ? (
              <span className="text-[10px] text-amber-400 font-mono">
                {player.skills[0].currentCooldown.toFixed(1)}
              </span>
            ) : (
              'I'
            )}
          </button>

          {/* Skill 2 (Dash) */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              soundManager.playButtonClick();
              onTriggerSkill(1);
            }}
            disabled={player.skills[1]?.currentCooldown > 0}
            className={`absolute top-6 left-4 w-11 h-11 rounded-full border flex items-center justify-center text-xs font-bold font-mono shadow-md ${
              player.skills[1]?.currentCooldown > 0
                ? 'bg-slate-900 border-slate-800 text-slate-600'
                : 'bg-slate-800 border-slate-600 text-slate-200 active:bg-slate-700'
            }`}
          >
            {player.skills[1]?.currentCooldown > 0 ? (
              <span className="text-[10px] text-amber-400 font-mono">
                {player.skills[1].currentCooldown.toFixed(1)}
              </span>
            ) : (
              'II'
            )}
          </button>

          {/* Skill 3 (Pulse) */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              soundManager.playButtonClick();
              onTriggerSkill(2);
            }}
            disabled={player.skills[2]?.currentCooldown > 0}
            className={`absolute bottom-14 left-0 w-11 h-11 rounded-full border flex items-center justify-center text-xs font-bold font-mono shadow-md ${
              player.skills[2]?.currentCooldown > 0
                ? 'bg-slate-900 border-slate-800 text-slate-600'
                : 'bg-slate-800 border-slate-600 text-slate-200 active:bg-slate-700'
            }`}
          >
            {player.skills[2]?.currentCooldown > 0 ? (
              <span className="text-[10px] text-amber-400 font-mono">
                {player.skills[2].currentCooldown.toFixed(1)}
              </span>
            ) : (
              'III'
            )}
          </button>

          {/* Skill 4 (Shield) */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              soundManager.playButtonClick();
              onTriggerSkill(3);
            }}
            disabled={player.skills[3]?.currentCooldown > 0}
            className={`absolute bottom-0 left-10 w-11 h-11 rounded-full border flex items-center justify-center text-xs font-bold font-mono shadow-md ${
              player.skills[3]?.currentCooldown > 0
                ? 'bg-slate-900 border-slate-800 text-slate-600'
                : 'bg-slate-800 border-slate-600 text-slate-200 active:bg-slate-700'
            }`}
          >
            {player.skills[3]?.currentCooldown > 0 ? (
              <span className="text-[10px] text-amber-400 font-mono">
                {player.skills[3].currentCooldown.toFixed(1)}
              </span>
            ) : (
              'IV'
            )}
          </button>

          {/* Primary Attack Button (Center large) */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              onAttack(true);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              onAttack(false);
            }}
            className="absolute bottom-2 right-2 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-rose-900 to-rose-700 border-2 border-rose-500 text-white flex flex-col items-center justify-center shadow-2xl active:scale-95 transition-transform"
          >
            <Sword className="w-8 h-8 text-rose-100" />
            <span className="text-[10px] font-mono tracking-wider uppercase font-bold mt-0.5">Golpear</span>
          </button>
        </div>
      </div>
    </div>
  );
};
