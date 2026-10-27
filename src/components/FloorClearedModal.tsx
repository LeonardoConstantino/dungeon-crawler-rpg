import React, { useState, useEffect, useRef } from 'react';
import { FloorClearSummary } from '../game/types';
import { soundManager } from '../game/audio';
import { Heart, Sparkles, Skull, Clock, Flame, ChevronRight, Check } from 'lucide-react';

interface FloorClearedModalProps {
  summary: FloorClearSummary;
  onContinue: (choice: 'heal' | 'remnants') => void;
}

export const FloorClearedModal: React.FC<FloorClearedModalProps> = ({
  summary,
  onContinue,
}) => {
  const [selectedReward, setSelectedReward] = useState<'heal' | 'remnants'>('heal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedRewardRef = useRef(selectedReward);
  selectedRewardRef.current = selectedReward;

  const onContinueRef = useRef(onContinue);
  onContinueRef.current = onContinue;

  // 1. Play fanfare ONLY ONCE when the modal opens
  useEffect(() => {
    soundManager.playFloorClear();
  }, []);

  // 2. Stable keyboard navigation without causing re-mounts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Digit1' || e.code === 'KeyH') {
        setSelectedReward('heal');
      } else if (e.code === 'Digit2' || e.code === 'KeyV') {
        setSelectedReward('remnants');
      } else if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        if (!isSubmitting) {
          setIsSubmitting(true);
          soundManager.playButtonClick();
          onContinueRef.current(selectedRewardRef.current);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const getHungerColor = (level: number) => {
    if (level === 0) return 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20';
    if (level === 1) return 'text-amber-400 border-amber-500/30 bg-amber-950/20';
    if (level === 2) return 'text-orange-400 border-orange-500/30 bg-orange-950/20';
    return 'text-rose-400 border-rose-500/30 bg-rose-950/20';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none">
      <div className="relative w-full max-w-lg rounded-2xl bg-gradient-to-b from-[#141b2d] via-[#0d121f] to-[#070a12] border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden p-6 sm:p-7">
        {/* Top ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-cyan-500/10 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider mb-2.5 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Marco do Abismo</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-sky-100 to-indigo-200 font-serif drop-shadow">
            ANDAR {summary.floorCompleted} SUPERADO!
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-sm mx-auto">
            A escuridão recua temporariamente. Escolha uma dádiva antes de descer as escadas.
          </p>
        </div>

        {/* Floor Stats Bar */}
        <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-900/70 border border-slate-800 mb-6 text-center">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-slate-400 text-[11px] mb-0.5">
              <Skull className="w-3.5 h-3.5 text-rose-400" />
              <span>Inimigos</span>
            </div>
            <span className="text-sm sm:text-base font-bold font-mono text-slate-200">
              {summary.enemiesKilled}
            </span>
          </div>

          <div className="flex flex-col items-center border-x border-slate-800/80 px-2">
            <div className="flex items-center gap-1 text-slate-400 text-[11px] mb-0.5">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>Tempo</span>
            </div>
            <span className="text-sm sm:text-base font-bold font-mono text-slate-200">
              {formatTime(summary.timeSpentSeconds)}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-slate-400 text-[11px] mb-0.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Fome</span>
            </div>
            <span className={`text-[10px] sm:text-xs font-bold font-mono px-1.5 py-0.5 rounded border truncate max-w-full ${getHungerColor(summary.hungerLevel)}`}>
              {summary.hungerStatus.split(' ')[0]}
            </span>
          </div>
        </div>

        {/* Reward Choice Cards */}
        <div className="mb-6">
          <span className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold mb-2.5">
            Selecione sua Recompensa de Travessia:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Choice 1: Heal HP */}
            <button
              onClick={() => {
                soundManager.playButtonClick();
                setSelectedReward('heal');
              }}
              className={`relative p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                selectedReward === 'heal'
                  ? 'bg-emerald-950/40 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.25)] ring-1 ring-emerald-400'
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-emerald-900/40 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
                  <Heart className="w-5 h-5 fill-emerald-500/30 text-emerald-400" />
                </div>
                {selectedReward === 'heal' && (
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-100 uppercase tracking-tight">
                  Descanso das Sombras
                </span>
                <span className="text-base sm:text-lg font-black font-mono text-emerald-400 block mt-0.5">
                  +{summary.healAmount} HP
                </span>
                <span className="text-[10px] text-slate-400 leading-tight block mt-1">
                  Restaura 35% da sua vida máxima imediatamente.
                </span>
              </div>
            </button>

            {/* Choice 2: Remnants for Ascension */}
            <button
              onClick={() => {
                soundManager.playButtonClick();
                setSelectedReward('remnants');
              }}
              className={`relative p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                selectedReward === 'remnants'
                  ? 'bg-purple-950/40 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.25)] ring-1 ring-purple-400'
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-purple-900/40 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </div>
                {selectedReward === 'remnants' && (
                  <div className="w-5 h-5 rounded-full bg-purple-500 text-slate-950 flex items-center justify-center shadow">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-100 uppercase tracking-tight">
                  Tributo do Vazio
                </span>
                <span className="text-base sm:text-lg font-black font-mono text-purple-400 block mt-0.5">
                  +{summary.remnantsAmount} Vestígios
                </span>
                <span className="text-[10px] text-slate-400 leading-tight block mt-1">
                  Pontos permanentes para evoluir o Santuário de Ascensão.
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Action Button */}
        <button
          disabled={isSubmitting}
          onClick={() => {
            if (isSubmitting) return;
            setIsSubmitting(true);
            soundManager.playButtonClick();
            onContinue(selectedReward);
          }}
          className={`w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-mono font-bold text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-cyan-900/30 flex items-center justify-center gap-2 active:scale-[0.99] transition-all ring-1 ring-cyan-300/40 cursor-pointer ${
            isSubmitting ? 'opacity-60 pointer-events-none' : ''
          }`}
        >
          <span>{isSubmitting ? 'Descendo...' : `Descer para o Andar ${summary.nextFloor}`}</span>
          <ChevronRight className="w-4 h-4 stroke-[2.5]" />
        </button>

        <span className="block text-center text-[10px] font-mono text-slate-500 mt-2.5">
          Dica: Pressione [Espaço] ou [Enter] para confirmar
        </span>
      </div>
    </div>
  );
};
