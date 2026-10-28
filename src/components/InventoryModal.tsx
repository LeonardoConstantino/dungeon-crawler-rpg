import React, { useState, useEffect, useRef } from 'react';
import { Equipment, Item, PlayerState } from '../game/types';
import {
  X,
  Shield,
  Sword,
  Heart,
  Sparkles,
  Trash2,
  ArrowUp,
  ArrowDown,
  Minus,
  Check,
  AlertTriangle,
  Zap,
  Lock,
  Unlock,
  ArrowUpDown,
  Flame,
  Info,
} from 'lucide-react';
import { soundManager } from '../game/audio';
import inventoryCharacterImg from '../assets/images/inventory character.png';
import { ItemIcon } from './ItemIcon';

export interface InventoryModalProps {
  player: PlayerState;
  onClose: () => void;
  onEquip: (index: number, targetSlot?: keyof Equipment) => void;
  onUnequip: (slot: keyof Equipment) => void;
  onDiscard: (index: number) => void;
  onDiscardEquipped?: (slot: keyof Equipment) => void;
  onToggleLock?: (index: number) => void;
  onToggleLockEquipped?: (slot: keyof Equipment) => void;
  onDismantle?: (index: number) => void;
  onSortInventory?: () => void;
}

interface HoveredTooltipData {
  item: Item;
  x: number;
  y: number;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  player,
  onClose,
  onEquip,
  onUnequip,
  onDiscard,
  onDiscardEquipped,
  onToggleLock,
  onToggleLockEquipped,
  onDismantle,
  onSortInventory,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedEquipSlot, setSelectedEquipSlot] = useState<keyof Equipment | null>(null);
  const [ringCompareSlot, setRingCompareSlot] = useState<'ring1' | 'ring2'>('ring1');
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [confirmingDismantle, setConfirmingDismantle] = useState(false);
  const [mobileTab, setMobileTab] = useState<'inventory' | 'equipment'>('inventory');
  const [inspectedIds, setInspectedIds] = useState<Set<string>>(() => new Set());
  const [recentlyEquippedSlot, setRecentlyEquippedSlot] = useState<keyof Equipment | null>(null);
  const [hoveredTooltip, setHoveredTooltip] = useState<HoveredTooltipData | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const noticeTimerRef = useRef<number | null>(null);

  const showNotice = (msg: string) => {
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    setActionNotice(msg);
    noticeTimerRef.current = window.setTimeout(() => setActionNotice(null), 3000);
  };

  // Auto-select ring comparison target intelligently when selecting a ring
  useEffect(() => {
    if (selectedIndex !== null) {
      const item = player.inventory[selectedIndex];
      if (item && item.type === 'ring') {
        // If ring1 is empty, prioritize ring1; else if ring2 is empty, prioritize ring2
        if (!player.equipment.ring1 && player.equipment.ring2) {
          setRingCompareSlot('ring1');
        } else if (player.equipment.ring1 && !player.equipment.ring2) {
          setRingCompareSlot('ring2');
        }
      }
    }
  }, [selectedIndex, player.equipment]);

  const selectedItem: Item | null =
    selectedIndex !== null
      ? player.inventory[selectedIndex]
      : selectedEquipSlot !== null
      ? player.equipment[selectedEquipSlot]
      : null;

  const isInspectingInventory = selectedIndex !== null;
  const isBackpackFull = player.inventory.every((s) => s !== null);
  const inventoryFilledCount = player.inventory.filter(Boolean).length;
  const newItemsCount = player.inventory.filter(
    (i) => i && i.isNew && !inspectedIds.has(i.id)
  ).length;

  // Determine comparison target item
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

  // Flash punch feedback when equipping
  const triggerEquipFeedback = (slotKey: keyof Equipment) => {
    setRecentlyEquippedSlot(slotKey);
    window.setTimeout(() => setRecentlyEquippedSlot(null), 450);
  };

  // Execution: Equip or Consume
  const handlePerformEquip = (index: number, targetRing?: 'ring1' | 'ring2') => {
    const item = player.inventory[index];
    if (!item) return;

    if (item.type === 'potion' || item.type === 'scroll' || item.type === 'elixir') {
      onEquip(index);
      setSelectedIndex(null);
      setConfirmingDiscard(false);
      setConfirmingDismantle(false);
      showNotice(`${item.name} consumido.`);
      return;
    }

    let targetSlot: keyof Equipment = 'weapon';
    if (item.type === 'armor') targetSlot = 'armor';
    else if (item.type === 'amulet') targetSlot = 'amulet';
    else if (item.type === 'ring') {
      targetSlot =
        targetRing ||
        (ringCompareSlot === 'ring2' ? 'ring2' : !player.equipment.ring1 ? 'ring1' : !player.equipment.ring2 ? 'ring2' : 'ring1');
    }

    onEquip(index, targetSlot);
    triggerEquipFeedback(targetSlot);
    setSelectedIndex(null);
    setConfirmingDiscard(false);
    setConfirmingDismantle(false);
    showNotice(`${item.name} equipado.`);
  };

  // Execution: Unequip
  const handlePerformUnequip = (slot: keyof Equipment) => {
    if (isBackpackFull) {
      soundManager.playButtonClick();
      showNotice('Mochila cheia! Não há espaço livre para guardar.');
      return;
    }
    onUnequip(slot);
    setSelectedEquipSlot(null);
    setConfirmingDiscard(false);
    showNotice('Item guardado na mochila.');
  };

  // Quick Action: Double Click or Right Click on Backpack Slot
  const handleQuickEquip = (index: number) => {
    const item = player.inventory[index];
    if (!item) return;
    soundManager.playButtonClick();
    if (item.isNew) {
      item.isNew = false;
      setInspectedIds((prev) => new Set(prev).add(item.id));
    }
    handlePerformEquip(index);
  };

  // Toggle item lock
  const handleToggleLock = () => {
    if (isInspectingInventory && selectedIndex !== null) {
      if (onToggleLock) {
        onToggleLock(selectedIndex);
      } else {
        const item = player.inventory[selectedIndex];
        if (item) {
          item.isLocked = !item.isLocked;
          soundManager.playButtonClick();
        }
      }
    } else if (selectedEquipSlot !== null) {
      if (onToggleLockEquipped) {
        onToggleLockEquipped(selectedEquipSlot);
      } else {
        const item = player.equipment[selectedEquipSlot];
        if (item) {
          item.isLocked = !item.isLocked;
          soundManager.playButtonClick();
        }
      }
    }
  };

  // Dismantle
  const handleDismantle = () => {
    if (selectedIndex === null) return;
    const item = player.inventory[selectedIndex];
    if (!item) return;
    if (item.isLocked) {
      showNotice('Item protegido com cadeado não pode ser dissolvido.');
      return;
    }
    if (onDismantle) {
      onDismantle(selectedIndex);
    }
    setSelectedIndex(null);
    setConfirmingDismantle(false);
    setConfirmingDiscard(false);
  };

  // Discard
  const handleDiscard = () => {
    if (isInspectingInventory && selectedIndex !== null) {
      const item = player.inventory[selectedIndex];
      if (item?.isLocked) {
        showNotice('Item protegido com cadeado não pode ser descartado.');
        setConfirmingDiscard(false);
        return;
      }
      onDiscard(selectedIndex);
      setSelectedIndex(null);
    } else if (selectedEquipSlot !== null && onDiscardEquipped) {
      const item = player.equipment[selectedEquipSlot];
      if (item?.isLocked) {
        showNotice('Item protegido com cadeado não pode ser descartado.');
        setConfirmingDiscard(false);
        return;
      }
      onDiscardEquipped(selectedEquipSlot);
      setSelectedEquipSlot(null);
    }
    setConfirmingDiscard(false);
  };

  // Keyboard Navigation & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        if (confirmingDiscard) {
          setConfirmingDiscard(false);
        } else if (confirmingDismantle) {
          setConfirmingDismantle(false);
        } else {
          soundManager.playButtonClick();
          onClose();
        }
      } else if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') {
        if (selectedIndex !== null && !confirmingDiscard && !confirmingDismantle) {
          e.preventDefault();
          handlePerformEquip(selectedIndex);
        } else if (selectedEquipSlot !== null && !confirmingDiscard) {
          e.preventDefault();
          handlePerformUnequip(selectedEquipSlot);
        }
      } else if (e.key === 'l' || e.key === 'L') {
        if (selectedItem) {
          e.preventDefault();
          handleToggleLock();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, selectedEquipSlot, confirmingDiscard, confirmingDismantle, selectedItem, onClose]);

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

  const getRarityBorderAccent = (rarity: string) => {
    if (rarity === 'legendary') return 'text-amber-400 border-amber-500/60 bg-amber-950/60';
    if (rarity === 'rare') return 'text-sky-300 border-sky-500/60 bg-sky-950/60';
    return 'text-slate-400 border-slate-700/60 bg-slate-900/60';
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

  // Helper to calculate dismantle reward
  const getDismantleReward = (item: Item): number => {
    if (item.rarity === 'legendary') return 15;
    if (item.rarity === 'rare') return 6;
    if (item.type === 'scroll' || item.type === 'elixir' || item.type === 'potion') return 1;
    return 2;
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

  // Render Equipped Slot in Column 1
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
        ((slotKey === 'ring1' || slotKey === 'ring2') &&
          selectedItem.type === 'ring' &&
          (ringCompareSlot === slotKey || (!player.equipment[slotKey] && !player.equipment[ringCompareSlot]))));

    const isRecentlyEquipped = recentlyEquippedSlot === slotKey;

    return (
      <div
        key={slotKey}
        onClick={() => {
          soundManager.playButtonClick();
          setSelectedIndex(null);
          setSelectedEquipSlot(slotKey);
          setConfirmingDiscard(false);
          setConfirmingDismantle(false);
        }}
        className={`flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl border text-center transition-all cursor-pointer relative overflow-hidden select-none ${
          isRecentlyEquipped
            ? 'scale-105 border-cyan-400 bg-cyan-950/80 shadow-[0_0_22px_rgba(34,211,238,0.7)] ring-2 ring-cyan-300'
            : isSelected
            ? 'border-sky-400 bg-sky-950/60 ring-2 ring-sky-400 shadow-[0_0_14px_rgba(56,189,248,0.45)]'
            : isMatchingBackpackItem
            ? 'border-emerald-500/80 bg-emerald-950/40 ring-1 ring-emerald-500/70 animate-pulse'
            : slotItem
            ? `${getRarityColor(slotItem.rarity)} hover:border-slate-400`
            : 'border-dashed border-slate-800 bg-slate-950/40 text-slate-600 hover:border-slate-700'
        }`}
        title={slotItem ? `${slotLabel}: ${slotItem.name}` : `${slotLabel}: Vazio`}
      >
        {/* Target Indicator badge when inspecting backpack item */}
        {isMatchingBackpackItem && (
          <span className="absolute top-0.5 right-1 text-[7.5px] font-mono font-bold text-emerald-400 bg-emerald-950 px-1 rounded-sm border border-emerald-500/60 shadow pointer-events-none z-10">
            ALVO
          </span>
        )}

        {/* Lock indicator */}
        {slotItem?.isLocked && (
          <span
            className="absolute top-1 left-1 p-0.5 rounded bg-slate-950/90 border border-amber-500/70 text-amber-400 z-10 shadow"
            title="Equipamento protegido com cadeado"
          >
            <Lock className="w-2.5 h-2.5" />
          </span>
        )}

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
          style={{ minWidth: '48px', minHeight: '48px' }}
        >
          {slotItem ? (
            <ItemIcon item={slotItem} size={48} showRarityGlow />
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
      onClick={() => setHoveredTooltip(null)}
    >
      <div className="bg-[#0D111A] border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Floating Notification Toast */}
        {actionNotice && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-sky-500/80 text-sky-200 px-4 py-1.5 rounded-full shadow-2xl text-xs font-mono font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <Info className="w-3.5 h-3.5 text-sky-400" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-800 bg-[#090D14]">
          <div className="flex items-center gap-3">
            <h2 className="text-sm sm:text-lg font-cinzel font-bold text-slate-100 tracking-wide">
              MOCHILA E EQUIPAMENTOS
            </h2>
            <span
              className={`text-xs font-mono px-2 py-0.5 rounded border hidden sm:inline ${
                isBackpackFull
                  ? 'bg-rose-950/80 border-rose-700/80 text-rose-300 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              {inventoryFilledCount} / 20 SLOTS {isBackpackFull && '(CHEIA)'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto-Organize Backpack Button */}
            {onSortInventory && (
              <button
                onClick={() => {
                  onSortInventory();
                  showNotice('Mochila organizada por raridade.');
                }}
                className="px-2.5 py-1 rounded-lg border border-slate-700/80 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-slate-100 text-xs font-mono flex items-center gap-1.5 transition-colors shadow-sm"
                title="Organizar mochila por raridade e categoria"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Organizar</span>
              </button>
            )}

            <button
              onClick={() => {
                soundManager.playButtonClick();
                onClose();
              }}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              title="Fechar (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
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
            <span>Mochila ({inventoryFilledCount}/20)</span>
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
          {/* Column 1: Equipped Slots & Character Paperdoll */}
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

            {/* Character Paperdoll Presentation */}
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

                {/* Center: Character Art */}
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

          {/* Column 2: 20-Slot Grid */}
          <div
            className={`lg:col-span-4 bg-[#111622] border border-slate-800/80 rounded-xl p-3.5 flex flex-col ${
              mobileTab === 'inventory' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
                  Grade da Mochila (20)
                </h3>
                {newItemsCount > 0 && (
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/90 text-cyan-300 border border-cyan-500/70 animate-pulse font-semibold flex items-center gap-1 shadow">
                    <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                    {newItemsCount} {newItemsCount === 1 ? 'Novo' : 'Novos'}
                  </span>
                )}
              </div>

              {/* Desktop quick equip hint */}
              <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
                2x Clique / Dir: Equipar
              </span>
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
                        item.isNew = false;
                        setInspectedIds((prev) => new Set(prev).add(item.id));
                      }
                      setSelectedEquipSlot(null);
                      setSelectedIndex(index);
                      setConfirmingDiscard(false);
                      setConfirmingDismantle(false);
                    }}
                    onDoubleClick={() => handleQuickEquip(index)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      handleQuickEquip(index);
                    }}
                    onMouseEnter={(e) => {
                      if (item) {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setHoveredTooltip({
                          item,
                          x: rect.right + 10,
                          y: rect.top,
                        });
                      }
                    }}
                    onMouseLeave={() => setHoveredTooltip(null)}
                    className={`aspect-square rounded-xl border p-1 flex flex-col items-center justify-center transition-all relative overflow-hidden group select-none ${
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
                    {/* Item Lock Indicator */}
                    {item?.isLocked && (
                      <span
                        className="absolute top-1 right-1 p-0.5 rounded bg-slate-950/90 border border-amber-500/70 text-amber-400 z-20 shadow"
                        title="Item protegido contra descarte/dissolução"
                      >
                        <Lock className="w-2.5 h-2.5" />
                      </span>
                    )}

                    {/* Corner Accents for Rare/Legendary items */}
                    {item?.rarity === 'legendary' && (
                      <>
                        <span className="absolute top-1 left-1 w-1 h-1 bg-amber-400 rounded-full shadow-[0_0_4px_#fbbf24] pointer-events-none" />
                        {!item.isLocked && (
                          <span className="absolute top-1 right-1 w-1 h-1 bg-amber-400 rounded-full shadow-[0_0_4px_#fbbf24] pointer-events-none" />
                        )}
                        <span className="absolute bottom-1 left-1 w-1 h-1 bg-amber-400 rounded-full shadow-[0_0_4px_#fbbf24] pointer-events-none" />
                        <span className="absolute bottom-1 right-1 w-1 h-1 bg-amber-400 rounded-full shadow-[0_0_4px_#fbbf24] pointer-events-none" />
                      </>
                    )}
                    {item?.rarity === 'rare' && (
                      <>
                        <span className="absolute top-1 left-1 w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_4px_#22d3ee] pointer-events-none" />
                        {!item.isLocked && (
                          <span className="absolute top-1 right-1 w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_4px_#22d3ee] pointer-events-none" />
                        )}
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
                    {item?.type === 'potion' && (
                      <span className="absolute top-1 left-1 px-1 rounded bg-rose-950/90 border border-rose-500/80 text-rose-300 text-[7px] font-mono font-bold z-10 pointer-events-none shadow">
                        POÇÃO
                      </span>
                    )}

                    {/* Discrete outline indicator for newly obtained uninspected items */}
                    {isNew && !item?.isLocked && (
                      <span
                        className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] border border-black animate-pulse z-20"
                        title="Item recém-obtido"
                      />
                    )}

                    {item ? (
                      <div className="flex flex-col items-center justify-between w-full h-full py-0.5">
                        <ItemIcon item={item} size={48} showRarityGlow />
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

            <div className="mt-auto pt-2.5 flex items-center justify-between text-[11px] text-slate-500">
              <span>Duplo clique ou botão direito para equipar rápido.</span>
              <span className="font-mono text-slate-600">[E] Equipar · [L] Trava</span>
            </div>
          </div>

          {/* Column 3: Comparison & Inspection Panel */}
          <div className="lg:col-span-4 bg-[#111622] border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
            {selectedItem ? (
              <div className="flex flex-col gap-3">
                {/* Header of selected item */}
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
                    <ItemIcon item={selectedItem} size={54} showRarityGlow />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9.5px] font-mono uppercase text-sky-400 font-bold">
                          {getRarityBadge(selectedItem.rarity)} · {selectedItem.type.toUpperCase()}
                        </span>
                        {selectedItem.isLocked && (
                          <span className="text-[8.5px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-500/80 flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" />
                            PROTEGIDO
                          </span>
                        )}
                        {selectedItem.isNew && (
                          <span className="text-[8.5px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/80 flex items-center gap-1 shadow animate-pulse">
                            <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                            NOVO
                          </span>
                        )}
                      </div>

                      {/* Lock Toggle Button */}
                      <button
                        onClick={handleToggleLock}
                        className={`p-1 rounded border transition-colors ${
                          selectedItem.isLocked
                            ? 'bg-amber-950/80 border-amber-500 text-amber-300 hover:bg-amber-900'
                            : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                        title={selectedItem.isLocked ? 'Item protegido (Tecla L)' : 'Proteger item contra descarte (Tecla L)'}
                      >
                        {selectedItem.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <h4 className="text-sm font-cinzel font-bold text-slate-100 truncate">
                      {selectedItem.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed line-clamp-2">
                      {selectedItem.description}
                    </p>
                  </div>
                </div>

                {/* Ring Targeting and Comparison Controls */}
                {isInspectingInventory && selectedItem.type === 'ring' && (
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase text-slate-400">Comparar e Destino:</span>
                      <span className="text-[9px] font-mono text-sky-400">
                        {!player.equipment.ring1
                          ? 'Anel 1 vazio (Recomendado)'
                          : !player.equipment.ring2
                          ? 'Anel 2 vazio (Recomendado)'
                          : 'Ambos equipados'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => setRingCompareSlot('ring1')}
                        className={`px-2 py-1.5 rounded text-[10.5px] font-mono flex flex-col items-center transition-colors ${
                          ringCompareSlot === 'ring1'
                            ? 'bg-sky-700 text-white font-bold ring-1 ring-sky-400'
                            : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span>Anel 1</span>
                        <span className="text-[9px] opacity-75 truncate max-w-full">
                          {player.equipment.ring1 ? player.equipment.ring1.name.slice(0, 11) : '(Vazio)'}
                        </span>
                      </button>
                      <button
                        onClick={() => setRingCompareSlot('ring2')}
                        className={`px-2 py-1.5 rounded text-[10.5px] font-mono flex flex-col items-center transition-colors ${
                          ringCompareSlot === 'ring2'
                            ? 'bg-sky-700 text-white font-bold ring-1 ring-sky-400'
                            : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span>Anel 2</span>
                        <span className="text-[9px] opacity-75 truncate max-w-full">
                          {player.equipment.ring2 ? player.equipment.ring2.name.slice(0, 11) : '(Vazio)'}
                        </span>
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
                        <ItemIcon item={equippedComparisonItem} size={18} />
                        <span className="text-[9.5px] font-mono text-slate-400 truncate max-w-[85px]">
                          {equippedComparisonItem.name.replace(/^antigo\s+/i, '').split(' ')[0]}
                        </span>
                      </div>
                      <span className="text-slate-600 text-[10px] font-bold">→</span>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[9.5px] font-mono text-sky-300 font-semibold truncate max-w-[85px]">
                          {selectedItem.name.replace(/^antigo\s+/i, '').split(' ')[0]}
                        </span>
                        <ItemIcon item={selectedItem} size={18} showRarityGlow />
                      </div>
                    </div>
                  )}

                  <div className="space-y-0.5">
                    {selectedItem.type === 'potion' ? (
                      <div className="flex justify-between text-xs font-mono text-emerald-400 py-1">
                        <span>Restauração:</span>
                        <span className="font-bold">+{selectedItem.healAmount || 45}% Vida Máxima</span>
                      </div>
                    ) : selectedItem.type === 'scroll' || selectedItem.type === 'elixir' ? (
                      <div className="py-1 text-xs font-mono text-amber-300">
                        <span className="text-slate-400">Efeito de Uso: </span>
                        <span>{selectedItem.description}</span>
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

                {/* Action Buttons Section */}
                <div className="flex flex-col gap-2 mt-1">
                  {/* Destructive Confirmations */}
                  {confirmingDiscard ? (
                    <div className="bg-rose-950/80 border border-rose-800 rounded-xl p-3 flex flex-col gap-2 animate-in fade-in">
                      <div className="text-xs font-mono text-rose-200 flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>Largar este item no chão?</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        O item <span className="font-semibold text-white">"{selectedItem.name}"</span> será solto no piso da masmorra.
                      </p>
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={handleDiscard}
                          className="flex-1 py-2 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-mono text-xs font-bold transition-colors shadow"
                        >
                          Confirmar Descarte
                        </button>
                        <button
                          onClick={() => setConfirmingDiscard(false)}
                          className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition-colors"
                        >
                          Cancelar (ESC)
                        </button>
                      </div>
                    </div>
                  ) : confirmingDismantle ? (
                    <div className="bg-purple-950/80 border border-purple-800 rounded-xl p-3 flex flex-col gap-2 animate-in fade-in">
                      <div className="text-xs font-mono text-purple-200 flex items-center gap-1.5 font-bold">
                        <Flame className="w-4 h-4 text-purple-400 shrink-0" />
                        <span>Dissolver por Restos do Abismo?</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        O item será destruído e você receberá{' '}
                        <span className="font-bold text-purple-300">
                          +{getDismantleReward(selectedItem)} Vestígios do Abismo
                        </span>{' '}
                        para Ascensão permanente.
                      </p>
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={handleDismantle}
                          className="flex-1 py-2 rounded-lg bg-purple-700 hover:bg-purple-600 text-white font-mono text-xs font-bold transition-colors shadow flex items-center justify-center gap-1"
                        >
                          <Flame className="w-3.5 h-3.5" />
                          <span>Dissolver (+{getDismantleReward(selectedItem)})</span>
                        </button>
                        <button
                          onClick={() => setConfirmingDismantle(false)}
                          className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Primary Actions for Backpack Items */}
                      {isInspectingInventory && selectedIndex !== null && (
                        <>
                          {selectedItem.type === 'ring' ? (
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => handlePerformEquip(selectedIndex, 'ring1')}
                                className={`py-2.5 px-3 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider transition-colors shadow flex flex-col items-center justify-center active:scale-98 ${
                                  !player.equipment.ring1
                                    ? 'bg-emerald-800 hover:bg-emerald-700 text-white ring-1 ring-emerald-500'
                                    : 'bg-sky-700 hover:bg-sky-600 text-white'
                                }`}
                              >
                                <span>Equipar no Anel 1</span>
                                <span className="text-[9px] opacity-80 normal-case truncate max-w-full">
                                  {player.equipment.ring1 ? `Substitui ${player.equipment.ring1.name.slice(0, 10)}...` : '(Slot Vazio)'}
                                </span>
                              </button>

                              <button
                                onClick={() => handlePerformEquip(selectedIndex, 'ring2')}
                                className={`py-2.5 px-3 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider transition-colors shadow flex flex-col items-center justify-center active:scale-98 ${
                                  !player.equipment.ring2
                                    ? 'bg-emerald-800 hover:bg-emerald-700 text-white ring-1 ring-emerald-500'
                                    : 'bg-sky-700 hover:bg-sky-600 text-white'
                                }`}
                              >
                                <span>Equipar no Anel 2</span>
                                <span className="text-[9px] opacity-80 normal-case truncate max-w-full">
                                  {player.equipment.ring2 ? `Substitui ${player.equipment.ring2.name.slice(0, 10)}...` : '(Slot Vazio)'}
                                </span>
                              </button>
                            </div>
                          ) : selectedItem.type === 'scroll' ? (
                            <button
                              onClick={() => {
                                handlePerformEquip(selectedIndex);
                                onClose();
                              }}
                              className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 active:scale-98 ring-1 ring-amber-400/40"
                            >
                              <Sparkles className="w-4 h-4 text-amber-200" />
                              <span>Ativar Pergaminho [E]</span>
                            </button>
                          ) : selectedItem.type === 'elixir' ? (
                            <button
                              onClick={() => {
                                handlePerformEquip(selectedIndex);
                                onClose();
                              }}
                              className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 active:scale-98 ring-1 ring-purple-400/40"
                            >
                              <Zap className="w-4 h-4 text-purple-200" />
                              <span>Consumir Elixir [E]</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handlePerformEquip(selectedIndex)}
                              className="w-full py-2.5 px-4 rounded-lg bg-sky-700 hover:bg-sky-600 text-white text-xs font-mono font-semibold uppercase tracking-wider transition-colors shadow-md flex items-center justify-center gap-2 active:scale-98"
                            >
                              <Check className="w-4 h-4" />
                              <span>
                                {selectedItem.type === 'potion'
                                  ? 'Beber Frasco (+45% HP) [E]'
                                  : equippedComparisonItem
                                  ? `Substituir ${equippedComparisonItem.name.split(' ')[0]} [E]`
                                  : 'Equipar no Corpo [E]'}
                              </span>
                            </button>
                          )}

                          {/* Secondary Destructive Actions: Dismantle & Discard */}
                          <div className="grid grid-cols-2 gap-2">
                            {onDismantle && (
                              <button
                                onClick={() => {
                                  if (selectedItem.isLocked) {
                                    showNotice('Item protegido com cadeado não pode ser dissolvido.');
                                    return;
                                  }
                                  if (selectedItem.rarity === 'common') {
                                    handleDismantle();
                                  } else {
                                    setConfirmingDismantle(true);
                                  }
                                }}
                                disabled={selectedItem.isLocked}
                                className={`py-2 px-3 rounded-lg border text-xs font-mono transition-colors flex items-center justify-center gap-1.5 ${
                                  selectedItem.isLocked
                                    ? 'border-slate-800 text-slate-600 cursor-not-allowed opacity-60'
                                    : 'border-purple-800/80 bg-purple-950/40 hover:bg-purple-900/60 text-purple-300'
                                }`}
                                title={
                                  selectedItem.isLocked
                                    ? 'Item protegido com cadeado'
                                    : `Dissolver por +${getDismantleReward(selectedItem)} Vestígios`
                                }
                              >
                                <Flame className="w-3.5 h-3.5" />
                                <span>Dissolver (+{getDismantleReward(selectedItem)})</span>
                              </button>
                            )}

                            <button
                              onClick={() => {
                                if (selectedItem.isLocked) {
                                  showNotice('Item protegido com cadeado não pode ser descartado.');
                                  return;
                                }
                                setConfirmingDiscard(true);
                              }}
                              disabled={selectedItem.isLocked}
                              className={`py-2 px-3 rounded-lg border text-xs font-mono transition-colors flex items-center justify-center gap-1.5 ${
                                selectedItem.isLocked
                                  ? 'border-slate-800 text-slate-600 cursor-not-allowed opacity-60'
                                  : 'border-slate-800 hover:border-rose-700 text-slate-400 hover:text-rose-400'
                              } ${!onDismantle ? 'col-span-2' : ''}`}
                              title={selectedItem.isLocked ? 'Item protegido com cadeado' : 'Largar no chão'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Largar Item</span>
                            </button>
                          </div>
                        </>
                      )}

                      {/* Primary Actions for Equipped Items */}
                      {selectedEquipSlot !== null && (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handlePerformUnequip(selectedEquipSlot)}
                            disabled={isBackpackFull}
                            className={`w-full py-2.5 px-4 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors shadow ${
                              isBackpackFull
                                ? 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                            }`}
                            title={isBackpackFull ? 'Mochila cheia para desequipar' : 'Guardar na mochila'}
                          >
                            {isBackpackFull
                              ? 'Mochila Cheia (Impossível Remover)'
                              : 'Remover e Guardar na Mochila [E]'}
                          </button>

                          <button
                            onClick={() => {
                              if (selectedItem.isLocked) {
                                showNotice('Equipamento protegido com cadeado!');
                                return;
                              }
                              setConfirmingDiscard(true);
                            }}
                            disabled={selectedItem.isLocked}
                            className={`w-full py-2 px-3 rounded-lg border text-xs font-mono transition-colors flex items-center justify-center gap-1.5 ${
                              selectedItem.isLocked
                                ? 'border-slate-800 text-slate-600 cursor-not-allowed opacity-60'
                                : 'border-slate-800 hover:border-rose-700 text-slate-500 hover:text-rose-400'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Desequipar e Largar no Chão</span>
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
                <span className="text-[11px] text-slate-600 mt-1 max-w-[200px]">
                  Clique em um item da mochila ou no corpo para ver comparação de atributos.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightweight Desktop Hover Tooltip (Does not interfere with selection) */}
      {hoveredTooltip && (
        <div
          className="fixed z-50 pointer-events-none hidden lg:block bg-[#090D14]/95 border border-slate-700 rounded-xl p-2.5 shadow-2xl backdrop-blur-md max-w-xs animate-in fade-in duration-100"
          style={{
            left: `${Math.min(window.innerWidth - 240, hoveredTooltip.x)}px`,
            top: `${Math.min(window.innerHeight - 150, hoveredTooltip.y)}px`,
          }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1 mb-1.5">
            <span
              className={`text-[9px] font-mono uppercase font-bold px-1.5 py-0.2 rounded border ${getRarityBorderAccent(
                hoveredTooltip.item.rarity
              )}`}
            >
              {getRarityBadge(hoveredTooltip.item.rarity)} · {hoveredTooltip.item.type.toUpperCase()}
            </span>
            {hoveredTooltip.item.isLocked && (
              <span className="text-[9px] font-mono text-amber-400 flex items-center gap-0.5">
                <Lock className="w-2.5 h-2.5" /> Travado
              </span>
            )}
          </div>
          <div className="text-xs font-bold text-slate-100 mb-0.5">{hoveredTooltip.item.name}</div>
          <p className="text-[10px] text-slate-400 mb-1.5 line-clamp-2">{hoveredTooltip.item.description}</p>
          <div className="text-[10px] font-mono text-slate-300 space-y-0.5">
            {hoveredTooltip.item.stats?.attack ? <div>ATQ: +{hoveredTooltip.item.stats.attack}</div> : null}
            {hoveredTooltip.item.stats?.defense ? <div>DEF: +{hoveredTooltip.item.stats.defense}</div> : null}
            {hoveredTooltip.item.stats?.maxHp ? <div>VIDA: +{hoveredTooltip.item.stats.maxHp}</div> : null}
            {hoveredTooltip.item.stats?.critChance ? <div>CRIT: +{Math.round(hoveredTooltip.item.stats.critChance * 100)}%</div> : null}
            {hoveredTooltip.item.stats?.cooldownReduction ? (
              <div>RECARGA: -{Math.round(hoveredTooltip.item.stats.cooldownReduction * 100)}%</div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
