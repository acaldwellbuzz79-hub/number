import { useState, useEffect, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { getKpiData } from "~/data/kpiStore";
import type { KpiDashboard } from "~/data/kpiStore";

export const Route = createFileRoute("/kpis")({
  component: KpiPage,
});

function formatPrice(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function formatPercent(n: number | null): string {
  if (n == null) return "—";
  return `${Math.round(n).toLocaleString("en-US")}%`;
}

function KpiPage() {
  const [data, setData] = useState<KpiDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getKpiData();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load KPI data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <a
            href="/"
            className="flex items-center gap-2 rounded-lg px-1 py-1 text-lg font-bold text-teal-700 transition-colors hover:text-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          >
            <span aria-hidden="true">🌴</span>
            VacayScout
          </a>
          <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
            KPIs
          </span>
        </div>
      </header>

      <main className="flex flex-1 flex-col px-4 py-8">
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            KPI Dashboard
          </h1>
          <p className="mb-8 text-sm text-gray-500">
            Real usage metrics — no personal data collected.
          </p>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="relative h-10 w-10">
                <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-teal-200" />
                <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-teal-600 border-t-transparent" />
              </div>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
              <p className="text-red-700">{error}</p>
              <button
                type="button"
                onClick={fetchData}
                className="mt-3 rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-800 transition-colors hover:bg-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                Retry
              </button>
            </div>
          )}

          {/* KPI cards */}
          {data && !loading && (
            <>
              <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Trips planned */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Trips Planned
                  </p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {data.tripsPlanned.toLocaleString("en-US")}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">total computed</p>
                </div>

                {/* Avg budget adherence */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Avg Budget Under
                  </p>
                  <p className="mt-2 text-3xl font-bold text-emerald-600">
                    {data.avgBudgetAdherence != null
                      ? formatPrice(data.avgBudgetAdherence)
                      : "—"}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    feasible trips only
                  </p>
                </div>

                {/* Booking clicks */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Booking Clicks
                  </p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {data.bookingClicks.toLocaleString("en-US")}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    affiliate link clicks
                  </p>
                </div>

                {/* Avg savings */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Avg Savings (off-peak)
                  </p>
                  <p className="mt-2 text-3xl font-bold text-teal-600">
                    {data.avgSavings != null ? formatPrice(data.avgSavings) : "—"}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">vs peak prices</p>
                </div>
              </div>

              {/* Derived metrics */}
              {data.tripsPlanned > 0 && (
                <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
                    Derived Metrics
                  </h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-gray-400">
                        Booking conversion rate
                      </p>
                      <p className="text-lg font-bold text-gray-900">
                        {data.tripsPlanned > 0
                          ? `${((data.bookingClicks / data.tripsPlanned) * 100).toFixed(1)}%`
                          : "—"}
                      </p>
                      <p className="text-xs text-gray-400">
                        clicks per trip planned
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">
                        Feasible trip rate
                      </p>
                      <p className="text-lg font-bold text-gray-900">
                        {data.recentTrips.length > 0
                          ? `${((data.recentTrips.filter((t) => t.isFeasible).length / data.recentTrips.length) * 100).toFixed(0)}%`
                          : "—"}
                      </p>
                      <p className="text-xs text-gray-400">
                        of last {data.recentTrips.length} trips
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent trips table */}
              {data.recentTrips.length > 0 && (
                <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-50 px-5 py-3">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                      Recent Trips
                    </h2>
                    <button
                      type="button"
                      onClick={fetchData}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                    >
                      Refresh
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-gray-50 text-xs uppercase tracking-wider text-gray-400">
                          <th className="px-5 py-2 font-medium">Time</th>
                          <th className="px-5 py-2 font-medium">Budget</th>
                          <th className="px-5 py-2 font-medium">Total</th>
                          <th className="px-5 py-2 font-medium">Under</th>
                          <th className="px-5 py-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentTrips.map((trip, i) => (
                          <tr
                            key={i}
                            className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                          >
                            <td className="px-5 py-2.5 text-gray-500">
                              {new Date(trip.timestamp).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="px-5 py-2.5 font-medium text-gray-900">
                              {formatPrice(trip.budget)}
                            </td>
                            <td className="px-5 py-2.5 text-gray-700">
                              {trip.totalCost != null
                                ? formatPrice(trip.totalCost)
                                : "—"}
                            </td>
                            <td className="px-5 py-2.5">
                              {trip.budgetGap != null ? (
                                <span className="text-emerald-600 font-medium">
                                  {formatPrice(trip.budgetGap)}
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-5 py-2.5">
                              {trip.isFeasible ? (
                                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                  Fit
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                                  Over
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white py-4 text-center text-xs text-gray-400">
        VacayScout — Honest trip planning for real budgets
      </footer>
    </div>
  );
}
