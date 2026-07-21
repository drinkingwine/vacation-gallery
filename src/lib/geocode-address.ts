export type GeocodeAddressParts = {
  street?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
};

export type PositionstackResult = {
  latitude: number;
  longitude: number;
  label?: string;
  postal_code?: string;
  region?: string;
  region_code?: string;
};

const QUERY_STOP_WORDS = new Set([
  "the",
  "and",
  "or",
  "of",
  "at",
  "in",
  "on",
  "st",
  "street",
  "ave",
  "avenue",
]);

/** Generic hospitality words that hurt exact place matching. */
const PLACE_NOISE_WORDS = new Set([
  ...QUERY_STOP_WORDS,
  "resort",
  "resorts",
  "hotel",
  "hotels",
  "spa",
  "club",
  "all",
  "inclusive",
  "adults",
  "only",
]);

const US_STATE =
  /^(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)$/i;

const US_STATE_NAMES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  DC: "District of Columbia",
};

const ZIP3_STATE_RANGES: ReadonlyArray<[number, number, string]> = [
  [350, 369, "AL"],
  [995, 999, "AK"],
  [850, 865, "AZ"],
  [716, 729, "AR"],
  [900, 966, "CA"],
  [800, 816, "CO"],
  [60, 69, "CT"],
  [197, 199, "DE"],
  [320, 349, "FL"],
  [300, 319, "GA"],
  [967, 968, "HI"],
  [832, 838, "ID"],
  [600, 629, "IL"],
  [460, 479, "IN"],
  [500, 529, "IA"],
  [660, 679, "KS"],
  [400, 427, "KY"],
  [700, 714, "LA"],
  [39, 49, "ME"],
  [206, 219, "MD"],
  [10, 27, "MA"],
  [480, 499, "MI"],
  [550, 567, "MN"],
  [386, 397, "MS"],
  [630, 658, "MO"],
  [590, 599, "MT"],
  [680, 693, "NE"],
  [889, 898, "NV"],
  [30, 38, "NH"],
  [70, 89, "NJ"],
  [870, 884, "NM"],
  [100, 149, "NY"],
  [270, 289, "NC"],
  [580, 588, "ND"],
  [430, 459, "OH"],
  [730, 749, "OK"],
  [970, 979, "OR"],
  [150, 196, "PA"],
  [28, 29, "RI"],
  [290, 299, "SC"],
  [570, 577, "SD"],
  [370, 385, "TN"],
  [750, 799, "TX"],
  [840, 847, "UT"],
  [50, 59, "VT"],
  [201, 246, "VA"],
  [980, 994, "WA"],
  [247, 268, "WV"],
  [530, 549, "WI"],
  [820, 831, "WY"],
  [200, 205, "DC"],
];

function normalizePart(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

function inferStateFromUsZip(zip: string): string | null {
  const digits = zip.replace(/\D/g, "").slice(0, 5);
  if (digits.length < 5) return null;

  const zip3 = Number(digits.slice(0, 3));
  if (Number.isNaN(zip3)) return null;

  for (const [start, end, state] of ZIP3_STATE_RANGES) {
    if (zip3 >= start && zip3 <= end) {
      return state;
    }
  }

  return null;
}

function isUsStateCode(value: string): boolean {
  return US_STATE.test(value.trim());
}

export function buildGeocodeQuery(parts: GeocodeAddressParts): string {
  const streetLine = [normalizePart(parts.street), normalizePart(parts.line2)].filter(Boolean).join(", ");
  return [
    streetLine,
    normalizePart(parts.city),
    normalizePart(parts.state),
    normalizePart(parts.zip),
    normalizePart(parts.country),
  ]
    .filter(Boolean)
    .join(", ");
}

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  "united states": "US",
  usa: "US",
  "united states of america": "US",
  "dominican republic": "DO",
  "republica dominicana": "DO",
  mexico: "MX",
  canada: "CA",
  italy: "IT",
  france: "FR",
  spain: "ES",
  germany: "DE",
  "united kingdom": "GB",
  uk: "GB",
  "great britain": "GB",
  ireland: "IE",
  portugal: "PT",
  greece: "GR",
  jamaica: "JM",
  bahamas: "BS",
  belize: "BZ",
  bonaire: "BQ",
  aruba: "AW",
  curacao: "CW",
  "cayman islands": "KY",
  "grand cayman": "KY",
  cayman: "KY",
  australia: "AU",
  japan: "JP",
  fiji: "FJ",
  beqa: "FJ",
  korea: "KR",
  "south korea": "KR",
  "republic of korea": "KR",
  philippines: "PH",
  philippine: "PH",
  phillipines: "PH",
  philipines: "PH",
  indonesia: "ID",
  indonisia: "ID",
  yap: "FM",
  micronesia: "FM",
  "federated states of micronesia": "FM",
  honduras: "HN",
};

