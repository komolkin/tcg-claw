"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Card } from "@/lib/types";
import { searchCards, getCardMarketPrice, LIST_SELECT } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CircleHelp, Music, Volume2, VolumeX } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import confetti from "canvas-confetti";
import { RarityBadge } from "@/components/rarity-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RetroMusic } from "@/lib/retro-music";

/* ───────────────────────── Drop-rate tiers ───────────────────────── */

const DROP_TIERS = [
  { label: "$0 – $1", tag: "Common", rate: 0.45, dot: "bg-green-400" },
  { label: "$1 – $10", tag: "Uncommon", rate: 0.3, dot: "bg-blue-400" },
  { label: "$10 – $50", tag: "Rare", rate: 0.18, dot: "bg-purple-400" },
  { label: "$50 +", tag: "Ultra Rare", rate: 0.07, dot: "bg-orange-400" },
] as const;

function tierIndexForCard(card: Card): number {
  const price = getCardMarketPrice(card);
  if (price >= 50) return 3;
  if (price >= 10) return 2;
  if (price >= 1) return 1;
  return 0;
}

/* ───────────────────── Roulette constants / helpers ──────────────── */

const STRIP_LEN = 60;
const WIN_IDX = 48;
const CARD_W = 200; // px
const GAP = 12; // px
const STEP = CARD_W + GAP;
const SPIN_MS = 5000;

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

function pickWinner(tiers: Card[][]): Card {
  const roll = Math.random();
  let cumulative = 0;
  for (let i = 0; i < DROP_TIERS.length; i++) {
    cumulative += DROP_TIERS[i].rate;
    if (roll <= cumulative && tiers[i].length > 0) {
      return tiers[i][Math.floor(Math.random() * tiers[i].length)];
    }
  }
  // Fallback – first non-empty tier
  for (const t of tiers) {
    if (t.length > 0) return t[Math.floor(Math.random() * t.length)];
  }
  throw new Error("No cards available");
}

function buildStrip(pool: Card[], winner: Card): Card[] {
  const out: Card[] = [];
  for (let i = 0; i < STRIP_LEN; i++) {
    out.push(
      i === WIN_IDX ? winner : pool[Math.floor(Math.random() * pool.length)],
    );
  }
  return out;
}

/* ═══════════════════════════ Component ═══════════════════════════ */

