import { createFileRoute, Link } from "@tanstack/react-router";
import { PremiumFeatures, PREMIUM_PRICE, PREMIUM_PRICE_LABEL } from "~/components/PremiumFeatures";

export const Route = createFileRoute("/premium")({
  component: PremiumPage,
});

function PremiumPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg px-1 py-1 text-lg font-bold text-teal-700 transition-colors hover:text-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
            aria-label="VacayScout — Home"
          >
            <span aria-hidden="true">🌴</span>
            VacayScout
          </Link>
          <Link
            to="/"
            className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          >
            ← Back to planner
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col px-4 py-8 sm:py-12">
        <div className="mx-auto w-full max-w-2xl">
          {/* Hero */}
          <div className="mb-8 text-center">
            <span className="mb-3 inline-block text-4xl" aria-hidden="true">
              ⭐
            </span>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              VacayScout Premium
            </h1>
            <p className="mt-3 text-lg leading-relaxed text-gray-600">
              Get more flexibility for your travel planning. One payment, no
              subscriptions, no surprises — just like our trip planner.
            </p>
            <p className="mt-2 text-sm text-gray-400">
              {PREMIUM_PRICE} {PREMIUM_PRICE_LABEL} payment
            </p>
          </div>

          {/* Features card */}
          <PremiumFeatures variant="page" />

          {/* FAQ / reassurance */}
          <div className="mt-8 space-y-4 rounded-2xl border border-gray-100 bg-white p-5 sm:p-6">
            <h3 className="text-base font-semibold text-gray-900">
              Frequently asked questions
            </h3>

            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                Is this a subscription?
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                No. VacayScout Premium is a one-time payment of {PREMIUM_PRICE}.
                You pay once and get access to all premium features forever. We
                don&rsquo;t do recurring charges.
              </p>
            </details>

            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                What happens after I pay?
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                After your payment is processed through Stripe, you&rsquo;ll
                receive an email with instructions to activate premium features
                on your VacayScout account. Premium features are being rolled
                out and will be available soon.
              </p>
            </details>

            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                Can I get a refund?
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                We offer a 14-day refund if premium features haven&rsquo;t been
                used. Contact us through the email you receive after purchase.
              </p>
            </details>
          </div>

          {/* Back link */}
          <div className="mt-8 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-6 py-3 text-base font-medium text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-3 focus-visible:ring-teal-500/20"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Back to the planner
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white py-4 text-center text-xs text-gray-400">
        VacayScout — Honest trip planning for real budgets
      </footer>
    </div>
  );
}