function normalizeCountryName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractPrimaryLocationHint(query: string): string {
  const parts = query
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1]! : query.trim();
}

/** Place-name segment before city/region/country commas. */
export function extractPrimaryPlaceName(query: string): string {
  const parts = query
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts[0] ?? query.trim();
}

function stripPlaceNoiseWords(text: string): string {
  return text
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token && !PLACE_NOISE_WORDS.has(token.toLowerCase()))
    .join(" ")
    .trim();
}

/**
 * Alternate place queries for providers that choke on long resort strings
 * like "Excellence Resort, Riviera Cancun, Mexico".
 */
export function buildPlaceGeocodeQueryVariants(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const variants: string[] = [];
  const seen = new Set<string>();
  const add = (value: string) => {
    const next = value.trim().replace(/\s+/g, " ");
    if (!next) return;
    const key = next.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    variants.push(next);
  };

  const parts = trimmed
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const primary = parts[0] ?? trimmed;
  const cleanedPrimary = stripPlaceNoiseWords(primary) || primary;
  const middle = parts.length > 2 ? parts.slice(1, -1) : parts.slice(1);
  const country = parts.length > 1 ? parts[parts.length - 1]! : null;

  add(trimmed);
  add([cleanedPrimary, ...parts.slice(1)].filter(Boolean).join(", "));
  add([cleanedPrimary, ...middle, country].filter(Boolean).join(" "));
  add([cleanedPrimary, ...middle].filter(Boolean).join(", "));
  add([cleanedPrimary, ...middle].filter(Boolean).join(" "));

  if (middle.length > 0) {
    add(`${cleanedPrimary} ${middle.join(" ")}`);
  }

  add(cleanedPrimary);
  if (country) {
    add(`${cleanedPrimary}, ${country}`);
    if (middle.length > 0) {
      add(`${cleanedPrimary}, ${middle.join(", ")}, ${country}`);
    }
  }

  return variants;
}

export function inferCountryCodeFromText(text?: string | null): string | null {
  const normalized = normalizeCountryName(normalizePart(text));
  if (!normalized) return null;

  if (
    /\bcayman islands\b/.test(normalized) ||
    /\bgrand cayman\b/.test(normalized) ||
    /\bcayman\b/.test(normalized)
  ) {
    return "KY";
  }

  if (/\bbonaire\b/.test(normalized)) {
    return "BQ";
  }

  if (/\baruba\b/.test(normalized)) {
    return "AW";
  }

  if (/\bcuracao\b/.test(normalized) || /\bcuraçao\b/.test(normalized)) {
    return "CW";
  }

  if (
    /\bdominican\b/.test(normalized) ||
    /\bdominicana\b/.test(normalized) ||
    /\bcominican\b/.test(normalized) ||
    /\brepublica dominicana\b/.test(normalized) ||
    (/\bdominic/.test(normalized) && /\brepublic\b/.test(normalized))
  ) {
    return "DO";
  }

  if (/\bunited states\b/.test(normalized) || /\bamerica\b/.test(normalized)) {
    return "US";
  }

  for (const [name, code] of Object.entries(COUNTRY_NAME_TO_CODE)) {
    if (normalized.includes(name)) {
      return code;
    }
  }

  return null;
}