export function ClawMachine() {
  /* ── data state ── */
  const [cards, setCards] = useState<Card[]>([]);
  const [tiers, setTiers] = useState<Card[][]>([[], [], [], []]);
  const [loading, setLoading] = useState(true);

  /* ── roulette state ── */
  const [spinning, setSpinning] = useState(false);
  const [strip, setStrip] = useState<Card[]>([]);
  const [wonCard, setWonCard] = useState<Card | null>(null);

  /* ── ui state ── */
  const [successOpen, setSuccessOpen] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const [soundOpen, setSoundOpen] = useState(false);
  const [shared, setShared] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  /* ── audio state ── */
  const [sfxOn, setSfxOn] = useState(true);
  const [sfxVolume, setSfxVolume] = useState(80);
  const [musicOn, setMusicOn] = useState(true);
  const [musicVolume, setMusicVolume] = useState(60);

  /* ── refs ── */
  const containerRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const cardEls = useRef<Map<number, HTMLDivElement>>(new Map());
  const rafRef = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);
  const lastCenterRef = useRef(-1);
  const hasSpunRef = useRef(false);
  const sfxRef = useRef({ on: true, volume: 0.8 });
  const musicRef = useRef({ on: true, volume: 0.6 });
  const lastTickTimeRef = useRef(0);
  const bgMusic = useRef<RetroMusic | null>(null);
  const musicStarted = useRef(false);

  // keep refs in sync
  useEffect(() => {
    sfxRef.current = { on: sfxOn, volume: sfxVolume / 100 };
  }, [sfxOn, sfxVolume]);

  useEffect(() => {
    musicRef.current = { on: musicOn, volume: musicVolume / 100 };
  }, [musicOn, musicVolume]);

  // Lazily create music engine
  const getMusic = useCallback(() => {
    if (!bgMusic.current) bgMusic.current = new RetroMusic();
    return bgMusic.current;
  }, []);

  // Sync music volume
  useEffect(() => {
    const m = bgMusic.current;
    if (!m) return;
    m.setVolume(musicVolume / 100);
  }, [musicVolume]);

  // Start / stop music when musicOn toggles
  useEffect(() => {
    const m = bgMusic.current;
    if (!m) return;
    if (musicOn && musicStarted.current) {
      m.setVolume(musicVolume / 100);
      m.start();
    } else {
      m.stop();
    }
  }, [musicOn, musicVolume]);

  // Switch music mode when spinning changes
  useEffect(() => {
    const m = bgMusic.current;
    if (!m) return;
    m.setMode(spinning ? "spin" : "idle");
  }, [spinning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => bgMusic.current?.dispose();
  }, []);

  /* ── load cards on mount ── */
  useEffect(() => {
    searchCards({ pageSize: 250, select: LIST_SELECT })
      .then((res) => {
        const data = res.data.filter((c) => c.images?.small);
        setCards(data);
        const t: Card[][] = [[], [], [], []];
        for (const c of data) t[tierIndexForCard(c)].push(c);
        setTiers(t);
        // Build an idle preview strip
        const idle = Array.from(
          { length: 15 },
          () => data[Math.floor(Math.random() * data.length)],
        );
        setStrip(idle);
      })
      .finally(() => setLoading(false));
  }, []);

  /* ── center the idle strip (only before first spin) ── */
  useEffect(() => {
    if (spinning || strip.length === 0 || hasSpunRef.current) return;
    if (!stripRef.current || !containerRef.current) return;
    const cw = containerRef.current.offsetWidth;
    const mid = Math.floor(strip.length / 2);
    const x = mid * STEP - cw / 2 + CARD_W / 2;
    stripRef.current.style.transition = "none";
    stripRef.current.style.transform = `translateX(${-x}px)`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strip, spinning]);

  /* ── highlight the center card (scale 1.1) ── */
  const highlightCenter = useCallback((idx: number) => {
    if (lastCenterRef.current >= 0) {
      const prev = cardEls.current.get(lastCenterRef.current);
      if (prev) prev.style.transform = "";
    }
    const el = cardEls.current.get(idx);
    if (el) el.style.transform = "scale(1.1)";
    lastCenterRef.current = idx;
  }, []);

  /* ──────────────── Sound helpers ──────────────── */

  function ensureAudioCtx(): AudioContext {
    if (!audioRef.current) audioRef.current = new AudioContext();
    if (audioRef.current.state === "suspended") audioRef.current.resume();
    return audioRef.current;
  }

  const playTick = useCallback(() => {
    const { on, volume } = sfxRef.current;
    if (!on || volume === 0) return;
    const now = performance.now();
    if (now - lastTickTimeRef.current < 50) return; // throttle
    lastTickTimeRef.current = now;
    const ctx = ensureAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 600 + Math.random() * 600;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.08 * volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  }, []);

  const playWin = useCallback(() => {
    const { on, volume } = musicRef.current;
    if (!on || volume === 0) return;
    const ctx = ensureAudioCtx();
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "triangle";
      const t0 = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0.12 * volume, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35);
      osc.start(t0);
      osc.stop(t0 + 0.35);
    });
  }, []);

  /* ──────────────── Run the claw machine ──────────────── */

  const run = useCallback(() => {
    if (spinning || cards.length === 0) return;

    const winner = pickWinner(tiers);
    const newStrip = buildStrip(cards, winner);

    // Reset previous card scales
    cardEls.current.forEach((el) => {
      el.style.transform = "";
    });
    lastCenterRef.current = -1;

    // Preload the large modal image during the spin so it's cached when the modal opens
    const modalSrc = winner.images.large || winner.images.small;
    const preload = new Image();
    preload.src = modalSrc;
    preload.onload = () => setImgLoaded(true);

    setStrip(newStrip);
    setWonCard(winner);
    setImgLoaded(false);
    setSpinning(true);

    // Ensure audio context is warm (user gesture)
    if (sfxRef.current.on || musicRef.current.on) ensureAudioCtx();

    // Start background music on first interaction
    if (!musicStarted.current && musicRef.current.on) {
      const m = getMusic();
      m.setVolume(musicRef.current.volume);
      m.setMode("idle");
      m.start();
      musicStarted.current = true;
    }

    // Double-rAF: wait for React to commit the new strip, then animate
    requestAnimationFrame(() => {
      // Reset position before paint
      if (stripRef.current) {
        stripRef.current.style.transition = "none";
        stripRef.current.style.transform = "translateX(0)";
      }

      requestAnimationFrame(() => {
        const cw = containerRef.current?.offsetWidth ?? 600;
        const centerOff = cw / 2 - CARD_W / 2;
        const target = WIN_IDX * STEP - centerOff;
        const t0 = performance.now();
        let lastIdx = -1;

        const tick = (now: number) => {
          const elapsed = now - t0;
          const progress = Math.min(elapsed / SPIN_MS, 1);
          const x = easeOutQuart(progress) * target;

          if (stripRef.current) {
            stripRef.current.style.transform = `translateX(${-x}px)`;
          }

          // Determine which card is at center
          const ci = Math.round((x + centerOff) / STEP);
          if (ci !== lastIdx) {
            highlightCenter(ci);
            lastIdx = ci;
            playTick();
          }

          if (progress < 1) {
            rafRef.current = requestAnimationFrame(tick);
          } else {
            highlightCenter(WIN_IDX);
            hasSpunRef.current = true;
            setSpinning(false);
            playWin();
            setTimeout(() => {
              setSuccessOpen(true);
              confetti({
                particleCount: 120,
                spread: 80,
                origin: { y: 0.6 },
              });
            }, 350);
          }
        };

        rafRef.current = requestAnimationFrame(tick);
      });
    });
  }, [spinning, cards, tiers, highlightCenter, playTick, playWin, getMusic]);

  // Clean up animation on unmount
  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  /* ──────────────── Share handler ──────────────── */

  const handleShare = useCallback(async () => {
    if (!wonCard) return;
    const text = `I just pulled ${wonCard.name} from the Rarible Claw Machine!`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Rarible Claw Machine Pull", text });
      } else {
        await navigator.clipboard.writeText(text);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch {
      /* user cancelled share */
    }
  }, [wonCard]);

  /* ──────────────── Render ──────────────── */

  if (loading) {
    return (
      <section className="mb-36 pt-16">
        <h1 className="mb-4 text-center text-3xl font-bold tracking-tight md:text-4xl">
          Rarible Claw Machine
        </h1>
        <div className="flex h-52 items-center justify-center rounded-lg border bg-card text-sm text-muted-foreground">
          Loading cards…
        </div>
      </section>
    );
  }

  return (
    <section className="my-12 flex md:min-h-[80vh] flex-col justify-center">
      {/* ── Title ── */}
      <h1 className="mb-4 text-center text-3xl font-bold tracking-tight md:text-4xl">
        Rarible Claw Machine
      </h1>

      {/* ── Drop Rates ── */}
      <div className="mb-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        {DROP_TIERS.map((t) => (
          <span
            key={t.tag}
            className="inline-flex items-center gap-1.5 text-xs"
          >
            <span className={`size-2.5 shrink-0 rounded-full ${t.dot}`} />
            <span className="opacity-60">{t.label}</span>
            <span className="font-bold">{(t.rate * 100).toFixed(0)}%</span>
          </span>
        ))}
      </div>

      {/* ── Roulette ── */}
      <div
        ref={containerRef}
        className="relative mb-8 overflow-hidden rounded-lg border border-transparent bg-transparent py-4"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
        }}
      >
        {/* Card strip */}
        <div
          ref={stripRef}
          className="flex will-change-transform"
          style={{ gap: GAP }}
        >
          {strip.map((card, i) => (
            <div
              key={`${card.id}-${i}`}
              ref={(el) => {
                if (el) cardEls.current.set(i, el);
                else cardEls.current.delete(i);
              }}
              className="shrink-0 transition-transform duration-150"
              style={{ width: CARD_W }}
            >
              <div className="aspect-3/4 overflow-hidden rounded-lg bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={card.images.small}
                  alt={card.name}
                  className="h-full w-full object-contain"
                  draggable={false}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          onClick={run}
          disabled={spinning || cards.length === 0}
          size="lg"
        >
          {spinning ? "Spinning…" : "Run Claw Machine"}
        </Button>

        <Button
          variant="ghost"
          size="icon-lg"
          onClick={() => setHowOpen(true)}
          aria-label="How it works"
        >
          <CircleHelp className="size-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon-lg"
          onClick={() => setSoundOpen(true)}
          aria-label="Sound settings"
        >
          <Music className="size-5" />
        </Button>
      </div>

      {/* ── Sound settings modal ── */}
      <Dialog open={soundOpen} onOpenChange={setSoundOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Sound Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* SFX */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Sound Effects</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSfxOn((v) => !v)}
                  aria-label={sfxOn ? "Mute SFX" : "Unmute SFX"}
                >
                  {sfxOn ? (
                    <Volume2 className="size-4" />
                  ) : (
                    <VolumeX className="size-4" />
                  )}
                </Button>
              </div>
              <Slider
                value={[sfxOn ? sfxVolume : 0]}
                onValueChange={([v]) => {
                  setSfxVolume(v);
                  if (v > 0 && !sfxOn) setSfxOn(true);
                  if (v === 0) setSfxOn(false);
                }}
                max={100}
                step={1}
                disabled={!sfxOn}
              />
            </div>

            {/* Music */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Music</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMusicOn((v) => !v)}
                  aria-label={musicOn ? "Mute music" : "Unmute music"}
                >
                  {musicOn ? (
                    <Volume2 className="size-4" />
                  ) : (
                    <VolumeX className="size-4" />
                  )}
                </Button>
              </div>
              <Slider
                value={[musicOn ? musicVolume : 0]}
                onValueChange={([v]) => {
                  setMusicVolume(v);
                  if (v > 0 && !musicOn) setMusicOn(true);
                  if (v === 0) setMusicOn(false);
                }}
                max={100}
                step={1}
                disabled={!musicOn}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── How it works modal ── */}
      <Dialog open={howOpen} onOpenChange={setHowOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>How it works</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  The Rarible Claw Machine randomly picks a Pokémon card from
                  the catalogue based on weighted drop rates. Rarer and more
                  expensive cards have lower drop chances — just like a real
                  claw machine!
                </p>
                <p>
                  Hit <strong>&ldquo;Run Rarible Claw Machine&rdquo;</strong>{" "}
                  and watch the roulette spin to reveal your pull. Good luck!
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* ── Success modal ── */}
      <Dialog
        open={successOpen}
        onOpenChange={(open) => {
          setSuccessOpen(open);
          if (!open) {
            setShared(false);
            // Remove scale highlight from the winning card
            if (lastCenterRef.current >= 0) {
              const el = cardEls.current.get(lastCenterRef.current);
              if (el) el.style.transform = "";
              lastCenterRef.current = -1;
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">
              You pulled
            </DialogTitle>
          </DialogHeader>

          {wonCard && (
            <div className="flex flex-col items-center gap-3">
              <div className="relative aspect-3/4 w-52">
                {!imgLoaded && (
                  <Skeleton className="absolute inset-0 rounded-lg" />
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={wonCard.images.large || wonCard.images.small}
                  alt={wonCard.name}
                  className={`absolute inset-0 h-full w-full rounded-lg object-contain shadow-lg transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
                  onLoad={() => setImgLoaded(true)}
                />
              </div>
              <p className="text-lg font-semibold">{wonCard.name}</p>
              <div className="flex items-center gap-2">
                {wonCard.rarity && <RarityBadge rarity={wonCard.rarity} />}
                {(() => {
                  const price = getCardMarketPrice(wonCard);
                  return price > 0 ? (
                    <span className="text-sm font-semibold">
                      ${price.toFixed(2)}
                    </span>
                  ) : null;
                })()}
              </div>
            </div>
          )}

          <DialogFooter className="flex-col items-center gap-2 sm:flex-col sm:items-center">
            <Button
              className="w-full"
              onClick={() => {
                setSuccessOpen(false);
                setShared(false);
                setTimeout(run, 250);
              }}
            >
              Try again
            </Button>
            <Button className="w-full" variant="outline" onClick={handleShare}>
              {shared ? "Copied!" : "Flex"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
