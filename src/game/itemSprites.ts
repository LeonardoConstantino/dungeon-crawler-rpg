import rpgInventorySheet from '../assets/images/rpg_inventory.png';
import spritesheetData from '../assets/images/rpg_spritesheet_map.json';
import { Item } from './types';

export { rpgInventorySheet };

export interface SpriteFrame {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SpriteItemData {
  id: string;
  index: number;
  name: string;
  name_en: string;
  category: string;
  subcategory: string;
  grid: { col: number; row: number };
  frame: SpriteFrame;
}

export const SPRITESHEET_CONFIG = {
  width: spritesheetData.spritesheet.width, // 768
  height: spritesheetData.spritesheet.height, // 896
  cellSize: spritesheetData.spritesheet.cell_size, // 128
  cols: spritesheetData.spritesheet.cols, // 6
  rows: spritesheetData.spritesheet.rows, // 7
};

export const ITEMS_SPRITE_LIST: SpriteItemData[] = spritesheetData.items as SpriteItemData[];

// Fast lookup maps
const itemsByName = new Map<string, SpriteItemData>();
const itemsById = new Map<string, SpriteItemData>();

function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .replace(/^antigo\s+/i, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Populate maps
ITEMS_SPRITE_LIST.forEach((item) => {
  itemsById.set(item.id.toLowerCase(), item);
  itemsByName.set(normalizeKey(item.name), item);
  itemsByName.set(normalizeKey(item.name_en), item);
});

/**
 * Returns sprite data for any item instance or name
 */
export function getItemSprite(target: Item | string | null | undefined): SpriteItemData | null {
  if (!target) return null;

  if (typeof target === 'string') {
    const key = normalizeKey(target);
    const direct = itemsByName.get(key) || itemsById.get(target.toLowerCase());
    if (direct) return direct;
    return null;
  }

  // Target is an Item object
  if (target.name) {
    const key = normalizeKey(target.name);
    const match = itemsByName.get(key);
    if (match) return match;
  }

  if (target.id) {
    const matchId = itemsById.get(target.id.toLowerCase());
    if (matchId) return matchId;
  }

  // Fallback by item type if unknown name
  switch (target.type) {
    case 'potion':
      return itemsByName.get(normalizeKey('Frasco de Sangue Frio')) || null;
    case 'scroll':
      return itemsByName.get(normalizeKey('Pergaminho da Revelação Arcana')) || null;
    case 'elixir':
      return itemsByName.get(normalizeKey('Elixir da Fúria Sanguínea')) || null;
    case 'weapon':
      return itemsByName.get(normalizeKey('Gládio do Andarilho')) || null;
    case 'armor':
      return itemsByName.get(normalizeKey('Capa Esfarrapada')) || null;
    case 'ring':
      return itemsByName.get(normalizeKey('Anel de Pirita')) || null;
    case 'amulet':
      return itemsByName.get(normalizeKey('Amuleto de Ardósia')) || null;
    default:
      return null;
  }
}
