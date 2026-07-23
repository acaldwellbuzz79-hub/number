/**
 * IATA code mapping for US cities.
 * Maps user-facing city names (lowercase) to their primary airport IATA codes.
 */
export const CITY_IATA: Record<string, string> = {
  "new york": "JFK",
  miami: "MIA",
  "las vegas": "LAS",
  orlando: "MCO",
  chicago: "ORD",
  "los angeles": "LAX",
  atlanta: "ATL",
  dallas: "DFW",
  denver: "DEN",
  seattle: "SEA",
  boston: "BOS",
  "san francisco": "SFO",
  phoenix: "PHX",
  houston: "IAH",
  detroit: "DTW",
  minneapolis: "MSP",
  philadelphia: "PHL",
  "washington dc": "DCA",
  portland: "PDX",
};

/** All known city names for autocomplete suggestions */
export const KNOWN_CITIES = Object.keys(CITY_IATA);

/**
 * Resolve a user-facing city name to its primary IATA airport code.
 * Returns null when the city isn't in our known mapping.
 */
export function getIata(cityName: string): string | null {
  return CITY_IATA[cityName.toLowerCase().trim()] ?? null;
}