export function resolveCountryCode(country?: string | null): string | null {
  const raw = normalizePart(country);
  if (!raw) return null;
  if (/^[a-z]{2}$/i.test(raw)) return raw.toUpperCase();

  const normalized = normalizeCountryName(raw);
  if (COUNTRY_NAME_TO_CODE[normalized]) {
    return COUNTRY_NAME_TO_CODE[normalized];
  }

  return inferCountryCodeFromText(raw);
}

export function resolveCountryCodeForRequest(
  parts: GeocodeAddressParts,
  query: string,
  mode: "place" | "address",
): string | null {
  const fromField = resolveCountryCode(parts.country);
  if (fromField) return fromField;

  const fromQuery = inferCountryCodeFromText(query);
  if (fromQuery) return fromQuery;

  if (mode === "place") {
    const fromHint = inferCountryCodeFromText(extractPrimaryLocationHint(query));
    if (fromHint) return fromHint;
  }

  if (mode === "address" && !normalizePart(parts.country)) {
    return "US";
  }

  return null;
}

export function extractZipFromQuery(query: string): string | null {
  const match = query.match(/\b(\d{5})(?:-\d{4})?\b/);
  return match?.[1] ?? null;
}

export function resolveGeocodeRegion(state?: string | null, zip?: string | null): string | null {
  const normalizedState = normalizePart(state).toUpperCase();
  if (normalizedState && US_STATE_NAMES[normalizedState]) {
    return US_STATE_NAMES[normalizedState];
  }

  const zipDigits = normalizePart(zip).replace(/\D/g, "").slice(0, 5);
  const inferredState = zipDigits.length === 5 ? inferStateFromUsZip(zipDigits) : null;
  if (inferredState && US_STATE_NAMES[inferredState]) {
    return US_STATE_NAMES[inferredState];
  }

  return null;
}

export function pickBestGeocodeResult(
  results: PositionstackResult[],
  hints: GeocodeAddressParts = {},
): PositionstackResult | null {
  if (results.length === 0) return null;

  const targetZip = normalizePart(hints.zip).replace(/\D/g, "").slice(0, 5);
  const targetState = normalizePart(hints.state).toUpperCase();

  if (targetZip) {
    const zipMatch = results.find((result) =>
      String(result.postal_code ?? "")
        .replace(/\D/g, "")
        .startsWith(targetZip),
    );
    if (zipMatch) return zipMatch;
  }

  if (targetState && isUsStateCode(targetState)) {
    const stateMatch = results.find((result) => {
      const regionCode = normalizePart(result.region_code).toUpperCase();
      const regionName = US_STATE_NAMES[targetState];
      return regionCode === targetState || result.region === regionName;
    });
    if (stateMatch) return stateMatch;
  }

  return results[0] ?? null;
}

export function parseGeocodeAddressPartsFromSearchParams(
  searchParams: URLSearchParams,
): GeocodeAddressParts {
  return {
    street: searchParams.get("street"),
    line2: searchParams.get("line2"),
    city: searchParams.get("city"),
    state: searchParams.get("state"),
    zip: searchParams.get("zip"),
    country: searchParams.get("country"),
  };
}

export function resolveGeocodeRegionForRequest(
  parts: GeocodeAddressParts,
  query: string,
): string | null {
  const countryCode = resolveCountryCode(parts.country);
  if (countryCode && countryCode !== "US") return null;

  const zip = normalizePart(parts.zip) || extractZipFromQuery(query) || null;
  return resolveGeocodeRegion(parts.state, zip);
}

export function isGeocodeResultCountryMismatch(
  result: PositionstackResult,
  query: string,
): boolean {
  const locationHint = extractPrimaryLocationHint(query);
  const inferredCountry =
    inferCountryCodeFromText(query) ?? inferCountryCodeFromText(locationHint);
  if (!inferredCountry || inferredCountry === "US") return false;
  return looksLikeUnitedStates(String(result.label ?? ""));
}

