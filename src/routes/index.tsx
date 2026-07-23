import { useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BudgetStep } from "~/components/BudgetStep";
import { TripDetailsStep } from "~/components/TripDetailsStep";
import { ResultsStep } from "~/components/ResultsStep";
import { getDestinationData } from "~/data/mockData";
import { searchFlights, searchHotels } from "~/data/amadeusApi";
import { logKpiEvent } from "~/data/kpiStore";
import type {
  TripParams,
  TripResult,
  Flight,
  Hotel,
  Activity,
  LegInput,
  TripLeg,
  MultiLegTripResult,
} from "~/types";

type Step = "budget" | "details" | "results";

export const Route = createFileRoute("/")({
  component: Home,
});

/** Calculate number of nights between two date strings */
function calcNights(departure: string, return_: string): number {
  const d1 = new Date(departure);
  const d2 = new Date(return_);
  const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff);
}

/**
 * Find the cheapest workable trip combination that fits the budget.
 * Algorithm: pick cheapest flight, then find up to 3 hotels at different
 * price tiers (budget, mid, premium) that all fit within the budget.
 * Uses the cheapest hotel for the base total, then includes free activities.
 * Paid activities are added one by one (cheapest first) as long as they
 * fit within the remaining budget.
 *
 * When offPeak is true, flight and hotel prices are reduced by the destination's
 * seasonality savings percentage. The peak-equivalent cost is also computed.
 */
function computeTrip(
  flights: Flight[],
  hotels: Hotel[],
  activities: Activity[],
  travelers: number,
  nights: number,
  budget: number,
  offPeak: boolean = false,
  savingsPercent: number = 0,
  driving: boolean = false,
): TripResult {
  // Apply off-peak discount to flight and hotel prices
  const discountMultiplier = offPeak ? 1 - savingsPercent / 100 : 1;

  const adjustedFlights: Flight[] = flights.map((f) => ({
    ...f,
    price: Math.round(f.price * discountMultiplier),
  }));
  const adjustedHotels: Hotel[] = hotels.map((h) => ({
    ...h,
    pricePerNight: Math.round(h.pricePerNight * discountMultiplier),
  }));

  const sortedFlights = driving
    ? []
    : [...adjustedFlights].sort((a, b) => a.price - b.price);
  const freeActivities = activities.filter((a) => a.price === 0);
  const paidActivities = activities
    .filter((a) => a.price > 0)
    .sort((a, b) => a.price - b.price);

  const cheapestFlight = driving ? null : sortedFlights[0];

  if (!driving && !cheapestFlight) {
    return {
      flights: [],
      hotel: null,
      hotels: [],
      activities: [],
      totalCost: Infinity,
      nights,
      budgetGap: 0,
      isFeasible: false,
      departure: "",
      arrival: "",
      offPeak,
      driving,
    };
  }

  const flightTotal = driving ? 0 : cheapestFlight!.price * travelers;

  const tierOrder: Array<"budget" | "mid" | "premium"> = [
    "budget",
    "mid",
    "premium",
  ];
  const candidateHotels: Hotel[] = [];

  for (const tier of tierOrder) {
    const tierHotels = adjustedHotels
      .filter((h) => h.tier === tier)
      .sort((a, b) => a.pricePerNight - b.pricePerNight);

    for (const hotel of tierHotels) {
      const hotelTotal = hotel.pricePerNight * nights;
      if (flightTotal + hotelTotal <= budget) {
        candidateHotels.push(hotel);
        break;
      }
    }
  }

  if (candidateHotels.length === 0) {
    const absoluteCheapest = [...adjustedHotels].sort(
      (a, b) => a.pricePerNight - b.pricePerNight,
    )[0];
    const cheapestHotelTotal = absoluteCheapest
      ? absoluteCheapest.pricePerNight * nights + flightTotal
      : Infinity;
    return {
      flights: sortedFlights,
      hotel: absoluteCheapest ?? null,
      hotels: [],
      activities: [...freeActivities],
      totalCost: cheapestHotelTotal,
      nights,
      budgetGap: Math.max(0, budget - cheapestHotelTotal),
      isFeasible: cheapestHotelTotal <= budget,
      departure: "",
      arrival: "",
      offPeak,
      driving,
    };
  }

  const primaryHotel = candidateHotels[0];
  let totalCost = flightTotal + primaryHotel.pricePerNight * nights;

  const selectedActivities: Activity[] = [...freeActivities];

  for (const act of paidActivities) {
    const actCost = act.price * travelers;
    if (totalCost + actCost <= budget) {
      totalCost += actCost;
      selectedActivities.push(act);
    }
  }

  let peakTotalCost: number | undefined;
  if (offPeak && savingsPercent > 0) {
    const origFlights = driving
      ? []
      : [...flights].sort((a, b) => a.price - b.price);
    const origHotels = [...hotels].sort(
      (a, b) => a.pricePerNight - b.pricePerNight,
    );
    const peakFlightCost = driving ? 0 : (origFlights[0]?.price ?? 0);
    const peakHotelCost = origHotels[0]?.pricePerNight ?? 0;
    peakTotalCost =
      peakFlightCost * travelers + peakHotelCost * nights;
    for (const act of paidActivities) {
      if (selectedActivities.includes(act)) {
        peakTotalCost += act.price * travelers;
      }
    }
  }

  const isFeasible = totalCost <= budget;
  const budgetGap = Math.max(0, budget - totalCost);

  return {
    flights: sortedFlights,
    hotel: primaryHotel,
    hotels: candidateHotels,
    activities: selectedActivities,
    totalCost,
    nights,
    budgetGap,
    isFeasible,
    peakTotalCost,
    offPeak,
    driving,
  };
}

