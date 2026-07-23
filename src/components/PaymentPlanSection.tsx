import { useId } from "react";

interface PaymentPlanSectionProps {
  tripTotal: number;
}

interface InstallmentOption {
  label: string;
  payments: number;
  interval: string;
  apr: number;
  paymentAmount: number;
  totalWithInterest: number;
  provider: string;
}

function formatPrice(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Compute monthly payment from principal, term in months, and APR. */
function monthlyPayment(principal: number, months: number, apr: number): number {
  if (apr === 0) return principal / months;
  const monthlyRate = apr / 12;
  const n = months;
  // Standard amortization formula: P * r * (1+r)^n / ((1+r)^n - 1)
  return (
    principal *
    (monthlyRate * Math.pow(1 + monthlyRate, n)) /
    (Math.pow(1 + monthlyRate, n) - 1)
  );
}

export function PaymentPlanSection({ tripTotal }: PaymentPlanSectionProps) {
  const detailsId = useId();

  // Build installment options
  const options: InstallmentOption[] = [
    {
      label: "4 payments",
      payments: 4,
      interval: "every 2 weeks",
      apr: 0,
      paymentAmount: tripTotal / 4,
      totalWithInterest: tripTotal,
      provider: "Afterpay",
    },
    {
      label: "6 months",
      payments: 6,
      interval: "monthly",
      apr: 0.1,
      paymentAmount: monthlyPayment(tripTotal, 6, 0.1),
      totalWithInterest: monthlyPayment(tripTotal, 6, 0.1) * 6,
      provider: "Affirm",
    },
    {
      label: "12 months",
      payments: 12,
      interval: "monthly",
      apr: 0.2,
      paymentAmount: monthlyPayment(tripTotal, 12, 0.2),
      totalWithInterest: monthlyPayment(tripTotal, 12, 0.2) * 12,
      provider: "Klarna",
    },
  ];

  return (
    <section
      className="mb-8 rounded-xl border border-gray-200 bg-gray-50/60"
      aria-labelledby={`${detailsId}-heading`}
    >
      {/* Use <details> for native, accessible collapse — starts collapsed */}
      <details className="group">
        {/* Summary acts as the toggle header */}
        <summary
          id={`${detailsId}-heading`}
          className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-gray-600 outline-none hover:text-gray-800 focus-visible:rounded-xl focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 sm:px-5"
        >
          {/* Chevron that rotates on open */}
          <svg
            className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-90"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span>Spread the cost over time</span>
          <span className="text-xs font-normal text-gray-400">
            — pay in installments
          </span>
        </summary>

        {/* Collapsible body */}
        <div className="border-t border-gray-200 px-4 pb-5 pt-3 sm:px-5">
          {/* Gentle subtext */}
          <p className="mb-4 text-sm leading-relaxed text-gray-500">
            Make your trip more manageable with monthly payments. Rates as low
            as 0% APR for qualified buyers.
          </p>

          {/* Installment options */}
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            {options.map((opt) => (
              <div
                key={opt.label}
                className="rounded-lg border border-gray-200 bg-white p-3 text-center"
              >
                {/* Payment amount — the main number */}
                <div className="text-lg font-bold text-gray-900">
                  {formatPrice(opt.paymentAmount)}
                </div>
                <div className="text-xs text-gray-500">
                  / {opt.label === "4 payments" ? "payment" : "month"}
                </div>

                {/* Term and interval */}
                <div className="mt-1 text-xs text-gray-400">
                  {opt.label} · {opt.interval}
                </div>

                {/* APR badge */}
                <div className="mt-2">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      opt.apr === 0
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {opt.apr === 0 ? "0% APR" : `${Math.round(opt.apr * 100)}% APR`}
                  </span>
                </div>

                {/* Total with interest (fine print for interest-bearing options) */}
                {opt.apr > 0 && (
                  <div className="mt-1.5 text-xs text-gray-400">
                    Total: {formatPrice(opt.totalWithInterest)}
                  </div>
                )}

                {/* Provider name */}
                <div className="mt-1.5 text-xs text-gray-400">
                  via {opt.provider}
                </div>
              </div>
            ))}
          </div>

          {/* Disclaimer */}
          <p className="mb-4 text-xs leading-relaxed text-gray-400">
            Rates depend on credit approval. See provider terms for details.
            Payment options are estimates and may vary based on your credit
            profile. VacayScout may earn a commission if you apply.
          </p>

          {/* Check your rate button — soft secondary style */}
          <a
            href="https://www.affirm.com/how-it-works"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 min-h-[44px]"
          >
            Check your rate
            <svg
              className="h-3.5 w-3.5 text-gray-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M7 17l9.2-9.2M17 17V7H7" />
            </svg>
          </a>
        </div>
      </details>
    </section>
  );
}
