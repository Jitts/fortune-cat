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
    <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-3">
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 ring-1 ring-neutral-300 hover:bg-neutral-100 disabled:opacity-60"
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
      {note && <p className="mt-2 text-xs text-neutral-500">{note}</p>}
    </div>
  );
}
