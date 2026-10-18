import React, { useState } from 'react';
import { AscensionUpgrades } from '../game/types';
import { Storage } from '../game/storage';
import { X, Sparkles, Heart, Sword, Eye, Clock, Gem } from 'lucide-react';
import { soundManager } from '../game/audio';

interface AscensionModalProps {
  onClose: () => void;
  onUpgradeApplied?: () => void;
}

export const AscensionModal: React.FC<AscensionModalProps> = ({ onClose, onUpgradeApplied }) => {
  const [remnants, setRemnants] = useState(Storage.getAbyssRemnants());
  const [upgrades, setUpgrades] = useState<AscensionUpgrades>(Storage.getAscension());

  const getUpgradeCost = (currentLevel: number) => {
    return (currentLevel + 1) * 12;
  };

  const handleUpgrade = (key: keyof AscensionUpgrades) => {
    const cost = getUpgradeCost(upgrades[key]);
    if (remnants < cost) return;

    const newRemnants = remnants - cost;
    const newUpgrades = { ...upgrades, [key]: upgrades[key] + 1 };

    Storage.saveAscension(newUpgrades);
    localStorage.setItem('dungeon_crawler_remnants_points', newRemnants.toString());

    setRemnants(newRemnants);
    setUpgrades(newUpgrades);
    soundManager.playLevelUp();

    if (onUpgradeApplied) {
      onUpgradeApplied();
    }
  };

  const items = [
    {
      key: 'maxHpLevel' as const,
      title: 'Coração de Basalto',
      desc: '+10% de Vida Máxima permanente em todas as descidas.',
      icon: Heart,
      color: 'text-rose-400',
      level: upgrades.maxHpLevel,
    },
    {
      key: 'attackLevel' as const,
      title: 'Lâmina Espectral',
      desc: '+8% de Ataque básico permanente.',
      icon: Sword,
      color: 'text-amber-400',
      level: upgrades.attackLevel,
    },
    {
      key: 'visionLevel' as const,
      title: 'Visão do Andarilho',
      desc: '+1 Tile de raio de visão através da névoa de guerra.',
      icon: Eye,
      color: 'text-sky-400',
      level: upgrades.visionLevel,
    },
    {
      key: 'cooldownLevel' as const,
      title: 'Cadência do Amuleto',
      desc: '+5% de Redução no tempo de recarga de todas as habilidades.',
      icon: Clock,
      color: 'text-purple-400',
      level: upgrades.cooldownLevel,
    },
    {
      key: 'fortuneLevel' as const,
      title: 'Bênção da Fortuna',
      desc: '+10% de probabilidade de encontrar equipamentos raros e lendários.',
      icon: Gem,
      color: 'text-emerald-400',
      level: upgrades.fortuneLevel,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 md:p-6 select-none animate-in fade-in duration-300"
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))',
      }}
    >
      <div className="bg-[#0B0E15] border border-purple-900/60 rounded-2xl w-full max-w-2xl max-h-[92vh] max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Subtle violet top accent */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-purple-600 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-cinzel font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span>ALTAR DA ASCENSÃO</span>
            </h2>
            <p className="text-xs text-slate-400 font-inter mt-0.5">
              Transforme a memória de suas quedas em poder indelével.
            </p>
          </div>

          <button
            onClick={() => {
              soundManager.playButtonClick();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Remnants balance counter banner */}
        <div className="bg-[#121622] px-6 py-3 border-b border-slate-800 flex items-center justify-between font-mono text-xs">
          <span className="text-slate-400">Vestígios do Abismo Disponíveis:</span>
          <span className="text-purple-300 font-bold text-sm flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>{remnants}</span>
          </span>
        </div>

        {/* List of Blessings */}
        <div className="p-5 overflow-y-auto space-y-3">
          {items.map((item) => {
            const Icon = item.icon;
            const cost = getUpgradeCost(item.level);
            const canAfford = remnants >= cost;

            return (
              <div
                key={item.key}
                className="bg-[#10141E] border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <div className={`p-2.5 rounded-lg bg-slate-900 border border-slate-800 shrink-0 ${item.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-cinzel font-bold text-slate-100">
                        {item.title}
                      </h3>
                      <span className="text-[10px] font-mono text-purple-400 bg-purple-950/40 border border-purple-800/60 px-1.5 py-0.5 rounded">
                        Grau {item.level}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-inter mt-1 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleUpgrade(item.key)}
                  disabled={!canAfford}
                  className={`py-2 px-4 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider shrink-0 transition-all ${
                    canAfford
                      ? 'bg-purple-900/80 hover:bg-purple-800 text-purple-100 shadow-md active:scale-95'
                      : 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  Evoluir ({cost} Vestígios)
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
