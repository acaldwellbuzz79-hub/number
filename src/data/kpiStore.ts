import { createServerFn } from "@tanstack/react-start";

/**
 * KPI event store using SQLite for lightweight persistence on Bun,
 * with a graceful no-op fallback for Node.js runtimes (e.g., Vercel).
 *
 * No cookies, no personal data, no IP tracking — just anonymous event counts.
 *
 * On Bun: events are stored in a file-based SQLite db at the project root.
 * On Node.js (Vercel): logging is silently dropped; dashboard shows zeros.
 *
 * Schema (when Bun is available):
 *   event_type: "trip_planned" | "booking_click"
 *   timestamp: ISO 8601 string
 *   budget: user's trip budget (trip_planned only)
 *   budget_gap: how much under budget (trip_planned, feasible only)
 *   is_feasible: 1 if trip was feasible, 0 otherwise
 *   peak_total_cost: what the trip would cost at peak prices (off-peak trips only)
 *   total_cost: actual total cost of the trip
 *   link_type: "flight" | "hotel" | "event" (booking_click only)
 */

const DB_PATH = "kpi.db";

// ─── No-op DB stub for runtimes without bun:sqlite ──────────────────────

/** Minimal interface covering the SQLite operations used in this module. */
interface KpiDb {
  prepare(sql: string): { run(...args: unknown[]): void };
  query(sql: string): { get(): unknown; all(): unknown[] };
}

function createNoOpDb(): KpiDb {
  return {
    prepare(_sql: string) {
      return {
        run(..._args: unknown[]) {
          // silently drop writes
        },
      };
    },
    query(_sql: string) {
      return {
        get() {
          // Return null — callers coerce to { count: 0 } or { avg_gap: null }
          return null;
        },
        all() {
          return [];
        },
      };
    },
  };
}

// ─── Lazy DB singleton ──────────────────────────────────────────────────

let _db: KpiDb | null = null;
let _dbInitialized = false;

function getDb(): KpiDb {
  if (_dbInitialized) return _db!;

  _dbInitialized = true;

  // Only attempt bun:sqlite if the Bun global is present.
  // We use a dynamic require() inside try-catch so the bundler leaves it
  // alone and it never crashes on Node.js runtimes (Vercel).
  if (typeof (globalThis as any).Bun !== "undefined") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const BunSqlite: any = require("bun:sqlite");
      const Database = BunSqlite.default ?? BunSqlite;
      const db = new Database(DB_PATH);
      db.run("PRAGMA journal_mode=WAL");
      db.run(`CREATE TABLE IF NOT EXISTS kpi_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        budget REAL,
        budget_gap REAL,
        is_feasible INTEGER,
        peak_total_cost REAL,
        total_cost REAL,
        link_type TEXT
      )`);
      _db = db;
      return _db;
    } catch {
      // bun:sqlite not loadable — fall through to no-op
    }
  }

  _db = createNoOpDb();
  return _db;
}

// ─── Types ──────────────────────────────────────────────────────────────

/** Shape of a KPI event to log */
export interface KpiEventPayload {
  event_type: "trip_planned" | "booking_click";
  budget?: number;
  budgetGap?: number;
  isFeasible?: boolean;
  peakTotalCost?: number;
  totalCost?: number;
  linkType?: string;
}

/** Shape of aggregated KPI data returned by the dashboard */
export interface KpiDashboard {
  tripsPlanned: number;
  avgBudgetAdherence: number | null; // average budget_gap for feasible trips
  bookingClicks: number;
  avgSavings: number | null; // average (peakTotalCost - totalCost) for off-peak trips
  recentTrips: Array<{
    timestamp: string;
    budget: number;
    isFeasible: boolean;
    totalCost?: number;
    budgetGap?: number;
  }>;
}

// ─── Server functions ───────────────────────────────────────────────────

/** Log a KPI event. Callable from client or server — always runs on the server. */
export const logKpiEvent = createServerFn({ method: "POST" })
  .validator((data: KpiEventPayload) => {
    if (!["trip_planned", "booking_click"].includes(data.event_type)) {
      throw new Error(`Invalid event_type: ${data.event_type}`);
    }
    return data;
  })
  .handler(async ({ data }) => {
    const db = getDb();
    const stmt = db.prepare(
      `INSERT INTO kpi_events
       (event_type, timestamp, budget, budget_gap, is_feasible, peak_total_cost, total_cost, link_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    stmt.run(
      data.event_type,
      new Date().toISOString(),
      data.budget ?? null,
      data.budgetGap ?? null,
      data.isFeasible != null ? (data.isFeasible ? 1 : 0) : null,
      data.peakTotalCost ?? null,
      data.totalCost ?? null,
      data.linkType ?? null,
    );
    return { success: true };
  });

/** Read aggregated KPI data for the dashboard. Server-only. */
export const getKpiData = createServerFn({ method: "GET" }).handler(async () => {
  const db = getDb();

  const tripsPlannedRow = db
    .query(
      "SELECT COUNT(*) as count FROM kpi_events WHERE event_type = 'trip_planned'",
    )
    .get() as { count: number } | null;

  const adherenceRow = db
    .query(
      "SELECT AVG(budget_gap) as avg_gap FROM kpi_events WHERE event_type = 'trip_planned' AND is_feasible = 1 AND budget_gap IS NOT NULL",
    )
    .get() as { avg_gap: number | null } | null;

  const bookingClicksRow = db
    .query(
      "SELECT COUNT(*) as count FROM kpi_events WHERE event_type = 'booking_click'",
    )
    .get() as { count: number } | null;

  const savingsRow = db
    .query(
      "SELECT AVG(peak_total_cost - total_cost) as avg_savings FROM kpi_events WHERE event_type = 'trip_planned' AND peak_total_cost IS NOT NULL AND total_cost IS NOT NULL",
    )
    .get() as { avg_savings: number | null } | null;

  const recentTrips = db
    .query(
      "SELECT timestamp, budget, is_feasible, total_cost, budget_gap FROM kpi_events WHERE event_type = 'trip_planned' ORDER BY id DESC LIMIT 10",
    )
    .all() as Array<{
    timestamp: string;
    budget: number;
    is_feasible: number;
    total_cost: number | null;
    budget_gap: number | null;
  }>;

  return {
    tripsPlanned: tripsPlannedRow?.count ?? 0,
    avgBudgetAdherence: adherenceRow?.avg_gap ?? null,
    bookingClicks: bookingClicksRow?.count ?? 0,
    avgSavings: savingsRow?.avg_savings ?? null,
    recentTrips: recentTrips.map((r) => ({
      timestamp: r.timestamp,
      budget: r.budget,
      isFeasible: r.is_feasible === 1,
      totalCost: r.total_cost ?? undefined,
      budgetGap: r.budget_gap ?? undefined,
    })),
  };
});
