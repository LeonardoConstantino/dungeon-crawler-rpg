import React, { useState, useRef } from 'react';
import {
  X,
  Copy,
  Check,
  Share2,
  Download,
  Flame,
  Award,
  Play,
  Skull,
  Clock,
  Sparkles,
  Shield,
  Sword,
} from 'lucide-react';
import { soundManager } from '../game/audio';
import { PlayerState } from '../game/types';

interface SocialShareModalProps {
  currentSeed: string;
  floor: number;
  level: number;
  kills: number;
  playtimeSeconds: number;
  remnantsEarned: number;
  player?: PlayerState;
  isVictory?: boolean;
  causeOfDeath?: string;
  onClose: () => void;
  onStartCustomSeed: (seed: string) => void;
}

export const SocialShareModal: React.FC<SocialShareModalProps> = ({
  currentSeed,
  floor,
  level,
  kills,
  playtimeSeconds,
  remnantsEarned,
  player,
  isVictory = false,
  causeOfDeath = 'Consumido pela Fome do Abismo',
  onClose,
  onStartCustomSeed,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [inputSeed, setInputSeed] = useState('');
  const [activeTab, setActiveTab] = useState<'share' | 'challenge'>('share');
  const [isExportingImage, setIsExportingImage] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Determine Rank based on floor & kills
  const getRank = () => {
    if (isVictory || floor >= 10) return { rank: 'S', title: 'Conquistador do Abismo', color: 'text-amber-400 border-amber-500 bg-amber-950/40' };
    if (floor >= 7) return { rank: 'A', title: 'Senhor das Fissuras', color: 'text-purple-400 border-purple-500 bg-purple-950/40' };
    if (floor >= 4) return { rank: 'B', title: 'Andarilho Espectral', color: 'text-sky-400 border-sky-500 bg-sky-950/40' };
    if (floor >= 2) return { rank: 'C', title: 'Iniciado das Sombras', color: 'text-emerald-400 border-emerald-500 bg-emerald-950/40' };
    return { rank: 'D', title: 'Descendente Novato', color: 'text-slate-400 border-slate-600 bg-slate-900/40' };
  };

  const rankInfo = getRank();

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}m ${remainingSecs}s`;
  };

  const currentUrl = typeof window !== 'undefined'
    ? `https://leonardoconstantino.github.io/dungeon-crawler-rpg/?seed=${encodeURIComponent(currentSeed)}`
    : `https://leonardoconstantino.github.io/dungeon-crawler-rpg/?seed=${encodeURIComponent(currentSeed)}`;

  const shareText = `⚔️ DUNGEON CRAWLER RPG ⚔️\n${isVictory ? '👑 VITÓRIA LENDÁRIA!' : '💀 REGISTRO DA QUEDA'}\n` +
    `• Rank: [${rankInfo.rank}] ${rankInfo.title}\n` +
    `• Andar Alcançado: ${floor}\n` +
    `• Nível: ${level} | Abates: ${kills}\n` +
    `• Sobrevivência: ${formatTime(playtimeSeconds)}\n` +
    `• Vestígios: +${remnantsEarned}\n` +
    `• Seed: ${currentSeed}\n\n` +
    `Você consegue superar a Fome do Abismo? Aceite o desafio:\n${currentUrl}`;

  const handleCopyLink = () => {
    soundManager.playButtonClick();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const handleCopyText = () => {
    soundManager.playButtonClick();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
    }
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2200);
  };

  const handleShareWhatsApp = () => {
    soundManager.playButtonClick();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const handleShareTwitter = () => {
    soundManager.playButtonClick();
    const tweet = `Sobrevivi até o Andar ${floor} no Dungeon Crawler RPG com Rank [${rankInfo.rank}]! Você aceita o desafio nesta mesma seed? ${currentUrl} #DungeonCrawler #Roguelite #IndieGame`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`;
    window.open(url, '_blank');
  };

  // Generate and download a canvas image card
  const handleExportCardImage = () => {
    soundManager.playButtonClick();
    setIsExportingImage(true);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 1000;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Background stone texture
      const bgGrad = ctx.createLinearGradient(0, 0, 0, 1000);
      bgGrad.addColorStop(0, '#06080F');
      bgGrad.addColorStop(0.5, '#0E131F');
      bgGrad.addColorStop(1, '#05070B');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 800, 1000);

      // Ornate Border
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, 760, 960);

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.strokeRect(28, 28, 744, 944);

      // Header Banner
      ctx.fillStyle = '#D97706';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('DUNGEON CRAWLER RPG · REGISTRO DO ABISMO', 400, 75);

      // Title
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 36px serif';
      ctx.fillText(isVictory ? 'VITÓRIA NO ABISMO' : 'DESCIDA AO ABISMO', 400, 130);

      // Subtitle
      ctx.fillStyle = '#94A3B8';
      ctx.font = 'italic 16px sans-serif';
      ctx.fillText(`"${causeOfDeath}"`, 400, 165);

      // Rank Badge Shield
      ctx.fillStyle = '#1E1B4B';
      ctx.fillRect(320, 195, 160, 90);
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.strokeRect(320, 195, 160, 90);

      ctx.fillStyle = '#F59E0B';
      ctx.font = 'bold 48px monospace';
      ctx.fillText(rankInfo.rank, 400, 255);

      ctx.font = '12px monospace';
      ctx.fillStyle = '#FDE68A';
      ctx.fillText(rankInfo.title.toUpperCase(), 400, 275);

      // Stats Grid Panel
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(60, 310, 680, 380);
      ctx.strokeStyle = '#1E293B';
      ctx.strokeRect(60, 310, 680, 380);

      const metrics = [
        { label: 'ANDAR ALCANÇADO', val: `Andar ${floor}` },
        { label: 'NÍVEL DO DESCENDENTE', val: `Nível ${level}` },
        { label: 'INIMIGOS DERROTADOS', val: `${kills} Monstros` },
        { label: 'TEMPO DE SOBREVIVÊNCIA', val: formatTime(playtimeSeconds) },
        { label: 'VESTÍGIOS DO ABISMO', val: `+${remnantsEarned} Almas` },
        { label: 'EQUIPAMENTO PRINCIPAL', val: player?.equipment.weapon?.name || 'Gládio Padrão' },
      ];

      metrics.forEach((m, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const x = col === 0 ? 90 : 430;
        const y = 350 + row * 115;

        ctx.fillStyle = '#64748B';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(m.label, x, y);

        ctx.fillStyle = '#F8FAFC';
        ctx.font = 'bold 24px monospace';
        ctx.fillText(m.val, x, y + 32);
      });

      // Seed Box
      ctx.fillStyle = '#05070B';
      ctx.fillRect(60, 720, 680, 90);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(60, 720, 680, 90);

      ctx.fillStyle = '#F59E0B';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SEMENTE DETERMINÍSTICA DO MAPA (SEED)', 400, 748);

      ctx.fillStyle = '#38BDF8';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(currentSeed, 400, 785);

      // Playable URL Call to Action
      ctx.fillStyle = '#E2E8F0';
      ctx.font = '15px sans-serif';
      ctx.fillText('Aceite o desafio e tente sobreviver na mesma masmorra:', 400, 855);

      ctx.fillStyle = '#38BDF8';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('leonardoconstantino.github.io/dungeon-crawler-rpg', 400, 890);

      // Watermark
      ctx.fillStyle = '#475569';
      ctx.font = '11px monospace';
      ctx.fillText('Gerado proceduralmente · Roguelite Dark Fantasy', 400, 945);

      // Trigger download
      const imageURL = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = imageURL;
      downloadLink.download = `dungeon-crawler-desafio-${currentSeed.slice(0, 10)}.png`;
      downloadLink.click();
    } catch {
      // Fallback
    } finally {
      setIsExportingImage(false);
    }
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
      <div className="bg-[#0B0E14] border border-slate-800 rounded-2xl w-full max-w-xl max-h-[92dvh] overflow-y-auto p-4 sm:p-6 flex flex-col shadow-2xl relative">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm sm:text-base font-cinzel font-bold text-slate-100 tracking-wider">
              COMPARTILHAMENTO & DESAFIOS
            </h2>
          </div>
          <button
            onClick={() => {
              soundManager.playButtonClick();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mb-4">
          <button
            onClick={() => {
              soundManager.playButtonClick();
              setActiveTab('share');
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'share'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Card de Aventura</span>
          </button>
          <button
            onClick={() => {
              soundManager.playButtonClick();
              setActiveTab('challenge');
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'challenge'
                ? 'bg-sky-700 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Jogar com Outra Seed</span>
          </button>
        </div>

        {activeTab === 'share' ? (
          <div className="flex flex-col gap-4">
            {/* Visual Roguelite Challenge Card */}
            <div
              ref={cardRef}
              className="bg-gradient-to-b from-[#10141F] to-[#0A0D15] p-4 sm:p-5 rounded-xl border border-amber-500/40 shadow-xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider block">
                    Registro de Batalha
                  </span>
                  <h3 className="text-base sm:text-lg font-cinzel font-bold text-slate-100 flex items-center gap-2">
                    <span>{isVictory ? 'Triunfo no Abismo' : 'Descida nas Profundezas'}</span>
                  </h3>
                  <p className="text-xs text-slate-400 italic">"{causeOfDeath}"</p>
                </div>

                {/* Rank Badge */}
                <div
                  className={`px-3 py-1.5 rounded-lg border flex flex-col items-center justify-center shadow-lg ${rankInfo.color}`}
                >
                  <span className="text-[9px] font-mono uppercase tracking-widest">Rank</span>
                  <span className="text-2xl font-black font-mono leading-none">{rankInfo.rank}</span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3 bg-black/40 p-3 rounded-lg border border-slate-800/80 text-xs font-mono">
                <div>
                  <span className="text-slate-500 text-[10px] block">ANDAR</span>
                  <span className="text-slate-200 font-bold text-sm">Andar {floor}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">NÍVEL</span>
                  <span className="text-slate-200 font-bold text-sm">Nvl {level}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">ABATES</span>
                  <span className="text-slate-200 font-bold text-sm">{kills}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">TEMPO</span>
                  <span className="text-slate-200 font-bold text-sm">{formatTime(playtimeSeconds)}</span>
                </div>
              </div>

              {/* Equipment Highlight if available */}
              {player && (
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-3 bg-slate-950/60 p-2 rounded border border-slate-900">
                  <Sword className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">
                    Arma: <strong className="text-slate-200">{player.equipment.weapon?.name || 'Gládio Padrão'}</strong>
                  </span>
                  <span className="text-slate-700">|</span>
                  <Shield className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="truncate">
                    Armadura: <strong className="text-slate-200">{player.equipment.armor?.name || 'Capa Simples'}</strong>
                  </span>
                </div>
              )}

              {/* Seed display inside card */}
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 flex items-center justify-between gap-2">
                <div className="truncate">
                  <span className="text-[10px] font-mono text-slate-500 block">SEED DETERMINÍSTICA</span>
                  <span className="font-mono text-xs text-amber-300 font-bold select-all truncate block">
                    {currentSeed}
                  </span>
                </div>
                <button
                  onClick={handleCopyLink}
                  title="Copiar link com a seed"
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors shrink-0"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Social Sharing Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* WhatsApp Button */}
              <button
                onClick={handleShareWhatsApp}
                className="py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-mono text-xs font-bold transition-all shadow flex items-center justify-center gap-2 active:scale-98"
              >
                <Share2 className="w-4 h-4" />
                <span>Desafiar no WhatsApp</span>
              </button>

              {/* X / Twitter Button */}
              <button
                onClick={handleShareTwitter}
                className="py-2.5 px-3 rounded-xl bg-sky-700 hover:bg-sky-600 text-white font-mono text-xs font-bold transition-all shadow flex items-center justify-center gap-2 active:scale-98"
              >
                <Share2 className="w-4 h-4" />
                <span>Compartilhar no X (Twitter)</span>
              </button>

              {/* Copy Full Text Summary */}
              <button
                onClick={handleCopyText}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-semibold border border-slate-700 transition-all flex items-center justify-center gap-2"
              >
                {copiedText ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Resumo Copiado para Área de Transf.!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-400" />
                    <span>Copiar Resumo (Discord/Chat)</span>
                  </>
                )}
              </button>

              {/* Export Canvas Image */}
              <button
                onClick={handleExportCardImage}
                disabled={isExportingImage}
                className="py-2.5 px-3 rounded-xl bg-purple-900/80 hover:bg-purple-800 border border-purple-700 text-purple-200 font-mono text-xs font-bold transition-all shadow flex items-center justify-center gap-2 active:scale-98"
              >
                <Download className="w-4 h-4 text-purple-300" />
                <span>{isExportingImage ? 'Gerando Imagem...' : 'Baixar Cartão em PNG'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Custom Seed Exploration Tab */
          <div className="bg-[#10141E] p-4 sm:p-5 rounded-xl border border-slate-800 flex flex-col gap-3">
            <div>
              <h3 className="text-sm font-cinzel font-bold text-slate-100 mb-1">
                ENTRAR EM UMA MASMORRA DE AMIGO
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-inter">
                Cole a seed enviada por um amigo para jogar exatamente a mesma masmorra, com os mesmos itens, salas e perigos.
              </p>
            </div>

            <div className="flex gap-2 mt-2">
              <input
                type="text"
                placeholder="Ex: abyss-849201..."
                value={inputSeed}
                onChange={(e) => setInputSeed(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500"
              />
              <button
                onClick={handlePlayCustom}
                disabled={!inputSeed.trim()}
                className="py-2 px-4 rounded-lg bg-sky-700 hover:bg-sky-600 disabled:bg-slate-900 disabled:text-slate-600 text-white text-xs font-mono font-bold transition-colors flex items-center gap-1.5 shadow"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Explorar Seed</span>
              </button>
            </div>

            <div className="mt-2 text-[11px] font-mono text-slate-500 bg-black/30 p-2.5 rounded border border-slate-900">
              💡 Dica: Sementes com o mesmo prefixo e caracteres garantem layout 100% reproduzível entre diferentes jogadores.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
