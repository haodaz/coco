// Place: where the owner and the pet live, and what is true around them right now.
// Area-level only: the owner picks a town or neighbourhood and we keep its centre, never a street address.
// Live facts come from public data at the time of asking (Open-Meteo for weather and air, OpenStreetMap for services),
// and every fact carries its source and when it was checked.

export type Place = {
  area: string; // "Palo Alto, California, United States"
  name: string;
  region: string | null; // state or province
  country: string;
  countryCode: string; // "US"
  lat: number;
  lon: number;
  timezone: string;
  home: { type: "apartment" | "house" | "other" | null; yard: boolean | null; rules: string | null };
  services?: { items: Service[]; checkedAt: string } | null;
  setAt: string;
};

export type Service = { kind: ServiceKind; name: string; hours: string | null; osm: string; lat: number; lon: number };
export type ServiceKind = "dog_park" | "groomer" | "boarding" | "pet_shop" | "clinic";
export const SERVICE_LABEL: Record<ServiceKind, string> = { dog_park: "Dog parks", groomer: "Groomers", boarding: "Boarding", pet_shop: "Pet shops", clinic: "Clinics" };

export type Area = Omit<Place, "home" | "services" | "setAt">;

const UA = { "User-Agent": "coco/1.0 (github.com/haodaz/coco)" };

export async function findAreas(q: string): Promise<Area[]> {
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en`, { headers: UA });
  if (!r.ok) return [];
  const j = (await r.json()) as { results?: { name: string; admin1?: string; country: string; country_code: string; latitude: number; longitude: number; timezone: string }[] };
  return (j.results ?? []).map((x) => ({
    area: [x.name, x.admin1, x.country].filter(Boolean).join(", "),
    name: x.name,
    region: x.admin1 ?? null,
    country: x.country,
    countryCode: x.country_code,
    // the town's centre, rounded: enough for weather, never a home
    lat: Math.round(x.latitude * 100) / 100,
    lon: Math.round(x.longitude * 100) / 100,
    timezone: x.timezone,
  }));
}

export type Weather = {
  tempC: number;
  feelsC: number;
  sky: string;
  isDay: boolean;
  uv: number | null;
  aqi: number | null;
  next: { time: string; tempC: number }[]; // the next few hours
  localTime: string; // at the place, "2026-10-27T14:15"
  at: string; // when we checked (ISO)
};

// WMO weather codes in plain words
function sky(code: number) {
  if (code === 0) return "clear";
  if (code <= 2) return "partly cloudy";
  if (code === 3) return "cloudy";
  if (code <= 48) return "foggy";
  if (code <= 57) return "drizzle";
  if (code <= 67) return "rain";
  if (code <= 77) return "snow";
  if (code <= 82) return "showers";
  if (code <= 86) return "snow showers";
  return "thunderstorms";
}

const cache = new Map<string, { at: number; w: Weather }>();

export async function weatherAt(p: Pick<Place, "lat" | "lon">): Promise<Weather | null> {
  const key = `${p.lat},${p.lon}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 15 * 60_000) return hit.w;
  try {
    const [f, a] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&current=temperature_2m,apparent_temperature,weather_code,is_day,uv_index&hourly=temperature_2m&forecast_hours=6&timezone=auto`, { headers: UA }).then((r) => (r.ok ? r.json() : null)),
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${p.lat}&longitude=${p.lon}&current=us_aqi`, { headers: UA }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    if (!f?.current) return null;
    const w: Weather = {
      tempC: f.current.temperature_2m,
      feelsC: f.current.apparent_temperature,
      sky: sky(f.current.weather_code),
      isDay: f.current.is_day === 1,
      uv: f.current.uv_index ?? null,
      aqi: a?.current?.us_aqi ?? null,
      next: (f.hourly?.time ?? [])
        .map((t: string, i: number) => ({ t, time: t.slice(11, 16), tempC: f.hourly.temperature_2m[i] }))
        .filter((h: { t: string }) => h.t > f.current.time) // only the hours still ahead
        .map(({ time, tempC }: { time: string; tempC: number }) => ({ time, tempC })),
      localTime: f.current.time,
      at: new Date().toISOString(),
    };
    cache.set(key, { at: Date.now(), w });
    return w;
  } catch {
    return null;
  }
}

// Pet services around the area's centre, from OpenStreetMap. Names and hours only: listings, never advice.
// the main server can take half a minute when busy; one mirror as a quick second try
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
const TAGS: [ServiceKind, string][] = [
  ["dog_park", `["leisure"="dog_park"]`],
  ["groomer", `["shop"="pet_grooming"]`],
  ["boarding", `["amenity"="animal_boarding"]`],
  ["pet_shop", `["shop"="pet"]`],
  ["clinic", `["amenity"="veterinary"]`],
];

export async function servicesNear(p: Pick<Place, "lat" | "lon">, radius = 5000): Promise<Service[] | null> {
  const q = `[out:json][timeout:45];(${TAGS.map(([, t]) => `nwr${t}(around:${radius},${p.lat},${p.lon});`).join("")});out center tags 200;`;
  for (const url of OVERPASS) {
    try {
      const r = await fetch(url, { method: "POST", headers: { ...UA, "Content-Type": "application/x-www-form-urlencoded" }, body: `data=${encodeURIComponent(q)}`, signal: AbortSignal.timeout(url === OVERPASS[0] ? 48_000 : 20_000) });
      if (!r.ok) continue;
      const j = (await r.json()) as { elements: { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[] };
      const items: Service[] = [];
      for (const e of j.elements) {
        const t = e.tags ?? {};
        const kind = TAGS.find(([, sel]) => {
          const [k, v] = sel.slice(2, -2).split(`"="`);
          return t[k] === v;
        })?.[0];
        const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon;
        if (!kind || lat == null || lon == null) continue;
        if (!t.name && kind !== "dog_park") continue; // an unnamed shop helps no one
        items.push({ kind, name: t.name ?? "Dog park", hours: t.opening_hours ?? null, osm: `https://www.openstreetmap.org/${e.type}/${e.id}`, lat, lon });
      }
      // nearest first within each kind
      const d = (s: Service) => (s.lat - p.lat) ** 2 + ((s.lon - p.lon) * Math.cos((p.lat * Math.PI) / 180)) ** 2;
      return items.sort((a, b) => d(a) - d(b));
    } catch {
      /* try the next mirror */
    }
  }
  return null;
}

export const SERVICES_FRESH_DAYS = 30;
export const servicesStale = (pl: Place) => !pl.services || Date.now() - Date.parse(pl.services.checkedAt) > SERVICES_FRESH_DAYS * 86_400_000;
