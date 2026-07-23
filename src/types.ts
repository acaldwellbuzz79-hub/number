/** Seasonal pricing profile for a destination */
export interface Seasonality {
  /** 3-letter month abbreviations (e.g., "Jun") */
  peak: string[];
  shoulder: string[];
  offPeak: string[];
  /** How much cheaper off-peak is vs peak, as a whole percent (e.g., 35 means 35% savings) */
  savingsPercent: number;
}

/** A single flight option */
export interface Flight {
  id: string;
  airline: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  price: number; // per person, all-in
  stops: number;
  departureAirport: string;
  arrivalAirport: string;
  /** Airline flight number (e.g. "DL1234") — populated by real API */
  flightNumber?: string;
  /** Deep-link to book this flight — populated by real API */
  bookingLink?: string;
}

/** Price tier for hotels */
export type HotelTier = "budget" | "mid" | "premium";

/** A hotel / stay option */
export interface Hotel {
  id: string;
  name: string;
  rating: number; // 1-5
  pricePerNight: number; // all-in per night
  amenities: string[];
  image: string; // placeholder name or emoji
  /** Price tier: budget (hostels/motels), mid (3-star chains), premium (4-star affordable) */
  tier: HotelTier;
  /** Deep-link to book this hotel — populated by real API */
  bookingLink?: string;
}

/** A single activity */
export interface Activity {
  id: string;
  name: string;
  description: string;
  price: number; // per person, 0 for free
  category: "free" | "paid";
}

/** The user's trip parameters */
export interface TripParams {
  budget: number;
  /** Departure city name (e.g. "Chicago") */
  departure: string;
  /** Arrival/destination city name (e.g. "Miami") */
  arrival: string;
  departureDate: string;
  returnDate: string;
  travelers: number;
  /** Whether off-peak pricing was requested */
  offPeak?: boolean;
  /** Whether the user wants us to auto-pick the cheapest dates */
  flexibleDates?: boolean;
  /** Whether the user is driving — no flight search needed */
  driving?: boolean;
}

/** Computed trip result */
export interface TripResult {
  flights: Flight[];
  /** Primary hotel used for total cost calculation (cheapest that fits) */
  hotel: Hotel | null;
  /** All hotel options at different tiers that fit within budget (up to 3) */
  hotels: Hotel[];
  activities: Activity[];
  totalCost: number;
  nights: number;
  budgetGap: number;
  isFeasible: boolean;
  /** Departure city name */
  departure: string;
  /** Arrival city name */
  arrival: string;
  /** What the trip would have cost at peak prices (only set when offPeak was used) */
  peakTotalCost?: number;
  /** Whether off-peak pricing was applied */
  offPeak?: boolean;
  /** Whether flexible dates were used — we auto-picked the cheapest month */
  flexibleDates?: boolean;
  /** The month we auto-selected when flexibleDates was used (e.g. "November") */
  flexibleDatesMonth?: string;
  /** Whether this is a road trip — no flights used */
  driving?: boolean;
}

/** A show, tour, or attraction that can be added to a trip */
export interface Event {
  name: string;
  category: string; // "Show", "Tour", "Attraction", etc.
  pricePerPerson: number;
  description: string; // one-line description
  bookingLink: string; // affiliate link (Viator, Ticketmaster, etc.)
  emoji: string; // icon for the card
}

/** User input for a single leg of a multi-leg trip */
export interface LegInput {
  /** Arrival/destination city for this leg (departure auto-set from previous leg) */
  arrival: string;
  departureDate: string;
  returnDate: string;
}

/** A single completed leg of a multi-leg trip */
export interface TripLeg {
  departure: string;
  arrival: string;
  departureDate: string;
  returnDate: string;
  nights: number;
  flights: Flight[];
  hotel: Hotel | null;
  hotels: Hotel[];
  activities: Activity[];
  totalCost: number;
  offPeak?: boolean;
  flexibleDates?: boolean;
  flexibleDatesMonth?: string;
}

/** Computed multi-leg trip result */
export interface MultiLegTripResult {
  legs: TripLeg[];
  totalCost: number;
  budgetGap: number;
  isFeasible: boolean;
  travelers: number;
  budget: number;
  peakTotalCost?: number;
  offPeak?: boolean;
  flexibleDates?: boolean;
  flexibleDatesMonth?: string;
}

/** All data for a known destination */
export interface DestinationData {
  flights: Flight[];
  hotels: Hotel[];
  activities: Activity[];
  /** Shows, tours, and attractions users can optionally add to their trip */
  events: Event[];
  /** Seasonal pricing profile (optional — only known destinations have this) */
  seasonality?: Seasonality;
}
