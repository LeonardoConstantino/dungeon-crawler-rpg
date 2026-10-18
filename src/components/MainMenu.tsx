import React, { useState } from 'react';
import { Storage, SaveSlotData } from '../game/storage';
import { soundManager } from '../game/audio';
import { Play, Sparkles, History, Settings, Trash2, ArrowRight } from 'lucide-react';
import titleBg from '../assets/images/dungeon_crawler_abyss_chasm_1792251111318.jpg';

interface MainMenuProps {
  onStartGame: (seed?: string, slotId?: string, resume?: boolean) => void;
  onOpenAscension: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartGame,
  onOpenAscension,
  onOpenHistory,
  onOpenSettings,
}) => {
  const [selectedSlotId, setSelectedSlotId] = useState<string>(Storage.getActiveSlotId());
  const [showSlotPicker, setShowSlotPicker] = useState(false);
  const [customSeed, setCustomSeed] = useState('');

  const slots = ['A', 'B', 'C'].map((id) => Storage.getSlot(id));
  const activeSlot = Storage.getSlot(selectedSlotId);

  const handleStartNew = () => {
    soundManager.playButtonClick();
    Storage.setActiveSlotId(selectedSlotId);
    onStartGame(customSeed.trim() || undefined, selectedSlotId, false);
  };

  const handleContinue = () => {
    soundManager.playButtonClick();
    Storage.setActiveSlotId(selectedSlotId);
    onStartGame(activeSlot.seed, selectedSlotId, true);
  };

  const handleDeleteSlot = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Excluir permanentemente o progresso do Slot ${id}?`)) {
      Storage.deleteSlot(id);
      setSelectedSlotId(id);
      soundManager.playButtonClick();
    }
  };

  return (
    <div className="relative w-full h-full h-[100dvh] bg-[#06080D] flex flex-col justify-between overflow-y-auto select-none"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
      }}
    >
      {/* Cinematic Background Image with Gradient Scrim */}
      <div className="absolute inset-0 z-0">
        <img
          src={titleBg}
          alt="Abismo Monumental"
          className="w-full h-full object-cover object-center opacity-45 scale-105 transition-transform duration-1000"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#06080D] via-[#06080D]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#06080D] via-[#06080D]/40 to-transparent" />
      </div>

      {/* Top Header info */}
      <div className="relative z-10 px-4 py-3 sm:px-6 sm:py-6 md:px-10 flex items-start justify-between">
        <div>
          <span className="text-[11px] font-mono tracking-widest text-sky-400 uppercase block mb-1">
            Roguelite Dungeon Crawler 2D
          </span>
          <h1 className="text-3xl md:text-5xl font-cinzel font-black tracking-wider text-slate-100 uppercase drop-shadow-md">
            O ABISMO LEMBRA
          </h1>
          <p className="text-xs md:text-sm text-slate-400 font-inter mt-1.5 max-w-md italic">
            "Um abismo infinito que cresce junto com você e transforma suas mortes em poder."
          </p>
        </div>

        {/* Remnants Badge */}
        <button
          onClick={() => {
            soundManager.playButtonClick();
            onOpenAscension();
          }}
          className="bg-[#0B0F18]/90 hover:bg-slate-800/90 border border-purple-900/60 rounded-xl px-3.5 py-2 flex items-center gap-2 transition-colors shadow-xl"
        >
          <Sparkles className="w-4 h-4 text-purple-400" />
          <div className="text-left">
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Vestígios</span>
            <span className="text-xs font-mono font-bold text-purple-300">
              {Storage.getAbyssRemnants()}
            </span>
          </div>
        </button>
      </div>

      {/* Center/Bottom Menu Options */}
      <div className="relative z-10 p-6 md:p-10 max-w-md flex flex-col gap-3">
        {/* Slot Selector strip */}
        <div className="flex items-center gap-2 bg-[#0C1019]/90 border border-slate-800 p-1.5 rounded-xl mb-1">
          <span className="text-[10px] font-mono uppercase text-slate-500 pl-2">Slot:</span>
          {['A', 'B', 'C'].map((id) => {
            const slot = Storage.getSlot(id);
            const isSelected = selectedSlotId === id;

            return (
              <button
                key={id}
                onClick={() => {
                  soundManager.playButtonClick();
                  setSelectedSlotId(id);
                }}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-mono transition-all flex items-center justify-center gap-1.5 ${
                  isSelected
                    ? 'bg-sky-700 text-white font-bold shadow'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Slot {id}</span>
                {slot.hasActiveRun && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Slot Info Banner */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#0C1019]/60 border border-slate-800/60 rounded-lg text-[11px] font-mono text-slate-400">
          {activeSlot.hasActiveRun ? (
            <>
              <div className="truncate">
                <span className="text-amber-400 font-semibold">Andar {activeSlot.floor}</span>
                <span className="mx-1.5 text-slate-600">·</span>
                <span>Nível {activeSlot.playerStats?.level || 1}</span>
                <span className="mx-1.5 text-slate-600">·</span>
                <span className="text-slate-500">Seed: {activeSlot.seed.slice(0, 8)}</span>
              </div>
              <button
                onClick={(e) => handleDeleteSlot(selectedSlotId, e)}
                title="Limpar este slot"
                className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors ml-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <span className="text-slate-500">Slot {selectedSlotId} está vazio.</span>
          )}
        </div>

        {/* Continue Button if active save */}
        {activeSlot.hasActiveRun && (
          <button
            onClick={handleContinue}
            className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-sky-700 to-sky-600 hover:from-sky-600 hover:to-sky-500 text-white font-mono font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-between shadow-xl active:scale-[0.99]"
          >
            <div className="flex items-center gap-2.5">
              <Play className="w-4 h-4 fill-white" />
              <span>Continuar Descida</span>
            </div>
            <span className="text-[11px] font-mono text-sky-200">
              Andar {activeSlot.floor}
            </span>
          </button>
        )}

        {/* New Game Button */}
        <button
          onClick={handleStartNew}
          className="w-full py-3.5 px-5 rounded-xl bg-[#0D121D]/90 hover:bg-slate-800 border border-slate-700/80 text-slate-100 font-mono font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-between shadow-lg active:scale-[0.99]"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>{activeSlot.hasActiveRun ? 'Nova Descida (Substituir)' : 'Iniciar Nova Descida'}</span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* Optional Custom Seed field */}
        <div className="flex items-center gap-2 bg-[#0C1019]/80 border border-slate-800/80 rounded-xl px-3 py-1.5 text-xs font-mono">
          <span className="text-slate-500 text-[10px] uppercase">Seed:</span>
          <input
            type="text"
            placeholder="Aleatória ou insira código..."
            value={customSeed}
            onChange={(e) => setCustomSeed(e.target.value)}
            className="bg-transparent text-slate-300 w-full focus:outline-none placeholder:text-slate-600 text-xs"
          />
        </div>

        {/* Secondary Options */}
        <div className="grid grid-cols-3 gap-2 mt-2">
          <button
            onClick={() => {
              soundManager.playButtonClick();
              onOpenAscension();
            }}
            className="py-2.5 px-3 rounded-xl bg-[#0C1019]/80 hover:bg-slate-800 border border-slate-800 text-slate-300 font-mono text-[11px] uppercase tracking-wider transition-colors flex flex-col items-center justify-center gap-1"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Ascensão</span>
          </button>

          <button
            onClick={() => {
              soundManager.playButtonClick();
              onOpenHistory();
            }}
            className="py-2.5 px-3 rounded-xl bg-[#0C1019]/80 hover:bg-slate-800 border border-slate-800 text-slate-300 font-mono text-[11px] uppercase tracking-wider transition-colors flex flex-col items-center justify-center gap-1"
          >
            <History className="w-4 h-4 text-sky-400" />
            <span>Histórico</span>
          </button>

          <button
            onClick={() => {
              soundManager.playButtonClick();
              onOpenSettings();
            }}
            className="py-2.5 px-3 rounded-xl bg-[#0C1019]/80 hover:bg-slate-800 border border-slate-800 text-slate-300 font-mono text-[11px] uppercase tracking-wider transition-colors flex flex-col items-center justify-center gap-1"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Ajustes</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 px-6 py-4 md:px-10 border-t border-slate-800/40 text-[11px] font-mono text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>Dungeon Crawler RPG · Exploração Procedural & Progressão Contínua</span>
        <div className="flex items-center gap-4">
          <span>Desktop (Teclado/Mouse)</span>
          <span aria-hidden="true">·</span>
          <span>Mobile (Gamepad Tátil)</span>
          <span aria-hidden="true">·</span>
          <span>100% Offline</span>
        </div>
      </div>
    </div>
  );
};
