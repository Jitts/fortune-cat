/**
 * The keypad's little calculator. Split out of QuickAddSheet so the quick-add
 * sheet and the edit form's amount field share one implementation rather than
 * drifting apart — money entry should behave identically wherever it happens.
 *
 * Only + and −, so there is no operator precedence to honour: evaluate left to
 * right and round once at the end. Rounding at the end is the whole point —
 * 0.1 + 0.2 must read as 0.30, not 0.30000000000000004.
 */

/** Evaluate a left-to-right +/− chain. Incomplete trailing operators are ignored. */
export function evaluateExpression(expr: string): number {
  if (!expr) return 0;
  const parts = expr.match(/[+-]?[^+-]+/g) ?? [];
  let total = 0;
  for (const part of parts) {
    const n = Number(part);
    if (!Number.isNaN(n)) total += n;
  }
  return Math.round(total * 100) / 100;
}

/** Apply one keypress to the expression, keeping it always-valid. */
export function pushKey(prev: string, ch: string): string {
  if (/[0-9]/.test(ch)) return prev + ch;
  if (ch === ".") {
    const current = prev.split(/[+-]/).pop() ?? "";
    if (current.includes(".")) return prev; // one dot per operand
    return prev === "" || /[+-]$/.test(prev) ? prev + "0." : prev + ".";
  }
  // operator: never lead with one, and a new one replaces a trailing one
  if (prev === "") return prev;
  return /[+\-.]$/.test(prev) ? prev.slice(0, -1) + ch : prev + ch;
}

/** Mid-entry — ends on an operator or a bare dot. */
export function isIncomplete(expr: string): boolean {
  return /[+\-.]$/.test(expr);
}

/** Show the working only when there is working to show. */
export function displayExpression(expr: string): string {
  if (!expr) return "";
  if (!isIncomplete(expr) && !/[+-]/.test(expr)) return "";
  return expr.replace(/([+-])/g, " $1 ");
}
