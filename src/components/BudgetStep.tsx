import { useState, useRef, useEffect, type KeyboardEvent } from "react";

interface BudgetStepProps {
  onNext: (budget: number) => void;
}

/** Quick-select budget presets */
const QUICK_BUDGETS = [500, 1000, 2000, 3000, 5000];

export function BudgetStep({ onNext }: BudgetStepProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const rawValue = value.replace(/[^0-9]/g, "");
  const budget = rawValue ? parseInt(rawValue, 10) : 0;
  const displayValue = rawValue
    ? `$${parseInt(rawValue, 10).toLocaleString("en-US")}`
    : "";

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && budget > 0) {
      e.preventDefault();
      onNext(budget);
    }
  };

  const handleContinue = () => {
    if (budget > 0) {
      onNext(budget);
    }
  };

  const handleQuickSelect = (n: number) => {
    setValue(n.toString());
    // Brief delay so the user sees the value populate before navigating
    setTimeout(() => onNext(n), 150);
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mb-6 text-5xl" aria-hidden="true">
          💰
        </div>

        {/* Heading */}
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          What&rsquo;s your total trip budget?
        </h1>

        {/* Subtext */}
        <p className="mb-8 text-base leading-relaxed text-gray-500">
          We&rsquo;ll never suggest anything over this amount.
          <br />
          <span className="font-medium text-teal-600">
            No upsells, ever.
          </span>
        </p>

        {/* Input */}
        <div className="mb-6">
          <label htmlFor="budget-input" className="sr-only">
            Trip budget in dollars
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              id="budget-input"
              type="text"
              inputMode="numeric"
              value={displayValue}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="$2,000"
              className="w-full rounded-2xl border-2 border-gray-200 bg-white px-5 py-5 text-center text-3xl font-bold text-gray-900 placeholder:text-gray-300 focus:border-teal-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/20 transition-colors sm:text-4xl"
              aria-describedby="budget-hint budget-help"
            />
          </div>
          <p id="budget-hint" className="mt-2 text-sm text-gray-400">
            Include flights, hotel, and activities — we&rsquo;ll make it work
          </p>
          <p id="budget-help" className="mt-3 text-xs leading-relaxed text-gray-400">
            This is a hard limit. We build your trip <strong className="font-medium text-gray-500">within</strong> this number, not around it.
          </p>
        </div>

        {/* Continue button */}
        <button
          type="button"
          onClick={handleContinue}
          disabled={budget <= 0}
          className="w-full rounded-xl bg-teal-600 px-6 py-4 text-lg font-semibold text-white shadow-sm transition-all hover:bg-teal-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/40 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={budget > 0 ? `Continue with $${budget.toLocaleString("en-US")} budget` : "Continue"}
        >
          Continue
        </button>

        {/* Budget examples — quick-select chips */}
        <fieldset className="mt-8">
          <legend className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400">
            Quick picks
          </legend>
          <div className="flex flex-wrap justify-center gap-2">
            {QUICK_BUDGETS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => handleQuickSelect(n)}
                className="min-h-[44px] rounded-full border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-all hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 active:scale-95"
                aria-label={`Set budget to $${n.toLocaleString("en-US")}`}
              >
                ${n.toLocaleString("en-US")}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
    </div>
  );
}
