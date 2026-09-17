"use client";

import { Player, type PlayerRef } from "@remotion/player";
import { useEffect, useRef, useState } from "react";
import CaptureLoop, { LOOP_DURATION, LOOP_FPS } from "./CaptureLoop";
import CaptureWeek, { DURATION, FPS, STEPS, STEP_FRAMES } from "./CaptureWeek";
import SafeToSpendTick, { TICK_DURATION, TICK_FPS } from "./SafeToSpendTick";

/**
 * The three places Remotion works on this page, each with its own rule for
 * when it moves:
 *  - HeroLoop plays on its own (muted, looping) — it's ambient, like a globe.
 *  - WeekScroll moves only as the visitor scrolls — progress is the frame.
 *  - SafeToSpend ticks once, the first time it scrolls into view.
 * `prefers-reduced-motion` turns each into its final frame.
 */

function useNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = matchMedia("(max-width: 700px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return narrow;
}

function useReducedMotion() {
  const [still, setStill] = useState(false);
  useEffect(() => {
    setStill(matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  return still;
}

export function HeroLoop() {
  const still = useReducedMotion();
  const narrow = useNarrow();
  return (
    <div className="l-player l-player-hero">
      <Player
        component={CaptureLoop}
        inputProps={{ narrow }}
        durationInFrames={LOOP_DURATION}
        fps={LOOP_FPS}
        compositionWidth={narrow ? 420 : 720}
        compositionHeight={narrow ? 360 : 300}
        style={{ width: "100%" }}
        controls={false}
        clickToPlay={false}
        autoPlay={!still}
        loop={!still}
        initialFrame={still ? 60 : 0}
      />
    </div>
  );
}

/**
 * The week, scrubbed by scrolling: a tall track with the whole split (copy on
 * the left, ledger on the right) stuck inside it. Progress through the track
 * is the Player's frame, so scrolling down fills the week and scrolling up
 * unfills it. Nothing plays on its own. Reduced motion collapses the track
 * and rests on the completed week.
 */
export function WeekScroll({ children }: { children: React.ReactNode }) {
  const player = useRef<PlayerRef>(null);
  const track = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const still = useReducedMotion();
  const last = STEPS.length - 1;

  useEffect(() => {
    const p = player.current;
    if (!p) return;
    if (still) {
      setStep(last);
      p.seekTo(DURATION - 1);
      return;
    }
    let raf = 0;
    let lastFrame = -1;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = track.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const t = Math.min(
          1,
          Math.max(0, -r.top / (r.height - window.innerHeight)),
        );
        const frame = Math.round(t * (DURATION - 1));
        if (frame === lastFrame) return;
        lastFrame = frame;
        p.seekTo(frame);
        setStep(Math.min(last, Math.floor(frame / STEP_FRAMES)));
      });
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [still, last]);

  return (
    <div ref={track} className="l-track" data-still={still || undefined}>
      <div className="l-stage l-wrap l-split">
        {children}
        <div className="l-widget">
          <div className="l-widget-head">
            <span className="l-count" aria-live="polite">
              {step + 1} / {STEPS.length}
            </span>
            <ol className="l-segs" aria-hidden>
              {STEPS.map((s, i) => (
                <li key={s.day + i} data-on={i <= step || undefined} />
              ))}
            </ol>
          </div>
          <div className="l-player">
            <Player
              ref={player}
              component={CaptureWeek}
              durationInFrames={DURATION}
              fps={FPS}
              compositionWidth={480}
              compositionHeight={600}
              style={{ width: "100%" }}
              controls={false}
              clickToPlay={false}
            />
          </div>
          <p className="l-caption" aria-live="polite">
            {STEPS[step].caption}
          </p>
          {!still && (
            <p className="l-hint" aria-hidden>
              {step < last ? "Scroll to fill the week ↓" : "Week complete"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function SafeToSpend() {
  const player = useRef<PlayerRef>(null);
  const box = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();
  useEffect(() => {
    const el = box.current;
    const p = player.current;
    if (!el || !p) return;
    if (still) {
      p.seekTo(TICK_DURATION - 1);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          p.play();
          io.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [still]);
  return (
    <div ref={box} className="l-player l-player-tick">
      <Player
        ref={player}
        component={SafeToSpendTick}
        durationInFrames={TICK_DURATION}
        fps={TICK_FPS}
        compositionWidth={560}
        compositionHeight={300}
        style={{ width: "100%" }}
        controls={false}
        clickToPlay={false}
      />
    </div>
  );
}
