import { useState, useMemo, useCallback } from "react";
import type { TripResult, Hotel, HotelTier, Event, MultiLegTripResult, TripLeg } from "~/types";
import { PaymentPlanSection } from "~/components/PaymentPlanSection";
import { PremiumFeatures } from "~/components/PremiumFeatures";
import { getDestinationData, KNOWN_DESTINATIONS } from "~/data/mockData";
import { logKpiEvent } from "~/data/kpiStore";

interface ResultsStepProps {
  result: TripResult;
  departure: string;
  arrival: string;
  budget: number;
  travelers: number;
  departureDate?: string;
  returnDate?: string;
  onStartOver: () => void;
  onBack: () => void;
  /** Multi-leg trip result — when present, renders multi-leg itinerary view */
  multiLegResult?: MultiLegTripResult;
}

function formatPrice(n: number): string {
  if (!isFinite(n)) return "—";
  return `$${n.toLocaleString("en-US")}`;
}

/** Tier display config */
const TIER_CONFIG: Record<HotelTier, { label: string; color: string }> = {
  budget: { label: "Budget", color: "bg-emerald-100 text-emerald-700" },
  mid: { label: "Mid-range", color: "bg-blue-100 text-blue-700" },
  premium: { label: "Nicer", color: "bg-purple-100 text-purple-700" },
};

