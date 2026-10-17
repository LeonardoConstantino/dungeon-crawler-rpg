import { AscensionUpgrades, GameSettings, Item, PlayerStats, RunHistoryEntry, SoulRemnant } from './types';

export interface SaveSlotData {
  id: string; // 'A' | 'B' | 'C'
  lastPlayed: string;
  hasActiveRun: boolean;
  seed: string;
  floor: number;
  playtimeSeconds: number;
  playerStats: PlayerStats | null;
  equipment: {
    weapon: Item | null;
    armor: Item | null;
    ring1: Item | null;
    ring2: Item | null;
    amulet: Item | null;
  } | null;
  inventory: (Item | null)[];
  potionsCount?: number;
  enemiesKilledCount?: number;
  abyssRemnantsEarned?: number;
}

const STORAGE_KEYS = {
  SLOTS_PREFIX: 'dungeon_crawler_slot_',
  ASCENSION: 'dungeon_crawler_ascension',
  REMNANTS: 'dungeon_crawler_remnants_points',
  DEATH_REMNANTS: 'dungeon_crawler_death_markers',
  HISTORY: 'dungeon_crawler_history',
  SETTINGS: 'dungeon_crawler_settings',
  ACTIVE_SLOT: 'dungeon_crawler_active_slot_id',
};

const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.8,
  musicVolume: 0.6,
  sfxVolume: 0.8,
  isMuted: false,
  screenShake: true,
  reducedFlashes: false,
  aimAssist: true,
  virtualJoystickScale: 1.0,
  virtualJoystickOpacity: 0.75,
};

const DEFAULT_ASCENSION: AscensionUpgrades = {
  maxHpLevel: 0,
  attackLevel: 0,
  visionLevel: 0,
  cooldownLevel: 0,
  fortuneLevel: 0,
};

export const Storage = {
  getSettings(): GameSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: GameSettings) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save settings to localStorage', e);
    }
  },

  getActiveSlotId(): string {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_SLOT) || 'A';
  },

  setActiveSlotId(id: string) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SLOT, id);
  },

  getSlot(slotId: string): SaveSlotData {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SLOTS_PREFIX + slotId);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      id: slotId,
      lastPlayed: '',
      hasActiveRun: false,
      seed: '',
      floor: 1,
      playtimeSeconds: 0,
      playerStats: null,
      equipment: null,
      inventory: Array(20).fill(null),
    };
  },

  saveSlot(slotData: SaveSlotData) {
    try {
      localStorage.setItem(
        STORAGE_KEYS.SLOTS_PREFIX + slotData.id,
        JSON.stringify({ ...slotData, lastPlayed: new Date().toISOString() })
      );
    } catch (e) {
      console.warn('Failed to save slot', e);
    }
  },

  deleteSlot(slotId: string) {
    try {
      localStorage.removeItem(STORAGE_KEYS.SLOTS_PREFIX + slotId);
    } catch (e) {
      console.warn('Failed to delete slot', e);
    }
  },

  getAscension(): AscensionUpgrades {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ASCENSION);
      return raw ? { ...DEFAULT_ASCENSION, ...JSON.parse(raw) } : DEFAULT_ASCENSION;
    } catch {
      return DEFAULT_ASCENSION;
    }
  },

  saveAscension(upgrades: AscensionUpgrades) {
    try {
      localStorage.setItem(STORAGE_KEYS.ASCENSION, JSON.stringify(upgrades));
    } catch (e) {
      console.warn('Failed to save ascension', e);
    }
  },

  getAbyssRemnants(): number {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.REMNANTS);
      return raw ? parseInt(raw, 10) : 0;
    } catch {
      return 0;
    }
  },

  addAbyssRemnants(amount: number) {
    try {
      const current = this.getAbyssRemnants();
      const updated = Math.max(0, current + amount);
      localStorage.setItem(STORAGE_KEYS.REMNANTS, updated.toString());
      return updated;
    } catch {
      return 0;
    }
  },

  getDeathRemnants(): SoulRemnant[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DEATH_REMNANTS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  addDeathRemnant(remnant: SoulRemnant) {
    try {
      const all = this.getDeathRemnants().filter(r => r.runSeed !== remnant.runSeed);
      all.push(remnant);
      localStorage.setItem(STORAGE_KEYS.DEATH_REMNANTS, JSON.stringify(all));
    } catch (e) {
      console.warn('Failed to save death remnant', e);
    }
  },

  removeDeathRemnant(id: string) {
    try {
      const all = this.getDeathRemnants().filter(r => r.id !== id);
      localStorage.setItem(STORAGE_KEYS.DEATH_REMNANTS, JSON.stringify(all));
    } catch (e) {
      console.warn('Failed to remove death remnant', e);
    }
  },

  getHistory(): RunHistoryEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  addHistoryEntry(entry: RunHistoryEntry) {
    try {
      const history = this.getHistory();
      history.unshift(entry);
      // Keep last 25 runs
      if (history.length > 25) history.length = 25;
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    } catch (e) {
      console.warn('Failed to save history entry', e);
    }
  },
};
