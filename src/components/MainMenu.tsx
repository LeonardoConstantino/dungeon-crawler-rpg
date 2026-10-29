import React, { useState, useEffect } from 'react';
import { Storage, SaveSlotData } from '../game/storage';
import { soundManager } from '../game/audio';
import {
  Play,
  Sparkles,
  History,
  Settings,
  Trash2,
  ArrowRight,
  Dices,
  X,
  AlertTriangle,
  Info,
  Clock,
  Shield,
  Heart,
  Skull,
  Compass,
} from 'lucide-react';
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
  const [selectedSlotId, setSelectedSlotId] = useState<string>(() => Storage.getActiveSlotId());
  const [customSeed, setCustomSeed] = useState('');
  const [slotsData, setSlotsData] = useState<Record<string, SaveSlotData>>(() => ({
    A: Storage.getSlot('A'),
    B: Storage.getSlot('B'),
    C: Storage.getSlot('C'),
  }));

  // In-UI Confirmation Modals
  const [confirmDeleteSlotId, setConfirmDeleteSlotId] = useState<string | null>(null);
  const [confirmOverwriteSlot, setConfirmOverwriteSlot] = useState(false);
  const [showVestigesInfo, setShowVestigesInfo] = useState(false);

  // Sync active slot ID to storage whenever selection changes
  useEffect(() => {
    Storage.setActiveSlotId(selectedSlotId);
  }, [selectedSlotId]);

  const activeSlot = slotsData[selectedSlotId] || Storage.getSlot(selectedSlotId);
  const remnantsCount = Storage.getAbyssRemnants();

  const reloadSlots = () => {
    setSlotsData({
      A: Storage.getSlot('A'),
      B: Storage.getSlot('B'),
      C: Storage.getSlot('C'),
    });
  };

  // Format date safely
  const formatLastPlayed = (isoDate?: string): string => {
    if (!isoDate) return 'Nunca jogado';
    try {
      const d = new Date(isoDate);
      if (isNaN(d.getTime())) return 'Nunca jogado';
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 2) return 'Agora há pouco';
      if (diffMins < 60) return `Há ${diffMins} min`;
      if (diffHours < 24) return `Há ${diffHours}h`;
      if (diffDays === 1) return 'Ontem';
      if (diffDays < 7) return `Há ${diffDays} dias`;
      return d.toLocaleDateString();
    } catch {
      return 'Nunca jogado';
    }
  };

  const formatPlaytime = (secs?: number): string => {
    if (!secs || secs <= 0) return '';
    const mins = Math.floor(secs / 60);
    const hours = Math.floor(mins / 60);
    if (hours > 0) return `${hours}h ${mins % 60}m`;
    return `${mins}m de descida`;
  };

  // Seed Sanitization & Validation
  const sanitizedSeed = customSeed.trim();
  const isSeedCustomized = sanitizedSeed.length > 0;
  const isSeedValid = !isSeedCustomized || /^[a-zA-Z0-9\-_]+$/.test(sanitizedSeed);

  // Actions
  const handleContinue = () => {
    if (!activeSlot.hasActiveRun) return;
    soundManager.playButtonClick();
    onStartGame(activeSlot.seed, selectedSlotId, true);
  };

  const handleRequestNewGame = () => {
    soundManager.playButtonClick();
    if (activeSlot.hasActiveRun) {
      // Slot already occupied: require explicit confirmation before overwriting
      setConfirmOverwriteSlot(true);
    } else {
      executeStartNew();
    }
  };

  const executeStartNew = () => {
    setConfirmOverwriteSlot(false);
    const finalSeed = isSeedCustomized && isSeedValid ? sanitizedSeed : undefined;
    onStartGame(finalSeed, selectedSlotId, false);
  };

  const executeDeleteSlot = (slotId: string) => {
    Storage.deleteSlot(slotId);
    reloadSlots();
    setConfirmDeleteSlotId(null);
    soundManager.playButtonClick();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in seed input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Escape') {
        if (confirmDeleteSlotId) setConfirmDeleteSlotId(null);
        else if (confirmOverwriteSlot) setConfirmOverwriteSlot(false);
        else if (showVestigesInfo) setShowVestigesInfo(false);
      } else if (e.key === '1') {
        soundManager.playButtonClick();
        setSelectedSlotId('A');
      } else if (e.key === '2') {
        soundManager.playButtonClick();
        setSelectedSlotId('B');
      } else if (e.key === '3') {
        soundManager.playButtonClick();
        setSelectedSlotId('C');
      } else if (e.key === 'c' || e.key === 'C') {
        if (activeSlot.hasActiveRun && !confirmDeleteSlotId && !confirmOverwriteSlot) {
          handleContinue();
        }
      } else if (e.key === 'n' || e.key === 'N') {
        if (!confirmDeleteSlotId && !confirmOverwriteSlot) {
          handleRequestNewGame();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSlotId, activeSlot, confirmDeleteSlotId, confirmOverwriteSlot, showVestigesInfo]);

  return (
    <div
      className="relative w-full h-full h-[100dvh] bg-[#06080D] flex flex-col justify-between overflow-y-auto select-none"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
      }}
    >
      {/* 1. CINEMATIC ATMOSPHERIC BACKGROUND */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src={titleBg}
          alt="Abismo Monumental"
          className="w-full h-full object-cover object-center opacity-40 scale-105 transition-transform duration-1000"
          referrerPolicy="no-referrer"
        />

        {/* Ambient Dark Fantasy Vignette & Atmospheric Fissure Breath */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#06080D] via-[#06080D]/65 to-[#06080D]/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#06080D] via-[#06080D]/50 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(225,29,72,0.18)_0%,transparent_60%)] animate-fissure-glow pointer-events-none" />
      </div>

      {/* 2. TOP BAR: Identidade, Versão & Indicador de Vestígios */}
      <div className="relative z-10 px-4 py-2 sm:px-6 sm:py-4 md:px-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8] animate-pulse" />
          <span className="text-[10px] sm:text-xs font-mono tracking-widest text-sky-400/90 uppercase font-bold">
            Roguelite Dungeon Crawler 2D · V1.0
          </span>
        </div>

        {/* Vestígios do Abismo Global Indicator */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              soundManager.playButtonClick();
              onOpenAscension();
            }}
            className="group flex items-center gap-2 bg-[#0B0F18]/90 hover:bg-[#121928] border border-purple-900/70 hover:border-purple-500/80 rounded-xl px-3 py-1.5 sm:px-3.5 sm:py-2 transition-all shadow-xl active:scale-95"
            title="Abrir Árvore de Ascensão (Usar Vestígios)"
          >
            <Sparkles className="w-4 h-4 text-purple-400 group-hover:rotate-12 transition-transform" />
            <div className="text-left">
              <span className="text-[9.5px] font-mono uppercase text-slate-400 block leading-tight">
                Vestígios
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold text-purple-300">
                {remnantsCount}
              </span>
            </div>
          </button>

          <button
            onClick={() => {
              soundManager.playButtonClick();
              setShowVestigesInfo(true);
            }}
            className="p-2 rounded-xl bg-[#0B0F18]/80 hover:bg-slate-800 text-slate-400 hover:text-purple-300 border border-slate-800/80 transition-colors"
            title="O que são Vestígios do Abismo?"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. MAIN CONTENT: 2-Column Responsive Layout */}
      <div className="relative z-10 px-4 py-2 sm:px-6 md:px-10 my-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center max-w-7xl mx-auto w-full">
        {/* LEFT COLUMN: Identidade Narrativa & Painel de Ações */}
        <div className="lg:col-span-6 flex flex-col gap-4 sm:gap-5">
          {/* Game Title & Narrative Lore */}
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-cinzel font-black tracking-wider text-slate-100 uppercase drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] leading-none">
              O ABISMO LEMBRA
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-inter mt-2 max-w-lg leading-relaxed italic border-l-2 border-rose-500/60 pl-3">
              "Um abismo infinito que cresce junto com você e transforma suas mortes em poder."
            </p>
          </div>

          {/* Primary Action Button (Continuar se ativo, ou Nova Descida se vazio) */}
          <div className="flex flex-col gap-2.5 max-w-md w-full">
            {activeSlot.hasActiveRun ? (
              <button
                onClick={handleContinue}
                className="group w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-sky-600 via-sky-500 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white font-cinzel font-bold text-sm tracking-wider uppercase transition-all shadow-[0_0_24px_rgba(56,189,248,0.35)] active:scale-[0.99] flex items-center justify-between border-t border-white/20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                  </div>
                  <div className="text-left">
                    <span className="block leading-none">Continuar Descida [C]</span>
                    <span className="text-[10px] font-mono text-sky-100 normal-case opacity-90">
                      Slot {selectedSlotId} · Andar {activeSlot.floor} (Nível {activeSlot.playerStats?.level || 1})
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            ) : (
              <button
                onClick={handleRequestNewGame}
                className="group w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-cyan-600 via-teal-500 to-emerald-500 hover:from-cyan-500 hover:to-teal-400 text-white font-cinzel font-bold text-sm tracking-wider uppercase transition-all shadow-[0_0_24px_rgba(20,184,166,0.35)] active:scale-[0.99] flex items-center justify-between border-t border-white/20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                  </div>
                  <div className="text-left">
                    <span className="block leading-none">Iniciar Nova Descida [N]</span>
                    <span className="text-[10px] font-mono text-teal-100 normal-case opacity-90">
                      Slot {selectedSlotId} está livre para expedição
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            )}

            {/* Secondary Action: Nova Descida quando já existe save ativo */}
            {activeSlot.hasActiveRun && (
              <button
                onClick={handleRequestNewGame}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0D121D]/80 hover:bg-slate-800/90 border border-slate-800 text-slate-300 hover:text-slate-100 font-mono text-xs uppercase tracking-wider transition-all flex items-center justify-between shadow active:scale-[0.99]"
              >
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span>Nova Descida [N] (Substituir Slot {selectedSlotId})</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </button>
            )}

            {/* Custom Seed Field */}
            <div className="bg-[#0C1019]/90 border border-slate-800/80 rounded-xl p-2 sm:p-2.5 flex flex-col gap-1 shadow-inner">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono uppercase font-semibold">
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Semente do Abismo (Seed):</span>
                </div>
                <span
                  className={`text-[9.5px] font-mono ${
                    isSeedCustomized
                      ? isSeedValid
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                      : 'text-slate-500'
                  }`}
                >
                  {isSeedCustomized
                    ? isSeedValid
                      ? '✓ Seed Personalizada'
                      : '⚠ Use apenas letras/números'
                    : 'Geração Aleatória'}
                </span>
              </div>

              <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800/80 rounded-lg px-2.5 py-1.5 text-xs font-mono">
                <input
                  type="text"
                  placeholder="Aleatória (deixe vazio ou insira um código...)"
                  value={customSeed}
                  onChange={(e) => setCustomSeed(e.target.value)}
                  className="bg-transparent text-slate-200 w-full focus:outline-none placeholder:text-slate-600 text-xs font-mono"
                  maxLength={32}
                />
                {customSeed && (
                  <button
                    onClick={() => setCustomSeed('')}
                    className="text-slate-500 hover:text-slate-300 p-0.5"
                    title="Limpar seed (voltar a aleatória)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Secondary Navigation Row: Ascensão, Histórico, Ajustes */}
            <div className="grid grid-cols-3 gap-2 mt-1">
              <button
                onClick={() => {
                  soundManager.playButtonClick();
                  onOpenAscension();
                }}
                className="py-2.5 px-3 rounded-xl bg-[#0C1019]/85 hover:bg-purple-950/40 border border-purple-900/50 hover:border-purple-500/70 text-purple-200 font-mono text-[11px] uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 shadow active:scale-95 group"
              >
                <Sparkles className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                <span>Ascensão</span>
              </button>

              <button
                onClick={() => {
                  soundManager.playButtonClick();
                  onOpenHistory();
                }}
                className="py-2.5 px-3 rounded-xl bg-[#0C1019]/85 hover:bg-sky-950/40 border border-sky-900/50 hover:border-sky-500/70 text-sky-200 font-mono text-[11px] uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 shadow active:scale-95 group"
              >
                <History className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
                <span>Histórico</span>
              </button>

              <button
                onClick={() => {
                  soundManager.playButtonClick();
                  onOpenSettings();
                }}
                className="py-2.5 px-3 rounded-xl bg-[#0C1019]/85 hover:bg-slate-800 border border-slate-800 hover:border-slate-600 text-slate-300 font-mono text-[11px] uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 shadow active:scale-95 group"
              >
                <Settings className="w-4 h-4 text-slate-400 group-hover:rotate-45 transition-transform" />
                <span>Ajustes</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Seleção & Gerenciamento de Expedições (Slots A, B, C) */}
        <div className="lg:col-span-6 flex flex-col gap-3 max-w-lg w-full ml-auto">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>Selecione a Expedição (Teclas 1, 2, 3)</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500">3 Slots Locais</span>
          </div>

          {/* Cards dos 3 Slots */}
          <div className="flex flex-col gap-2.5">
            {(['A', 'B', 'C'] as const).map((id, idx) => {
              const slot = slotsData[id];
              const isSelected = selectedSlotId === id;
              const hasRun = slot?.hasActiveRun;

              return (
                <div
                  key={id}
                  onClick={() => {
                    soundManager.playButtonClick();
                    setSelectedSlotId(id);
                  }}
                  className={`relative p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between select-none ${
                    isSelected
                      ? 'border-sky-400 ring-2 ring-sky-400/50 bg-[#0E1524] shadow-[0_0_20px_rgba(56,189,248,0.25)]'
                      : 'border-slate-800/90 bg-[#090D15]/80 hover:bg-[#0E1420] hover:border-slate-700'
                  }`}
                >
                  {/* Slot Identifier & Run Info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Slot badge indicator */}
                    <div
                      className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center font-mono font-black border shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-sky-600 border-sky-300 text-white shadow-md'
                          : hasRun
                          ? 'bg-slate-800 border-slate-700 text-amber-300'
                          : 'bg-slate-900 border-slate-800 text-slate-600'
                      }`}
                    >
                      <span className="text-[9px] uppercase tracking-tighter opacity-80">Slot</span>
                      <span className="text-sm leading-none">{id}</span>
                    </div>

                    <div className="min-w-0">
                      {hasRun ? (
                        <>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs sm:text-sm font-cinzel font-bold text-amber-400 truncate">
                              Andar {slot.floor}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800/80 font-semibold">
                              Nv. {slot.playerStats?.level || 1}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span>Seed: {slot.seed.slice(0, 10)}</span>
                            {slot.lastPlayed && (
                              <>
                                <span className="text-slate-600">·</span>
                                <span className="text-slate-500 flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5" />
                                  {formatLastPlayed(slot.lastPlayed)}
                                </span>
                              </>
                            )}
                            {slot.playtimeSeconds ? (
                              <>
                                <span className="text-slate-600">·</span>
                                <span className="text-slate-500">{formatPlaytime(slot.playtimeSeconds)}</span>
                              </>
                            ) : null}
                          </div>
                        </>
                      ) : (
                        <div>
                          <span className="text-xs font-cinzel font-semibold text-slate-400 block">
                            Slot Vazio
                          </span>
                          <span className="text-[10px] font-mono text-slate-600">
                            Pronto para iniciar uma nova expedição
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right side: Delete icon button if occupied, or arrow indicator */}
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {hasRun && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          soundManager.playButtonClick();
                          setConfirmDeleteSlotId(id);
                        }}
                        className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/60 transition-colors"
                        title={`Excluir expedição do Slot ${id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8]" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. FOOTER: Especificações Técnicas e Suporte Offline */}
      <div className="relative z-10 px-4 py-3 sm:px-6 md:px-10 border-t border-slate-800/60 text-[10.5px] font-mono text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 bg-[#06080D]/80 backdrop-blur-sm">
        <span>O Abismo Lembra · Roguelite Top-Down 2D Dark Fantasy</span>
        <div className="flex items-center gap-3">
          <span>Teclado/Mouse</span>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <span>Gamepad Tátil Mobile</span>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <span className="text-emerald-500/80 font-bold">100% Offline</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. IN-UI DIALOG: Confirmação de Exclusão de Slot (Zero window.confirm) */}
      {/* ======================================================== */}
      {confirmDeleteSlotId && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#0D121D] border border-rose-800/80 rounded-2xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center gap-2 text-rose-400 font-cinzel font-bold text-base">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Excluir Expedição do Slot {confirmDeleteSlotId}?</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-inter">
              Esta ação removerá permanentemente o progresso salvo no{' '}
              <span className="text-amber-400 font-bold">
                Andar {slotsData[confirmDeleteSlotId]?.floor}
              </span>{' '}
              (Nível {slotsData[confirmDeleteSlotId]?.playerStats?.level || 1}). Todos os itens, atributos e seed deste slot serão perdidos.
            </p>

            <div className="flex items-center gap-2.5 mt-2">
              <button
                onClick={() => executeDeleteSlot(confirmDeleteSlotId)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors shadow"
              >
                Sim, Excluir Slot
              </button>
              <button
                onClick={() => setConfirmDeleteSlotId(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition-colors"
              >
                Cancelar (ESC)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. IN-UI DIALOG: Confirmação de Substituição (Nova Descida) */}
      {/* ======================================================== */}
      {confirmOverwriteSlot && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#0D121D] border border-amber-600/80 rounded-2xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center gap-2 text-amber-400 font-cinzel font-bold text-base">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Substituir Expedição Ativa?</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-inter">
              O <span className="text-white font-bold">Slot {selectedSlotId}</span> já possui uma expedição em andamento no{' '}
              <span className="text-amber-400 font-bold">Andar {activeSlot.floor}</span>.
              Iniciar uma nova descida irá sobrescrever esta partida com uma nova expedição.
            </p>

            <div className="flex items-center gap-2.5 mt-2">
              <button
                onClick={executeStartNew}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors shadow"
              >
                Substituir e Iniciar
              </button>
              <button
                onClick={() => setConfirmOverwriteSlot(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition-colors"
              >
                Voltar (ESC)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. IN-UI DIALOG: Informação sobre Vestígios do Abismo */}
      {/* ======================================================== */}
      {showVestigesInfo && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#0D121D] border border-purple-800/80 rounded-2xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-purple-900/60 pb-2">
              <div className="flex items-center gap-2 text-purple-300 font-cinzel font-bold text-base">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Vestígios do Abismo</span>
              </div>
              <button
                onClick={() => setShowVestigesInfo(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-inter">
              Os <span className="text-purple-300 font-semibold">Vestígios do Abismo</span> são a essência permanente acumulada através das suas expedições. Ao purificar andares, derrotar monstros e fechar pactos nos altares, você adquire essa força imortal.
            </p>

            <p className="text-xs text-slate-400 leading-relaxed font-inter">
              Diferente dos equipamentos temporários da mochila, os Vestígios sobrevivem à morte e alimentam a <span className="text-purple-300 font-semibold">Árvore de Ascensão</span>, concedendo bônus perpétuos de Vida Máxima, Ataque, Visão e Redução de Recarga para todas as suas futuras encarnações.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  setShowVestigesInfo(false);
                  onOpenAscension();
                }}
                className="flex-1 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-mono text-xs font-bold transition-colors shadow"
              >
                Abrir Árvore de Ascensão
              </button>
              <button
                onClick={() => setShowVestigesInfo(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
