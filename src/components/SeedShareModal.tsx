import React, { useState } from 'react';
import { X, Copy, Check, Play, Share2 } from 'lucide-react';
import { soundManager } from '../game/audio';

interface SeedShareModalProps {
  currentSeed: string;
  floor: number;
  onClose: () => void;
  onStartCustomSeed: (seed: string) => void;
}

export const SeedShareModal: React.FC<SeedShareModalProps> = ({
  currentSeed,
  floor,
  onClose,
  onStartCustomSeed,
}) => {
  const [copied, setCopied] = useState(false);
  const [inputSeed, setInputSeed] = useState('');

  const currentUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?seed=${encodeURIComponent(currentSeed)}`
    : '';

  const handleCopy = () => {
    soundManager.playButtonClick();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl || currentSeed);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handlePlayCustom = () => {
    if (!inputSeed.trim()) return;
    soundManager.playButtonClick();
    onStartCustomSeed(inputSeed.trim());
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200"
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))',
      }}
    >
      <div className="bg-[#0B0E14] border border-slate-800 rounded-2xl w-full max-w-md max-h-[92dvh] overflow-y-auto p-5 sm:p-6 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-cinzel font-bold text-slate-100">
              SEEDS & COMPARTILHAMENTO
            </h2>
          </div>
          <button
            onClick={() => {
              soundManager.playButtonClick();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Seed Info */}
        <div className="bg-[#10141E] p-4 rounded-xl border border-slate-800 mb-5">
          <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
            Seed da Descida Atual (Andar {floor})
          </span>
          <div className="font-mono text-sm font-bold text-amber-300 break-all bg-slate-950 p-2.5 rounded border border-slate-900 select-all">
            {currentSeed}
          </div>

          <p className="text-xs text-slate-400 mt-2 leading-relaxed font-inter">
            Esta semente reproduz a mesma arquitetura de salas, baús e inimigos determinísticos.
          </p>

          <button
            onClick={handleCopy}
            className="mt-3 w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-slate-700"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Link Copiado para Área de Transferência!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-400" />
                <span>Copiar Link Compartilhável</span>
              </>
            )}
          </button>
        </div>

        {/* Enter Custom Seed to Explore */}
        <div className="bg-[#10141E] p-4 rounded-xl border border-slate-800">
          <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
            Explorar Outra Semente
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Digite ou cole uma seed..."
              value={inputSeed}
              onChange={(e) => setInputSeed(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500"
            />
            <button
              onClick={handlePlayCustom}
              disabled={!inputSeed.trim()}
              className="py-2 px-3 rounded-lg bg-sky-700 hover:bg-sky-600 disabled:bg-slate-900 disabled:text-slate-600 text-white text-xs font-mono font-semibold transition-colors flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Jogar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
