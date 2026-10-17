import React, { useState } from 'react';
import { LevelUpOption } from '../game/types';
import { Sparkles, Sword, Shield, Heart, Wind } from 'lucide-react';
import { soundManager } from '../game/audio';

interface LevelUpModalProps {
  options: LevelUpOption[];
  onSelect: (option: LevelUpOption) => void;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({ options, onSelect }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const getCategoryIcon = (category: LevelUpOption['category']) => {
    switch (category) {
      case 'attack':
        return <Sword className="w-6 h-6 text-amber-400" />;
      case 'defense':
        return <Shield className="w-6 h-6 text-sky-400" />;
      case 'vitality':
        return <Heart className="w-6 h-6 text-rose-400" />;
      case 'utility':
        return <Wind className="w-6 h-6 text-emerald-400" />;
      case 'spectral':
      default:
        return <Sparkles className="w-6 h-6 text-purple-400" />;
    }
  };

  const getCategoryLabel = (category: LevelUpOption['category']) => {
    switch (category) {
      case 'attack': return 'Poder Ofensivo';
      case 'defense': return 'Resguardo Físico';
      case 'vitality': return 'Vitalidade';
      case 'utility': return 'Mobilidade & Recursos';
      case 'spectral': return 'Harmonia Espectral';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-300">
      <div className="w-full max-w-2xl flex flex-col items-center">
        {/* Ceremonial Header */}
        <div className="text-center mb-6">
          <div className="text-xs font-mono tracking-widest text-sky-400 uppercase mb-1">
            Ressonância do Amuleto
          </div>
          <h2 className="text-2xl md:text-3xl font-cinzel font-bold text-slate-100 tracking-wide">
            ASCENSÃO DE NÍVEL
          </h2>
          <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-md">
            O Abismo reconhece seu avanço. Escolha uma bênção para fortalecer a descida.
          </p>
        </div>

        {/* 3 Blessing Cards (Vertical stack on mobile, horizontal on desktop) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          {options.map((option) => {
            const isSelected = selectedId === option.id;

            return (
              <div
                key={option.id}
                onClick={() => {
                  soundManager.playButtonClick();
                  setSelectedId(option.id);
                }}
                className={`bg-[#0E131E] border rounded-xl p-5 flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-xl ${
                  isSelected
                    ? 'border-sky-400 bg-sky-950/30 scale-105 ring-1 ring-sky-400'
                    : 'border-slate-800 hover:border-slate-700 hover:bg-[#131927]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      {getCategoryIcon(option.category)}
                    </div>
                    <span className="text-[10px] font-mono uppercase text-slate-500">
                      {getCategoryLabel(option.category)}
                    </span>
                  </div>

                  <h3 className="text-base font-cinzel font-bold text-slate-100 mb-1.5">
                    {option.title}
                  </h3>

                  <p className="text-xs text-slate-300 leading-relaxed font-inter">
                    {option.description}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    soundManager.playLevelUp();
                    onSelect(option);
                  }}
                  className={`mt-5 w-full py-2.5 px-4 rounded-lg text-xs font-mono font-semibold tracking-wider uppercase transition-colors shadow-md ${
                    isSelected
                      ? 'bg-sky-600 hover:bg-sky-500 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  Confirmar Escolha
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
