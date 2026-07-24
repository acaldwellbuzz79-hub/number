import { createFileRoute, Link } from "@tanstack/react-router";
import { getDestinationData, KNOWN_DESTINATIONS } from "~/data/mockData";
import type { DestinationData } from "~/types";

const SITE_URL = "https://vacayscout.com";

/** Map a URL slug (e.g. "new-york") back to the mock data key (e.g. "new york") */
function slugToKey(slug: string): string {
  return slug.replace(/-/g, " ");
}

/** Title-case format a slug for display (e.g. "new-york" → "New York") */
function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((word) => {
      if (word.length === 2 && word.toUpperCase() === word) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export const Route = createFileRoute("/destination/$slug")({
  head: ({ params }) => {
    const key = slugToKey(params.slug);
    const destData = getDestinationData(key);
    const title = destData
      ? `${slugToTitle(params.slug)} Vacation Budget Planner — VacayScout`
      : "Destination — VacayScout";
    const description = destData
      ? `Plan a ${slugToTitle(params.slug)} vacation that fits your budget. Find flights, hotels, and free activities — all within your price range.`
      : "Plan a vacation that fits your budget. Set your limit, pick a destination, and we find everything within your price range.";

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `${SITE_URL}/destination/${params.slug}` },
        { property: "og:site_name", content: "VacayScout" },
      ],
      links: [
        { rel: "canonical", href: `${SITE_URL}/destination/${params.slug}` },
      ],
    };
  },
  loader: ({ params }) => {
    const key = slugToKey(params.slug);
    const destData = getDestinationData(key);
    return { destData, key, displayName: slugToTitle(params.slug) };
  },
  component: DestinationPage,
});

function DestinationPage() {
  const { destData, displayName } = Route.useLoaderData();

  if (!destData) {
    return <NotFoundDestination displayName={displayName} />;
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg px-1 py-1 text-lg font-bold text-teal-700 transition-colors hover:text-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          >
            <span aria-hidden="true">🌴</span>
            VacayScout
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="bg-gradient-to-b from-teal-50 to-white px-4 py-12">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              {displayName} on a Budget
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Find flights, affordable stays, and free activities in {displayName} —
              all within your price range. No upsells, no surprises.
            </p>
            <Link
              to="/"
              className="mt-8 inline-block rounded-xl bg-teal-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
            >
              Start Planning Your {displayName} Trip →
            </Link>
          </div>
        </section>

        {/* Seasonality info */}
        {destData.seasonality && (
          <section className="px-4 py-8">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-xl font-semibold text-gray-900">
                Best Time to Visit {displayName}
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <SeasonCard
                  label="Peak Season"
                  months={destData.seasonality.peak}
                  color="bg-amber-50 border-amber-200 text-amber-800"
                />
                <SeasonCard
                  label="Shoulder Season"
                  months={destData.seasonality.shoulder}
                  color="bg-blue-50 border-blue-200 text-blue-800"
                />
                <SeasonCard
                  label="Off-Peak (Save up to {destData.seasonality.savingsPercent}%)"
                  months={destData.seasonality.offPeak}
                  color="bg-green-50 border-green-200 text-green-800"
                />
              </div>
              <p className="mt-3 text-sm text-gray-500">
                Traveling off-peak could save up to{" "}
                {destData.seasonality.savingsPercent}% on flights and hotels.
              </p>
            </div>
          </section>
        )}

        {/* Hotels preview */}
        {destData.hotels.length > 0 && (
          <section className="bg-gray-50 px-4 py-8">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-xl font-semibold text-gray-900">
                Where to Stay
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Budget, mid-range, and premium options — all in your price range
              </p>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {destData.hotels.slice(0, 6).map((hotel) => (
                  <li
                    key={hotel.id}
                    className="rounded-xl border border-gray-200 bg-white p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900 text-sm">
                        {hotel.name}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 capitalize">
                        {hotel.tier}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        ⭐ {hotel.rating}
                      </span>
                      <span className="font-bold text-teal-700">
                        ${hotel.pricePerNight}
                        <span className="text-xs font-normal text-gray-400">
                          /night
                        </span>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Free activities */}
        {destData.activities.filter((a) => a.price === 0).length > 0 && (
          <section className="px-4 py-8">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-xl font-semibold text-gray-900">
                Free Things to Do
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {displayName} has plenty to offer without spending a dime
              </p>
              <ul className="mt-4 space-y-3">
                {destData.activities
                  .filter((a) => a.price === 0)
                  .slice(0, 5)
                  .map((activity) => (
                    <li
                      key={activity.id}
                      className="flex items-start gap-3 rounded-lg border border-green-100 bg-green-50 p-3"
                    >
                      <span className="mt-0.5 flex-shrink-0 rounded-full bg-green-200 p-1 text-xs">
                        🆓
                      </span>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {activity.name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {activity.description}
                        </p>
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="px-4 py-8">
          <div className="mx-auto max-w-md rounded-2xl bg-teal-600 p-8 text-center text-white">
            <h2 className="text-xl font-bold">Ready to Plan Your Trip?</h2>
            <p className="mt-2 text-teal-100">
              Set your budget and we'll build a complete {displayName} trip that
              fits.
            </p>
            <Link
              to="/"
              className="mt-6 inline-block rounded-xl bg-white px-6 py-3 text-base font-semibold text-teal-700 shadow-sm transition-colors hover:bg-teal-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-teal-600"
            >
              Plan My {displayName} Trip →
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-100 bg-white py-4 text-center text-xs text-gray-400">
        VacayScout — Honest trip planning for real budgets
      </footer>
    </div>
  );
}

/** Card for peak/shoulder/off-peak seasons */
function SeasonCard({
  label,
  months,
  color,
}: {
  label: string;
  months: string[];
  color: string;
}) {
  return (
    <div className={`rounded-lg border p-4 ${color}`}>
      <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-sm">{months.join(", ")}</p>
    </div>
  );
}

/** 404-style page for unknown destination slugs */
function NotFoundDestination({ displayName }: { displayName: string }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-4xl items-center px-4 py-3">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg px-1 py-1 text-lg font-bold text-teal-700"
          >
            <span aria-hidden="true">🌴</span>
            VacayScout
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Destination Not Found
          </h1>
          <p className="mt-2 text-gray-600">
            We don't have data for "{displayName}" yet.{" "}
            <Link to="/" className="text-teal-600 underline">
              Plan a different trip →
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
