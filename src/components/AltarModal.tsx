import React, { useEffect, useState } from 'react';
import { AltarOffer, VoidPact } from '../game/types';
import { soundManager } from '../game/audio';
import { Flame, Skull, Zap, Sparkles, X, ChevronRight, ShieldAlert, Award } from 'lucide-react';

interface AltarModalProps {
  offer: AltarOffer;
  onAccept: (pact: VoidPact) => void;
  onDecline: () => void;
}

export const AltarModal: React.FC<AltarModalProps> = ({
  offer,
  onAccept,
  onDecline,
}) => {
  const [selectedPact, setSelectedPact] = useState<VoidPact>(offer.pacts[0]);

  useEffect(() => {
    soundManager.playVoidPulse();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Digit1') {
        if (offer.pacts[0]) setSelectedPact(offer.pacts[0]);
      } else if (e.code === 'Digit2') {
        if (offer.pacts[1]) setSelectedPact(offer.pacts[1]);
      } else if (e.code === 'Escape') {
        e.preventDefault();
        onDecline();
      } else if (e.code === 'Enter') {
        e.preventDefault();
        onAccept(selectedPact);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPact, offer.pacts, onAccept, onDecline]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-gradient-to-b from-[#181124] via-[#0f0c18] to-[#08060c] border border-purple-500/40 shadow-[0_0_60px_rgba(168,85,247,0.2)] overflow-hidden p-6 sm:p-7">
        {/* Top ambient purple flame glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-28 bg-purple-600/15 blur-3xl pointer-events-none" />

        {/* Close / Decline icon */}
        <button
          onClick={onDecline}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          title="Recusar Pacto (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/70 border border-purple-500/50 text-purple-300 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider mb-2.5 shadow-sm">
            <Flame className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            <span>Altar das Profundezas</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-pink-100 to-indigo-200 font-serif drop-shadow">
            PACTO COM O VAZIO
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-sm mx-auto">
            O Abismo exige um tributo pelo seu poder. Todo dom vem acompanhado de uma maldição.
          </p>
        </div>

        {/* Pact Choices */}
        <div className="flex flex-col gap-3.5 mb-6">
          {offer.pacts.map((pact, idx) => {
            const isSelected = selectedPact.id === pact.id;
            return (
              <button
                key={pact.id}
                onClick={() => {
                  soundManager.playButtonClick();
                  setSelectedPact(pact);
                }}
                className={`relative p-4 rounded-xl border text-left transition-all flex flex-col gap-2 ${
                  isSelected
                    ? 'bg-purple-950/40 border-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.25)] ring-1 ring-purple-400/80 scale-[1.01]'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-md bg-purple-900/50 border border-purple-500/50 flex items-center justify-center font-mono text-xs font-bold text-purple-300">
                      {idx + 1}
                    </span>
                    <span className="text-sm sm:text-base font-bold font-serif text-slate-100">
                      {pact.title}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border bg-purple-950/60 border-purple-600/50 text-purple-300">
                    {pact.rarity === 'legendary' ? 'Lendário' : pact.rarity === 'curse' ? 'Provocação' : 'Raro'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 italic">
                  "{pact.tagline}"
                </p>

                {/* Sacrifício vs Bênção */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1 pt-2 border-t border-purple-900/30 text-xs">
                  <div className="flex items-start gap-1.5 p-2 rounded bg-rose-950/30 border border-rose-900/40">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-[10px] font-mono font-bold uppercase text-rose-400">
                        Sacrifício
                      </span>
                      <span className="text-slate-300 text-[11px] leading-tight block mt-0.5">
                        {pact.costDescription}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-1.5 p-2 rounded bg-emerald-950/30 border border-emerald-900/40">
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-[10px] font-mono font-bold uppercase text-emerald-400">
                        Dádiva
                      </span>
                      <span className="text-slate-200 text-[11px] font-semibold leading-tight block mt-0.5">
                        {pact.benefitDescription}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onDecline}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-mono text-xs uppercase tracking-wider border border-slate-800 transition-colors"
          >
            Recusar Pacto [Esc]
          </button>

          <button
            onClick={() => onAccept(selectedPact)}
            className="flex-2 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-700 via-fuchsia-600 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white font-mono font-bold text-xs uppercase tracking-wider shadow-lg shadow-purple-950/50 flex items-center justify-center gap-2 active:scale-[0.99] transition-all ring-1 ring-purple-300/40 cursor-pointer"
          >
            <span>Selar Pacto Selecionado</span>
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        <span className="block text-center text-[10px] font-mono text-slate-500 mt-3">
          Dica: Pressione [1] ou [2] para escolher e [Enter] para selar o pacto
        </span>
      </div>
    </div>
  );
};
