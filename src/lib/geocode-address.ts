export type GeocodeAddressParts = {
  street?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
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
  return [streetLine, normalizePart(parts.city), normalizePart(parts.state), normalizePart(parts.zip)]
    .filter(Boolean)
    .join(", ");
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
  };
}

export function resolveGeocodeRegionForRequest(
  parts: GeocodeAddressParts,
  query: string,
): string | null {
  const zip = normalizePart(parts.zip) || extractZipFromQuery(query) || null;
  return resolveGeocodeRegion(parts.state, zip);
}

export function pickBestGeocodeResultForQuery(
  results: PositionstackResult[],
  query: string,
): PositionstackResult | null {
  if (results.length === 0) return null;

  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return results[0] ?? null;

  const tokens = normalizedQuery
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !QUERY_STOP_WORDS.has(token));

  if (tokens.length === 0) return results[0] ?? null;

  let best: PositionstackResult | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const result of results) {
    const label = String(result.label ?? "").toLowerCase();
    const region = String(result.region ?? "").toLowerCase();
    const regionCode = String(result.region_code ?? "").toLowerCase();
    const haystack = `${label} ${region} ${regionCode}`.trim();

    let score = 0;
    if (label.includes(normalizedQuery)) {
      score += 12;
    }

    for (const token of tokens) {
      if (label.includes(token)) {
        score += 4;
      } else if (haystack.includes(token)) {
        score += 2;
      }
    }

    if (score > bestScore) {
      best = result;
      bestScore = score;
    }
  }

  return best ?? results[0] ?? null;
}
