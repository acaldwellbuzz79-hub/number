import type { FC } from "react";

const STRIPE_PAYMENT_LINK =
  "https://buy.stripe.com/6oUfZjeGO05E1067NxafS00";

const FEATURES = [
  {
    emoji: "🗺️",
    title: "Multi-destination planning",
    description:
      "Build trips across multiple cities — perfect for road trips, tours, and multi-stop vacations.",
  },
  {
    emoji: "👥",
    title: "Split-budget group trips",
    description:
      "Plan trips with friends or family where everyone has their own budget. We'll find options that work for the whole group.",
  },
  {
    emoji: "🔔",
    title: "Real-time price-drop rebooking alerts",
    description:
      "We monitor your booked trip and alert you if prices drop so you can rebook and save — automatically.",
  },
];

/** One-time price display */
export const PREMIUM_PRICE = "$29";
export const PREMIUM_PRICE_LABEL = "one-time";

interface PremiumFeaturesProps {
  /** Render as a compact banner (for inline upsells) vs full page layout */
  variant?: "banner" | "page";
}

/**
 * Reusable premium features list with Stripe payment button.
 * Used on both the /premium page and the ResultsStep upsell banner.
 */
export const PremiumFeatures: FC<PremiumFeaturesProps> = ({
  variant = "page",
}) => {
  const isBanner = variant === "banner";

  return (
    <div
      className={
        isBanner
          ? "rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50 p-5 sm:p-6"
          : "rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50 p-6 sm:p-8"
      }
    >
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3
            className={`font-bold text-teal-800 ${isBanner ? "text-lg" : "text-xl sm:text-2xl"}`}
          >
            <span aria-hidden="true" className="mr-1.5">
              ⭐
            </span>
            VacayScout Premium
          </h3>
          <p className="mt-0.5 text-sm text-teal-600/80">
            {PREMIUM_PRICE} {PREMIUM_PRICE_LABEL} — unlock more flexibility
          </p>
        </div>
        {!isBanner && (
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-3 py-1 text-sm font-semibold text-teal-700">
            {PREMIUM_PRICE} one-time
          </span>
        )}
      </div>

      {/* Features list */}
      <ul className={`space-y-3 ${isBanner ? "mb-5" : "mb-6"}`} role="list">
        {FEATURES.map((feature) => (
          <li key={feature.title} className="flex items-start gap-3">
            <span
              className="mt-0.5 shrink-0 text-xl"
              aria-hidden="true"
            >
              {feature.emoji}
            </span>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-gray-900">
                {feature.title}
              </h4>
              <p className="text-sm text-gray-600">{feature.description}</p>
            </div>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <a
        href={STRIPE_PAYMENT_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 font-semibold text-white transition-colors hover:bg-teal-700 focus:outline-none focus-visible:ring-3 focus-visible:ring-teal-500/40 ${
          isBanner ? "px-5 py-2.5 text-sm" : "px-6 py-3 text-base"
        }`}
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
        Upgrade to Premium — {PREMIUM_PRICE} one-time
      </a>

      {isBanner && (
        <p className="mt-2 text-center text-xs text-gray-400">
          Learn more on our{" "}
          <a
            href="/premium"
            className="font-medium text-teal-600 underline underline-offset-2 hover:text-teal-800"
          >
            Premium page
          </a>
        </p>
      )}
    </div>
  );
};
