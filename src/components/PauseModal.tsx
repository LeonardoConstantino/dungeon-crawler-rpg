import React from 'react';
import { soundManager } from '../game/audio';
import { Play, Shield, Settings, Home, Save } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onOpenInventory: () => void;
  onOpenSettings: () => void;
  onSaveAndExit: () => void;
  floor: number;
  seed: string;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onOpenInventory,
  onOpenSettings,
  onSaveAndExit,
  floor,
  seed,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-[#0B0E14] border border-slate-800 rounded-2xl w-full max-w-sm p-6 flex flex-col items-center text-center shadow-2xl">
        <h2 className="text-xl font-cinzel font-bold text-slate-100 tracking-wider mb-1">
          JOGO PAUSADO
        </h2>
        <div className="text-xs font-mono text-slate-500 mb-6">
          Andar {floor} · Seed: {seed.slice(0, 10)}
        </div>

        <div className="flex flex-col gap-2.5 w-full">
          <button
            onClick={() => {
              soundManager.playButtonClick();
              onResume();
            }}
            className="w-full py-3 px-4 rounded-xl bg-sky-700 hover:bg-sky-600 text-white font-mono font-semibold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Retomar Descida</span>
          </button>

          <button
            onClick={() => {
              soundManager.playButtonClick();
              onOpenInventory();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 font-mono text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4 text-slate-400" />
            <span>Ver Mochila & Equipamento</span>
          </button>

          <button
            onClick={() => {
              soundManager.playButtonClick();
              onOpenSettings();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 font-mono text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Configurações</span>
          </button>

          <button
            onClick={() => {
              soundManager.playButtonClick();
              onSaveAndExit();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-mono text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 mt-2"
          >
            <Home className="w-4 h-4 text-slate-400" />
            <span>Salvar e Voltar ao Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
