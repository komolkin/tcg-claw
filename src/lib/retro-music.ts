/**
 * Procedural chiptune music engine – "Waifu Pokémon" style.
 *
 * Generates looping retro music entirely via the Web Audio API.
 * Two modes: a chill idle theme and an up-tempo spinning theme.
 */

/* ─── Note helpers ─── */

const NOTE_FREQ: Record<string, number> = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0,
};

/* ─── Patterns ─── */

// Idle melody – gentle, pentatonic, Pokémon-town feel (C major pentatonic)
const IDLE_MELODY: (string | null)[] = [
  "E4", "G4", "A4", "G4", "E4", "D4", "C4", null,
  "D4", "E4", "G4", "E4", "D4", "C4", "D4", null,
  "E4", "G4", "A4", "C5", "A4", "G4", "E4", "G4",
  "A4", "G4", "E4", "D4", "C4", "D4", "E4", null,
];

const IDLE_BASS: (string | null)[] = [
  "C3", null, "G3", null, "A3", null, "G3", null,
  "F3", null, "C3", null, "G3", null, "C3", null,
  "C3", null, "E3", null, "A3", null, "G3", null,
  "F3", null, "G3", null, "C3", null, "C3", null,
];

// Arpeggio overlay for sparkle
const IDLE_ARP: (string | null)[] = [
  "C5", "E5", "G5", null, "A4", "C5", "E5", null,
  "D5", "G5", "A5", null, "E5", "G5", "C5", null,
  "C5", "E5", "G5", null, "A4", "C5", "E5", null,
  "G5", "E5", "C5", null, "D5", "E5", "G5", null,
];

// Spin melody – faster, more energetic
const SPIN_MELODY: (string | null)[] = [
  "E5", "E5", "D5", "E5", "G5", "A5", "G5", "E5",
  "D5", "C5", "D5", "E5", "G5", "E5", "D5", "C5",
  "A4", "C5", "D5", "E5", "G5", "A5", "G5", "E5",
  "D5", "E5", "G5", "A5", "G5", "E5", "D5", "C5",
];

const SPIN_BASS: (string | null)[] = [
  "C3", "C3", "G3", "G3", "A3", "A3", "G3", "G3",
  "F3", "F3", "C3", "C3", "G3", "G3", "E3", "E3",
  "A3", "A3", "C3", "C3", "G3", "G3", "E3", "E3",
  "F3", "F3", "G3", "G3", "C3", "C3", "C3", "C3",
];

const SPIN_ARP: (string | null)[] = [
  "C5", "G5", "E5", "G5", "C5", "E5", "G5", "A5",
  "D5", "A5", "G5", "E5", "D5", "G5", "E5", "C5",
  "A4", "E5", "C5", "E5", "G5", "A5", "G5", "E5",
  "D5", "G5", "E5", "G5", "A5", "G5", "E5", "C5",
];

/* ─── Engine ─── */

export type MusicMode = "idle" | "spin";

export class RetroMusic {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private melodyGain: GainNode | null = null;
  private bassGain: GainNode | null = null;
  private arpGain: GainNode | null = null;

  private timerId: ReturnType<typeof setInterval> | null = null;
  private nextNoteTime = 0;
  private step = 0;
  private playing = false;
  private _mode: MusicMode = "idle";
  private _volume = 0.6;

  /* ─ Public API ─ */

  get mode() { return this._mode; }

  setMode(m: MusicMode) {
    this._mode = m;
    // Reset step so pattern starts fresh on mode change
    this.step = 0;
  }

  setVolume(v: number) {
    this._volume = Math.max(0, Math.min(1, v));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this._volume, this.ctx.currentTime, 0.05);
    }
  }

  start() {
    if (this.playing) return;
    this.playing = true;

    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._volume;
      this.masterGain.connect(this.ctx.destination);

      this.melodyGain = this.ctx.createGain();
      this.melodyGain.gain.value = 0.18;
      this.melodyGain.connect(this.masterGain);

      this.bassGain = this.ctx.createGain();
      this.bassGain.gain.value = 0.22;
      this.bassGain.connect(this.masterGain);

      this.arpGain = this.ctx.createGain();
      this.arpGain.gain.value = 0.07;
      this.arpGain.connect(this.masterGain);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();

    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.step = 0;
    this.scheduler();
    this.timerId = setInterval(() => this.scheduler(), 25);
  }

  stop() {
    this.playing = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    // Fade out quickly
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      // Restore volume after fade for next start
      setTimeout(() => {
        if (this.masterGain && this.ctx) {
          this.masterGain.gain.value = this._volume;
        }
      }, 300);
    }
  }

  dispose() {
    this.stop();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }

  /* ─ Scheduler (look-ahead) ─ */

  private scheduler() {
    if (!this.ctx || !this.playing) return;
    const lookAhead = 0.1; // seconds
    while (this.nextNoteTime < this.ctx.currentTime + lookAhead) {
      this.scheduleStep(this.nextNoteTime);
      this.step++;
      const bpm = this._mode === "spin" ? 180 : 130;
      this.nextNoteTime += 60 / bpm / 2; // eighth-note pulse
    }
  }

  private scheduleStep(time: number) {
    if (!this.ctx) return;
    const isIdle = this._mode === "idle";
    const melody = isIdle ? IDLE_MELODY : SPIN_MELODY;
    const bass = isIdle ? IDLE_BASS : SPIN_BASS;
    const arp = isIdle ? IDLE_ARP : SPIN_ARP;
    const len = melody.length;
    const idx = this.step % len;
    const dur = isIdle ? 0.18 : 0.12;

    // Melody – square wave
    const mNote = melody[idx];
    if (mNote && this.melodyGain) {
      this.playNote(mNote, "square", this.melodyGain, time, dur);
    }

    // Bass – triangle wave (every 2nd step for idle, every step for spin)
    const bNote = bass[idx];
    if (bNote && this.bassGain) {
      const bDur = isIdle ? 0.3 : 0.2;
      this.playNote(bNote, "triangle", this.bassGain, time, bDur);
    }

    // Arpeggio – pulse-like (square with short envelope)
    const aNote = arp[idx];
    if (aNote && this.arpGain) {
      this.playNote(aNote, "square", this.arpGain, time, 0.06);
    }
  }

  private playNote(
    note: string,
    type: OscillatorType,
    dest: GainNode,
    time: number,
    dur: number,
  ) {
    if (!this.ctx) return;
    const freq = NOTE_FREQ[note];
    if (!freq) return;

    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(env);
    env.connect(dest);

    env.gain.setValueAtTime(1, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.start(time);
    osc.stop(time + dur + 0.01);
  }
}