function extractQueryTokens(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !QUERY_STOP_WORDS.has(token));
}

function extractDistinctivePlaceTokens(query: string): string[] {
  return extractPrimaryPlaceName(query)
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !PLACE_NOISE_WORDS.has(token));
}

function tokenMatchScore(token: string, haystack: string): number {
  if (!haystack.includes(token)) return 0;
  return Math.min(10, 3 + Math.floor(token.length / 2));
}

function looksLikeUnitedStates(label: string): boolean {
  const normalized = label.toLowerCase();
  if (/\bcayman\b/.test(normalized)) return false;
  // Country Mexico is not the US state New Mexico.
  if (/(^|,\s*)mexico\s*$/i.test(label.trim()) || /,\s*m[eé]xico\b/i.test(label)) {
    return false;
  }

  return (
    /\b(united states|usa|u\.s\.a\.)\b/.test(normalized) ||
    /\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming)\b/.test(
      normalized,
    ) ||
    /,\s*(al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|in|ia|ks|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy)\b/i.test(
      label,
    )
  );
}

export function scoreGeocodeResultForQuery(
  result: PositionstackResult,
  query: string,
): number {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return 0;

  const locationHint = extractPrimaryLocationHint(query).toLowerCase();
  const hintTokens = extractQueryTokens(locationHint);
  const tokens = extractQueryTokens(query);
  const primaryTokens = extractDistinctivePlaceTokens(query);
  const inferredCountry =
    inferCountryCodeFromText(query) ?? inferCountryCodeFromText(locationHint);

  const label = String(result.label ?? "").toLowerCase();
  const region = String(result.region ?? "").toLowerCase();
  const regionCode = String(result.region_code ?? "").toLowerCase();
  const haystack = `${label} ${region} ${regionCode}`.trim();

  let score = 0;
  if (label.includes(normalizedQuery)) {
    score += 16;
  }

  if (locationHint && label.includes(locationHint)) {
    score += 20;
  }

  for (const token of hintTokens) {
    score += tokenMatchScore(token, haystack) + 4;
  }

  for (const token of tokens) {
    if (PLACE_NOISE_WORDS.has(token)) continue;
    score += tokenMatchScore(token, haystack);
  }

  for (const token of primaryTokens) {
    const match = tokenMatchScore(token, haystack);
    if (match > 0) {
      score += match + 10;
    } else {
      score -= 18;
    }
  }

  if (inferredCountry && inferredCountry !== "US" && looksLikeUnitedStates(label)) {
    score -= 24;
  }

  if (inferredCountry === "KY" && /\bcayman\b/.test(haystack)) {
    score += 12;
  }

  if (inferredCountry === "MX" && /\bm[eé]xico\b/.test(haystack)) {
    score += 8;
  }

  return score;
}

/** Reject weak matches that miss the distinctive place name tokens. */
export function isWeakPlaceGeocodeMatch(
  result: PositionstackResult,
  query: string,
): boolean {
  const primaryTokens = extractDistinctivePlaceTokens(query);
  if (primaryTokens.length === 0) return false;

  const label = String(result.label ?? "").toLowerCase();
  const region = String(result.region ?? "").toLowerCase();
  const haystack = `${label} ${region}`;
  const matched = primaryTokens.filter((token) => haystack.includes(token));
  return matched.length === 0;
}

export function pickBestGeocodeResultForQuery(
  results: PositionstackResult[],
  query: string,
): PositionstackResult | null {
  if (results.length === 0) return null;

  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return results[0] ?? null;

  let best: PositionstackResult | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const result of results) {
    const score = scoreGeocodeResultForQuery(result, query);
    if (score > bestScore) {
      best = result;
      bestScore = score;
    }
  }

  return best ?? results[0] ?? null;
}