export function ResultsStep({
  result,
  departure,
  arrival,
  budget,
  travelers,
  departureDate,
  returnDate,
  onStartOver,
  onBack,
  multiLegResult,
}: ResultsStepProps) {
  // ─────────────────────────────────────────────────────────
  // Multi-leg results view
  // ─────────────────────────────────────────────────────────
  if (multiLegResult) {
    return (
      <MultiLegResults
        multiLeg={multiLegResult}
        budget={budget}
        travelers={travelers}
        onStartOver={onStartOver}
        onBack={onBack}
      />
    );
  }

  // ─────────────────────────────────────────────────────────
  // Single-leg results view (unchanged below)
  // ─────────────────────────────────────────────────────────

  // ---------- NOT FEASIBLE STATE ----------
  if (!result.isFeasible) {
    const overBudget = result.totalCost - budget;
    const destData = getDestinationData(arrival);
    const savingsPercent = destData?.seasonality?.savingsPercent ?? 0;

    // Find up to 3 cheaper alternative destinations that fit the budget
    const cheaperDestinations = KNOWN_DESTINATIONS
      .filter((d) => d.toLowerCase() !== arrival.toLowerCase())
      .map((destKey) => {
        const data = getDestinationData(destKey);
        if (!data) return null;
        const cheapestFlight = result.driving
          ? null
          : [...data.flights].sort((a, b) => a.price - b.price)[0];
        const cheapestHotel = [...data.hotels].sort(
          (a, b) => a.pricePerNight - b.pricePerNight,
        )[0];
        if (!cheapestHotel) return null;
        if (!result.driving && !cheapestFlight) return null;
        const totalEstimate = result.driving
          ? cheapestHotel.pricePerNight * 4
          : cheapestFlight!.price * travelers + cheapestHotel.pricePerNight * 4;
        return {
          name: destKey,
          totalEstimate,
          fitsBudget: totalEstimate <= budget,
        };
      })
      .filter(
        (d): d is NonNullable<typeof d> =>
          d !== null && d.fitsBudget,
      )
      .sort((a, b) => a.totalEstimate - b.totalEstimate)
      .slice(0, 3);

    return (
      <div className="flex flex-1 flex-col px-4 py-8 sm:py-10">
        <div className="mx-auto w-full max-w-lg">
          {/* Header */}
          <div className="mb-2 text-center" aria-hidden="true">
            <span className="text-4xl">❌</span>
          </div>

          <h2 className="mb-2 text-center text-xl font-bold text-gray-900 sm:text-2xl">
            This trip is{" "}
            <span className="text-amber-600">{formatPrice(overBudget)}</span> over
            your {formatPrice(budget)} budget
          </h2>

          <p className="mb-8 text-center text-base leading-relaxed text-gray-600">
            We get it — budgets are real. Here&rsquo;s what might work:
          </p>

          {/* Recovery cards */}
          <div className="space-y-4">
            {!result.offPeak && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="shrink-0 text-2xl" aria-hidden="true">💡</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-gray-900">
                      Try off-peak dates
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Save up to {savingsPercent}% by traveling during quieter
                      months. You could bring this trip within reach.
                    </p>
                    <button
                      type="button"
                      onClick={onBack}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-100 focus:outline-none focus-visible:ring-3 focus-visible:ring-teal-500/30 min-h-[44px]"
                    >
                      Back to adjust dates
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!result.flexibleDates && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="shrink-0 text-2xl" aria-hidden="true">📅</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-gray-900">
                      Make your dates flexible
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Let us find the cheapest travel window for you. We&rsquo;ll
                      automatically pick the best dates that fit your budget.
                    </p>
                    <button
                      type="button"
                      onClick={onBack}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-100 focus:outline-none focus-visible:ring-3 focus-visible:ring-teal-500/30 min-h-[44px]"
                    >
                      Back to adjust dates
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {cheaperDestinations.length > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="shrink-0 text-2xl" aria-hidden="true">🌎</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-gray-900">
                      Explore similar cities
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      {cheaperDestinations.length === 1
                        ? "We found a destination that fits your budget:"
                        : `We found ${cheaperDestinations.length} destinations that fit your budget:`}
                    </p>
                    <ul className="mt-3 space-y-2">
                      {cheaperDestinations.map((dest) => (
                        <li key={dest.name} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
                          <div>
                            <span className="font-semibold capitalize text-gray-900">{dest.name}</span>
                            <span className="ml-2 text-sm text-gray-500">— from {formatPrice(dest.totalEstimate)} total</span>
                          </div>
                          <button
                            type="button"
                            onClick={onBack}
                            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-teal-600 transition-colors hover:bg-teal-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 min-h-[36px]"
                          >
                            Try {dest.name.charAt(0).toUpperCase() + dest.name.slice(1)} →
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {cheaperDestinations.length === 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="shrink-0 text-2xl" aria-hidden="true">🌎</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-gray-900">Explore other cities</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      None of our known destinations fit this budget with your current settings. Try going back and adjusting your dates or destination.
                    </p>
                    <button
                      type="button"
                      onClick={onBack}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-100 focus:outline-none focus-visible:ring-3 focus-visible:ring-teal-500/30 min-h-[44px]"
                    >
                      Back to adjust trip
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={onStartOver}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-6 py-3 text-base font-semibold text-gray-700 transition-colors hover:bg-gray-200 focus:outline-none focus-visible:ring-3 focus-visible:ring-teal-500/30 min-h-[48px]"
            >
              💰 Adjust budget
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- FEASIBLE (TRIP FOUND) STATE ----------

  const hotelOptions: Hotel[] =
    result.hotels.length > 0 ? result.hotels : result.hotel ? [result.hotel] : [];

  const [selectedHotelId, setSelectedHotelId] = useState<string>(
    result.hotel?.id ?? hotelOptions[0]?.id ?? "",
  );

  const selectedHotel = useMemo(
    () => hotelOptions.find((h) => h.id === selectedHotelId) ?? hotelOptions[0] ?? null,
    [hotelOptions, selectedHotelId],
  );

  const destDataForEvents = useMemo(() => getDestinationData(arrival), [arrival]);
  const availableEvents: Event[] = destDataForEvents?.events ?? [];

  const [selectedEventNames, setSelectedEventNames] = useState<Set<string>>(new Set());

  const toggleEvent = useCallback((eventName: string) => {
    setSelectedEventNames((prev) => {
      const next = new Set(prev);
      if (next.has(eventName)) {
        next.delete(eventName);
      } else {
        next.add(eventName);
      }
      return next;
    });
  }, []);

  const selectedEvents = useMemo(
    () => availableEvents.filter((e) => selectedEventNames.has(e.name)),
    [availableEvents, selectedEventNames],
  );

  const eventsCostTotal = useMemo(
    () => selectedEvents.reduce((sum, e) => sum + e.pricePerPerson * travelers, 0),
    [selectedEvents, travelers],
  );

  const cheapestFlight = result.flights[0];

  const flightCostTotal = result.driving ? 0 : (cheapestFlight?.price ?? 0) * travelers;
  const hotelCostTotal = selectedHotel
    ? selectedHotel.pricePerNight * result.nights
    : 0;
  const activitiesCostTotal = result.activities
    .filter((a) => a.price > 0)
    .reduce((sum, a) => sum + a.price * travelers, 0);
  const dynamicTotalCost = flightCostTotal + hotelCostTotal + activitiesCostTotal + eventsCostTotal;

  const isWithinBudget = dynamicTotalCost <= budget;
  const dynamicBudgetGap = Math.max(0, budget - dynamicTotalCost);

  const budgetPercentUsed = Math.round((dynamicTotalCost / budget) * 100);
  const budgetBarColor =
    budgetPercentUsed < 70
      ? "bg-emerald-500"
      : budgetPercentUsed < 90
        ? "bg-amber-500"
        : "bg-orange-500";

  const handleSelectHotel = useCallback((hotelId: string) => {
    setSelectedHotelId(hotelId);
  }, []);

  const handleBookingClick = useCallback(
    (_e: React.MouseEvent<HTMLAnchorElement>, linkType: string) => {
      logKpiEvent({
        data: {
          event_type: "booking_click",
          linkType,
        },
      }).catch(() => {});
    },
    [],
  );

  return (
    <div className="flex flex-1 flex-col px-4 py-6">
      <div className="mx-auto w-full max-w-2xl">
        {/* Success header */}
        <div className="mb-8 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 p-5 sm:p-6 ring-1 ring-teal-100/50">
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <h2 className="text-lg font-bold text-gray-900 capitalize sm:text-xl">
              {result.driving ? (
                <>🚗 Road trip from {departure} to {arrival}</>
              ) : (
                <>Trip from {departure} to {arrival}</>
              )}
            </h2>
            {isWithinBudget && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 animate-bounce-gentle">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Under budget
              </span>
            )}
            {!isWithinBudget && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Exceeds budget with this hotel
              </span>
            )}
          </div>

          <div className="mb-1 flex items-baseline gap-2">
            <span className={`text-3xl font-bold sm:text-4xl ${isWithinBudget ? "text-teal-700" : "text-amber-700"}`}>
              {formatPrice(dynamicTotalCost)}
            </span>
            <span className="text-sm text-gray-500">total for {travelers} traveler{travelers > 1 ? "s" : ""}</span>
          </div>

          {travelers > 1 && (
            <p className="mb-3 text-sm text-gray-500">
              {formatPrice(Math.round(dynamicTotalCost / travelers))} per person
            </p>
          )}

          <div className="mb-3">
            <div className="flex justify-between text-xs font-medium text-gray-500">
              <span>Spent: ${dynamicTotalCost.toLocaleString("en-US")}</span>
              <span>Budget: ${budget.toLocaleString("en-US")}</span>
            </div>
            <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${budgetBarColor}`}
                style={{ width: `${Math.min(budgetPercentUsed, 100)}%` }}
                role="progressbar"
                aria-valuenow={budgetPercentUsed}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${budgetPercentUsed}% of ${formatPrice(budget)} budget used`}
              />
            </div>
          </div>

          {isWithinBudget && dynamicBudgetGap >= 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-100/60 px-3 py-2">
              <span className="text-lg" aria-hidden="true">🎉</span>
              <p className="text-sm font-semibold text-emerald-800">
                ${dynamicBudgetGap.toLocaleString("en-US")} left over
                {dynamicBudgetGap > 0 && (
                  <span className="font-normal text-emerald-700"> — that&rsquo;s money back in your pocket!</span>
                )}
              </p>
            </div>
          )}

          {!isWithinBudget && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-100/60 px-3 py-2">
              <span className="text-lg" aria-hidden="true">⚠️</span>
              <p className="text-sm font-semibold text-amber-800">
                ${(-dynamicBudgetGap).toLocaleString("en-US")} over budget
                <span className="font-normal text-amber-700"> — pick a more affordable hotel or adjust your budget</span>
              </p>
            </div>
          )}

          {result.flexibleDates && result.flexibleDatesMonth && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-teal-100/60 px-3 py-2.5">
              <span className="mt-0.5 text-lg shrink-0" aria-hidden="true">📅</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-teal-800">
                  Flexible dates saved you ~$
                  {((result.peakTotalCost ?? 0) > 0
                    ? result.peakTotalCost! - result.totalCost
                    : Math.round(result.totalCost * (0.3 / (1 - 0.3)))
                  ).toLocaleString("en-US")}
                  {" "}— we picked{" "}
                  <span className="font-bold">{result.flexibleDatesMonth}</span> for the best price
                </p>
                {departureDate && returnDate && (
                  <p className="mt-0.5 text-xs text-teal-700/80">
                    Travel dates:{" "}
                    <span className="font-medium">
                      {new Date(departureDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    {" → "}
                    <span className="font-medium">
                      {new Date(returnDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}

          {result.offPeak && !result.flexibleDates && result.peakTotalCost && result.peakTotalCost > result.totalCost && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-teal-100/60 px-3 py-2">
              <span className="text-lg" aria-hidden="true">🌿</span>
              <p className="text-sm font-semibold text-teal-800">
                You saved ~${(result.peakTotalCost - result.totalCost).toLocaleString("en-US")} by traveling off-peak
                <span className="font-normal text-teal-700"> — peak price ~${result.peakTotalCost.toLocaleString("en-US")} vs. your ${result.totalCost.toLocaleString("en-US")}</span>
              </p>
            </div>
          )}
        </div>

        {/* Cost breakdown */}
        {travelers > 1 && (
          <section className="mb-8" aria-labelledby="breakdown-heading">
            <h3 id="breakdown-heading" className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Cost Breakdown
            </h3>
            <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
              {!result.driving && cheapestFlight && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-gray-600">
                    <span aria-hidden="true">✈️</span> Flights ({travelers} × {formatPrice(cheapestFlight.price)})
                  </span>
                  <span className="font-semibold text-gray-900">{formatPrice(flightCostTotal)}</span>
                </div>
              )}
              {selectedHotel && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-gray-600">
                    <span aria-hidden="true">{selectedHotel.image}</span> Stay ({result.nights} night{result.nights > 1 ? "s" : ""} × {formatPrice(selectedHotel.pricePerNight)})
                  </span>
                  <span className="font-semibold text-gray-900">{formatPrice(hotelCostTotal)}</span>
                </div>
              )}
              {activitiesCostTotal > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-gray-600">
                    <span aria-hidden="true">🎯</span> Activities
                    {travelers > 1 && <span className="text-xs text-gray-400"> ({travelers} travelers)</span>}
                  </span>
                  <span className="font-semibold text-gray-900">{formatPrice(activitiesCostTotal)}</span>
                </div>
              )}
              {eventsCostTotal > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-gray-600">
                    <span aria-hidden="true">🎭</span> Shows & Experiences
                    {travelers > 1 && <span className="text-xs text-gray-400"> ({travelers} travelers)</span>}
                  </span>
                  <span className="font-semibold text-gray-900">{formatPrice(eventsCostTotal)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-gray-800">Total</span>
                  <span className={`font-bold ${isWithinBudget ? "text-teal-700" : "text-amber-700"}`}>
                    {formatPrice(dynamicTotalCost)}
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Flights section */}
        {!result.driving && (
          <section className="mb-8" aria-labelledby="flights-heading">
            <h3 id="flights-heading" className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 sm:text-xl">
              <span aria-hidden="true">✈️</span> Flights
              <span className="text-sm font-normal text-gray-400">(per person)</span>
            </h3>
            <div className="space-y-3">
              {result.flights.slice(0, 3).map((flight, idx) => (
                <div
                  key={flight.id}
                  className={`rounded-xl border-2 p-4 transition-colors ${idx === 0 ? "border-teal-500 bg-teal-50/50" : "border-gray-100 bg-white hover:border-gray-200"}`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-gray-900">{flight.airline}</span>
                        {flight.stops === 0 && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-700">Nonstop</span>}
                        {flight.stops === 1 && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">1 stop</span>}
                        {idx === 0 && <span className="rounded bg-teal-100 px-1.5 py-0.5 text-xs font-medium text-teal-700">Best deal</span>}
                      </div>
                      <div className="mt-1 text-sm text-gray-500 truncate">
                        {flight.departureTime} – {flight.arrivalTime} · {flight.duration} · {flight.departureAirport}→{flight.arrivalAirport}
                      </div>
                    </div>
                    <div className="text-right sm:ml-4 sm:shrink-0">
                      <div className="text-xl font-bold text-gray-900">{formatPrice(flight.price)}</div>
                      <div className="text-xs text-gray-400">per person</div>
                    </div>
                  </div>
                  {flight.bookingLink && (
                    <div className="mt-3 border-t border-gray-100 pt-2 text-right">
                      <a
                        href={flight.bookingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => handleBookingClick(e, "flight")}
                        className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 transition-colors hover:text-teal-800"
                      >
                        View deal
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 text-sm text-gray-400">
              💡 We selected the cheapest option:{" "}
              <span className="font-medium text-gray-600">{cheapestFlight.airline} at {formatPrice(cheapestFlight.price)}/person</span>
            </p>
          </section>
        )}

        {/* Hotel section */}
        {hotelOptions.length > 0 && (
          <section className="mb-8" aria-labelledby="hotel-heading">
            <h3 id="hotel-heading" className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 sm:text-xl">
              <span aria-hidden="true">🏨</span> Stay
              <span className="text-sm font-normal text-gray-400">({result.nights} night{result.nights > 1 ? "s" : ""})</span>
            </h3>
            <div className="space-y-3" role="radiogroup" aria-label="Select a hotel">
              {hotelOptions.map((hotel, idx) => {
                const isSelected = hotel.id === selectedHotelId;
                const isBestValue = idx === 0;
                const tierCfg = TIER_CONFIG[hotel.tier];
                const hotelTotal = hotel.pricePerNight * result.nights;
                return (
                  <button
                    key={hotel.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleSelectHotel(hotel.id)}
                    className={`w-full rounded-xl border-2 p-4 text-left transition-all duration-200 focus:outline-none focus-visible:ring-3 focus-visible:ring-teal-500/30 sm:p-5 ${
                      isSelected ? "border-teal-500 bg-teal-50/50 shadow-sm" : "border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">{hotel.name}</h4>
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${tierCfg.color}`}>{tierCfg.label}</span>
                          {isBestValue && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700">
                              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              Best value
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-amber-600" aria-label={`${hotel.rating} out of 5 stars`}>
                            {"★".repeat(Math.round(hotel.rating))}{"☆".repeat(5 - Math.round(hotel.rating))}
                          </span>
                          <span className="text-sm text-gray-400">{hotel.rating}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {hotel.amenities.map((a) => (
                            <span key={a} className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-600 ring-1 ring-gray-200">{a}</span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right sm:ml-4 sm:shrink-0">
                        <div className="text-sm text-gray-400">{formatPrice(hotel.pricePerNight)}/night</div>
                        <div className="text-xl font-bold text-gray-900">{formatPrice(hotelTotal)}</div>
                        <div className="text-xs text-gray-400">total stay</div>
                      </div>
                    </div>
                    {hotel.bookingLink && (
                      <div className="mt-3 border-t border-gray-100 pt-2 text-right">
                        <a
                          href={hotel.bookingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => { e.stopPropagation(); handleBookingClick(e, "hotel"); }}
                          className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 transition-colors hover:text-teal-800"
                        >
                          View deal
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        </a>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {hotelOptions.length > 1 && (
              <p className="mt-2 text-sm text-gray-400">
                💡 We recommend the <span className="font-medium text-gray-600">Best value</span> pick — it keeps the most room in your budget for activities.
              </p>
            )}
          </section>
        )}

        {/* Activities section */}
        <section className="mb-8" aria-labelledby="activities-heading">
          <h3 id="activities-heading" className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 sm:text-xl">
            <span aria-hidden="true">🎯</span> Activities
            <span className="text-sm font-normal text-gray-400">(per person)</span>
          </h3>
          {result.activities.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-4 text-center text-sm text-gray-500">
              No activities fit within your remaining budget. Try a free destination with more included activities.
            </p>
          ) : (
            <div className="space-y-2">
              {result.activities.map((activity) => (
                <div key={activity.id} className="flex items-start justify-between rounded-xl border border-gray-100 bg-white p-3 transition-colors hover:border-gray-200">
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-900">{activity.name}</span>
                      {activity.price === 0 ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Free</span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">Paid</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500 break-words">{activity.description}</p>
                  </div>
                  <div className="shrink-0 text-right text-sm font-semibold text-gray-900">
                    {activity.price === 0 ? "Free" : formatPrice(activity.price)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Shows & Experiences */}
        {availableEvents.length > 0 && (() => {
          const remainingAfterCore = budget - (flightCostTotal + hotelCostTotal + activitiesCostTotal);
          const hasRemaining = remainingAfterCore > 0;
          const affordableEvents = availableEvents.filter((e) => e.pricePerPerson * travelers <= remainingAfterCore);
          if (!hasRemaining || affordableEvents.length === 0) return null;
          const remainingAfterEvents = remainingAfterCore - eventsCostTotal;
          return (
            <section className="mb-8" aria-labelledby="events-heading">
              <h3 id="events-heading" className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 sm:text-xl">
                <span aria-hidden="true">🎭</span> Shows &amp; Experiences
                <span className="text-sm font-normal text-gray-400">(per person)</span>
              </h3>
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-teal-50 px-3 py-2 ring-1 ring-teal-100/50">
                <span className="text-lg" aria-hidden="true">💡</span>
                <p className="text-sm font-semibold text-teal-800">
                  You&rsquo;ve got {formatPrice(remainingAfterEvents)} left
                  {remainingAfterEvents < remainingAfterCore && (
                    <span className="font-normal text-teal-700"> — add a show or tour if you&rsquo;d like</span>
                  )}
                </p>
              </div>
              <div className="space-y-2">
                {affordableEvents.map((event) => {
                  const eventTotal = event.pricePerPerson * travelers;
                  const isSelected = selectedEventNames.has(event.name);
                  const wouldFit = isSelected || eventTotal <= remainingAfterCore - eventsCostTotal;
                  return (
                    <div
                      key={event.name}
                      className={`rounded-xl border-2 p-4 transition-colors ${
                        isSelected ? "border-teal-500 bg-teal-50/50" : wouldFit ? "border-gray-100 bg-white hover:border-gray-200" : "border-gray-100 bg-gray-50/50 opacity-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={isSelected}
                          disabled={!wouldFit && !isSelected}
                          onClick={() => toggleEvent(event.name)}
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors focus:outline-none focus-visible:ring-3 focus-visible:ring-teal-500/30 ${
                            isSelected ? "border-teal-600 bg-teal-600" : wouldFit ? "border-gray-300 hover:border-teal-400" : "border-gray-200"
                          }`}
                          aria-label={`${isSelected ? "Remove" : "Add"} ${event.name} to trip`}
                        >
                          {isSelected && (
                            <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-lg" aria-hidden="true">{event.emoji}</span>
                            <span className="font-semibold text-gray-900">{event.name}</span>
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{event.category}</span>
                          </div>
                          <p className="mt-1 text-sm text-gray-500">{event.description}</p>
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm">
                              <span className="font-semibold text-gray-900">{formatPrice(event.pricePerPerson)}</span>
                              <span className="text-gray-400"> / person</span>
                              {travelers > 1 && <span className="ml-1 text-xs text-gray-400">({formatPrice(eventTotal)} total)</span>}
                            </div>
                            <a
                              href={event.bookingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => handleBookingClick(e, "event")}
                              className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 transition-colors hover:text-teal-800"
                            >
                              Book tickets
                              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                              </svg>
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-sm text-gray-400">💡 These are optional — your trip is complete without them. Add only what fits your budget.</p>
            </section>
          );
        })()}

        {/* Payment plan section */}
        <PaymentPlanSection tripTotal={dynamicTotalCost} />

        {/* Premium upsell */}
        <section className="mb-8" aria-labelledby="premium-upsell-heading">
          <h3 id="premium-upsell-heading" className="sr-only">VacayScout Premium</h3>
          <PremiumFeatures variant="banner" />
        </section>

        {/* Start over */}
        <div className="mb-12 text-center">
          <button
            type="button"
            onClick={onStartOver}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-6 py-3 text-base font-medium text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-3 focus-visible:ring-teal-500/20 min-h-[48px]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Plan Another Trip
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Multi-Leg Results Component
// ═══════════════════════════════════════════════════════════════════════════

function MultiLegResults({
  multiLeg,
  budget,
  travelers,
  onStartOver,
  onBack,
}: {
  multiLeg: MultiLegTripResult;
  budget: number;
  travelers: number;
  onStartOver: () => void;
  onBack: () => void;
}) {
  const isWithinBudget = multiLeg.isFeasible;
  const budgetPercentUsed = Math.round((multiLeg.totalCost / budget) * 100);
  const budgetBarColor =
    budgetPercentUsed < 70
      ? "bg-emerald-500"
      : budgetPercentUsed < 90
        ? "bg-amber-500"
        : "bg-orange-500";

  // ── NOT FEASIBLE STATE ──
  if (!multiLeg.isFeasible) {
    return (
      <div className="flex flex-1 flex-col px-4 py-8 sm:py-10">
        <div className="mx-auto w-full max-w-lg">
          <div className="mb-2 text-center" aria-hidden="true">
            <span className="text-4xl">❌</span>
          </div>
          <h2 className="mb-2 text-center text-xl font-bold text-gray-900 sm:text-2xl">
            This multi-stop trip is over your {formatPrice(budget)} budget
          </h2>
          <p className="mb-8 text-center text-base leading-relaxed text-gray-600">
            Multi-destination trips need more budget per stop. Try reducing the
            number of stops, picking cheaper destinations, or increasing your
            budget.
          </p>

          {/* Per-leg summary for debugging */}
          <div className="mb-6 space-y-2">
            {multiLeg.legs.map((leg, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
              >
                <div>
                  <span className="font-semibold text-gray-900 capitalize">
                    {leg.departure} → {leg.arrival}
                  </span>
                  <span className="ml-2 text-sm text-gray-500">
                    {leg.nights} night{leg.nights > 1 ? "s" : ""}
                  </span>
                </div>
                <span className={`font-bold ${leg.totalCost === Infinity || leg.totalCost > (leg.nights / multiLeg.legs.reduce((s, l) => s + l.nights, 0)) * budget ? "text-amber-600" : "text-gray-900"}`}>
                  {leg.totalCost === Infinity ? "—" : formatPrice(leg.totalCost)}
                </span>
              </div>
            ))}
          </div>

          <div className="text-center space-y-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-all hover:bg-teal-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/40 min-h-[48px]"
            >
              Back to adjust trip
            </button>
            <br />
            <button
              type="button"
              onClick={onStartOver}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-6 py-3 text-base font-semibold text-gray-700 transition-colors hover:bg-gray-200 focus:outline-none focus-visible:ring-3 focus-visible:ring-teal-500/30 min-h-[48px]"
            >
              💰 Adjust budget
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── FEASIBLE STATE ──
  return (
    <div className="flex flex-1 flex-col px-4 py-6">
      <div className="mx-auto w-full max-w-2xl">
        {/* Header summary */}
        <div className="mb-8 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 p-5 sm:p-6 ring-1 ring-teal-100/50">
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <h2 className="text-lg font-bold text-gray-900 sm:text-xl">
              🗺️ Multi-stop trip ({multiLeg.legs.length} destinations)
            </h2>
            {isWithinBudget && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 animate-bounce-gentle">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Under budget
              </span>
            )}
          </div>

          <div className="mb-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-teal-700 sm:text-4xl">
              {formatPrice(multiLeg.totalCost)}
            </span>
            <span className="text-sm text-gray-500">
              total for {travelers} traveler{travelers > 1 ? "s" : ""}
            </span>
          </div>

          {travelers > 1 && (
            <p className="mb-3 text-sm text-gray-500">
              {formatPrice(Math.round(multiLeg.totalCost / travelers))} per person
            </p>
          )}

          {/* Budget bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs font-medium text-gray-500">
              <span>Spent: ${multiLeg.totalCost.toLocaleString("en-US")}</span>
              <span>Budget: ${budget.toLocaleString("en-US")}</span>
            </div>
            <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${budgetBarColor}`}
                style={{ width: `${Math.min(budgetPercentUsed, 100)}%` }}
                role="progressbar"
                aria-valuenow={budgetPercentUsed}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${budgetPercentUsed}% of ${formatPrice(budget)} budget used`}
              />
            </div>
          </div>

          {/* Under-budget banner */}
          {isWithinBudget && multiLeg.budgetGap >= 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-100/60 px-3 py-2">
              <span className="text-lg" aria-hidden="true">🎉</span>
              <p className="text-sm font-semibold text-emerald-800">
                ${multiLeg.budgetGap.toLocaleString("en-US")} left over
                <span className="font-normal text-emerald-700"> — that&rsquo;s money back in your pocket!</span>
              </p>
            </div>
          )}
        </div>

        {/* Total cost breakdown */}
        <section className="mb-8" aria-labelledby="multi-breakdown-heading">
          <h3 id="multi-breakdown-heading" className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Cost Breakdown
          </h3>
          <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
            {multiLeg.legs.map((leg, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-gray-600">
                  <span aria-hidden="true">📍</span>
                  Stop {idx + 1}: {leg.departure} → {leg.arrival}
                </span>
                <span className="font-semibold text-gray-900">{formatPrice(leg.totalCost)}</span>
              </div>
            ))}
            <div className="border-t border-gray-200 pt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-800">Total</span>
                <span className="font-bold text-teal-700">{formatPrice(multiLeg.totalCost)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Timeline-style leg display */}
        <section className="mb-8" aria-labelledby="timeline-heading">
          <h3 id="timeline-heading" className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 sm:text-xl">
            <span aria-hidden="true">🗺️</span> Your Itinerary
          </h3>
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-teal-200" aria-hidden="true" />

            <div className="space-y-6">
              {multiLeg.legs.map((leg, idx) => (
                <LegTimelineCard
                  key={idx}
                  leg={leg}
                  index={idx}
                  travelers={travelers}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Payment plan */}
        <PaymentPlanSection tripTotal={multiLeg.totalCost} />

        {/* Premium upsell */}
        <section className="mb-8" aria-labelledby="premium-upsell-heading">
          <h3 id="premium-upsell-heading" className="sr-only">VacayScout Premium</h3>
          <PremiumFeatures variant="banner" />
        </section>

        {/* Start over */}
        <div className="mb-12 text-center">
          <button
            type="button"
            onClick={onStartOver}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-6 py-3 text-base font-medium text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-3 focus-visible:ring-teal-500/20 min-h-[48px]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Plan Another Trip
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * A single leg card in the timeline display.
 */
function LegTimelineCard({
  leg,
  index,
  travelers,
}: {
  leg: TripLeg;
  index: number;
  travelers: number;
}) {
  const cheapestFlight = leg.flights[0];
  const primaryHotel = leg.hotel;
  const flightTotal = cheapestFlight ? cheapestFlight.price * travelers : 0;
  const hotelTotal = primaryHotel ? primaryHotel.pricePerNight * leg.nights : 0;

  return (
    <div className="relative pl-14">
      {/* Timeline dot */}
      <div
        className="absolute left-4 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border-2 border-teal-500 bg-white shadow-sm text-sm font-bold text-teal-700"
        aria-hidden="true"
      >
        {index + 1}
      </div>

      {/* Card */}
      <div className="rounded-xl border-2 border-teal-200 bg-white p-4 sm:p-5 animate-step-enter">
        {/* Header: route */}
        <div className="mb-3">
          <h4 className="text-base font-bold text-gray-900 capitalize">
            {leg.departure} → {leg.arrival}
          </h4>
          <p className="text-sm text-gray-500">
            {new Date(leg.departureDate + "T00:00:00").toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}{" "}
            →{" "}
            {new Date(leg.returnDate + "T00:00:00").toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
            {" · "}
            {leg.nights} night{leg.nights > 1 ? "s" : ""}
          </p>
        </div>

        {/* Cost summary */}
        <div className="mb-3 rounded-lg bg-gray-50 px-3 py-2">
          <div className="flex justify-between text-xs font-medium text-gray-500">
            <span>Leg total</span>
            <span className="font-bold text-gray-900">{formatPrice(leg.totalCost)}</span>
          </div>
        </div>

        {/* Flight */}
        {cheapestFlight && (
          <div className="mb-2 flex items-center gap-2 text-sm">
            <span aria-hidden="true">✈️</span>
            <span className="font-medium text-gray-700">{cheapestFlight.airline}</span>
            <span className="text-gray-400">
              {formatPrice(cheapestFlight.price)}/person · {formatPrice(flightTotal)} total
            </span>
          </div>
        )}

        {/* Hotel */}
        {primaryHotel && (
          <div className="mb-2 flex items-center gap-2 text-sm">
            <span aria-hidden="true">{primaryHotel.image}</span>
            <span className="font-medium text-gray-700">{primaryHotel.name}</span>
            <span className="text-gray-400">
              {formatPrice(primaryHotel.pricePerNight)}/night · {formatPrice(hotelTotal)} total
            </span>
          </div>
        )}

        {/* Activities */}
        {leg.activities.length > 0 && (
          <div className="mb-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <span aria-hidden="true">🎯</span> Activities
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {leg.activities.map((act) => (
                <span
                  key={act.id}
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    act.price === 0
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {act.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
