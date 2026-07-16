"use client";

import { useEffect, useRef, useState } from "react";
import { REGIONS } from "@/lib/regions";
import { FLAGS } from "./flags";

/**
 * A small custom country combobox with real flag images and a search filter —
 * a native <select> can only hold text, and flag emoji don't render on Windows.
 */
export default function CountrySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = REGIONS.find((r) => r.code === value) ?? REGIONS[0];
  const SelFlag = FLAGS[selected.code];
  const q = query.trim().toLowerCase();
  const filtered = q ? REGIONS.filter((r) => r.name.toLowerCase().includes(q)) : REGIONS;

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(code: string) {
    onChange(code);
    setOpen(false);
    setQuery("");
  }

  const flagCls = "h-4 w-6 shrink-0 rounded-[2px] ring-1 ring-black/10";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink transition hover:border-ink-faint focus:border-action focus:outline-none"
      >
        <span className="flex items-center gap-2.5">
          {SelFlag && <SelFlag title={selected.name} className={flagCls} />}
          {selected.name}
        </span>
        <span aria-hidden className={`text-ink-faint transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-line bg-surface shadow-lg">
          <div className="p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country…"
              className="w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:border-action focus:outline-none"
            />
          </div>
          <ul role="listbox" className="max-h-56 overflow-auto pb-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-ink-faint">No match</li>
            ) : (
              filtered.map((r) => {
                const F = FLAGS[r.code];
                const isSel = r.code === value;
                return (
                  <li key={r.code} role="option" aria-selected={isSel}>
                    <button
                      type="button"
                      onClick={() => pick(r.code)}
                      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-surface-2 ${
                        isSel ? "bg-surface-2 font-medium text-ink" : "text-ink-muted"
                      }`}
                    >
                      {F && <F title={r.name} className={flagCls} />}
                      {r.name}
                      {isSel && <span className="ml-auto text-fortune-700" aria-hidden>✓</span>}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
