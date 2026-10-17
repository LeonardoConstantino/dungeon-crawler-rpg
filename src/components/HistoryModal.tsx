import React from 'react';
import { Storage } from '../game/storage';
import { soundManager } from '../game/audio';
import { X, History, Play, Sparkles, Skull } from 'lucide-react';

interface HistoryModalProps {
  onClose: () => void;
  onSelectSeed: (seed: string) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ onClose, onSelectSeed }) => {
  const history = Storage.getHistory();

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}m ${remainingSecs}s`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 select-none animate-in fade-in duration-200">
      <div className="bg-[#0B0E14] border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-sky-400" />
            <h2 className="text-lg font-cinzel font-bold text-slate-100">
              HISTÓRICO DE DESCIDAS
            </h2>
          </div>
          <button
            onClick={() => {
              soundManager.playButtonClick();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Runs List */}
        <div className="p-5 overflow-y-auto space-y-3">
          {history.length === 0 ? (
            <div className="py-16 text-center text-slate-500 font-mono text-xs flex flex-col items-center">
              <Skull className="w-8 h-8 mb-2 text-slate-700" />
              <span>Nenhuma descida registrada ainda.</span>
              <span className="text-slate-600 mt-1">O Abismo aguarda seus primeiros passos.</span>
            </div>
          ) : (
            history.map((run) => (
              <div
                key={run.id}
                className="bg-[#10141E] border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-sm font-cinzel font-bold text-rose-400">
                      Andar {run.floorReached}
                    </span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="text-xs font-mono text-slate-300">Nível {run.level}</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="text-xs font-mono text-slate-400">{run.date}</span>
                  </div>

                  <div className="text-xs font-mono text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
                    <span>Inimigos: {run.enemiesKilled}</span>
                    <span>Duração: {formatTime(run.durationSeconds)}</span>
                    <span className="text-purple-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      +{run.remnantsEarned} Vestígios
                    </span>
                  </div>

                  <div className="text-[11px] font-mono text-slate-500 mt-1.5 truncate max-w-xs sm:max-w-md">
                    Seed: {run.seed}
                  </div>
                </div>

                <button
                  onClick={() => {
                    soundManager.playButtonClick();
                    onSelectSeed(run.seed);
                    onClose();
                  }}
                  className="py-2 px-3.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold uppercase tracking-wider shrink-0 transition-colors flex items-center justify-center gap-1.5 border border-slate-700"
                >
                  <Play className="w-3.5 h-3.5 fill-slate-300" />
                  <span>Repetir Seed</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
