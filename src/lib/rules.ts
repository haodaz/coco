import { SERVICE_LABEL, servicesStale, weatherAt, type Place, type ServiceKind, type Weather } from "./place";

// The checks that run before the pet speaks up about a plan. They are code, not the model:
// the model only puts the result into the pet's words and cites the facts by id.
// Every rule is quoted or summarised from an official page, with its link and the date we checked it.

export type Fact = {
  id: string;
  kind: "weather" | "check" | "rule" | "home" | "services";
  title: string;
  text: string;
  source: string;
  url: string | null;
  at: string; // when this was checked (ISO or YYYY-MM-DD)
  level?: "ok" | "careful" | "no"; // for checks
};

const CHECKED = "2026-10-27";

// Table of State Laws that Protect Animals Left in Parked Vehicles, Animal Legal & Historical Center (MSU College of Law), 2025.
const HOT_CAR_LAWS: Record<string, string> = {
  Arizona: "A.R.S. § 13-2910; A.R.S. 12-558.02",
  California: "Cal. Penal Code § 597.7; Cal. Civ. Code § 43.100",
  Colorado: "C.R.S.A. 13-21-108.4; C.R.S.A. 18-1-706.5",
  Connecticut: "C.G.S.A. § 52-557u",
  Delaware: "11 Del.C. § 1325(b)(6)",
  Florida: "F.S.A. § 768.139",
  Georgia: "Ga. Code Ann. § 35-1-7",
  Illinois: "510 ILCS 70/7.1",
  Indiana: "I.C. 34-30-30-1 to 4",
  Kansas: "K.S.A. 60-5401",
  Louisiana: "LSA-R.S. 37:1738.1",
  Maine: "7 M.R.S.A. 4011; 7 M.R.S.A. § 4019",
  Maryland: "MD Code, Transportation, § 21-1004.1",
  Massachusetts: "M.G.L.A. 140 § 174F",
  Minnesota: "M.S.A. § 346.57",
  Nevada: "N.R.S. 574.195",
  "New Hampshire": "N.H. Rev. Stat. 644:8-aa",
  "New Jersey": "N.J.S.A. 4:22-26 and related sections",
  "New York": "NY Agri. & Mkts. § 353-d",
  "North Carolina": "N.C.G.S.A. § 14-363.3",
  "North Dakota": "NDCC 36-21.2-12",
  Ohio: "R.C. § 959.133",
  Oregon: "O.R.S. § 30.813",
  Pennsylvania: "42 Pa.C.S.A. § 8340.3",
  "Rhode Island": "Gen. Laws § 4-1-3.2",
  "South Dakota": "SDCL § 40-1-36",
  Tennessee: "T.C.A. § 29-34-209",
  Vermont: "13 V.S.A. § 386; 12 V.S.A. § 5784",
  Virginia: "Va. Code Ann. § 3.2-6504.1",
  Washington: "RCWA 16.52.340",
  "West Virginia": "W. Va. Code § 61-8-19",
  Wisconsin: "W.S.A. 895.484",
};

const AVMA_HOT = "https://www.avma.org/resources-tools/pet-owners/petcare/pets-vehicles";
const AVMA_COLD = "https://www.avma.org/resources-tools/pet-owners/petcare/cold-weather-animal-safety";

const f = (c: number) => Math.round((c * 9) / 5 + 32);
const c = (fahr: number) => Math.round(((fahr - 32) * 5) / 9);

// EPA's AQI categories (AirNow)
function aqiBand(aqi: number) {
  if (aqi <= 50) return { name: "Good", level: "ok" as const };
  if (aqi <= 100) return { name: "Moderate", level: "ok" as const };
  if (aqi <= 150) return { name: "Unhealthy for sensitive groups", level: "careful" as const };
  if (aqi <= 200) return { name: "Unhealthy", level: "careful" as const };
  if (aqi <= 300) return { name: "Very unhealthy", level: "no" as const };
  return { name: "Hazardous", level: "no" as const };
}

// The parked-car check. The answer is always "don't leave me"; the weather decides how strongly and why.
function carCheck(w: Weather, petName: string): Fact {
  const out = w.tempC;
  const in10 = c(f(out) + 20), in60 = c(f(out) + 40);
  const cold = out <= 7;
  const hot = in10 >= 32;
  const text = cold
    ? `It's ${Math.round(out)}°C (${f(out)}°F) outside. In cold weather a parked car cools like a refrigerator (AVMA). Don't leave ${petName} waiting in it.`
    : `It's ${Math.round(out)}°C (${f(out)}°F) outside. A parked car can get almost 20°F warmer in 10 minutes and more than 40°F warmer in an hour (AVMA): about ${in10}°C after 10 minutes and ${in60}°C after an hour today. Cracking a window makes little difference. Don't leave ${petName} waiting in it.`;
  return {
    id: "check-car",
    kind: "check",
    title: "Waiting in a parked car",
    text,
    source: "American Veterinary Medical Association, with today's temperature",
    url: cold ? AVMA_COLD : AVMA_HOT,
    at: w.at,
    level: hot || cold ? "no" : "careful",
  };
}

