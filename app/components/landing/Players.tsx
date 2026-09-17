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
 *  - WeekWidget moves only when the visitor presses "Next alert".
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

export function WeekWidget() {
  const player = useRef<PlayerRef>(null);
  const [step, setStep] = useState(-1); // -1: nothing pressed yet
  const still = useReducedMotion();
  const last = STEPS.length - 1;

  // Play exactly one step's worth of frames, then hold on its last frame.
  // The stop frame lives in a ref so the one listener never reads stale state.
  const stop = useRef(Infinity);
  useEffect(() => {
    const p = player.current;
    if (!p) return;
    const onFrame = (e: { detail: { frame: number } }) => {
      if (e.detail.frame >= stop.current) p.pause();
    };
    p.addEventListener("frameupdate", onFrame);
    return () => p.removeEventListener("frameupdate", onFrame);
  }, []);

  const next = () => {
    const s = Math.min(last, step + 1);
    setStep(s);
    const p = player.current;
    if (!p) return;
    stop.current = (s + 1) * STEP_FRAMES - 1;
    if (still) {
      p.seekTo(stop.current);
    } else {
      p.seekTo(s * STEP_FRAMES);
      p.play();
    }
  };
  const reset = () => {
    setStep(-1);
    stop.current = Infinity;
    player.current?.pause();
    player.current?.seekTo(0);
  };

  return (
    <div className="l-widget">
      <div className="l-widget-head">
        <span className="l-count" aria-live="polite">
          {step < 0 ? "Sample week" : `${step + 1} / ${STEPS.length}`}
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
        {step < 0
          ? "Seven days. Press the button and each alert arrives the way your phone shows it."
          : STEPS[step].caption}
      </p>
      <div className="l-widget-ctl">
        <button
          type="button"
          className="l-pill"
          onClick={next}
          disabled={step >= last}
        >
          {step < 0
            ? "First alert"
            : step >= last
              ? "Week complete"
              : "Next alert"}
        </button>
        {step >= 0 && (
          <button type="button" className="l-pill l-pill-ghost" onClick={reset}>
            Start over
          </button>
        )}
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
