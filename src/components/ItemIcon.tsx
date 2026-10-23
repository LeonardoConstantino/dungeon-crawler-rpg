import React from 'react';
import { Item, ItemRarity } from '../game/types';
import { getItemSprite, rpgInventorySheet, SPRITESHEET_CONFIG } from '../game/itemSprites';

interface ItemIconProps {
  item?: Item | string | null;
  size?: number;
  className?: string;
  showRarityGlow?: boolean;
  rarity?: ItemRarity;
  fallbackText?: string;
}

export const ItemIcon: React.FC<ItemIconProps> = ({
  item,
  size = 36,
  className = '',
  showRarityGlow = false,
  rarity,
  fallbackText,
}) => {
  const sprite = getItemSprite(item);

  // If item is Item object and rarity not explicitly passed, infer it
  const effectiveRarity = rarity || (typeof item === 'object' && item ? item.rarity : undefined);

  if (!sprite) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-900/60 rounded border border-slate-800 text-slate-600 text-xs font-mono ${className}`}
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        {fallbackText ? fallbackText.slice(0, 2).toUpperCase() : '?'}
      </div>
    );
  }

  // Calculate background scale and position
  // 6 columns and 7 rows of 128px cells
  const bgWidth = SPRITESHEET_CONFIG.cols * size;
  const bgHeight = SPRITESHEET_CONFIG.rows * size;
  const posX = -sprite.grid.col * size;
  const posY = -sprite.grid.row * size;

  let rarityGlowStyle = '';
  if (showRarityGlow) {
    if (effectiveRarity === 'legendary') {
      rarityGlowStyle = 'drop-shadow-[0_0_8px_rgba(245,158,11,0.65)]';
    } else if (effectiveRarity === 'rare') {
      rarityGlowStyle = 'drop-shadow-[0_0_6px_rgba(56,189,248,0.55)]';
    }
  }

  return (
    <div
      className={`relative inline-block select-none shrink-0 ${rarityGlowStyle} ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
      title={typeof item === 'object' && item ? item.name : sprite.name}
    >
      <div
        className="w-full h-full rounded transition-transform"
        style={{
          backgroundImage: `url(${rpgInventorySheet})`,
          backgroundSize: `${bgWidth}px ${bgHeight}px`,
          backgroundPosition: `${posX}px ${posY}px`,
          backgroundRepeat: 'no-repeat',
          imageRendering: 'auto',
        }}
      />
    </div>
  );
};
