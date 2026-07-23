import { createServerFn } from "@tanstack/react-start";
import type { Flight, Hotel } from "~/types";
import { getIata } from "~/data/cities";

// ============================================================================
// OAuth 2.0 Token Management (Client Credentials Grant)
// ============================================================================

const AUTH_URL = "https://test.api.amadeus.com/v1/security/oauth2/token";

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

/**
 * Obtain an Amadeus OAuth access token using client credentials.
 * Caches the token for its 30-minute lifetime (minus a 60-second safety margin).
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const key = process.env.AMADEUS_API_KEY;
  const secret = process.env.AMADEUS_API_SECRET;

  if (!key || !secret) {
    throw new Error("Amadeus API credentials not configured");
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: key,
    client_secret: secret,
  });

  const response = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`Amadeus auth failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedToken = data.access_token;
  // Expire 60 seconds early to avoid edge-case expiry mid-request
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;

  return cachedToken;
}

// ============================================================================
// Amadeus API response shapes (subset of fields we care about)
// ============================================================================

interface AmadeusSegment {
  departure: { iataCode: string; at: string };
  arrival: { iataCode: string; at: string };
  carrierCode: string;
  number: string;
}

interface AmadeusItinerary {
  segments: AmadeusSegment[];
}

interface AmadeusFlightOffer {
  price: { grandTotal: string; currency: string };
  itineraries: AmadeusItinerary[];
  validatingAirlineCodes: string[];
}

interface AmadeusByCityHotel {
  hotelId: string;
  name: string;
  iataCode: string;
}

interface AmadeusHotelOffer {
  hotel: {
    hotelId: string;
    name: string;
    rating?: string;
  };
  offers: Array<{
    price: { total: string; currency: string };
  }>;
}

// ============================================================================
// Mapping helpers — transform raw Amadeus responses into our domain types
// ============================================================================

/** Format an ISO date string to a short display format like "Aug 1" */
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function mapFlight(raw: AmadeusFlightOffer, idx: number): Flight {
  const outbound = raw.itineraries[0];
  const inbound = raw.itineraries[1];

  const firstSeg = outbound.segments[0];
  const lastSeg =
    (inbound ?? outbound).segments[
      (inbound ?? outbound).segments.length - 1
    ];

  // Count stops: total segments minus number of itineraries (each itinerary
  // has N segments = N-1 stops)
  const totalStops = raw.itineraries.reduce(
    (sum, it) => sum + it.segments.length - 1,
    0,
  );
  const durationLabel =
    totalStops === 0
      ? "Nonstop"
      : `${totalStops} stop${totalStops > 1 ? "s" : ""}`;

  return {
    id: `am-fl-${idx}`,
    airline: raw.validatingAirlineCodes?.[0] ?? firstSeg.carrierCode,
    flightNumber: `${firstSeg.carrierCode}${firstSeg.number}`,
    departureTime: fmtDate(firstSeg.departure.at),
    arrivalTime: fmtDate(lastSeg.arrival.at),
    duration: durationLabel,
    price: Math.round(parseFloat(raw.price.grandTotal)),
    stops: totalStops,
    departureAirport: firstSeg.departure.iataCode,
    arrivalAirport: lastSeg.arrival.iataCode,
  };
}

function mapHotel(raw: AmadeusHotelOffer, idx: number, nights: number): Hotel {
  const totalPrice = parseFloat(raw.offers?.[0]?.price?.total ?? "0");

  return {
    id: `am-ht-${idx}`,
    name: raw.hotel.name,
    rating: raw.hotel.rating ? parseFloat(raw.hotel.rating) : 3,
    pricePerNight: nights > 0 ? Math.round(totalPrice / nights) : 0,
    amenities: [],
    image: "🏨",
  };
}

// ============================================================================
// Parameter types for the server functions
// ============================================================================

interface FlightSearchParams {
  departure: string;
  arrival: string;
  departureDate: string;
  returnDate: string;
}

interface HotelSearchParams {
  arrival: string;
  checkIn: string;
  checkOut: string;
}

// ============================================================================
// Server Functions — these run server-side so the API secrets stay private
// ============================================================================

/**
 * Check whether Amadeus API credentials are configured.
 * Returns true only when both AMADEUS_API_KEY and AMADEUS_API_SECRET are set.
 */
