import React, { useState } from 'react';
import { GameSettings } from '../game/types';
import { Storage } from '../game/storage';
import { soundManager } from '../game/audio';
import { X, Volume2, VolumeX, Eye, Vibrate, Crosshair, Smartphone, Keyboard } from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
  onSettingsChanged?: (settings: GameSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onSettingsChanged }) => {
  const [settings, setSettings] = useState<GameSettings>(Storage.getSettings());

  const updateSetting = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    Storage.saveSettings(updated);
    soundManager.applySettings(updated);
    if (onSettingsChanged) {
      onSettingsChanged(updated);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 md:p-6 select-none animate-in fade-in duration-200"
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))',
      }}
    >
      <div className="bg-[#0B0E15] border border-slate-800 rounded-2xl w-full max-w-xl max-h-[92vh] max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-lg font-cinzel font-bold text-slate-100 tracking-wide">
            CONFIGURAÇÕES & ACESSIBILIDADE
          </h2>
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Audio Section */}
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-sky-400" />
              <span>Áudio & Volumes</span>
            </h3>

            <div className="space-y-3 bg-[#111520] p-4 rounded-xl border border-slate-800/80">
              {/* Mute Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300 font-inter">Silenciar Todo o Áudio</span>
                <button
                  onClick={() => updateSetting('isMuted', !settings.isMuted)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
                    settings.isMuted
                      ? 'bg-rose-900/60 text-rose-300 border border-rose-700'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {settings.isMuted ? 'Mudo (Ativo)' : 'Com Som'}
                </button>
              </div>

              {/* Master Volume */}
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1 font-mono">
                  <span>Volume Geral:</span>
                  <span>{Math.round(settings.masterVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.masterVolume}
                  onChange={(e) => updateSetting('masterVolume', parseFloat(e.target.value))}
                  className="w-full accent-sky-500 bg-slate-900 rounded-lg h-1.5"
                />
              </div>

              {/* Music Volume */}
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1 font-mono">
                  <span>Música (Folk Fúnebre Sintético):</span>
                  <span>{Math.round(settings.musicVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.musicVolume}
                  onChange={(e) => updateSetting('musicVolume', parseFloat(e.target.value))}
                  className="w-full accent-sky-500 bg-slate-900 rounded-lg h-1.5"
                />
              </div>

              {/* SFX Volume */}
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1 font-mono">
                  <span>Efeitos Sonoros (SFX):</span>
                  <span>{Math.round(settings.sfxVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.sfxVolume}
                  onChange={(e) => updateSetting('sfxVolume', parseFloat(e.target.value))}
                  className="w-full accent-sky-500 bg-slate-900 rounded-lg h-1.5"
                />
              </div>
            </div>
          </div>

          {/* Gameplay & Accessibility */}
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4 text-purple-400" />
              <span>Acessibilidade & Conforto</span>
            </h3>

            <div className="space-y-3 bg-[#111520] p-4 rounded-xl border border-slate-800/80">
              {/* Screen Shake */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-200 block font-medium">Tremor de Câmera</span>
                  <span className="text-[11px] text-slate-500">Impactos e abalos do Abismo</span>
                </div>
                <button
                  onClick={() => updateSetting('screenShake', !settings.screenShake)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
                    settings.screenShake ? 'bg-sky-900/60 text-sky-200 border border-sky-700' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {settings.screenShake ? 'Ligado' : 'Desligado'}
                </button>
              </div>

              {/* Reduced Flashes */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                <div>
                  <span className="text-xs text-slate-200 block font-medium">Redução de Flashes</span>
                  <span className="text-[11px] text-slate-500">Conforto para fotossensibilidade</span>
                </div>
                <button
                  onClick={() => updateSetting('reducedFlashes', !settings.reducedFlashes)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
                    settings.reducedFlashes ? 'bg-sky-900/60 text-sky-200 border border-sky-700' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {settings.reducedFlashes ? 'Ativo' : 'Padrão'}
                </button>
              </div>

              {/* Aim Assist */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                <div>
                  <span className="text-xs text-slate-200 block font-medium">Assistência de Mira</span>
                  <span className="text-[11px] text-slate-500">Alinha golpes ao inimigo mais próximo</span>
                </div>
                <button
                  onClick={() => updateSetting('aimAssist', !settings.aimAssist)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
                    settings.aimAssist ? 'bg-sky-900/60 text-sky-200 border border-sky-700' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {settings.aimAssist ? 'Ligado' : 'Desligado'}
                </button>
              </div>
            </div>
          </div>

          {/* Virtual Gamepad Settings */}
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Controles Mobile (Gamepad Virtual)</span>
            </h3>

            <div className="space-y-3 bg-[#111520] p-4 rounded-xl border border-slate-800/80">
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1 font-mono">
                  <span>Tamanho do Joystick:</span>
                  <span>{Math.round(settings.virtualJoystickScale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.4"
                  step="0.05"
                  value={settings.virtualJoystickScale}
                  onChange={(e) => updateSetting('virtualJoystickScale', parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 bg-slate-900 rounded-lg h-1.5"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1 font-mono">
                  <span>Opacidade dos Botões:</span>
                  <span>{Math.round(settings.virtualJoystickOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="1.0"
                  step="0.05"
                  value={settings.virtualJoystickOpacity}
                  onChange={(e) => updateSetting('virtualJoystickOpacity', parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 bg-slate-900 rounded-lg h-1.5"
                />
              </div>
            </div>
          </div>

          {/* Keybindings Reference */}
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-amber-400" />
              <span>Atalhos de Teclado (Desktop)</span>
            </h3>

            <div className="bg-[#111520] p-3 rounded-xl border border-slate-800/80 text-xs font-mono text-slate-400 grid grid-cols-2 gap-2">
              <div><strong className="text-slate-200">WASD / Setas:</strong> Mover</div>
              <div><strong className="text-slate-200">Espaço / Clique:</strong> Atacar</div>
              <div><strong className="text-slate-200">1, 2, 3, 4:</strong> Habilidades</div>
              <div><strong className="text-slate-200">Q:</strong> Beber Poção</div>
              <div><strong className="text-slate-200">I / B:</strong> Mochila</div>
              <div><strong className="text-slate-200">ESC:</strong> Pausar Jogo</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
