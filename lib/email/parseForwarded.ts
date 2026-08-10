/**
 * Unwrap a forwarded message to recover who originally sent it.
 *
 * This exists because of what the envelope of a forwarded message says. When
 * someone forwards their bank's alert to Fortune Cat, the From address on the
 * message we receive is THEIR OWN — the bank appears nowhere in the headers,
 * only inside the body text the mail client quoted. Without unwrapping, every
 * forwarded capture is attributed to the person who forwarded it, which breaks
 * the account tag, breaks trusted-sender matching, and makes the review queue
 * read "from: you" for every row.
 *
 * The original sender lives in a quoted header block that every mail client
 * writes differently, and that Gmail and Outlook LOCALISE. So this does not
 * look for "---------- Forwarded message ----------": that string is English
 * Gmail only, and matching it would silently fail for a French or Chinese
 * user. It looks for the structure instead — a line like "From: ..." followed
 * closely by other header-ish lines — with the field names aliased across the
 * languages people actually use.
 *
 * Coverage is deliberately partial and the failure mode is deliberately soft.
 * There is no list of aliases that covers every locale of every client, so an
 * unrecognised layout must not lose the message: it comes back `unwrapped:
 * false` with the full text intact, and the caller captures it attributed to
 * the forwarder with a review reason. A capture that needs a human glance
 * beats a message that vanished.
 */

export type ForwardedMessage = {
  /** Original sender's address, lowercased. Empty when it couldn't be read. */
  from: string;
  /** Original subject, or "" when it couldn't be read. */
  subject: string;
  /** Original send date. Null when absent or unparseable — never guessed. */
  date: Date | null;
  /** The message body with the quoted header block removed. */
  body: string;
  /** False means no forward structure was recognised; `body` is the input. */
  unwrapped: boolean;
};

// Field-name aliases, by the languages Gmail and Outlook actually localise
// into. Not exhaustive and not pretending to be — see the soft-failure note
// above. Compared case-insensitively after trimming.
const FROM_KEYS = [
  "from", "de", "von", "da", "van", "od", "fra", "från", "frå",
  "nadawca", "kimden", "от", "отправитель", "gönderen", "από", "מאת",
  "من", "จาก", "từ", "dari", "发件人", "寄件者", "差出人", "보낸사람", "보낸 사람",
];
const SUBJECT_KEYS = [
  "subject", "objet", "asunto", "betreff", "oggetto", "assunto", "onderwerp",
  "ämne", "emne", "aihe", "temat", "předmět", "tárgy", "konu", "тема",
  "θέμα", "נושא", "الموضوع", "เรื่อง", "chủ đề", "主题", "主旨", "件名", "제목",
];
// "Sent" is Outlook's word for the same field, so both land here.
const DATE_KEYS = [
  "date", "sent", "fecha", "datum", "data", "päivämäärä", "dato",
  "gönderilme tarihi", "tarih", "дата", "отправлено", "ημερομηνία",
  "תאריך", "التاريخ", "วันที่", "ngày", "日期", "发送时间", "日付", "送信日時", "날짜", "보낸날짜",
];
const TO_KEYS = [
  "to", "à", "a", "an", "para", "aan", "till", "til", "do", "kime",
  "кому", "προς", "אל", "إلى", "ถึง", "đến", "收件人", "宛先", "받는사람", "받는 사람",
];

const ALL_KEYS = new Set([...FROM_KEYS, ...SUBJECT_KEYS, ...DATE_KEYS, ...TO_KEYS]);

/** Split "Name <a@b.com>" / "a@b.com" / "<a@b.com>" down to the address. */
export function extractAddress(value: string): string {
  const angled = value.match(/<([^<>@\s]+@[^<>@\s]+)>/);
  if (angled) return angled[1].toLowerCase();
  const bare = value.match(/([^\s<>(),;:"]+@[^\s<>(),;:"]+\.[a-z]{2,})/i);
  return bare ? bare[1].toLowerCase() : "";
}

