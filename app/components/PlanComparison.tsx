import { PLAN_COMPARISON, type PlanValue } from "@/lib/proFeatures";

/**
 * Free vs Pro at a glance — a real <table>, because this genuinely is tabular
 * data: screen readers get proper row/column semantics and every cell is
 * announced with its column.
 *
 * Sized for a phone first. The two value columns are pinned narrow so the
 * feature column takes whatever is left and wraps, which keeps the whole table
 * inside a 360px viewport with no horizontal scroll — the point of the table is
 * that you can read the difference in one glance, and a sideways scroll would
 * destroy exactly that.
 */

function Check({ tone }: { tone: "gold" | "ink" }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`mx-auto h-[18px] w-[18px] ${tone === "gold" ? "text-gold-text" : "text-ink-muted"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 10.5l4 4 8-9" />
    </svg>
  );
}

function Cell({ value, plan }: { value: PlanValue; plan: "free" | "pro" }) {
  if (value === true) {
    return (
      <>
        <Check tone={plan === "pro" ? "gold" : "ink"} />
        <span className="sr-only">Included</span>
      </>
    );
  }
  if (value === false) {
    return (
      <>
        <span aria-hidden className="text-ink-subtle">
          —
        </span>
        <span className="sr-only">Not included</span>
      </>
    );
  }
  return (
    <span className={plan === "pro" ? "font-semibold text-gold-text" : "text-ink-muted"}>
      {value}
    </span>
  );
}

export default function PlanComparison() {
  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-line">
      <table className="w-full table-fixed border-collapse text-left">
        <caption className="sr-only">
          Feature comparison between the free tier and Fortune Cat Pro
        </caption>

        <colgroup>
          <col />
          <col className="w-[3.75rem] sm:w-28" />
          <col className="w-[3.75rem] sm:w-28" />
        </colgroup>

        <thead>
          <tr className="bg-surface-2">
            <th scope="col" className="px-3 py-3 text-[13px] font-semibold text-ink sm:px-5">
              What you get
            </th>
            <th
              scope="col"
              className="px-1.5 py-3 text-center text-[13px] font-semibold text-ink-muted sm:px-3"
            >
              Free
            </th>
            <th
              scope="col"
              className="bg-gold-soft px-1.5 py-3 text-center text-[13px] font-bold text-gold-text sm:px-3"
            >
              Pro
            </th>
          </tr>
        </thead>

        {PLAN_COMPARISON.map((group) => (
          <tbody key={group.title}>
            <tr>
              <th
                scope="colgroup"
                colSpan={3}
                className="border-t border-line bg-surface-3/50 px-3 py-2 text-[12px] font-semibold text-ink-subtle sm:px-5"
              >
                {group.title}
              </th>
            </tr>

            {group.rows.map((row) => (
              <tr key={row.label} className="border-t border-line">
                <th
                  scope="row"
                  className="px-3 py-3 text-[13px] font-medium text-ink sm:px-5 sm:text-sm"
                >
                  {row.label}
                  {row.note && (
                    <span className="mt-0.5 block text-[11px] font-normal leading-snug text-ink-subtle sm:text-xs">
                      {row.note}
                    </span>
                  )}
                </th>
                <td className="px-1.5 py-3 text-center text-[12px] sm:px-3 sm:text-sm">
                  <Cell value={row.free} plan="free" />
                </td>
                <td className="bg-gold-soft/50 px-1.5 py-3 text-center text-[12px] sm:px-3 sm:text-sm">
                  <Cell value={row.pro} plan="pro" />
                </td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}
