import React from 'react';
import { soundManager } from '../game/audio';
import { Skull, RefreshCw, Sparkles, Home } from 'lucide-react';

interface DeathScreenProps {
  floor: number;
  level: number;
  kills: number;
  playtimeSeconds: number;
  remnantsEarned: number;
  seed: string;
  onRetry: () => void;
  onOpenAscension: () => void;
  onReturnMenu: () => void;
}

export const DeathScreen: React.FC<DeathScreenProps> = ({
  floor,
  level,
  kills,
  playtimeSeconds,
  remnantsEarned,
  seed,
  onRetry,
  onOpenAscension,
  onReturnMenu,
}) => {
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}m ${remainingSecs}s`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 select-none animate-in fade-in duration-700">
      <div className="w-full max-w-lg bg-[#0B0E14] border border-rose-950/70 rounded-2xl p-6 md:p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
        {/* Subtle crimson fissure line at top */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-rose-600 to-transparent" />

        <div className="w-14 h-14 rounded-full bg-rose-950/40 border border-rose-900/60 flex items-center justify-center text-rose-500 mb-4">
          <Skull className="w-7 h-7" />
        </div>

        <h1 className="text-3xl md:text-4xl font-cinzel font-black text-rose-500 tracking-wider">
          VOCÊ CAIU.
        </h1>

        <p className="text-xs md:text-sm text-slate-400 mt-2 font-inter max-w-sm italic">
          "Sua jornada termina aqui. Suas marcas permanecem."
        </p>

        {/* Run Metrics Breakdown */}
        <div className="w-full bg-[#10141D] border border-slate-800/80 rounded-xl p-4 my-6 text-xs font-mono grid grid-cols-2 gap-3 text-left">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Profundidade</span>
            <span className="text-slate-200 text-sm font-bold">Andar {floor}</span>
          </div>

          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Nível Alcançado</span>
            <span className="text-slate-200 text-sm font-bold">Nível {level}</span>
          </div>

          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Inimigos Vencidos</span>
            <span className="text-slate-200 text-sm font-bold">{kills}</span>
          </div>

          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Tempo de Sobrevivência</span>
            <span className="text-slate-200 text-sm font-bold">{formatTime(playtimeSeconds)}</span>
          </div>

          <div className="col-span-2 pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-purple-400 font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Vestígios Coletados:</span>
            </span>
            <span className="text-purple-300 text-sm font-bold">+{remnantsEarned}</span>
          </div>
        </div>

        <div className="text-[11px] font-mono text-slate-500 mb-6 truncate max-w-full">
          Seed da Masmorra: <span className="text-slate-400">{seed}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <button
            onClick={() => {
              soundManager.playButtonClick();
              onRetry();
            }}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-rose-900/80 hover:bg-rose-800 text-rose-100 font-mono font-semibold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Tentar Novamente</span>
          </button>

          <button
            onClick={() => {
              soundManager.playButtonClick();
              onOpenAscension();
            }}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-purple-950/70 hover:bg-purple-900 border border-purple-800/60 text-purple-200 font-mono font-semibold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            <Sparkles className="w-4 h-4" />
            <span>Ver Ascensão</span>
          </button>
        </div>

        <button
          onClick={() => {
            soundManager.playButtonClick();
            onReturnMenu();
          }}
          className="mt-4 text-xs font-mono text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1.5"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Voltar ao Menu Principal</span>
        </button>
      </div>
    </div>
  );
};
