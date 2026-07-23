import { useState, useRef, useEffect } from "react";
import { KNOWN_DESTINATIONS, getDestinationData } from "~/data/mockData";
import { KNOWN_CITIES } from "~/data/cities";

interface TripDetailsStepProps {
  budget: number;
  onBack: () => void;
  onFind: (params: {
    departure: string;
    arrival: string;
    departureDate: string;
    returnDate: string;
    travelers: number;
    offPeak: boolean;
    flexibleDates: boolean;
    driving: boolean;
  }) => void;
}

/** All known cities sorted alphabetically for dropdown display */
const SORTED_CITIES = [...KNOWN_CITIES].sort((a, b) =>
  a.localeCompare(b, "en", { sensitivity: "base" }),
);

export function TripDetailsStep({ budget, onBack, onFind }: TripDetailsStepProps) {
  const [departure, setDeparture] = useState("");
  const [arrival, setArrival] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [travelers, setTravelers] = useState(1);
  const [offPeak, setOffPeak] = useState(false);
  const [flexibleDates, setFlexibleDates] = useState(false);
  const [driving, setDriving] = useState(false);

  // Refs for the two select elements
  const depSelectRef = useRef<HTMLSelectElement>(null);
  const arrSelectRef = useRef<HTMLSelectElement>(null);

  // Store previous date values so we can restore them when unchecking flexible dates
  const prevDatesRef = useRef<{ departureDate: string; returnDate: string }>({
    departureDate: "",
    returnDate: "",
  });

  // Derive seasonality from the selected arrival city
  const arrivalLower = arrival.toLowerCase().trim();
  const destData = KNOWN_DESTINATIONS.includes(arrivalLower)
    ? getDestinationData(arrivalLower)
    : null;
  const seasonality = destData?.seasonality ?? null;

  // Compute estimated savings for the off-peak card
  const estimatedSavings = seasonality
    ? Math.round(budget * (seasonality.savingsPercent / 100))
    : 0;

  /**
   * Find the next off-peak month starting from a given month index (0 = January).
   * Returns a two-digit month string ("01"–"12") for date input default values.
   */
  function getNextOffPeakDate(monthIndex: number): string {
    if (!seasonality) return "";
    const now = new Date();
    const currentYear = now.getFullYear();

    // Look ahead up to 18 months to find an off-peak month
    for (let offset = 0; offset < 18; offset++) {
      const checkMonth = (monthIndex + offset) % 12;
      const checkYear = currentYear + Math.floor((monthIndex + offset) / 12);
      const monthAbbr = new Date(checkYear, checkMonth, 1).toLocaleString("en-US", {
        month: "short",
      });
      if (seasonality.offPeak.includes(monthAbbr)) {
        const mm = String(checkMonth + 1).padStart(2, "0");
        const dd = "01";
        return `${checkYear}-${mm}-${dd}`;
      }
    }
    return "";
  }

  /** Handle toggling off-peak on: auto-suggest off-peak dates */
  function handleOffPeakToggle(on: boolean) {
    setOffPeak(on);
    if (on && seasonality) {
      const now = new Date();
      const nextDeparture = getNextOffPeakDate(now.getMonth());
      if (nextDeparture) {
        setDepartureDate(nextDeparture);
        // Default return: 5 nights later
        const depDate = new Date(nextDeparture);
        depDate.setDate(depDate.getDate() + 5);
        const retStr = depDate.toISOString().split("T")[0];
        setReturnDate(retStr);
      }
    }
  }

  /** Handle toggling flexible dates on/off */
  function handleFlexibleDatesToggle(on: boolean) {
    if (on) {
      // Save current date values so we can restore them later
      prevDatesRef.current = { departureDate, returnDate };
      setFlexibleDates(true);
      // Clear date fields — we'll auto-pick later
      setDepartureDate("");
      setReturnDate("");
      // When flexible is on, off-peak is implied and forced
      if (!offPeak) {
        setOffPeak(true);
      }
    } else {
      setFlexibleDates(false);
      // Restore previous date values
      setDepartureDate(prevDatesRef.current.departureDate);
      setReturnDate(prevDatesRef.current.returnDate);
    }
  }

  // Focus departure select on mount
  useEffect(() => {
    depSelectRef.current?.focus();
  }, []);

  const today = new Date().toISOString().split("T")[0];

  const isValid =
    departure.trim().length > 0 &&
    arrival.trim().length > 0 &&
    (flexibleDates ||
      (departureDate.length > 0 &&
       returnDate.length > 0 &&
       returnDate >= departureDate)) &&
    travelers >= 1 &&
    travelers <= 10;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onFind({
      departure: departure.trim(),
      arrival: arrival.trim(),
      departureDate,
      returnDate,
      travelers,
      offPeak,
      flexibleDates,
      driving,
    });
  };

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-6 sm:py-8">
      <div className="w-full max-w-md">
        {/* Budget badge */}
        <div className="mb-6 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-4 py-1.5 text-sm font-medium text-teal-700 min-h-[36px]">
            <span aria-hidden="true">{driving ? "🚗" : "💰"}</span>
            {driving
              ? "Budget for hotel, activities & fun:"
              : "Budget:"}{" "}
            ${budget.toLocaleString("en-US")}
          </span>
        </div>

        <h2 className="mb-8 text-center text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
          Where and when?
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* ---- Departure & Arrival City Fields ---- */}
          <div className="space-y-1">
            {/* Departure */}
            <div>
              <label
                htmlFor="departure-city"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                {driving ? "Where are you driving from?" : "Where are you flying from?"}
              </label>
              <div className="relative">
                <select
                  ref={depSelectRef}
                  id="departure-city"
                  value={departure}
                  onChange={(e) => {
                    setDeparture(e.target.value);
                    // Auto-focus arrival after selecting departure
                    if (e.target.value) {
                      setTimeout(() => arrSelectRef.current?.focus(), 0);
                    }
                  }}
                  className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-3 pr-10 text-base text-gray-900 focus:border-teal-500 focus:outline-none focus-visible:ring-3 focus-visible:ring-teal-500/20 min-h-[48px]"
                  aria-label="Departure city"
                >
                  <option value="" disabled>
                    Select a city…
                  </option>
                  {SORTED_CITIES.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
                {/* Custom dropdown chevron */}
                <div
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  aria-hidden="true"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
                {/* Clear button */}
                {departure.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeparture("");
                      depSelectRef.current?.focus();
                    }}
                    className="absolute right-8 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400 transition-colors hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                    aria-label="Clear departure city"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Driving checkbox */}
            <div className="mt-2 flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-3">
              <div className="relative shrink-0">
                <input
                  id="driving-checkbox"
                  type="checkbox"
                  checked={driving}
                  onChange={(e) => setDriving(e.target.checked)}
                  className="peer sr-only"
                />
                <label
                  htmlFor="driving-checkbox"
                  className={`block h-6 w-11 cursor-pointer rounded-full transition-colors duration-200 ${
                    driving ? "bg-teal-600" : "bg-gray-300"
                  }`}
                  aria-label="I'm driving — no flight needed"
                >
                  <span
                    className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      driving ? "translate-x-[22px]" : "translate-x-0"
                    }`}
                    style={{ marginTop: "2px" }}
                  />
                </label>
              </div>
              <label
                htmlFor="driving-checkbox"
                className="cursor-pointer text-sm font-medium text-gray-700 select-none"
              >
                🚗 I&rsquo;m driving — no flight needed
              </label>
            </div>

            {/* Arrow connector — subtle, desktop only */}
            <div className="hidden sm:flex justify-center py-0.5" aria-hidden="true">
              <svg
                className="h-5 w-5 text-gray-300"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="4" x2="12" y2="20" />
                <polyline points="18 14 12 20 6 14" />
              </svg>
            </div>

            {/* Arrival */}
            <div>
              <label
                htmlFor="arrival-city"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Where are you going?
              </label>
              <div className="relative">
                <select
                  ref={arrSelectRef}
                  id="arrival-city"
                  value={arrival}
                  onChange={(e) => setArrival(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-3 pr-10 text-base text-gray-900 focus:border-teal-500 focus:outline-none focus-visible:ring-3 focus-visible:ring-teal-500/20 min-h-[48px]"
                  aria-label="Arrival city"
                >
                  <option value="" disabled>
                    Select a city…
                  </option>
                  {SORTED_CITIES.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
                {/* Custom dropdown chevron */}
                <div
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  aria-hidden="true"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
                {/* Clear button */}
                {arrival.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setArrival("");
                      arrSelectRef.current?.focus();
                    }}
                    className="absolute right-8 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400 transition-colors hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                    aria-label="Clear arrival city"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Off-peak suggestion card — shown when arrival has seasonality data */}
          {seasonality && (
            <div
              className="rounded-xl border border-teal-200 bg-teal-50/60 px-4 py-4 animate-step-enter"
              role="region"
              aria-label="Off-peak travel suggestion"
            >
              <div className="flex items-start gap-3">
                {/* Toggle switch — disabled when flexibleDates is on */}
                <div className="relative mt-0.5 shrink-0">
                  <input
                    id="off-peak-toggle"
                    type="checkbox"
                    checked={offPeak || flexibleDates}
                    disabled={flexibleDates}
                    onChange={(e) => handleOffPeakToggle(e.target.checked)}
                    className="peer sr-only"
                  />
                  <label
                    htmlFor="off-peak-toggle"
                    className={`block h-6 w-11 rounded-full transition-colors duration-200 ${
                      flexibleDates
                        ? "cursor-not-allowed bg-teal-400"
                        : offPeak
                          ? "cursor-pointer bg-teal-600"
                          : "cursor-pointer bg-gray-300"
                    }`}
                    aria-label="Show me off-peak dates"
                  >
                    <span
                      className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        offPeak || flexibleDates ? "translate-x-[22px]" : "translate-x-0"
                      }`}
                      style={{ marginTop: "2px" }}
                    />
                  </label>
                </div>

                <div className="min-w-0 flex-1">
                  <label
                    htmlFor="off-peak-toggle"
                    className={`text-sm font-medium text-teal-800 ${
                      flexibleDates ? "cursor-default" : "cursor-pointer"
                    }`}
                  >
                    💡 Save up to {seasonality.savingsPercent}% by traveling off-peak
                    {flexibleDates && (
                      <span className="ml-1 text-xs font-normal text-teal-600">
                        (included with flexible dates)
                      </span>
                    )}
                  </label>
                  <p className="mt-1 text-xs text-teal-700/80">
                    {flexibleDates
                      ? `We'll automatically find the cheapest off-peak month for ~${estimatedSavings.toLocaleString("en-US")} in savings.`
                      : offPeak
                        ? `Estimated savings: ~${estimatedSavings.toLocaleString("en-US")} on your trip. We'll find the best off-peak deals for you.`
                        : "Travel during quieter months and stretch your budget further."}
                  </p>
                  {(offPeak || flexibleDates) && seasonality.offPeak.length > 0 && (
                    <p className="mt-1.5 text-xs text-teal-600/80">
                      <span aria-hidden="true">📅</span>{" "}
                      Off-peak months: {seasonality.offPeak.join(", ")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Date range — stack on small screens */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="departure"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Departure
              </label>
              <input
                id="departure"
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                min={today}
                disabled={flexibleDates}
                placeholder={flexibleDates ? "We'll find the cheapest dates" : undefined}
                className={`w-full rounded-xl border px-4 py-3 text-base focus:border-teal-500 focus:outline-none focus-visible:ring-3 focus-visible:ring-teal-500/20 min-h-[48px] ${
                  flexibleDates
                    ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                    : "border-gray-300 bg-white text-gray-900"
                }`}
              />
            </div>
            <div>
              <label
                htmlFor="return"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Return
              </label>
              <input
                id="return"
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                min={departureDate || today}
                disabled={flexibleDates}
                className={`w-full rounded-xl border px-4 py-3 text-base focus:border-teal-500 focus:outline-none focus-visible:ring-3 focus-visible:ring-teal-500/20 min-h-[48px] ${
                  flexibleDates
                    ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                    : "border-gray-300 bg-white text-gray-900"
                }`}
              />
            </div>
          </div>

          {/* Flexible dates checkbox — subtle, same weight as off-peak toggle */}
          <div
            data-testid="flexible-dates-section"
            className={`rounded-xl border px-4 py-3.5 animate-step-enter ${
              flexibleDates
                ? "border-teal-300 bg-teal-50/60"
                : "border-gray-200 bg-gray-50/50"
            }`}
            role="region"
            aria-label="Flexible dates option"
          >
            <div className="flex items-start gap-3">
              <div className="relative mt-0.5 shrink-0">
                <input
                  id="flexible-dates-checkbox"
                  type="checkbox"
                  checked={flexibleDates}
                  onChange={(e) => handleFlexibleDatesToggle(e.target.checked)}
                  className="peer sr-only"
                />
                <label
                  htmlFor="flexible-dates-checkbox"
                  className={`block h-6 w-11 cursor-pointer rounded-full transition-colors duration-200 ${
                    flexibleDates ? "bg-teal-600" : "bg-gray-300"
                  }`}
                  aria-label="My dates are flexible"
                >
                  <span
                    className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      flexibleDates ? "translate-x-[22px]" : "translate-x-0"
                    }`}
                    style={{ marginTop: "2px" }}
                  />
                </label>
              </div>

              <div className="min-w-0 flex-1">
                <label
                  htmlFor="flexible-dates-checkbox"
                  className="cursor-pointer text-sm font-medium text-gray-800"
                >
                  📅 My dates are flexible — find the cheapest time to go
                </label>
                {flexibleDates ? (
                  <p className="mt-1 text-xs text-teal-700/80">
                    We'll pick the cheapest off-peak dates so you get the best
                    price. Dates are auto-selected based on seasonal pricing.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">
                    Let us find the best travel window for your budget
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Travelers */}
          <div>
            <label
              id="travelers-label"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Travelers
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setTravelers(Math.max(1, travelers - 1))}
                disabled={travelers <= 1}
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-300 text-xl font-medium text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-3 focus-visible:ring-teal-500/20 disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Decrease travelers"
                aria-describedby="travelers-label"
              >
                −
              </button>
              <span
                id="travelers-count"
                className="flex h-12 min-w-[3.5rem] items-center justify-center text-xl font-bold text-gray-900 select-none"
                aria-live="polite"
                aria-label={`${travelers} traveler${travelers > 1 ? "s" : ""}`}
              >
                {travelers}
              </span>
              <button
                type="button"
                onClick={() => setTravelers(Math.min(10, travelers + 1))}
                disabled={travelers >= 10}
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-300 text-xl font-medium text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-3 focus-visible:ring-teal-500/20 disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Increase travelers"
                aria-describedby="travelers-label"
              >
                +
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {travelers === 1
                ? "Solo traveler"
                : `${travelers} travelers`}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onBack}
              className="rounded-xl border border-gray-300 px-5 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-3 focus-visible:ring-teal-500/20 min-h-[48px]"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={!isValid}
              className="flex-1 rounded-xl bg-teal-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-all hover:bg-teal-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/40 disabled:cursor-not-allowed disabled:opacity-40 min-h-[48px]"
            >
              Find My Trip
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
