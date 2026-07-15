"use client";

import { useRef, useState } from "react";
import { parseReceipt, type ReceiptParse } from "@/lib/receipt/parseReceipt";

/**
 * Snap or upload a receipt and prefill the form. OCR runs in the browser
 * (tesseract.js) — the photo never leaves the device, only the recognised text
 * is parsed locally. On phones the camera opens directly (capture="environment").
 */
export default function ReceiptScanButton({ onParsed }: { onParsed: (p: ReceiptParse) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function handleFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    setNote(null);
    setStage("Reading receipt… (first run downloads the reader)");
    try {
      const Tesseract = (await import("tesseract.js")).default;
      const ocr = await Tesseract.recognize(file, "eng");
      const parsed = parseReceipt(ocr.data.text ?? "");
      if (parsed.amount == null) {
        setNote("Couldn't read a total — enter it manually, the photo may be blurry.");
      } else {
        setNote(`Found ${parsed.merchant ? `${parsed.merchant}, ` : ""}$${parsed.amount.toFixed(2)} — check and save.`);
      }
      onParsed(parsed);
    } catch {
      setNote("Couldn't read that image — try again or enter it manually.");
    } finally {
      setBusy(false);
      setStage(null);
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-line bg-surface-2 p-3">
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-surface px-4 py-2.5 text-sm font-medium text-ink-muted ring-1 ring-line hover:bg-surface-3 disabled:opacity-60"
      >
        📷 {busy ? (stage ?? "Reading…") : "Snap a receipt"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
      {note && <p className="mt-2 text-xs text-ink-subtle">{note}</p>}
    </div>
  );
}
