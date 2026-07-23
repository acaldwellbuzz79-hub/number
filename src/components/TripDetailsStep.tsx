import { useState, useRef, useEffect } from "react";
import { KNOWN_DESTINATIONS, getDestinationData } from "~/data/mockData";
import { KNOWN_CITIES } from "~/data/cities";
import { PremiumFeatures } from "~/components/PremiumFeatures";
import type { LegInput } from "~/types";

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
    /** Extra legs for multi-destination trips (Premium) */
    extraLegs?: LegInput[];
  }) => void;
}

/** All known cities sorted alphabetically for dropdown display */
const SORTED_CITIES = [...KNOWN_CITIES].sort((a, b) =>
  a.localeCompare(b, "en", { sensitivity: "base" }),
);

/**
 * Check whether Premium mode is active via URL query param (dev toggle).
 * In production, this would be tied to a user account / premium key.
 */
function isPremiumMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("premium");
}

/** Maximum extra legs allowed in Premium */
const MAX_EXTRA_LEGS = 3;

export function TripDetailsStep({ budget, onBack, onFind }: TripDetailsStepProps) {
  const [departure, setDeparture] = useState("");
  const [arrival, setArrival] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [travelers, setTravelers] = useState(1);
  const [offPeak, setOffPeak] = useState(false);
  const [flexibleDates, setFlexibleDates] = useState(false);
  const [driving, setDriving] = useState(false);

  // Multi-destination: extra legs beyond the first
  const [extraLegs, setExtraLegs] = useState<LegInput[]>([]);

  // Premium gate: show upsell modal when user clicks "+ Add destination"
  const [showPremiumGate, setShowPremiumGate] = useState(false);

  // Is premium active (dev toggle or after "upgrade")
  const premiumActive = isPremiumMode();

  // Refs for the first two select elements
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

    for (let offset = 0; offset < 18; offset++) {
      const checkMonth = (monthIndex + offset) % 12;
      const checkYear = currentYear + Math.floor((monthIndex + offset) / 12);
      const monthAbbr = new Date(checkYear, checkMonth, 1).toLocaleString("en-US", {
        month: "short",
      });
      if (seasonality.offPeak.includes(monthAbbr)) {
        const mm = String(checkMonth + 1).padStart(2, "0");
        return `${checkYear}-${mm}-01`;
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
        const depDate = new Date(nextDeparture);
        depDate.setDate(depDate.getDate() + 5);
        setReturnDate(depDate.toISOString().split("T")[0]);
      }
    }
  }

  /** Handle toggling flexible dates on/off */
  function handleFlexibleDatesToggle(on: boolean) {
    if (on) {
      prevDatesRef.current = { departureDate, returnDate };
      setFlexibleDates(true);
      setDepartureDate("");
      setReturnDate("");
      if (!offPeak) setOffPeak(true);
    } else {
      setFlexibleDates(false);
      setDepartureDate(prevDatesRef.current.departureDate);
      setReturnDate(prevDatesRef.current.returnDate);
    }
  }

  // Focus departure select on mount
  useEffect(() => {
    depSelectRef.current?.focus();
  }, []);

  const today = new Date().toISOString().split("T")[0];

  /** Get the city name that serves as the departure for a given leg index */
  function getLegDeparture(legIndex: number): string {
    if (legIndex === 0) return departure;
    // Departure for leg N = arrival of leg N-1
    return extraLegs[legIndex - 1]?.arrival ?? "";
  }

  /** Add an extra destination leg */
  function handleAddLeg() {
    if (premiumActive) {
      // Premium mode: directly add
      if (extraLegs.length < MAX_EXTRA_LEGS) {
        setExtraLegs([...extraLegs, { arrival: "", departureDate: "", returnDate: "" }]);
      }
    } else {
      // Free mode: show premium gate
      setShowPremiumGate(true);
    }
  }

  /** Remove an extra destination leg */
  function handleRemoveLeg(index: number) {
    setExtraLegs(extraLegs.filter((_, i) => i !== index));
  }

  /** Update a field on an extra leg */
  function updateExtraLeg(index: number, field: keyof LegInput, value: string) {
    setExtraLegs((prev) =>
      prev.map((leg, i) => (i === index ? { ...leg, [field]: value } : leg)),
    );
  }

  /** Get the minimum return date for an extra leg (at least its departure date) */
  function getExtraLegMinReturn(legIndex: number): string {
    return extraLegs[legIndex]?.departureDate || today;
  }

  // Check if all extra legs have valid dates
  const extraLegsValid = extraLegs.every(
    (leg) =>
      leg.arrival.trim().length > 0 &&
      ((flexibleDates) ||
        (leg.departureDate.length > 0 &&
          leg.returnDate.length > 0 &&
          leg.returnDate >= leg.departureDate)),
  );

  const isMainValid =
    departure.trim().length > 0 &&
    arrival.trim().length > 0 &&
    (flexibleDates ||
      (departureDate.length > 0 &&
       returnDate.length > 0 &&
       returnDate >= departureDate)) &&
    travelers >= 1 &&
    travelers <= 10;

  const isValid = isMainValid && extraLegsValid;

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
      extraLegs: extraLegs.length > 0 ? extraLegs : undefined,
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
          {/* ---- Leg 1: Departure & Arrival City Fields ---- */}
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

          {/* ---- Extra Legs (Multi-Destination, Premium) ---- */}
          {extraLegs.map((leg, idx) => {
            const legDeparture = getLegDeparture(idx);
            return (
              <div
                key={idx}
                className="animate-step-enter rounded-xl border-2 border-teal-200 bg-teal-50/30 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-teal-800">
                    Stop {idx + 2}: {legDeparture || "(previous destination)"} → ...
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveLeg(idx)}
                    className="rounded-lg p-1 text-gray-400 transition-colors hover:text-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                    aria-label={`Remove stop ${idx + 2}`}
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
                </div>

                {/* Departure (read-only, auto-set) */}
                <div className="mb-3">
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    From
                  </label>
                  <div className="rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-base text-gray-500 min-h-[48px] flex items-center">
                    {legDeparture || "—"}
                  </div>
                </div>

                {/* Arrival */}
                <div className="mb-3">
                  <label
                    htmlFor={`extra-arrival-${idx}`}
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Destination
                  </label>
                  <div className="relative">
                    <select
                      id={`extra-arrival-${idx}`}
                      value={leg.arrival}
                      onChange={(e) => updateExtraLeg(idx, "arrival", e.target.value)}
                      className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-3 pr-10 text-base text-gray-900 focus:border-teal-500 focus:outline-none focus-visible:ring-3 focus-visible:ring-teal-500/20 min-h-[48px]"
                      aria-label={`Destination for stop ${idx + 2}`}
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
                  </div>
                </div>

                {/* Date range for extra leg */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor={`extra-dep-${idx}`}
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      Arrive
                    </label>
                    <input
                      id={`extra-dep-${idx}`}
                      type="date"
                      value={leg.departureDate}
                      onChange={(e) => updateExtraLeg(idx, "departureDate", e.target.value)}
                      min={today}
                      disabled={flexibleDates}
                      className={`w-full rounded-xl border px-3 py-3 text-sm focus:border-teal-500 focus:outline-none focus-visible:ring-3 focus-visible:ring-teal-500/20 min-h-[48px] ${
                        flexibleDates
                          ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                          : "border-gray-300 bg-white text-gray-900"
                      }`}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`extra-ret-${idx}`}
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      Depart
                    </label>
                    <input
                      id={`extra-ret-${idx}`}
                      type="date"
                      value={leg.returnDate}
                      onChange={(e) => updateExtraLeg(idx, "returnDate", e.target.value)}
                      min={getExtraLegMinReturn(idx)}
                      disabled={flexibleDates}
                      className={`w-full rounded-xl border px-3 py-3 text-sm focus:border-teal-500 focus:outline-none focus-visible:ring-3 focus-visible:ring-teal-500/20 min-h-[48px] ${
                        flexibleDates
                          ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                          : "border-gray-300 bg-white text-gray-900"
                      }`}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* "+ Add destination" button */}
          {extraLegs.length < MAX_EXTRA_LEGS && (
            <div className="text-center">
              <button
                type="button"
                onClick={handleAddLeg}
                className={`inline-flex items-center gap-1.5 rounded-xl border-2 border-dashed px-5 py-3 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-3 focus-visible:ring-teal-500/30 min-h-[48px] ${
                  premiumActive
                    ? "border-teal-400 bg-teal-50/30 text-teal-700 hover:border-teal-500 hover:bg-teal-50"
                    : "border-teal-300 bg-white text-teal-600 hover:border-teal-400 hover:bg-teal-50"
                }`}
                aria-label={
                  premiumActive
                    ? "Add another destination"
                    : "Add another destination — Premium feature"
                }
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
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                + Add destination
                {!premiumActive && (
                  <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                    PREMIUM
                  </span>
                )}
              </button>
              {!premiumActive && (
                <p className="mt-1 text-xs text-gray-400">
                  Multi-stop trips are a Premium feature
                </p>
              )}
            </div>
          )}

          {/* Off-peak suggestion card — shown when arrival has seasonality data */}
          {seasonality && (
            <div
              className="rounded-xl border border-teal-200 bg-teal-50/60 px-4 py-4 animate-step-enter"
              role="region"
              aria-label="Off-peak travel suggestion"
            >
              <div className="flex items-start gap-3">
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

          {/* Flexible dates checkbox */}
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

      {/* ---- Premium Gate Modal ---- */}
      {showPremiumGate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-step-enter"
          role="dialog"
          aria-modal="true"
          aria-labelledby="premium-gate-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            {/* Close button */}
            <div className="mb-4 flex items-center justify-between">
              <h3
                id="premium-gate-title"
                className="text-lg font-bold text-gray-900"
              >
                Multi-Destination Planning
              </h3>
              <button
                type="button"
                onClick={() => setShowPremiumGate(false)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                aria-label="Close"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
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
            </div>

            <p className="mb-5 text-sm leading-relaxed text-gray-600">
              Plan trips that visit multiple cities in one go — perfect for road
              trips, tours, and multi-stop vacations. Add up to 3 extra stops to
              any trip.
            </p>

            {/* Inline premium upsell */}
            <PremiumFeatures variant="banner" />

            {/* Dev toggle hint */}
            <p className="mt-3 text-center text-xs text-gray-400">
              Already have Premium?{" "}
              <a
                href="?premium=true"
                className="font-medium text-teal-600 underline underline-offset-2 hover:text-teal-800"
              >
                Activate with premium key
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