export const isApiKeySet = createServerFn({ method: "GET" }).handler(
  async (): Promise<boolean> => {
    return !!(process.env.AMADEUS_API_KEY && process.env.AMADEUS_API_SECRET);
  },
);

/**
 * Search for real flight deals via the Amadeus Flight Offers Search API.
 * Falls back to an empty array on any error so the caller can use mock data.
 */
export const searchFlights = createServerFn({ method: "GET" })
  .validator((params: FlightSearchParams) => params)
  .handler(async ({ data: params }): Promise<Flight[]> => {
    try {
      const key = process.env.AMADEUS_API_KEY;
      const secret = process.env.AMADEUS_API_SECRET;
      if (!key || !secret) return [];

      const departureIata = getIata(params.departure);
      const arrivalIata = getIata(params.arrival);
      if (!departureIata || !arrivalIata) return [];

      const token = await getAccessToken();

      const url = new URL(
        "https://test.api.amadeus.com/v2/shopping/flight-offers",
      );
      url.searchParams.set("originLocationCode", departureIata);
      url.searchParams.set("destinationLocationCode", arrivalIata);
      url.searchParams.set("departureDate", params.departureDate);
      url.searchParams.set("returnDate", params.returnDate);
      url.searchParams.set("adults", "1");
      url.searchParams.set("currencyCode", "USD");
      url.searchParams.set("max", "5");

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) return [];

      const json = (await response.json()) as {
        data?: AmadeusFlightOffer[];
      };

      if (!Array.isArray(json.data) || json.data.length === 0) {
        return [];
      }

      return json.data.map((f, i) => mapFlight(f, i));
    } catch {
      // Silently fall back — any error means "no API results"
      return [];
    }
  });

/**
 * Search for real hotel deals via the Amadeus Hotel Search APIs.
 * Two-step process:
 *   1. Find hotels in the destination city (by-city)
 *   2. Get offers for those hotels (hotel-offers)
 * Falls back to an empty array on any error so the caller can use mock data.
 */
export const searchHotels = createServerFn({ method: "GET" })
  .validator((params: HotelSearchParams) => params)
  .handler(async ({ data: params }): Promise<Hotel[]> => {
    try {
      const key = process.env.AMADEUS_API_KEY;
      const secret = process.env.AMADEUS_API_SECRET;
      if (!key || !secret) return [];

      const arrivalIata = getIata(params.arrival);
      if (!arrivalIata) return [];

      const token = await getAccessToken();

      // Step 1: Find hotels in the destination city
      const byCityUrl = new URL(
        "https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city",
      );
      byCityUrl.searchParams.set("cityCode", arrivalIata);
      byCityUrl.searchParams.set("radius", "20");
      byCityUrl.searchParams.set("radiusUnit", "KM");

      const cityResponse = await fetch(byCityUrl.toString(), {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8000),
      });

      if (!cityResponse.ok) return [];

      const cityJson = (await cityResponse.json()) as {
        data?: AmadeusByCityHotel[];
      };

      if (!Array.isArray(cityJson.data) || cityJson.data.length === 0) {
        return [];
      }

      // Take up to 5 hotel IDs for the offers query
      const hotelIds = cityJson.data
        .slice(0, 5)
        .map((h) => h.hotelId)
        .join(",");

      // Step 2: Get offers for those hotels
      const offersUrl = new URL(
        "https://test.api.amadeus.com/v3/shopping/hotel-offers",
      );
      offersUrl.searchParams.set("hotelIds", hotelIds);
      offersUrl.searchParams.set("adults", "1");
      offersUrl.searchParams.set("checkInDate", params.checkIn);
      offersUrl.searchParams.set("checkOutDate", params.checkOut);
      offersUrl.searchParams.set("currency", "USD");

      const offersResponse = await fetch(offersUrl.toString(), {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8000),
      });

      if (!offersResponse.ok) return [];

      const offersJson = (await offersResponse.json()) as {
        data?: AmadeusHotelOffer[];
      };

      if (
        !Array.isArray(offersJson.data) ||
        offersJson.data.length === 0
      ) {
        return [];
      }

      // Compute nights for per-night price
      const nights = Math.max(
        1,
        Math.round(
          (new Date(params.checkOut).getTime() -
            new Date(params.checkIn).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      );

      return offersJson.data.map((h, i) => mapHotel(h, i, nights));
    } catch {
      return [];
    }
  });
