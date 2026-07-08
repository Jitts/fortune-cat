import { formatCurrency } from "@/lib/format";
import ProBadge from "./ProBadge";

export default function BalanceHeader({
  balance,
  isPro,
}: {
  balance: number;
  isPro: boolean;
}) {
  const isNegative = balance < 0;

  return (
    <div className="flex items-center justify-between rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-200">
      <div>
        <p className="text-sm font-medium text-neutral-500">Balance</p>
        <p
          className={`mt-1 text-4xl font-bold tracking-tight ${
            isNegative ? "text-red-600" : "text-neutral-900"
          }`}
        >
          {formatCurrency(balance)}
        </p>
      </div>
      {isPro && <ProBadge />}
    </div>
  );
}