/** A "Key: value" line whose key is one we recognise, in any listed language. */
function headerLine(line: string): { key: string; value: string } | null {
  // Bounded key length so a prose line with a colon ("I paid this: see below")
  // can't masquerade as a header.
  const m = line.match(/^\s*\*?\s*([^\s:][^:]{0,24}?)\s*\*?\s*:\s*(.*)$/);
  if (!m) return null;
  const key = m[1].trim().toLowerCase().replace(/\s+/g, " ");
  if (!ALL_KEYS.has(key)) return null;
  return { key, value: m[2].trim() };
}

// Mail clients join the date and the time with a word: Gmail writes
// "Mon, 10 Aug 2026 at 14:32", Apple "10 August 2026 at 14:32:10 GMT+8",
// German "10. August 2026 um 14:32". Date.parse chokes on all of them and
// returns Invalid Date, so a Gmail forward would arrive dateless. Strip the
// connector and retry.
const DATE_CONNECTORS =
  /\s+(?:at|à|um|alle|a las|às|om|kl\.?|klo|о|в|на|στις)\s+/giu;

function parseHeaderDate(value: string): Date | null {
  const attempts = [value, value.replace(DATE_CONNECTORS, " ")];
  for (const attempt of attempts) {
    const d = new Date(attempt.trim());
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function classify(key: string): "from" | "subject" | "date" | "to" | null {
  if (FROM_KEYS.includes(key)) return "from";
  if (SUBJECT_KEYS.includes(key)) return "subject";
  if (DATE_KEYS.includes(key)) return "date";
  if (TO_KEYS.includes(key)) return "to";
  return null;
}

export function parseForwardedMessage(raw: string): ForwardedMessage {
  const text = typeof raw === "string" ? raw : "";
  const fallback: ForwardedMessage = {
    from: "",
    subject: "",
    date: null,
    body: text.trim(),
    unwrapped: false,
  };
  if (!text.trim()) return fallback;

  const lines = text.split(/\r?\n/);

  // Find a header BLOCK, not a lone "From:" line. A quoted signature or a
  // pasted note can easily contain one header-looking line; a real forward
  // header has a From plus at least one sibling within a few lines. Requiring
  // the cluster is what keeps this from misreading prose as structure.
  for (let i = 0; i < lines.length; i++) {
    const head = headerLine(lines[i]);
    if (!head || classify(head.key) !== "from") continue;

    const from = extractAddress(head.value);
    if (!from) continue;

    const found: Record<string, string> = { from: head.value };
    let siblings = 0;
    let lastHeaderIdx = i;

    // Look ahead a short way. Blank lines are tolerated (Outlook interleaves
    // them) but two in a row end the block.
    let blanks = 0;
    for (let j = i + 1; j < Math.min(i + 12, lines.length); j++) {
      const line = lines[j];
      if (!line.trim()) {
        if (++blanks >= 2) break;
        continue;
      }
      blanks = 0;
      const h = headerLine(line);
      if (!h) break;
      const kind = classify(h.key);
      if (!kind || kind === "from") break;
      if (!found[kind]) {
        found[kind] = h.value;
        siblings++;
      }
      lastHeaderIdx = j;
    }

    if (siblings === 0) continue; // lone From: — not a forward block

    return {
      from,
      subject: (found.subject ?? "").slice(0, 300),
      // An unparseable date stays null rather than becoming "now": a wrong
      // transaction date is worse than a missing one, because it silently
      // lands the spend in the wrong month.
      //
      // Known limit: several clients write the time with no timezone, so it
      // parses as server-local (UTC) and can land a late-evening spend on the
      // next day for someone east of UTC. Everything forwarded goes to review
      // and the date is shown there, so this is visible and correctable rather
      // than silent — which is why it isn't worth guessing a timezone over.
      date: found.date ? parseHeaderDate(found.date) : null,
      body: lines.slice(lastHeaderIdx + 1).join("\n").trim(),
      unwrapped: true,
    };
  }

  return fallback;
}
