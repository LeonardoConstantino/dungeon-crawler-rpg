import React, { useState } from 'react';
import { Equipment, Item, PlayerState } from '../game/types';
import { X, Shield, Sword, Heart, Sparkles, Trash2, ArrowUp, ArrowDown, Minus, Check, AlertTriangle, Zap, User } from 'lucide-react';
import { soundManager } from '../game/audio';
import inventoryCharacterImg from '../assets/images/inventory character.png';
import { ItemIcon } from './ItemIcon';

interface InventoryModalProps {
  player: PlayerState;
  onClose: () => void;
  onEquip: (index: number, targetSlot?: keyof Equipment) => void;
  onUnequip: (slot: keyof Equipment) => void;
  onDiscard: (index: number) => void;
  onDiscardEquipped?: (slot: keyof Equipment) => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  player,
  onClose,
  onEquip,
  onUnequip,
  onDiscard,
  onDiscardEquipped,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedEquipSlot, setSelectedEquipSlot] = useState<keyof Equipment | null>(null);
  const [ringCompareSlot, setRingCompareSlot] = useState<'ring1' | 'ring2'>('ring1');
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [mobileTab, setMobileTab] = useState<'inventory' | 'equipment'>('inventory');
  const [inspectedIds, setInspectedIds] = useState<Set<string>>(() => new Set());

  const selectedItem: Item | null =
    selectedIndex !== null
      ? player.inventory[selectedIndex]
      : selectedEquipSlot !== null
      ? player.equipment[selectedEquipSlot]
      : null;

  const isInspectingInventory = selectedIndex !== null;
  const newItemsCount = player.inventory.filter(
    (i) => i && i.isNew && !inspectedIds.has(i.id)
  ).length;

  // Determine which currently equipped item to compare against
  let equippedComparisonItem: Item | null = null;
  if (selectedItem && isInspectingInventory) {
    if (selectedItem.type === 'weapon') {
      equippedComparisonItem = player.equipment.weapon;
    } else if (selectedItem.type === 'armor') {
      equippedComparisonItem = player.equipment.armor;
    } else if (selectedItem.type === 'amulet') {
      equippedComparisonItem = player.equipment.amulet;
    } else if (selectedItem.type === 'ring') {
      equippedComparisonItem = player.equipment[ringCompareSlot];
    }
  }

  const getRarityColor = (rarity: string) => {
    if (rarity === 'legendary') {
      return 'border-amber-500/90 text-amber-300 bg-gradient-to-b from-[#1C1408]/90 via-[#130E06]/95 to-[#080502]/95 shadow-[0_0_12px_rgba(245,158,11,0.3)] ring-1 ring-amber-400/35';
    }
    if (rarity === 'rare') {
      return 'border-sky-500/80 text-sky-300 bg-gradient-to-b from-[#0A1624]/90 via-[#07101B]/95 to-[#040810]/95 shadow-[0_0_10px_rgba(56,189,248,0.25)] ring-1 ring-sky-400/35';
    }
    return 'border-slate-700/80 text-slate-300 bg-gradient-to-b from-[#141A28]/85 to-[#0A0E17]/95 hover:border-slate-500';
  };

  const getRarityBadge = (rarity: string) => {
    if (rarity === 'legendary') return 'LENDÁRIO';
    if (rarity === 'rare') return 'RARO';
    return 'COMUM';
  };

  // Helper to calculate instant stat difference compared to currently equipped gear
  const getSlotStatDiff = (item: Item | null): { diff: number; label: string } | null => {
    if (!item) return null;
    if (item.type === 'weapon') {
      const currentAtk = player.equipment.weapon?.stats?.attack || 0;
      const itemAtk = item.stats?.attack || 0;
      return { diff: itemAtk - currentAtk, label: 'ATQ' };
    }
    if (item.type === 'armor') {
      const currentDef = player.equipment.armor?.stats?.defense || 0;
      const itemDef = item.stats?.defense || 0;
      return { diff: itemDef - currentDef, label: 'DEF' };
    }
    if (item.type === 'amulet') {
      const currentHp = player.equipment.amulet?.stats?.maxHp || 0;
      const itemHp = item.stats?.maxHp || 0;
      return { diff: itemHp - currentHp, label: 'VIDA' };
    }
    if (item.type === 'ring') {
      const r1 = player.equipment.ring1?.stats?.attack || 0;
      const r2 = player.equipment.ring2?.stats?.attack || 0;
      const minEquipped = Math.min(r1, r2);
      const itemAtk = item.stats?.attack || 0;
      return { diff: itemAtk - minEquipped, label: 'ATQ' };
    }
    return null;
  };

  // Helper to render stat comparison row
  const renderStatDiff = (
    label: string,
    selectedVal?: number,
    equippedVal?: number,
    isPercentage = false
  ) => {
    const s = selectedVal || 0;
    const e = equippedVal || 0;
    if (s === 0 && e === 0) return null;

    const diff = s - e;
    const format = (v: number) => (isPercentage ? `${Math.round(v * 100)}%` : `${v}`);

    return (
      <div className="flex items-center justify-between text-xs font-mono py-1 border-b border-slate-800/60 last:border-0">
        <span className="text-slate-400">{label}:</span>
        <div className="flex items-center gap-2">
          {equippedComparisonItem !== null ? (
            <>
              <span className="text-slate-500">{format(e)}</span>
              <span className="text-slate-600">→</span>
              <span className="text-slate-200 font-bold">{format(s)}</span>
              {diff > 0 ? (
                <span className="flex items-center text-emerald-400 font-bold text-[11px] bg-emerald-950/40 px-1 rounded">
                  <ArrowUp className="w-3 h-3 mr-0.5" />
                  +{format(diff)}
                </span>
              ) : diff < 0 ? (
                <span className="flex items-center text-rose-400 font-bold text-[11px] bg-rose-950/40 px-1 rounded">
                  <ArrowDown className="w-3 h-3 mr-0.5" />
                  {format(diff)}
                </span>
              ) : (
                <span className="text-slate-500 text-[11px] flex items-center">
                  <Minus className="w-3 h-3" />
                </span>
              )}
            </>
          ) : (
            <span className="text-emerald-400 font-bold">+{format(s)}</span>
          )}
        </div>
      </div>
    );
  };

  const renderEquipSlotCard = (
    slotKey: keyof Equipment,
    slotLabel: string,
    slotItem: Item | null,
    Icon: React.ComponentType<{ className?: string }>
  ) => {
    const isSelected = selectedEquipSlot === slotKey;
    const isMatchingBackpackItem =
      selectedItem &&
      isInspectingInventory &&
      ((slotKey === 'weapon' && selectedItem.type === 'weapon') ||
        (slotKey === 'armor' && selectedItem.type === 'armor') ||
        (slotKey === 'amulet' && selectedItem.type === 'amulet') ||
        ((slotKey === 'ring1' || slotKey === 'ring2') && selectedItem.type === 'ring'));

    return (
      <div
        key={slotKey}
        onClick={() => {
          soundManager.playButtonClick();
          setSelectedIndex(null);
          setSelectedEquipSlot(slotKey);
          setConfirmingDiscard(false);
        }}
        className={`flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl border text-center transition-all cursor-pointer relative overflow-hidden ${
          isSelected
            ? 'border-sky-400 bg-sky-950/60 ring-2 ring-sky-400 shadow-[0_0_14px_rgba(56,189,248,0.45)]'
            : isMatchingBackpackItem
            ? 'border-emerald-500/80 bg-emerald-950/40 ring-1 ring-emerald-500/60 animate-pulse'
            : slotItem
            ? `${getRarityColor(slotItem.rarity)} hover:border-slate-400`
            : 'border-dashed border-slate-800 bg-slate-950/40 text-slate-600 hover:border-slate-700'
        }`}
        title={slotItem ? `${slotLabel}: ${slotItem.name}` : `${slotLabel}: Vazio`}
      >
        {/* Corner Accents for Rare/Legendary Equipped Gear */}
        {slotItem?.rarity === 'legendary' && (
          <>
            <span className="absolute top-1 left-1 w-1 h-1 bg-amber-400 rounded-full shadow-[0_0_4px_#fbbf24] pointer-events-none" />
            <span className="absolute top-1 right-1 w-1 h-1 bg-amber-400 rounded-full shadow-[0_0_4px_#fbbf24] pointer-events-none" />
            <span className="absolute bottom-1 left-1 w-1 h-1 bg-amber-400 rounded-full shadow-[0_0_4px_#fbbf24] pointer-events-none" />
            <span className="absolute bottom-1 right-1 w-1 h-1 bg-amber-400 rounded-full shadow-[0_0_4px_#fbbf24] pointer-events-none" />
          </>
        )}
        {slotItem?.rarity === 'rare' && (
          <>
            <span className="absolute top-1 left-1 w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_4px_#22d3ee] pointer-events-none" />
            <span className="absolute top-1 right-1 w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_4px_#22d3ee] pointer-events-none" />
          </>
        )}

        <div
          className={`w-13 h-13 sm:w-15 sm:h-15 rounded-xl flex items-center justify-center shrink-0 border overflow-hidden ${
            slotItem
              ? 'bg-slate-800/90 text-slate-200 border-slate-700 shadow-inner'
              : 'bg-slate-900/60 text-slate-600 border-slate-800/80'
          }`}
          style={{ minWidth: '50px', minHeight: '50px' }}
        >
          {slotItem ? (
            <ItemIcon item={slotItem} size={50} showRarityGlow />
          ) : (
            <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" />
          )}
        </div>
        <span className="text-[8.5px] sm:text-[9.5px] font-mono uppercase tracking-tight text-slate-400 mt-1 truncate max-w-full font-semibold">
          {slotLabel}
        </span>
        <span
          className={`text-[9.5px] sm:text-[10.5px] font-bold truncate max-w-full leading-tight px-0.5 ${
            slotItem
              ? slotItem.rarity === 'legendary'
                ? 'text-amber-400 drop-shadow-[0_0_4px_rgba(245,158,11,0.5)]'
                : slotItem.rarity === 'rare'
                ? 'text-sky-300 drop-shadow-[0_0_4px_rgba(56,189,248,0.5)]'
                : 'text-slate-200'
              : 'text-slate-600 italic'
          }`}
        >
          {slotItem ? slotItem.name.replace(/^antigo\s+/i, '').trim() : 'Vazio'}
        </span>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none animate-in fade-in duration-200"
      style={{
        paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(0.5rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(0.5rem, env(safe-area-inset-right, 0px))',
      }}
    >
      <div className="bg-[#0D111A] border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <h2 className="text-sm sm:text-lg font-cinzel font-bold text-slate-100 tracking-wide">
              MOCHILA E EQUIPAMENTOS
            </h2>
            <span className="text-xs font-mono text-slate-500 hidden sm:inline">
              {player.inventory.filter(Boolean).length} / 20 SLOTS
            </span>
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

        {/* Mobile Tab Bar (Visible on mobile/tablets < lg) */}
        <div className="flex lg:hidden border-b border-slate-800 bg-[#090D14]">
          <button
            onClick={() => {
              soundManager.playButtonClick();
              setMobileTab('inventory');
            }}
            className={`flex-1 py-2.5 text-xs font-mono font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              mobileTab === 'inventory'
                ? 'border-sky-500 text-sky-400 bg-slate-900/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Mochila ({player.inventory.filter(Boolean).length}/20)</span>
          </button>
          <button
            onClick={() => {
              soundManager.playButtonClick();
              setMobileTab('equipment');
            }}
            className={`flex-1 py-2.5 text-xs font-mono font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              mobileTab === 'equipment'
                ? 'border-sky-500 text-sky-400 bg-slate-900/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Equipamento</span>
          </button>
        </div>

        {/* Body Grid: Equipment Paperdoll (Col 1) | Inventory Grid (Col 2) | Item Inspection & Comparison (Col 3) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 p-3 sm:p-4 overflow-y-auto">
          {/* Column 1: Equipped Slots & Character Paperdoll (GDD 8.4) */}
          <div
            className={`lg:col-span-4 bg-[#111622] border border-slate-800/80 rounded-xl p-3 sm:p-3.5 flex flex-col gap-2.5 ${
              mobileTab === 'equipment' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            {/* Header: Title & Level */}
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_#38bdf8]" />
                <h3 className="text-xs font-cinzel font-bold tracking-wider text-slate-200 uppercase">
                  O Descendente
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950/80 text-sky-300 border border-sky-800/60 font-semibold">
                NÍVEL {player.stats.level}
              </span>
            </div>

            {/* Character Paperdoll Presentation (GDD 8.4) */}
            <div className="relative rounded-xl border border-slate-800/90 bg-gradient-to-b from-[#090D15] via-[#0D121C] to-[#080B12] p-2 sm:p-2.5 flex flex-col shadow-inner overflow-hidden group">
              {/* Subtle Atmospheric Backdrop Glow */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.08)_0%,transparent_75%)] pointer-events-none" />

              {/* Flanked Paperdoll Grid: Left Slots | Hero Figure | Right Slots */}
              <div className="relative z-10 grid grid-cols-12 gap-1.5 sm:gap-2 items-center">
                {/* Left Slots: Weapon & Ring 1 */}
                <div className="col-span-3 flex flex-col justify-around gap-2 h-full">
                  {renderEquipSlotCard('weapon', 'Arma', player.equipment.weapon, Sword)}
                  {renderEquipSlotCard('ring1', 'Anel 1', player.equipment.ring1, Sparkles)}
                </div>

                {/* Center: Character Art (from src/assets/images/inventory character.png) */}
                <div className="col-span-6 flex flex-col items-center justify-center py-0.5 relative">
                  <div className="relative flex items-center justify-center">
                    <img
                      src={inventoryCharacterImg}
                      alt="O Descendente - Personagem Principal"
                      className="h-44 sm:h-48 md:h-52 w-auto object-contain image-pixelated drop-shadow-[0_8px_18px_rgba(0,0,0,0.85)] transition-transform duration-300 group-hover:scale-102 select-none"
                      draggable={false}
                    />
                  </div>

                  {/* Character Vitality & Protection Mini-Tag */}
                  <div className="mt-1 flex items-center gap-1.5 text-[10px] font-mono bg-slate-950/80 px-2 py-0.5 rounded-full border border-slate-800/80 shadow">
                    <span className="text-rose-400 font-bold flex items-center gap-0.5">
                      <Heart className="w-2.5 h-2.5 fill-rose-500/30 text-rose-500" />
                      {player.stats.hp}/{player.stats.maxHp}
                    </span>
                    {player.shieldHp > 0 && (
                      <span className="text-purple-300 font-semibold flex items-center gap-0.5">
                        <Shield className="w-2.5 h-2.5 text-purple-400" />
                        +{player.shieldHp}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Slots: Armor, Amulet & Ring 2 */}
                <div className="col-span-3 flex flex-col justify-around gap-2 h-full">
                  {renderEquipSlotCard('armor', 'Armadura', player.equipment.armor, Shield)}
                  {renderEquipSlotCard('amulet', 'Amuleto', player.equipment.amulet, Heart)}
                  {renderEquipSlotCard('ring2', 'Anel 2', player.equipment.ring2, Sparkles)}
                </div>
              </div>
            </div>

            {/* Quick Combat Stat Summary Grid */}
            <div className="mt-auto pt-2 border-t border-slate-800/80 text-[10px] sm:text-[11px] font-mono text-slate-400 grid grid-cols-2 gap-x-3 gap-y-1 bg-slate-950/50 p-2 rounded-lg border border-slate-800/50">
              <div className="flex justify-between">
                <span>Ataque:</span>
                <span className="text-slate-100 font-bold">{player.stats.baseAttack}</span>
              </div>
              <div className="flex justify-between">
                <span>Defesa:</span>
                <span className="text-slate-100 font-bold">{player.stats.baseDefense}</span>
              </div>
              <div className="flex justify-between">
                <span>Vida Máx:</span>
                <span className="text-slate-100 font-bold">{player.stats.maxHp}</span>
              </div>
              <div className="flex justify-between">
                <span>Crítico:</span>
                <span className="text-slate-100 font-bold">{Math.round(player.stats.critChance * 100)}%</span>
              </div>
              <div className="flex justify-between col-span-2 border-t border-slate-800/60 pt-1">
                <span>Redução de Recarga:</span>
                <span className="text-slate-100 font-bold">{Math.round(player.stats.cooldownReduction * 100)}%</span>
              </div>
            </div>
          </div>

          {/* Column 2: 20-Slot Grid with Discrete Outline on Uninspected Items (GDD 8.4) */}
          <div
            className={`lg:col-span-4 bg-[#111622] border border-slate-800/80 rounded-xl p-3.5 flex-col ${
              mobileTab === 'inventory' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
                Grade da Mochila (20 Slots)
              </h3>
              {newItemsCount > 0 && (
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/90 text-cyan-300 border border-cyan-500/70 animate-pulse font-semibold flex items-center gap-1 shadow">
                  <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                  {newItemsCount} {newItemsCount === 1 ? 'Novo' : 'Novos'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 gap-2">
              {player.inventory.map((item, index) => {
                const isSelected = selectedIndex === index;
                const isNew = Boolean(item && item.isNew && !inspectedIds.has(item.id));
                const statDiff = getSlotStatDiff(item);

                return (
                  <button
                    key={index}
                    onClick={() => {
                      soundManager.playButtonClick();
                      if (item && item.isNew) {
                        item.isNew = false; // Inspected! Remove discrete outline immediately
                        setInspectedIds((prev) => new Set(prev).add(item.id));
                      }
                      setSelectedEquipSlot(null);
                      setSelectedIndex(index);
                      setConfirmingDiscard(false);
                    }}
                    className={`aspect-square rounded-xl border p-1 flex flex-col items-center justify-center transition-all relative overflow-hidden group ${
                      isSelected
                        ? 'border-sky-400 bg-sky-950/60 ring-2 ring-sky-400 shadow-[0_0_14px_rgba(56,189,248,0.45)]'
                        : item
                        ? getRarityColor(item.rarity)
                        : 'border-slate-800/80 bg-slate-950/40 hover:border-slate-700'
                    } ${
                      isNew
                        ? 'ring-1.5 ring-cyan-400/90 border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.4)] animate-pulse'
                        : ''
                    }`}
                  >
                    {/* Corner Accents for Rare/Legendary items */}
                    {item?.rarity === 'legendary' && (
                      <>
                        <span className="absolute top-1 left-1 w-1 h-1 bg-amber-400 rounded-full shadow-[0_0_4px_#fbbf24] pointer-events-none" />
                        <span className="absolute top-1 right-1 w-1 h-1 bg-amber-400 rounded-full shadow-[0_0_4px_#fbbf24] pointer-events-none" />
                        <span className="absolute bottom-1 left-1 w-1 h-1 bg-amber-400 rounded-full shadow-[0_0_4px_#fbbf24] pointer-events-none" />
                        <span className="absolute bottom-1 right-1 w-1 h-1 bg-amber-400 rounded-full shadow-[0_0_4px_#fbbf24] pointer-events-none" />
                      </>
                    )}
                    {item?.rarity === 'rare' && (
                      <>
                        <span className="absolute top-1 left-1 w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_4px_#22d3ee] pointer-events-none" />
                        <span className="absolute top-1 right-1 w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_4px_#22d3ee] pointer-events-none" />
                      </>
                    )}

                    {/* Instant Stat Comparison Badge (▲ +4 / ▼ -2) */}
                    {statDiff && statDiff.diff !== 0 && (
                      <div
                        className={`absolute top-1 left-1 flex items-center px-1 py-0.2 rounded text-[8px] font-mono font-black shadow pointer-events-none z-10 ${
                          statDiff.diff > 0
                            ? 'bg-emerald-950/95 border border-emerald-500/90 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                            : 'bg-rose-950/95 border border-rose-500/90 text-rose-300'
                        }`}
                        title={`${statDiff.label}: ${statDiff.diff > 0 ? `+${statDiff.diff}` : statDiff.diff} vs equipado`}
                      >
                        {statDiff.diff > 0 ? (
                          <ArrowUp className="w-2.5 h-2.5 mr-0.5 text-emerald-400" />
                        ) : (
                          <ArrowDown className="w-2.5 h-2.5 mr-0.5 text-rose-400" />
                        )}
                        <span>{statDiff.diff > 0 ? `+${statDiff.diff}` : statDiff.diff}</span>
                      </div>
                    )}

                    {/* Consumable badges */}
                    {item?.type === 'scroll' && (
                      <span className="absolute top-1 left-1 px-1 rounded bg-amber-950/90 border border-amber-500/80 text-amber-300 text-[7px] font-mono font-bold z-10 pointer-events-none shadow">
                        PERG
                      </span>
                    )}
                    {item?.type === 'elixir' && (
                      <span className="absolute top-1 left-1 px-1 rounded bg-purple-950/90 border border-purple-500/80 text-purple-300 text-[7px] font-mono font-bold z-10 pointer-events-none shadow">
                        ELIX
                      </span>
                    )}

                    {/* Discrete outline indicator for newly obtained uninspected items (GDD 8.4) */}
                    {isNew && (
                      <span
                        className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] border border-black animate-pulse z-20"
                        title="Item recém-obtido (não inspecionado)"
                      />
                    )}

                    {item ? (
                      <div className="flex flex-col items-center justify-between w-full h-full py-0.5">
                        <ItemIcon item={item} size={52} showRarityGlow />
                        <span
                          className={`text-[9px] sm:text-[10px] font-bold truncate max-w-full text-center px-0.5 leading-tight ${
                            item.rarity === 'legendary'
                              ? 'text-amber-400 drop-shadow-[0_0_4px_rgba(245,158,11,0.5)]'
                              : item.rarity === 'rare'
                              ? 'text-sky-300 drop-shadow-[0_0_4px_rgba(56,189,248,0.5)]'
                              : 'text-slate-200'
                          }`}
                          title={item.name}
                        >
                          {item.name.replace(/^antigo\s+/i, '').trim()}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] font-mono text-slate-700 m-auto">{index + 1}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-500 mt-auto pt-2.5 leading-tight">
              Itens recém-obtidos recebem contorno ciano discreto até serem inspecionados. Toque para comparar e equipar.
            </p>
          </div>

          {/* Column 3: Comparison & Inspection Panel */}
          <div className="lg:col-span-4 bg-[#111622] border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
            {selectedItem ? (
              <div className="flex flex-col gap-3">
                {/* Header of selected item with High-Res Sprite Icon */}
                <div
                  className={`flex items-start gap-3 p-2.5 rounded-xl border shadow-inner transition-all ${
                    selectedItem.rarity === 'legendary'
                      ? 'bg-gradient-to-r from-amber-950/40 via-slate-950/80 to-slate-950/90 border-amber-500/70 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                      : selectedItem.rarity === 'rare'
                      ? 'bg-gradient-to-r from-sky-950/40 via-slate-950/80 to-slate-950/90 border-sky-500/70 shadow-[0_0_15px_rgba(56,189,248,0.18)]'
                      : 'bg-slate-950/80 border-slate-800/90'
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-xl border shadow-md flex items-center justify-center shrink-0 ${
                      selectedItem.rarity === 'legendary'
                        ? 'bg-gradient-to-b from-[#1C1408] to-[#0A0703] border-amber-500/80 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                        : selectedItem.rarity === 'rare'
                        ? 'bg-gradient-to-b from-[#0A1624] to-[#040810] border-sky-500/80 shadow-[0_0_10px_rgba(56,189,248,0.3)]'
                        : 'bg-slate-900 border-slate-700/80'
                    }`}
                  >
                    <ItemIcon item={selectedItem} size={60} showRarityGlow />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9.5px] font-mono uppercase text-sky-400 font-bold">
                          {getRarityBadge(selectedItem.rarity)} · {selectedItem.type.toUpperCase()}
                        </span>
                        {(selectedItem.isNew || (isInspectingInventory && selectedIndex !== null && player.inventory[selectedIndex]?.isNew)) && (
                          <span className="text-[8.5px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/80 flex items-center gap-1 shadow animate-pulse">
                            <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                            NOVO
                          </span>
                        )}
                      </div>
                      {isInspectingInventory && (
                        <span className="text-[9.5px] font-mono text-slate-500">Mochila #{selectedIndex! + 1}</span>
                      )}
                    </div>
                    <h4 className="text-sm font-cinzel font-bold text-slate-100 truncate">
                      {selectedItem.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed line-clamp-2">
                      {selectedItem.description}
                    </p>
                  </div>
                </div>

                {/* If selected item is a Ring in inventory, offer selector to compare against Ring 1 or Ring 2 */}
                {isInspectingInventory && selectedItem.type === 'ring' && (
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between gap-1">
                    <span className="text-[10px] font-mono uppercase text-slate-400">Comparar com:</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setRingCompareSlot('ring1')}
                        className={`px-2 py-1 rounded text-[11px] font-mono ${
                          ringCompareSlot === 'ring1'
                            ? 'bg-sky-700 text-white font-bold'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Anel 1 ({player.equipment.ring1 ? 'Equipado' : 'Vazio'})
                      </button>
                      <button
                        onClick={() => setRingCompareSlot('ring2')}
                        className={`px-2 py-1 rounded text-[11px] font-mono ${
                          ringCompareSlot === 'ring2'
                            ? 'bg-sky-700 text-white font-bold'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Anel 2 ({player.equipment.ring2 ? 'Equipado' : 'Vazio'})
                      </button>
                    </div>
                  </div>
                )}

                {/* Comparative Stat Panel */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5">
                  <div className="text-[10px] font-mono uppercase text-slate-400 mb-1.5 flex items-center justify-between border-b border-slate-800 pb-1">
                    <span>Atributos</span>
                    {equippedComparisonItem ? (
                      <span className="text-slate-500">Equipado vs Selecionado</span>
                    ) : (
                      <span className="text-slate-500">Bônus Direto</span>
                    )}
                  </div>

                  {equippedComparisonItem && (
                    <div className="flex items-center justify-between bg-slate-950/70 px-2 py-1 rounded border border-slate-800/80 mb-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <ItemIcon item={equippedComparisonItem} size={20} />
                        <span className="text-[9.5px] font-mono text-slate-400 truncate max-w-[85px]">
                          {equippedComparisonItem.name.replace(/^antigo\s+/i, '').split(' ')[0]}
                        </span>
                      </div>
                      <span className="text-slate-600 text-[10px] font-bold">→</span>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[9.5px] font-mono text-sky-300 font-semibold truncate max-w-[85px]">
                          {selectedItem.name.replace(/^antigo\s+/i, '').split(' ')[0]}
                        </span>
                        <ItemIcon item={selectedItem} size={20} showRarityGlow />
                      </div>
                    </div>
                  )}

                  <div className="space-y-0.5">
                    {selectedItem.type === 'potion' ? (
                      <div className="flex justify-between text-xs font-mono text-emerald-400 py-1">
                        <span>Restauração:</span>
                        <span className="font-bold">+{selectedItem.healAmount}% Vida Máxima</span>
                      </div>
                    ) : (
                      <>
                        {renderStatDiff(
                          'Ataque',
                          selectedItem.stats.attack,
                          equippedComparisonItem?.stats.attack
                        )}
                        {renderStatDiff(
                          'Defesa',
                          selectedItem.stats.defense,
                          equippedComparisonItem?.stats.defense
                        )}
                        {renderStatDiff(
                          'Vida Máxima',
                          selectedItem.stats.maxHp,
                          equippedComparisonItem?.stats.maxHp
                        )}
                        {renderStatDiff(
                          'Chance Crítica',
                          selectedItem.stats.critChance,
                          equippedComparisonItem?.stats.critChance,
                          true
                        )}
                        {renderStatDiff(
                          'Redução Recarga',
                          selectedItem.stats.cooldownReduction,
                          equippedComparisonItem?.stats.cooldownReduction,
                          true
                        )}
                        {renderStatDiff(
                          'Velocidade',
                          selectedItem.stats.speed,
                          equippedComparisonItem?.stats.speed
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 mt-2">
                  {confirmingDiscard ? (
                    <div className="bg-rose-950/70 border border-rose-800 rounded-xl p-3 flex flex-col gap-2 animate-in fade-in">
                      <div className="text-xs font-mono text-rose-200 flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>Destruir este item?</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        O item <span className="font-semibold text-white">"{selectedItem.name}"</span> será descartado permanentemente.
                      </p>
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={() => {
                            if (isInspectingInventory && selectedIndex !== null) {
                              onDiscard(selectedIndex);
                              setSelectedIndex(null);
                            } else if (selectedEquipSlot !== null && onDiscardEquipped) {
                              onDiscardEquipped(selectedEquipSlot);
                              setSelectedEquipSlot(null);
                            }
                            setConfirmingDiscard(false);
                          }}
                          className="flex-1 py-2 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-mono text-xs font-bold transition-colors shadow"
                        >
                          Sim, Destruir
                        </button>
                        <button
                          onClick={() => setConfirmingDiscard(false)}
                          className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {isInspectingInventory && selectedIndex !== null && (
                        <>
                          {/* Ring-Specific Actions: Equip to Ring 1 or Ring 2 */}
                          {selectedItem.type === 'ring' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <button
                                onClick={() => {
                                  onEquip(selectedIndex, 'ring1');
                                  setSelectedIndex(null);
                                }}
                                className={`py-2 px-3 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider transition-colors shadow flex flex-col items-center justify-center ${
                                  !player.equipment.ring1
                                    ? 'bg-emerald-800 hover:bg-emerald-700 text-white'
                                    : 'bg-sky-700 hover:bg-sky-600 text-white'
                                }`}
                              >
                                <span>Equipar no Anel 1</span>
                                <span className="text-[10px] opacity-80 normal-case">
                                  {player.equipment.ring1 ? `Substitui ${player.equipment.ring1.name.slice(0, 12)}...` : '(Slot Vazio)'}
                                </span>
                              </button>

                              <button
                                onClick={() => {
                                  onEquip(selectedIndex, 'ring2');
                                  setSelectedIndex(null);
                                }}
                                className={`py-2 px-3 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider transition-colors shadow flex flex-col items-center justify-center ${
                                  !player.equipment.ring2
                                    ? 'bg-emerald-800 hover:bg-emerald-700 text-white'
                                    : 'bg-sky-700 hover:bg-sky-600 text-white'
                                }`}
                              >
                                <span>Equipar no Anel 2</span>
                                <span className="text-[10px] opacity-80 normal-case">
                                  {player.equipment.ring2 ? `Substitui ${player.equipment.ring2.name.slice(0, 12)}...` : '(Slot Vazio)'}
                                </span>
                              </button>
                            </div>
                          ) : selectedItem.type === 'scroll' ? (
                            <button
                              onClick={() => {
                                onEquip(selectedIndex);
                                setSelectedIndex(null);
                                onClose();
                              }}
                              className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 active:scale-98 ring-1 ring-amber-400/40"
                            >
                              <Sparkles className="w-4 h-4 text-amber-200" />
                              <span>Ativar Pergaminho</span>
                            </button>
                          ) : selectedItem.type === 'elixir' ? (
                            <button
                              onClick={() => {
                                onEquip(selectedIndex);
                                setSelectedIndex(null);
                                onClose();
                              }}
                              className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 active:scale-98 ring-1 ring-purple-400/40"
                            >
                              <Zap className="w-4 h-4 text-purple-200" />
                              <span>Consumir Elixir</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                onEquip(selectedIndex);
                                setSelectedIndex(null);
                              }}
                              className="w-full py-2.5 px-4 rounded-lg bg-sky-700 hover:bg-sky-600 text-white text-xs font-mono font-semibold uppercase tracking-wider transition-colors shadow-md flex items-center justify-center gap-2 active:scale-98"
                            >
                              <Check className="w-4 h-4" />
                              <span>
                                {selectedItem.type === 'potion'
                                  ? 'Beber Frasco de Sangue (+45% HP)'
                                  : equippedComparisonItem
                                  ? `Substituir ${equippedComparisonItem.name.split(' ')[0]}`
                                  : 'Equipar no Corpo'}
                              </span>
                            </button>
                          )}

                          <button
                            onClick={() => setConfirmingDiscard(true)}
                            className="w-full py-2 px-3 rounded-lg border border-slate-700 hover:border-rose-600 text-slate-400 hover:text-rose-400 text-xs font-mono transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Descartar Item</span>
                          </button>
                        </>
                      )}

                      {selectedEquipSlot !== null && (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => {
                              onUnequip(selectedEquipSlot);
                              setSelectedEquipSlot(null);
                            }}
                            className="w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono uppercase tracking-wider transition-colors"
                          >
                            Remover do Corpo e Guardar na Mochila
                          </button>

                          <button
                            onClick={() => setConfirmingDiscard(true)}
                            className="w-full py-2 px-3 rounded-lg border border-slate-800 hover:border-rose-700 text-slate-500 hover:text-rose-400 text-xs font-mono transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Destruir Item Equipado</span>
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-xs font-mono py-8 sm:py-12">
                <Shield className="w-8 h-8 mb-2 text-slate-700" />
                <span>Nenhum item selecionado.</span>
                <span className="text-[11px] text-slate-600 mt-1">
                  Selecione um item da mochila ou do corpo para comparar atributos.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