/**
 * Compute a single leg using the computeTrip engine but returning a TripLeg.
 */
function computeSingleLeg(
  departure: string,
  arrival: string,
  departureDate: string,
  returnDate: string,
  flights: Flight[],
  hotels: Hotel[],
  activities: Activity[],
  travelers: number,
  budget: number,
  offPeak: boolean,
  savingsPercent: number,
  driving: boolean,
  flexibleDates: boolean,
  flexibleDatesMonth?: string,
): TripLeg {
  const nights = calcNights(departureDate, returnDate);
  const tripResult = computeTrip(
    flights,
    hotels,
    activities,
    travelers,
    nights,
    budget,
    offPeak,
    savingsPercent,
    driving,
  );

  return {
    departure,
    arrival,
    departureDate,
    returnDate,
    nights,
    flights: tripResult.flights,
    hotel: tripResult.hotel,
    hotels: tripResult.hotels,
    activities: tripResult.activities,
    totalCost: tripResult.totalCost,
    offPeak,
    flexibleDates,
    flexibleDatesMonth,
  };
}

/**
 * Compute a multi-leg trip by distributing the total budget proportionally
 * across legs based on nights at each destination. Each leg is optimized
 * independently within its share of the budget.
 */
function computeMultiLegTrip(
  mainDeparture: string,
  mainArrival: string,
  mainDepartureDate: string,
  mainReturnDate: string,
  extraLegs: LegInput[],
  travelers: number,
  totalBudget: number,
  offPeak: boolean,
  flexibleDates: boolean,
  driving: boolean,
): MultiLegTripResult {
  // Build the full list of legs: main leg + extra legs
  const allLegInputs: Array<{
    departure: string;
    arrival: string;
    departureDate: string;
    returnDate: string;
  }> = [
    {
      departure: mainDeparture,
      arrival: mainArrival,
      departureDate: mainDepartureDate,
      returnDate: mainReturnDate,
    },
  ];

  // Each extra leg's departure is the arrival of the previous leg
  let prevArrival = mainArrival;
  for (const extra of extraLegs) {
    allLegInputs.push({
      departure: prevArrival,
      arrival: extra.arrival,
      departureDate: extra.departureDate,
      returnDate: extra.returnDate,
    });
    prevArrival = extra.arrival;
  }

  // Collect data for all destinations
  const legsData = allLegInputs.map((input) => {
    const data = getDestinationData(input.arrival);
    return {
      ...input,
      data,
      savingsPercent: offPeak ? (data?.seasonality?.savingsPercent ?? 0) : 0,
      nights: calcNights(input.departureDate, input.returnDate),
    };
  });

  // Distribute budget proportionally by nights
  const totalNights = legsData.reduce((sum, l) => sum + l.nights, 0);

  // First pass: compute each leg with its proportional budget
  const legs = legsData.map((legData) => {
    const legBudget =
      totalNights > 0
        ? Math.round((legData.nights / totalNights) * totalBudget)
        : totalBudget;

    return computeSingleLeg(
      legData.departure,
      legData.arrival,
      legData.departureDate,
      legData.returnDate,
      legData.data?.flights ?? [],
      legData.data?.hotels ?? [],
      legData.data?.activities ?? [],
      travelers,
      legBudget,
      offPeak,
      legData.savingsPercent,
      driving,
      flexibleDates,
    );
  });

  // Check feasibility: any leg that's infeasible makes the whole trip infeasible
  // We detect infeasibility when totalCost is Infinity or > budget for that leg
  const allFeasible = legs.every((leg) => leg.totalCost !== Infinity);
  const totalCost = legs.reduce((sum, leg) => sum + (leg.totalCost === Infinity ? 0 : leg.totalCost), 0);
  const budgetGap = Math.max(0, totalBudget - totalCost);

  return {
    legs,
    totalCost: allFeasible ? totalCost : totalBudget + 500,
    budgetGap: allFeasible ? budgetGap : 0,
    isFeasible: allFeasible && totalCost <= totalBudget,
    travelers,
    budget: totalBudget,
    offPeak,
    flexibleDates,
  };
}