export type PlaceFacts = { place: Place | null; weather: Weather | null; facts: Fact[] };

export async function placeFacts(place: Place | null | undefined, petName: string): Promise<PlaceFacts> {
  if (!place) return { place: null, weather: null, facts: [] };
  const w = await weatherAt(place);
  const facts: Fact[] = [];
  if (w) {
    facts.push({
      id: "weather-now",
      kind: "weather",
      title: `Now in ${place.name}`,
      text: `${Math.round(w.tempC)}°C (${f(w.tempC)}°F), feels like ${Math.round(w.feelsC)}°C, ${w.sky}, local time ${w.localTime.slice(11, 16)}. Next hours: ${w.next.map((h) => `${h.time} ${Math.round(h.tempC)}°C`).join(", ")}.`,
      source: "Open-Meteo",
      url: "https://open-meteo.com",
      at: w.at,
    });
    if (w.aqi != null) {
      const b = aqiBand(w.aqi);
      facts.push({ id: "check-air", kind: "check", title: "Air outside", text: `US AQI ${w.aqi}: ${b.name}.`, source: "Open-Meteo air quality, EPA AQI categories", url: "https://www.airnow.gov/aqi/aqi-basics/", at: w.at, level: b.level });
    }
    facts.push(carCheck(w, petName));
  }
  if (place.countryCode === "US") {
    const law = place.region ? HOT_CAR_LAWS[place.region] : undefined;
    facts.push({
      id: "rule-hot-car",
      kind: "rule",
      title: "Animals left in parked cars",
      text: law
        ? `${place.region} has a state law about animals left in parked vehicles (${law}).`
        : `${place.region ?? "This state"} isn't on the list of states with a law about animals left in parked vehicles; the safety facts above still apply.`,
      source: "Animal Legal & Historical Center, table of state laws",
      url: "https://www.animallaw.info/topic/table-state-laws-protect-animals-left-parked-vehicles",
      at: CHECKED,
    });
    facts.push({
      id: "rule-service-animals",
      kind: "rule",
      title: "Shops and service animals",
      text: "Under the ADA, service animals are dogs individually trained to do work or tasks for a person with a disability, and businesses must generally let them go wherever the public can. Dogs whose only job is comfort or emotional support don't qualify.",
      source: "U.S. Department of Justice, ADA service animal rules",
      url: "https://www.ada.gov/resources/service-animals-2010-requirements/",
      at: CHECKED,
    });
    facts.push({
      id: "rule-food",
      kind: "rule",
      title: "Places that sell or serve food",
      text: "Grocery stores and restaurants generally don't allow animals other than service animals (FDA Food Code § 6-501.115, which states adopt with their own changes). Other shops set their own pet policy.",
      source: "U.S. Food and Drug Administration, Food Code",
      url: "https://www.fda.gov/food/fda-food-code/food-code-2022",
      at: CHECKED,
    });
  } else {
    facts.push({ id: "rule-none", kind: "rule", title: "Local rules", text: `I don't know the pet rules in ${place.country} yet. Check the local rules before going.`, source: "coco", url: null, at: CHECKED });
  }
  const h = place.home;
  if (h.type || h.yard != null || h.rules) {
    facts.push({
      id: "home",
      kind: "home",
      title: "Our home",
      text: [h.type && `We live in ${h.type === "other" ? "a home" : `a ${h.type}`}`, h.yard != null && (h.yard ? "with a yard" : "without a yard"), h.rules && `Building rules the owner wrote down: ${h.rules}`].filter(Boolean).join(", ") + ".",
      source: "What you told me",
      url: null,
      at: place.setAt,
    });
  }
  if (place.services && !servicesStale(place)) {
    const by = new Map<ServiceKind, string[]>();
    for (const s of place.services.items) {
      const l = by.get(s.kind) ?? [];
      if (l.length < 2) l.push(s.hours ? `${s.name} (${s.hours})` : s.name);
      by.set(s.kind, l);
    }
    if (by.size)
      facts.push({
        id: "services",
        kind: "services",
        title: "Pet places nearby",
        text: [...by].map(([k, l]) => `${SERVICE_LABEL[k]}: ${l.join("; ")}`).join(". ") + ". Listings only, not recommendations.",
        source: "OpenStreetMap contributors",
        url: "https://www.openstreetmap.org/copyright",
        at: place.services.checkedAt,
      });
  }
  return { place, weather: w, facts };
}
