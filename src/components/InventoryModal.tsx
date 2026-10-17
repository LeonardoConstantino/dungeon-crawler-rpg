import React, { useState } from 'react';
import { Equipment, Item, PlayerState } from '../game/types';
import { X, Shield, Sword, Heart, Sparkles, Trash2, ArrowUp, ArrowDown, Minus, Check, AlertTriangle } from 'lucide-react';
import { soundManager } from '../game/audio';

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

  const selectedItem: Item | null =
    selectedIndex !== null
      ? player.inventory[selectedIndex]
      : selectedEquipSlot !== null
      ? player.equipment[selectedEquipSlot]
      : null;

  const isInspectingInventory = selectedIndex !== null;

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
    if (rarity === 'legendary') return 'border-amber-500 text-amber-400 bg-amber-950/20';
    if (rarity === 'rare') return 'border-sky-500 text-sky-400 bg-sky-950/20';
    return 'border-slate-700 text-slate-300 bg-slate-900/40';
  };

  const getRarityBadge = (rarity: string) => {
    if (rarity === 'legendary') return 'LENDÁRIO';
    if (rarity === 'rare') return 'RARO';
    return 'COMUM';
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

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="bg-[#0D111A] border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <h2 className="text-base sm:text-lg font-cinzel font-bold text-slate-100 tracking-wide">
              MOCHILA E EQUIPAMENTOS
            </h2>
            <span className="text-xs font-mono text-slate-500">
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

        {/* Body 3 Columns: Equipment | Inventory Grid | Item Inspection & Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 overflow-y-auto">
          {/* Column 1: Equipped Slots (4 cols) */}
          <div className="lg:col-span-4 bg-[#111622] border border-slate-800/80 rounded-xl p-3.5 flex flex-col gap-2.5">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
              Corpo do Descendente
            </h3>

            {/* Equipment Slots */}
            {(
              [
                { key: 'weapon', label: 'Arma', item: player.equipment.weapon, icon: Sword },
                { key: 'armor', label: 'Armadura', item: player.equipment.armor, icon: Shield },
                { key: 'ring1', label: 'Anel 1 (Primário)', item: player.equipment.ring1, icon: Sparkles },
                { key: 'ring2', label: 'Anel 2 (Secundário)', item: player.equipment.ring2, icon: Sparkles },
                { key: 'amulet', label: 'Amuleto', item: player.equipment.amulet, icon: Heart },
              ] as const
            ).map((slot) => {
              const Icon = slot.icon;
              const isSelected = selectedEquipSlot === slot.key;

              return (
                <div
                  key={slot.key}
                  onClick={() => {
                    soundManager.playButtonClick();
                    setSelectedIndex(null);
                    setSelectedEquipSlot(slot.key);
                    setConfirmingDiscard(false);
                  }}
                  className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-sky-500 bg-sky-950/30'
                      : slot.item
                      ? 'border-slate-700 bg-slate-900/60 hover:border-slate-600'
                      : 'border-dashed border-slate-800 bg-slate-950/40 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono uppercase text-slate-400 truncate">{slot.label}</div>
                      <div className="text-xs font-semibold text-slate-200 truncate">
                        {slot.item ? slot.item.name : 'Vazio'}
                      </div>
                    </div>
                  </div>

                  {slot.item && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUnequip(slot.key);
                      }}
                      className="text-[10px] text-slate-400 hover:text-rose-400 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 font-mono shrink-0 ml-2"
                    >
                      Remover
                    </button>
                  )}
                </div>
              );
            })}

            {/* Quick Stat Total Summary */}
            <div className="mt-auto pt-2.5 border-t border-slate-800/80 text-xs font-mono text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Ataque Total:</span>
                <span className="text-slate-200 font-bold">{player.stats.baseAttack}</span>
              </div>
              <div className="flex justify-between">
                <span>Defesa Total:</span>
                <span className="text-slate-200 font-bold">{player.stats.baseDefense}</span>
              </div>
              <div className="flex justify-between">
                <span>Vida Máxima:</span>
                <span className="text-slate-200 font-bold">{player.stats.maxHp}</span>
              </div>
              <div className="flex justify-between">
                <span>Chance Crítica:</span>
                <span className="text-slate-200 font-bold">{Math.round(player.stats.critChance * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Redução Recarga:</span>
                <span className="text-slate-200 font-bold">{Math.round(player.stats.cooldownReduction * 100)}%</span>
              </div>
            </div>
          </div>

          {/* Column 2: 20-Slot Grid (4 cols) */}
          <div className="lg:col-span-4 bg-[#111622] border border-slate-800/80 rounded-xl p-3.5 flex flex-col">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Grade da Mochila (20 Slots)
            </h3>

            <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 gap-2">
              {player.inventory.map((item, index) => {
                const isSelected = selectedIndex === index;
                return (
                  <button
                    key={index}
                    onClick={() => {
                      soundManager.playButtonClick();
                      setSelectedEquipSlot(null);
                      setSelectedIndex(index);
                      setConfirmingDiscard(false);
                    }}
                    className={`aspect-square rounded-lg border p-1 flex flex-col items-center justify-center transition-all relative ${
                      isSelected
                        ? 'border-sky-400 bg-sky-950/40 ring-1 ring-sky-400'
                        : item
                        ? getRarityColor(item.rarity)
                        : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                    }`}
                  >
                    {item ? (
                      <>
                        <span className="text-xs font-bold truncate max-w-full text-center px-1">
                          {item.name.split(' ')[0]}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 uppercase mt-0.5">
                          {item.type}
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-700">{index + 1}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-500 mt-auto pt-3">
              Toque num item para abrir o painel comparativo de atributos e equipar.
            </p>
          </div>

          {/* Column 3: Comparison & Inspection Panel (4 cols) */}
          <div className="lg:col-span-4 bg-[#111622] border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
            {selectedItem ? (
              <div className="flex flex-col gap-3">
                {/* Header of selected item */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono uppercase text-sky-400">
                      {getRarityBadge(selectedItem.rarity)} · {selectedItem.type.toUpperCase()}
                    </span>
                    {isInspectingInventory && (
                      <span className="text-[10px] font-mono text-slate-500">Na Mochila</span>
                    )}
                  </div>
                  <h4 className="text-sm sm:text-base font-cinzel font-bold text-slate-100">
                    {selectedItem.name}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {selectedItem.description}
                  </p>
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
                          ) : (
                            <button
                              onClick={() => {
                                onEquip(selectedIndex);
                                setSelectedIndex(null);
                              }}
                              className="w-full py-2.5 px-4 rounded-lg bg-sky-700 hover:bg-sky-600 text-white text-xs font-mono font-semibold uppercase tracking-wider transition-colors shadow-md flex items-center justify-center gap-2"
                            >
                              <Check className="w-4 h-4" />
                              <span>
                                {selectedItem.type === 'potion'
                                  ? 'Beber Frasco de Sangue'
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
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-xs font-mono py-12">
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
