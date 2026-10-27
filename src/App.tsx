import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/engine';
import { GameRenderer } from './game/renderer';
import { LevelUpOption, FloorClearSummary, AltarOffer } from './game/types';
import { soundManager } from './game/audio';
import { Storage } from './game/storage';

import { MainMenu } from './components/MainMenu';
import { GameHUD } from './components/GameHUD';
import { MobileGamepad } from './components/MobileGamepad';
import { InventoryModal } from './components/InventoryModal';
import { LevelUpModal } from './components/LevelUpModal';
import { DeathScreen } from './components/DeathScreen';
import { AscensionModal } from './components/AscensionModal';
import { PauseModal } from './components/PauseModal';
import { SettingsModal } from './components/SettingsModal';
import { SocialShareModal } from './components/SocialShareModal';
import { HistoryModal } from './components/HistoryModal';
import { FloorClearedModal } from './components/FloorClearedModal';
import { AltarModal } from './components/AltarModal';

export default function App() {
  const [gameState, setGameState] = useState<'MENU' | 'PLAYING'>('MENU');

  // Modals state
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isPauseOpen, setIsPauseOpen] = useState(false);
  const [isAscensionOpen, setIsAscensionOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSeedShareOpen, setIsSeedShareOpen] = useState(false);
  const [levelUpChoices, setLevelUpChoices] = useState<LevelUpOption[] | null>(null);
  const [floorClearSummary, setFloorClearSummary] = useState<FloorClearSummary | null>(null);
  const [activeAltarOffer, setActiveAltarOffer] = useState<AltarOffer | null>(null);
  const [isDead, setIsDead] = useState(false);

  // In-game dynamic toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'info' | 'rare' | 'danger' } | null>(null);

  // Device detection
  const [isMobile, setIsMobile] = useState(false);

  // References
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  // Force re-render for HUD sync
  const [, setTick] = useState(0);

  // Detect mobile / touch capabilities
  useEffect(() => {
    const checkMobile = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isNarrow = window.innerWidth <= 1024;
      setIsMobile(hasTouch || isNarrow);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check URL query parameters for shared seed
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlSeed = urlParams.get('seed');
      if (urlSeed) {
        soundManager.startMusic('menu');
      } else {
        soundManager.startMusic('menu');
      }
    } catch {
      soundManager.startMusic('menu');
    }
  }, []);

  // Show Toast
  const showToast = useCallback((text: string, type: 'info' | 'rare' | 'danger' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 2800);
  }, []);

  // Start or resume game
  const startGame = useCallback((customSeed?: string, slotId = 'A', resume = false) => {
    let seedToUse = customSeed;
    if (!seedToUse && !resume) {
      const urlParams = new URLSearchParams(window.location.search);
      seedToUse = urlParams.get('seed') || undefined;
    }

    const savedSlot = Storage.getSlot(slotId);
    const resumeData = (resume && savedSlot.hasActiveRun) ? savedSlot : null;

    if (resumeData) {
      seedToUse = resumeData.seed;
    }

    const engine = new GameEngine(
      seedToUse || '',
      resumeData ? resumeData.floor : 1,
      slotId,
      resumeData
    );

    engine.onLevelUp = (options) => {
      setLevelUpChoices(options);
    };

    engine.onPlayerDeath = () => {
      setIsDead(true);
    };

    engine.onMessage = (text, type) => {
      showToast(text, type);
    };

    engine.onFloorCleared = (summary) => {
      setFloorClearSummary(summary);
    };

    engine.onOpenAltar = (offer) => {
      setActiveAltarOffer(offer);
    };

    engine.onBountyCompleted = (bounty) => {
      showToast(`🏆 Meta Concluída: ${bounty.title}!`, 'rare');
    };

    engineRef.current = engine;
    setIsDead(false);
    setIsPauseOpen(false);
    setIsInventoryOpen(false);
    setLevelUpChoices(null);
    setFloorClearSummary(null);
    setActiveAltarOffer(null);
    setGameState('PLAYING');

    soundManager.startMusic('explore');
  }, [showToast]);

  const handleAdvanceFloor = useCallback((choice: 'heal' | 'remnants') => {
    if (engineRef.current) {
      engineRef.current.advanceToNextFloor(choice);
    }
    setFloorClearSummary(null);
  }, []);

  // Main Canvas Render & Physics Loop
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      if (!canvas) return;
      const width = window.visualViewport ? Math.round(window.visualViewport.width) : window.innerWidth;
      const height = window.visualViewport ? Math.round(window.visualViewport.height) : window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      if (rendererRef.current) {
        // Tile size adjusts slightly based on viewport height
        const idealTile = Math.max(30, Math.min(48, Math.floor(height / 18)));
        rendererRef.current.setTileSize(idealTile);
      }
    };

    rendererRef.current = new GameRenderer(canvas);
    handleResize();
    window.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);

    lastTimeRef.current = performance.now();

    let hudFrameCount = 0;

    const loop = (time: number) => {
      try {
        const dt = Math.min(0.1, (time - lastTimeRef.current) / 1000);
        lastTimeRef.current = time;

        const engine = engineRef.current;
        const renderer = rendererRef.current;

        if (engine && renderer) {
          // Run physics and AI if not paused
          engine.update(dt);

          // Render current frame
          renderer.render(
            engine.dungeon,
            engine.player,
            engine.enemies,
            engine.projectiles,
            engine.hazardAreas,
            engine.groundItems,
            engine.particles,
            engine.floatingTexts,
            engine.cameraShake,
            engine.settings.reducedFlashes
          );
        }

        // Throttle React state update for HUD to reduce DOM reconciliation overhead
        hudFrameCount++;
        if (hudFrameCount % 3 === 0) {
          setTick((t) => (t + 1) % 60);
        }
      } catch (loopErr) {
        console.error('Recoverable game loop exception caught:', loopErr);
      } finally {
        animationFrameId.current = requestAnimationFrame(loop);
      }
    };

    animationFrameId.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [gameState]);

  // Keyboard controls for Desktop
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const keysDown = new Set<string>();

    const updateMovement = () => {
      if (!engineRef.current) return;
      let x = 0;
      let y = 0;
      if (keysDown.has('KeyW') || keysDown.has('ArrowUp')) y -= 1;
      if (keysDown.has('KeyS') || keysDown.has('ArrowDown')) y += 1;
      if (keysDown.has('KeyA') || keysDown.has('ArrowLeft')) x -= 1;
      if (keysDown.has('KeyD') || keysDown.has('ArrowRight')) x += 1;
      engineRef.current.setMoveInput(x, y);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (floorClearSummary) return;
      if (e.repeat) return;
      keysDown.add(e.code);

      if (e.code === 'KeyW' || e.code === 'KeyA' || e.code === 'KeyS' || e.code === 'KeyD' ||
          e.code.startsWith('Arrow')) {
        updateMovement();
      }

      if (e.code === 'Space') {
        engineRef.current?.setAttackPressed(true);
      }

      if (e.code === 'Digit1') engineRef.current?.triggerSkill(0);
      if (e.code === 'Digit2') engineRef.current?.triggerSkill(1);
      if (e.code === 'Digit3') engineRef.current?.triggerSkill(2);
      if (e.code === 'Digit4') engineRef.current?.triggerSkill(3);

      if (e.code === 'KeyQ' && !e.repeat) {
        engineRef.current?.usePotion();
      }

      if (e.code === 'KeyE' && !e.repeat) {
        engineRef.current?.useFirstScroll();
      }

      if (e.code === 'KeyR' && !e.repeat) {
        engineRef.current?.useFirstElixir();
      }

      if (e.code === 'KeyI' || e.code === 'KeyB') {
        setIsInventoryOpen((prev) => !prev);
      }

      if (e.code === 'Escape') {
        setIsPauseOpen((prev) => {
          const next = !prev;
          if (engineRef.current) engineRef.current.isPaused = next;
          return next;
        });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysDown.delete(e.code);
      if (e.code === 'KeyW' || e.code === 'KeyA' || e.code === 'KeyS' || e.code === 'KeyD' ||
          e.code.startsWith('Arrow')) {
        updateMovement();
      }
      if (e.code === 'Space') {
        engineRef.current?.setAttackPressed(false);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0 && !isPauseOpen && !isInventoryOpen && !levelUpChoices && !floorClearSummary) {
        engineRef.current?.setAttackPressed(true);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        engineRef.current?.setAttackPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [gameState, isPauseOpen, isInventoryOpen, levelUpChoices, floorClearSummary]);

  const engine = engineRef.current;

  return (
    <div className="fixed inset-0 w-full h-full h-[100dvh] overflow-hidden bg-[#06080D] select-none touch-none">
      {/* 1. Main Menu Screen */}
      {gameState === 'MENU' && (
        <MainMenu
          onStartGame={startGame}
          onOpenAscension={() => setIsAscensionOpen(true)}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {/* 2. Active Game Canvas & HUD */}
      {gameState === 'PLAYING' && engine && (
        <>
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full block image-pixelated cursor-crosshair"
          />

          {/* Desktop & Mobile HUD */}
          <GameHUD
            player={engine.player}
            dungeon={engine.dungeon}
            seed={engine.seed}
            floor={engine.currentFloorNumber}
            comboCount={engine.comboCount}
            comboTimer={engine.comboTimer}
            maxComboTimer={engine.maxComboTimer}
            currentBounty={engine.currentBounty}
            onPause={() => {
              engine.isPaused = true;
              setIsPauseOpen(true);
            }}
            onOpenInventory={() => setIsInventoryOpen(true)}
            onOpenSeedShare={() => setIsSeedShareOpen(true)}
            onTriggerSkill={(idx) => engine.triggerSkill(idx)}
            onUsePotion={() => engine.usePotion()}
            onUseScroll={() => engine.useFirstScroll()}
            onUseElixir={() => engine.useFirstElixir()}
            isMobile={isMobile}
          />

          {/* Mobile Virtual Gamepad (Always rendered if mobile/touch active) */}
          {isMobile && !isPauseOpen && !isInventoryOpen && !levelUpChoices && !isDead && (
            <MobileGamepad
              player={engine.player}
              onMove={(x, y) => engine.setMoveInput(x, y)}
              onAttack={(pressed) => engine.setAttackPressed(pressed)}
              onTriggerSkill={(idx) => engine.triggerSkill(idx)}
              onUsePotion={() => engine.usePotion()}
              onUseConsumable={(idx) => engine.equipItem(idx)}
              onOpenInventory={() => setIsInventoryOpen(true)}
              scale={engine.settings.virtualJoystickScale}
              opacity={engine.settings.virtualJoystickOpacity}
            />
          )}

          {/* In-Game Toast Banner */}
          {toastMessage && (
            <div className="absolute top-20 inset-x-0 flex justify-center pointer-events-none z-30">
              <div
                className={`py-2 px-4 rounded-xl text-xs font-mono font-semibold tracking-wide shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-200 border ${
                  toastMessage.type === 'danger'
                    ? 'bg-rose-950/80 border-rose-600/70 text-rose-200'
                    : toastMessage.type === 'rare'
                    ? 'bg-purple-950/80 border-purple-600/70 text-purple-200'
                    : 'bg-slate-900/80 border-slate-700/80 text-slate-200'
                }`}
              >
                {toastMessage.text}
              </div>
            </div>
          )}
        </>
      )}

      {/* 3. Inventory & Equipment Modal */}
      {isInventoryOpen && engine && (
        <InventoryModal
          player={engine.player}
          onClose={() => {
            if (engine) engine.setMoveInput(0, 0);
            setIsInventoryOpen(false);
          }}
          onEquip={(idx, targetSlot) => engine.equipItem(idx, targetSlot)}
          onUnequip={(slot) => engine.unequipItem(slot)}
          onDiscard={(idx) => engine.discardItem(idx)}
          onDiscardEquipped={(slot) => engine.discardEquippedItem(slot)}
        />
      )}

      {/* 4. Level Up Choice Modal */}
      {levelUpChoices && engine && (
        <LevelUpModal
          options={levelUpChoices}
          onSelect={(option) => {
            engine.applyLevelUpChoice(option);
            setLevelUpChoices(null);
          }}
        />
      )}

      {/* 4.5 Floor Cleared Fanfare Modal */}
      {floorClearSummary && engine && (
        <FloorClearedModal
          summary={floorClearSummary}
          onContinue={handleAdvanceFloor}
        />
      )}

      {/* 4.6 Void Pact Altar Modal (Item 5) */}
      {activeAltarOffer && engine && (
        <AltarModal
          offer={activeAltarOffer}
          onAccept={(pact) => {
            engine.applyVoidPact(pact);
            setActiveAltarOffer(null);
          }}
          onDecline={() => {
            engine.declineVoidPact();
            setActiveAltarOffer(null);
          }}
        />
      )}

      {/* 5. Pause Modal */}
      {isPauseOpen && engine && (
        <PauseModal
          floor={engine.currentFloorNumber}
          seed={engine.seed}
          onResume={() => {
            engine.isPaused = false;
            setIsPauseOpen(false);
          }}
          onOpenInventory={() => setIsInventoryOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenShare={() => setIsSeedShareOpen(true)}
          onSaveAndExit={() => {
            engine.saveCurrentProgress();
            engine.isPaused = false;
            setIsPauseOpen(false);
            setIsInventoryOpen(false);
            setGameState('MENU');
            soundManager.startMusic('menu');
          }}
        />
      )}

      {/* 6. Death Screen Modal */}
      {isDead && engine && (
        <DeathScreen
          floor={engine.currentFloorNumber}
          level={engine.player.stats.level}
          kills={engine.enemiesKilledCount}
          playtimeSeconds={Math.round((Date.now() - engine.runStartTime) / 1000)}
          remnantsEarned={engine.abyssRemnantsEarned}
          seed={engine.seed}
          onRetry={() => startGame(undefined, engine.activeSlotId, false)}
          onOpenAscension={() => setIsAscensionOpen(true)}
          onShare={() => setIsSeedShareOpen(true)}
          onReturnMenu={() => {
            setIsPauseOpen(false);
            setIsInventoryOpen(false);
            setGameState('MENU');
            soundManager.startMusic('menu');
          }}
        />
      )}

      {/* 7. Ascension Altar Modal */}
      {isAscensionOpen && (
        <AscensionModal
          onClose={() => setIsAscensionOpen(false)}
          onUpgradeApplied={() => {
            if (engineRef.current) {
              engineRef.current.ascension = Storage.getAscension();
              engineRef.current.recalculatePlayerStats();
            }
          }}
        />
      )}

      {/* 8. History Modal */}
      {isHistoryOpen && (
        <HistoryModal
          onClose={() => setIsHistoryOpen(false)}
          onSelectSeed={(seed) => startGame(seed)}
        />
      )}

      {/* 9. Settings & Accessibility Modal */}
      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          onSettingsChanged={(newSettings) => {
            if (engineRef.current) {
              engineRef.current.settings = newSettings;
            }
          }}
        />
      )}

      {/* 10. Social Share & Challenge Modal */}
      {isSeedShareOpen && engine && (
        <SocialShareModal
          currentSeed={engine.seed}
          floor={engine.currentFloorNumber}
          level={engine.player.stats.level}
          kills={engine.enemiesKilledCount}
          playtimeSeconds={Math.round((Date.now() - engine.runStartTime) / 1000)}
          remnantsEarned={engine.abyssRemnantsEarned}
          player={engine.player}
          isVictory={engine.isVictory}
          causeOfDeath={isDead ? 'Consumido pela Fome do Abismo' : 'Descendendo no Abismo'}
          onClose={() => setIsSeedShareOpen(false)}
          onStartCustomSeed={(customSeed) => startGame(customSeed)}
        />
      )}
    </div>
  );
}
