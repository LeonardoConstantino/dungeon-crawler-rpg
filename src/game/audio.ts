import { GameSettings } from './types';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  // Music state
  private currentTrack: 'menu' | 'explore' | 'combat' | 'boss' | 'death' | 'none' = 'none';
  private musicTimer: number | null = null;
  private stepInBar = 0;
  private isPlayingMusic = false;

  private settings: GameSettings = {
    masterVolume: 0.8,
    musicVolume: 0.6,
    sfxVolume: 0.8,
    isMuted: false,
    screenShake: true,
    reducedFlashes: false,
    aimAssist: true,
    virtualJoystickScale: 1.0,
    virtualJoystickOpacity: 0.7,
  };

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.applySettings(this.settings);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public applySettings(settings: GameSettings) {
    this.settings = settings;
    if (!this.masterGain || !this.musicGain || !this.sfxGain || !this.ctx) return;

    const master = settings.isMuted ? 0 : settings.masterVolume;
    this.masterGain.gain.setTargetAtTime(master, this.ctx.currentTime, 0.05);
    this.musicGain.gain.setTargetAtTime(settings.musicVolume * 0.5, this.ctx.currentTime, 0.05);
    this.sfxGain.gain.setTargetAtTime(settings.sfxVolume * 0.7, this.ctx.currentTime, 0.05);
  }

  // --- SFX GENERATORS ---

  public playFootstep() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.settings.isMuted) return;

    // Gravel friction click/noise
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(80 + Math.random() * 40, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.06);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, t);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.07);
  }

  public playSwing() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.settings.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, t);
    filter.Q.setValueAtTime(2, t);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.13);
  }

  public playHit(isCrit = false) {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.settings.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isCrit ? 'square' : 'triangle';
    osc.frequency.setValueAtTime(isCrit ? 450 : 220, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + (isCrit ? 0.2 : 0.12));

    gain.gain.setValueAtTime(isCrit ? 0.45 : 0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (isCrit ? 0.22 : 0.13));

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + (isCrit ? 0.25 : 0.15));

    if (isCrit) {
      // Add metallic harmonic ring
      const ringOsc = this.ctx.createOscillator();
      const ringGain = this.ctx.createGain();
      ringOsc.type = 'sine';
      ringOsc.frequency.setValueAtTime(1100, t);
      ringGain.gain.setValueAtTime(0.25, t);
      ringGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      ringOsc.connect(ringGain);
      ringGain.connect(this.sfxGain);
      ringOsc.start(t);
      ringOsc.stop(t + 0.36);
    }
  }

  public playPlayerHurt() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.settings.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.18);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.19);
  }

  public playDash() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.settings.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(650, t + 0.16);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(700, t);

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.19);
  }

  public playVoidPulse() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.settings.isMuted) return;

    const t = this.ctx.currentTime;
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(90, t);
    subOsc.frequency.exponentialRampToValueAtTime(35, t + 0.4);

    subGain.gain.setValueAtTime(0.45, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);

    subOsc.start(t);
    subOsc.stop(t + 0.45);
  }

  public playAmuletShield() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.settings.isMuted) return;

    const t = this.ctx.currentTime;
    [520, 650, 780].forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.05);

      gain.gain.setValueAtTime(0.18, t + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35 + i * 0.05);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t + i * 0.05);
      osc.stop(t + 0.4 + i * 0.05);
    });
  }

  public playXpPickup() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.settings.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800 + Math.random() * 200, t);
    osc.frequency.exponentialRampToValueAtTime(1400, t + 0.09);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.11);
  }

  public playLevelUp() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.settings.isMuted) return;

    const t = this.ctx.currentTime;
    const notes = [440, 554, 659, 880, 1108]; // A Major spectral chord
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);

      gain.gain.setValueAtTime(0.25, t + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8 + idx * 0.08);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t + idx * 0.08);
      osc.stop(t + 0.9 + idx * 0.08);
    });
  }

  public playChestOpen(isRare = false) {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.settings.isMuted) return;

    const t = this.ctx.currentTime;
    // Creak
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.linearRampToValueAtTime(280, t + 0.15);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.2);

    if (isRare) {
      // Golden shimmering chime
      [659, 830, 987, 1318].forEach((freq, i) => {
        if (!this.ctx || !this.sfxGain) return;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, t + 0.12 + i * 0.06);
        g.gain.setValueAtTime(0.25, t + 0.12 + i * 0.06);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
        o.connect(g);
        g.connect(this.sfxGain);
        o.start(t + 0.12 + i * 0.06);
        o.stop(t + 0.85);
      });
    }
  }

  public playFloorClear() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.settings.isMuted) return;

    const t = this.ctx.currentTime;
    // Triumphant 4-note ascending chord (C4, E4, G4, C5)
    const notes = [261.6, 329.6, 392.0, 523.2];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.1);

      gain.gain.setValueAtTime(0.2, t + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65 + idx * 0.1);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + idx * 0.1);
      osc.stop(t + 0.7 + idx * 0.1);
    });
  }

  public playComboKill(combo: number) {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.settings.isMuted) return;

    const t = this.ctx.currentTime;
    // Escalating pitch based on streak (A3 to C6)
    const baseFreq = Math.min(880, 220 + Math.min(15, combo) * 35);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = combo >= 5 ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.3, t + 0.12);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  public playAltarPact() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.settings.isMuted) return;

    const t = this.ctx.currentTime;
    // Ominous sub saw drone with bell
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(82.4, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.75);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.85);

    [587.3, 739.9, 880].forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, t + 0.08 + idx * 0.07);
      g.gain.setValueAtTime(0.18, t + 0.08 + idx * 0.07);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
      o.connect(g);
      g.connect(this.sfxGain);
      o.start(t + 0.08 + idx * 0.07);
      o.stop(t + 0.7);
    });
  }

  public playBountyComplete() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.settings.isMuted) return;

    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.07);
      gain.gain.setValueAtTime(0.24, t + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6 + idx * 0.07);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + idx * 0.07);
      osc.stop(t + 0.65 + idx * 0.07);
    });
  }

  public playStairDescent() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.settings.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.6);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.7);
  }

  public playEnemyAlert(type: string) {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.settings.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (type === 'goblin') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(500, t);
      osc.frequency.exponentialRampToValueAtTime(850, t + 0.08);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    } else if (type === 'orc') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(90, t);
      osc.frequency.linearRampToValueAtTime(130, t + 0.15);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    } else if (type === 'archer') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(400, t + 0.07);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    } else if (type === 'mage' || type === 'boss') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.exponentialRampToValueAtTime(520, t + 0.25);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    }

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.3);
  }

  public playScrollCast() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.settings.isMuted) return;

    const t = this.ctx.currentTime;
    // Harmonic upward sweep with mystical chime
    [329, 440, 659, 880, 1318].forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.35 + idx * 0.05);

      gain.gain.setValueAtTime(0.2, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6 + idx * 0.05);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t + idx * 0.05);
      osc.stop(t + 0.65 + idx * 0.05);
    });
  }

  public playElixirDrink() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.settings.isMuted) return;

    const t = this.ctx.currentTime;
    // Bubbling liquid pop
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(700, t + 0.08);
    osc.frequency.exponentialRampToValueAtTime(1100, t + 0.18);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.23);
  }

  public playAbyssWarning() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.settings.isMuted) return;

    const t = this.ctx.currentTime;
    // Low sub-bass ominous rumble / heartbeat
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(75, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.4);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.5);
  }

  public playButtonClick() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.settings.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.04);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.06);
  }

  // --- ADAPTIVE PROCEDURAL MUSIC SYSTEM ("Folk Fúnebre Sintético") ---

  public startMusic(track: 'menu' | 'explore' | 'combat' | 'boss' | 'death') {
    this.initContext();
    if (this.currentTrack === track && this.isPlayingMusic) return;

    this.currentTrack = track;
    if (this.musicTimer) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }

    this.stepInBar = 0;
    this.isPlayingMusic = true;

    // Tempo settings based on track
    let intervalMs = 280; // ~107 BPM
    if (track === 'menu') intervalMs = 520;      // ~58 BPM
    else if (track === 'explore') intervalMs = 450; // ~66 BPM
    else if (track === 'combat') intervalMs = 280;  // ~107 BPM
    else if (track === 'boss') intervalMs = 230;    // ~130 BPM
    else if (track === 'death') intervalMs = 700;   // ~42 BPM

    this.tickMusic();
    this.musicTimer = window.setInterval(() => {
      this.tickMusic();
    }, intervalMs);
  }

  public stopMusic() {
    if (this.musicTimer) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.currentTrack = 'none';
    this.isPlayingMusic = false;
  }

  private tickMusic() {
    if (!this.ctx || !this.musicGain || this.settings.isMuted || !this.isPlayingMusic) return;
    const t = this.ctx.currentTime;
    const step = this.stepInBar % 16;
    this.stepInBar++;

    // "A Pedra Lembra" leitmotif notes: A2 (110Hz), C3 (130.8Hz), B2 (123.5Hz), E2 (82.4Hz)
    if (this.currentTrack === 'menu') {
      // Solemn slow bowed cello & ambient pad
      if (step === 0) this.playSynthesizedPad(110, 2.0, 'sawtooth', 0.12);
      if (step === 4) this.playSynthesizedPad(130.8, 1.8, 'sawtooth', 0.10);
      if (step === 8) this.playSynthesizedPad(123.5, 1.8, 'sawtooth', 0.10);
      if (step === 12) this.playSynthesizedPad(82.4, 2.2, 'sawtooth', 0.14);

      // Deep bell chime on step 0
      if (step === 0) {
        this.playDeepChime(220, 2.8, 0.08);
      }
    } else if (this.currentTrack === 'explore') {
      // Atmospheric dark cavern drone with subtle metallic plucks
      if (step === 0) this.playSynthesizedPad(82.4, 3.2, 'triangle', 0.14); // E2 drone
      if (step === 8) this.playSynthesizedPad(110, 3.0, 'triangle', 0.12);  // A2 drone

      // Random sparse mineral drops / harp notes
      if (step === 3 || step === 10 || step === 14) {
        const freqs = [329.6, 440, 493.8, 523.2];
        const f = freqs[Math.floor(Math.random() * freqs.length)];
        this.playDeepChime(f, 0.9, 0.05);
      }
    } else if (this.currentTrack === 'combat') {
      // Driving acoustic/synthetic tribal drumbeat & tense ostinato
      // Bass drum on 0, 4, 8, 12
      if (step % 4 === 0) {
        this.playSynthKick(t);
      }
      // Offbeat metallic pulse
      if (step % 2 === 1) {
        this.playSynthPercussion(t);
      }
      // Fast bass riff
      const bassNotes = [110, 110, 130.8, 110, 123.5, 110, 146.8, 123.5];
      const freq = bassNotes[step % bassNotes.length];
      this.playSynthesizedPad(freq, 0.22, 'sawtooth', 0.12);
    } else if (this.currentTrack === 'boss') {
      // Heavy apocalyptic drums & brass pulse
      if (step % 2 === 0) {
        this.playSynthKick(t, true);
      }
      if (step % 4 === 2) {
        this.playSynthSnare(t);
      }
      // Dissonant brass saw
      if (step === 0 || step === 6 || step === 12) {
        this.playSynthesizedPad(73.4, 0.5, 'sawtooth', 0.22); // D2
      }
    } else if (this.currentTrack === 'death') {
      // Dissolving low sub drone with filtering
      if (step === 0) {
        this.playSynthesizedPad(55, 3.5, 'sine', 0.25);
      }
    }
  }

  private playSynthesizedPad(freq: number, duration: number, type: OscillatorType, vol: number) {
    if (!this.ctx || !this.musicGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 3, t);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.5, t + duration);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  private playDeepChime(freq: number, duration: number, vol: number) {
    if (!this.ctx || !this.musicGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  private playSynthKick(t: number, heavy = false) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(heavy ? 120 : 95, t);
    osc.frequency.exponentialRampToValueAtTime(32, t + 0.12);

    gain.gain.setValueAtTime(heavy ? 0.35 : 0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  private playSynthSnare(t: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(190, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.08);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(t);
    osc.stop(t + 0.11);
  }

  private playSynthPercussion(t: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(350, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.03);

    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(t);
    osc.stop(t + 0.04);
  }
}

export const soundManager = new SoundEngine();