function Home() {
  const [step, setStep] = useState<Step>("budget");
  const [budget, setBudget] = useState(0);
  const [params, setParams] = useState<TripParams | null>(null);
  const [result, setResult] = useState<TripResult | null>(null);
  const [multiLegResult, setMultiLegResult] =
    useState<MultiLegTripResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // Detect if this is a multi-leg trip
  const [isMultiLeg, setIsMultiLeg] = useState(false);

  const handleBudgetNext = useCallback((b: number) => {
    setBudget(b);
    setStep("details");
    setStatusMessage(
      `Budget set to $${b.toLocaleString("en-US")}. Now choose your trip details.`,
    );
  }, []);

  const handleFind = useCallback(
    async (p: {
      departure: string;
      arrival: string;
      departureDate: string;
      returnDate: string;
      travelers: number;
      offPeak: boolean;
      flexibleDates: boolean;
      driving: boolean;
      extraLegs?: LegInput[];
    }) => {
      // Handle flexible dates for the main leg
      let effectiveDepartureDate = p.departureDate;
      let effectiveReturnDate = p.returnDate;
      let effectiveOffPeak = p.offPeak;
      let flexibleDatesMonth: string | undefined;

      if (p.flexibleDates) {
        const flexDestData = getDestinationData(p.arrival);
        const flexSeasonality = flexDestData?.seasonality;
        if (flexSeasonality) {
          const now = new Date();
          const currentMonth = now.getMonth();
          for (let offset = 0; offset < 18; offset++) {
            const checkMonth = (currentMonth + offset) % 12;
            const checkYear =
              now.getFullYear() + Math.floor((currentMonth + offset) / 12);
            const monthAbbr = new Date(checkYear, checkMonth, 1).toLocaleString(
              "en-US",
              { month: "short" },
            );
            if (flexSeasonality.offPeak.includes(monthAbbr)) {
              const mm = String(checkMonth + 1).padStart(2, "0");
              effectiveDepartureDate = `${checkYear}-${mm}-01`;
              const depDate = new Date(effectiveDepartureDate);
              depDate.setDate(depDate.getDate() + 5);
              effectiveReturnDate = depDate.toISOString().split("T")[0];
              flexibleDatesMonth = new Date(
                checkYear,
                checkMonth,
                1,
              ).toLocaleString("en-US", { month: "long" });
              break;
            }
          }
          effectiveOffPeak = true;
        } else {
          const now = new Date();
          const defaultMonth = new Date(
            now.getFullYear(),
            now.getMonth() + 3,
            1,
          );
          const mm = String(defaultMonth.getMonth() + 1).padStart(2, "0");
          const yy = defaultMonth.getFullYear();
          effectiveDepartureDate = `${yy}-${mm}-01`;
          const depDate = new Date(effectiveDepartureDate);
          depDate.setDate(depDate.getDate() + 5);
          effectiveReturnDate = depDate.toISOString().split("T")[0];
          flexibleDatesMonth = defaultMonth.toLocaleString("en-US", {
            month: "long",
          });
        }
      }

      const tripParams: TripParams = {
        budget,
        departure: p.departure,
        arrival: p.arrival,
        departureDate: effectiveDepartureDate,
        returnDate: effectiveReturnDate,
        travelers: p.travelers,
        offPeak: effectiveOffPeak,
        flexibleDates: p.flexibleDates,
        driving: p.driving,
      };
      setParams(tripParams);
      setIsLoading(true);
      setStatusMessage("Searching for the best deals that fit your budget…");

      // Determine if this is a multi-leg trip
      const hasExtraLegs = !!(p.extraLegs && p.extraLegs.length > 0);
      setIsMultiLeg(hasExtraLegs);

      try {
        // ─── MULTI-LEG PATH ──────────────────────────────────────
        if (hasExtraLegs && p.extraLegs) {
          // For multi-leg, we compute locally with mock data
          const multiResult = computeMultiLegTrip(
            p.departure,
            p.arrival,
            effectiveDepartureDate,
            effectiveReturnDate,
            p.extraLegs,
            p.travelers,
            budget,
            effectiveOffPeak,
            p.flexibleDates,
            p.driving,
          );
          multiResult.flexibleDates = p.flexibleDates;
          multiResult.flexibleDatesMonth = flexibleDatesMonth;

          setMultiLegResult(multiResult);
          setResult(null);

          logKpiEvent({
            data: {
              event_type: "trip_planned",
              budget,
              budgetGap: multiResult.isFeasible
                ? multiResult.budgetGap
                : undefined,
              isFeasible: multiResult.isFeasible,
              totalCost: multiResult.totalCost,
            },
          }).catch(() => {});

          if (multiResult.isFeasible) {
            setStatusMessage(
              `Trip found! Total: ${multiResult.totalCost.toLocaleString("en-US")} — ${multiResult.budgetGap.toLocaleString("en-US")} under your budget.`,
            );
          } else {
            setStatusMessage(
              `The cheapest multi-stop trip is over your budget. Try fewer stops or a different route.`,
            );
          }
          setIsLoading(false);
          setStep("results");
          return;
        }

        // ─── SINGLE-LEG PATH (unchanged) ─────────────────────────
        const destData = getDestinationData(p.arrival);
        const savingsPercent = effectiveOffPeak
          ? (destData?.seasonality?.savingsPercent ?? 0)
          : 0;

        const [apiFlights, apiHotels] = await Promise.all([
          p.driving
            ? Promise.resolve([] as Flight[])
            : searchFlights({
                data: {
                  departure: p.departure,
                  arrival: p.arrival,
                  departureDate: effectiveDepartureDate,
                  returnDate: effectiveReturnDate,
                },
              }),
          searchHotels({
            data: {
              arrival: p.arrival,
              checkIn: effectiveDepartureDate,
              checkOut: effectiveReturnDate,
            },
          }),
        ]);

        const flights: Flight[] =
          apiFlights.length > 0 ? apiFlights : (destData?.flights ?? []);
        const hotels: Hotel[] =
          apiHotels.length > 0 ? apiHotels : (destData?.hotels ?? []);
        const activities: Activity[] = destData?.activities ?? [];

        if (flights.length === 0 && hotels.length === 0) {
          const nights = calcNights(
            effectiveDepartureDate,
            effectiveReturnDate,
          );
          const computedResult: TripResult = {
            flights: [],
            hotel: null,
            hotels: [],
            activities: [],
            totalCost: budget + 500,
            nights,
            budgetGap: 0,
            isFeasible: false,
            departure: p.departure,
            arrival: p.arrival,
            offPeak: effectiveOffPeak,
            flexibleDates: p.flexibleDates,
            flexibleDatesMonth,
            driving: p.driving,
          };
          setResult(computedResult);
          setMultiLegResult(null);
          logTripKpi(computedResult, budget);
          setStatusMessage(
            `We couldn't find a trip from ${p.departure} to ${p.arrival} that fits your ${budget.toLocaleString("en-US")} budget.`,
          );
        } else {
          const nights = calcNights(
            effectiveDepartureDate,
            effectiveReturnDate,
          );
          const tripResult = computeTrip(
            flights,
            hotels,
            activities,
            p.travelers,
            nights,
            budget,
            effectiveOffPeak,
            savingsPercent,
            p.driving,
          );

          tripResult.departure = p.departure;
          tripResult.arrival = p.arrival;
          tripResult.flexibleDates = p.flexibleDates;
          tripResult.flexibleDatesMonth = flexibleDatesMonth;

          if (
            !p.driving &&
            tripResult.isFeasible &&
            tripResult.flights.length === 0
          ) {
            tripResult.isFeasible = false;
          }

          setResult(tripResult);
          setMultiLegResult(null);
          logTripKpi(tripResult, budget);

          if (tripResult.isFeasible) {
            setStatusMessage(
              `Trip found! Total: ${tripResult.totalCost.toLocaleString("en-US")} — ${tripResult.budgetGap.toLocaleString("en-US")} under your budget.`,
            );
          } else {
            setStatusMessage(
              `The cheapest trip from ${p.departure} to ${p.arrival} is over your budget. Try a different destination or increase your budget.`,
            );
          }
        }
      } catch {
        // Catastrophic failure — try pure mock fallback
        const destData = getDestinationData(p.arrival);
        const savingsPercent = effectiveOffPeak
          ? (destData?.seasonality?.savingsPercent ?? 0)
          : 0;
        if (!destData) {
          setResult({
            flights: [],
            hotel: null,
            hotels: [],
            activities: [],
            totalCost: budget + 500,
            nights: calcNights(effectiveDepartureDate, effectiveReturnDate),
            budgetGap: 0,
            isFeasible: false,
            departure: p.departure,
            arrival: p.arrival,
            offPeak: effectiveOffPeak,
            flexibleDates: p.flexibleDates,
            flexibleDatesMonth,
            driving: p.driving,
          });
          setMultiLegResult(null);
        } else {
          const nights = calcNights(
            effectiveDepartureDate,
            effectiveReturnDate,
          );
          const tripResult = computeTrip(
            destData.flights,
            destData.hotels,
            destData.activities,
            p.travelers,
            nights,
            budget,
            effectiveOffPeak,
            savingsPercent,
            p.driving,
          );
          tripResult.departure = p.departure;
          tripResult.arrival = p.arrival;
          tripResult.flexibleDates = p.flexibleDates;
          tripResult.flexibleDatesMonth = flexibleDatesMonth;
          if (
            !p.driving &&
            tripResult.isFeasible &&
            tripResult.flights.length === 0
          ) {
            tripResult.isFeasible = false;
          }
          setResult(tripResult);
          setMultiLegResult(null);
          logTripKpi(tripResult, budget);
          setStatusMessage(
            tripResult.isFeasible
              ? `Trip found! Total: ${tripResult.totalCost.toLocaleString("en-US")} — ${tripResult.budgetGap.toLocaleString("en-US")} under your budget.`
              : `The cheapest trip from ${p.departure} to ${p.arrival} is over your budget. Try a different destination or increase your budget.`,
          );
        }
      }

      setIsLoading(false);
      setStep("results");
    },
    [budget],
  );

  /** Log a trip_planned KPI event (fire-and-forget) */
  const logTripKpi = useCallback(
    (tripResult: TripResult, tripBudget: number) => {
      logKpiEvent({
        data: {
          event_type: "trip_planned",
          budget: tripBudget,
          budgetGap: tripResult.isFeasible ? tripResult.budgetGap : undefined,
          isFeasible: tripResult.isFeasible,
          peakTotalCost: tripResult.peakTotalCost,
          totalCost: tripResult.totalCost,
        },
      }).catch(() => {});
    },
    [],
  );

  const handleStartOver = useCallback(() => {
    setStep("budget");
    setBudget(0);
    setParams(null);
    setResult(null);
    setMultiLegResult(null);
    setIsMultiLeg(false);
    setStatusMessage("Let's plan a new trip. What's your budget?");
  }, []);

  const handleBackToDetails = useCallback(() => {
    setStep("details");
    setResult(null);
    setMultiLegResult(null);
    setIsMultiLeg(false);
    setStatusMessage("Adjust your trip details.");
  }, []);

  const stepLabels: Record<Step, string> = {
    budget: "Set your budget",
    details: "Choose destination and dates",
    results: "Your trip plan",
  };

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Screen-reader-only status announcements */}
      <div
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        role="status"
      >
        {statusMessage}
      </div>

      {/* Header */}
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={handleStartOver}
            className="flex items-center gap-2 rounded-lg px-1 py-1 text-lg font-bold text-teal-700 transition-colors hover:text-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
            aria-label="VacayScout — Start over"
          >
            <span aria-hidden="true">🌴</span>
            VacayScout
          </button>
          <div className="flex items-center gap-2">
            {step !== "budget" && (
              <button
                type="button"
                onClick={
                  step === "results" ? handleBackToDetails : handleStartOver
                }
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
              >
                {step === "details" ? "Change budget" : "Edit trip"}
              </button>
            )}
            <a
              href="https://buy.stripe.com/6oUfZjeGO05E1067NxafS00"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-teal-600 transition-colors hover:bg-teal-50 hover:text-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
            >
              Upgrade
            </a>
          </div>
        </div>
      </header>

      {/* Step indicator */}
      <nav
        className="mx-auto flex w-full max-w-md items-center justify-center gap-2 px-4 py-3"
        aria-label="Progress"
      >
        {(["budget", "details", "results"] as Step[]).map((s, i) => {
          const isActive = s === step;
          const isPast =
            (step === "details" && s === "budget") ||
            (step === "results" &&
              (s === "budget" || s === "details"));
          return (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && (
                <div
                  className={`h-px w-6 transition-colors duration-500 sm:w-10 ${
                    isPast ? "bg-teal-500" : "bg-gray-200"
                  }`}
                  aria-hidden="true"
                />
              )}
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors duration-300 ${
                  isActive
                    ? "bg-teal-600 text-white shadow-sm"
                    : isPast
                      ? "bg-teal-100 text-teal-700"
                      : "bg-gray-100 text-gray-400"
                }`}
                aria-current={isActive ? "step" : undefined}
                aria-label={`${stepLabels[s]}${isPast ? " (completed)" : isActive ? " (current)" : ""}`}
              >
                {isPast ? "✓" : i + 1}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Main content */}
      <main className="flex flex-1 flex-col">
        {/* Loading overlay */}
        {isLoading && (
          <div
            className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12 animate-step-enter"
            role="status"
            aria-label="Finding your trip"
          >
            <div className="relative h-16 w-16">
              <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-teal-200" />
              <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-teal-600 border-t-transparent" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900">
                Searching for your trip…
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Finding the best flights, stays, and activities
              </p>
            </div>
            <div className="w-full max-w-md space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="animate-shimmer h-16 rounded-xl"
                  aria-hidden="true"
                />
              ))}
            </div>
          </div>
        )}

        {/* Step content (hidden while loading) */}
        {!isLoading && (
          <div className="animate-step-enter flex flex-1 flex-col">
            {step === "budget" && <BudgetStep onNext={handleBudgetNext} />}
            {step === "details" && budget > 0 && (
              <TripDetailsStep
                budget={budget}
                onBack={handleStartOver}
                onFind={handleFind}
              />
            )}
            {step === "results" && (
              <>
                {/* Multi-leg results */}
                {isMultiLeg && multiLegResult && (
                  <ResultsStep
                    result={null as unknown as TripResult}
                    departure={params?.departure ?? ""}
                    arrival={params?.arrival ?? ""}
                    budget={budget}
                    travelers={params?.travelers ?? 1}
                    departureDate={params?.departureDate}
                    returnDate={params?.returnDate}
                    onStartOver={handleStartOver}
                    onBack={handleBackToDetails}
                    multiLegResult={multiLegResult}
                  />
                )}
                {/* Single-leg results */}
                {!isMultiLeg && result && params && (
                  <ResultsStep
                    result={result}
                    departure={params.departure}
                    arrival={params.arrival}
                    budget={budget}
                    travelers={params.travelers}
                    departureDate={params.departureDate}
                    returnDate={params.returnDate}
                    onStartOver={handleStartOver}
                    onBack={handleBackToDetails}
                  />
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white py-4 text-center text-xs text-gray-400">
        VacayScout — Honest trip planning for real budgets
      </footer>
    </div>
  );
}
