/**
 * Units of measure. A product's price is "per unit", and the unit decides how
 * many decimals a quantity may carry: tomatoes sell by 1.250 kg, sofas by 1 pcs.
 */

export type UnitGroup = "count" | "weight" | "volume" | "length" | "area" | "pack" | "time";

export type UnitDef = {
  id: string;
  label: string;
  /** Printed after quantities and prices, e.g. "AED 4.50 / kg" */
  short: string;
  /** Decimal places a quantity may use (0 = whole numbers only) */
  decimals: number;
  group: UnitGroup;
};

export const UNIT_GROUP_LABELS: Record<UnitGroup, string> = {
  count: "Count",
  weight: "Weight",
  volume: "Volume",
  length: "Length",
  area: "Area",
  pack: "Packs",
  time: "Time & services",
};

export const UNITS: readonly UnitDef[] = [
  { id: "pcs", label: "Piece", short: "pcs", decimals: 0, group: "count" },
  { id: "dozen", label: "Dozen", short: "dz", decimals: 2, group: "count" },
  { id: "pair", label: "Pair", short: "pair", decimals: 0, group: "count" },
  { id: "set", label: "Set", short: "set", decimals: 0, group: "count" },
  { id: "plate", label: "Plate / portion", short: "plate", decimals: 0, group: "count" },
  { id: "kg", label: "Kilogram", short: "kg", decimals: 3, group: "weight" },
  { id: "g", label: "Gram", short: "g", decimals: 3, group: "weight" },
  { id: "tola", label: "Tola", short: "tola", decimals: 3, group: "weight" },
  { id: "ton", label: "Tonne", short: "t", decimals: 3, group: "weight" },
  { id: "l", label: "Litre", short: "L", decimals: 3, group: "volume" },
  { id: "ml", label: "Millilitre", short: "ml", decimals: 0, group: "volume" },
  { id: "gal", label: "Gallon", short: "gal", decimals: 2, group: "volume" },
  { id: "m", label: "Metre", short: "m", decimals: 2, group: "length" },
  { id: "cm", label: "Centimetre", short: "cm", decimals: 1, group: "length" },
  { id: "ft", label: "Foot", short: "ft", decimals: 2, group: "length" },
  { id: "sqm", label: "Square metre", short: "m²", decimals: 2, group: "area" },
  { id: "sqft", label: "Square foot", short: "sq ft", decimals: 2, group: "area" },
  { id: "box", label: "Box", short: "box", decimals: 0, group: "pack" },
  { id: "carton", label: "Carton", short: "ctn", decimals: 0, group: "pack" },
  { id: "pack", label: "Pack", short: "pack", decimals: 0, group: "pack" },
  { id: "bag", label: "Bag / sack", short: "bag", decimals: 0, group: "pack" },
  { id: "bottle", label: "Bottle", short: "btl", decimals: 0, group: "pack" },
  { id: "can", label: "Can / tin", short: "can", decimals: 0, group: "pack" },
  { id: "tray", label: "Tray", short: "tray", decimals: 0, group: "pack" },
  { id: "roll", label: "Roll", short: "roll", decimals: 0, group: "pack" },
  { id: "bunch", label: "Bunch", short: "bunch", decimals: 0, group: "pack" },
  { id: "hour", label: "Hour", short: "hr", decimals: 2, group: "time" },
  { id: "day", label: "Day", short: "day", decimals: 1, group: "time" },
  { id: "night", label: "Night", short: "night", decimals: 0, group: "time" },
  { id: "month", label: "Month", short: "mo", decimals: 0, group: "time" },
  { id: "service", label: "Service / job", short: "job", decimals: 0, group: "time" },
];

const UNIT_MAP = new Map(UNITS.map((u) => [u.id, u]));

export const DEFAULT_UNIT = "pcs";

/** Known unit, or a custom unit typed by the shop (allows up to 3 decimals). */
export function getUnit(id: string | null | undefined): UnitDef {
  const key = (id ?? "").trim();
  if (!key) return UNIT_MAP.get(DEFAULT_UNIT)!;
  const known = UNIT_MAP.get(key.toLowerCase());
  if (known) return known;
  return { id: key, label: key, short: key, decimals: 3, group: "count" };
}

export function unitAllowsDecimals(id: string | null | undefined): boolean {
  return getUnit(id).decimals > 0;
}

/** HTML input step for a quantity in this unit. */
export function unitStep(id: string | null | undefined): string {
  const d = getUnit(id).decimals;
  return d > 0 ? (1 / 10 ** d).toFixed(d) : "1";
}

/** Rounds a quantity to what the unit allows. */
export function roundQty(qty: number, id: string | null | undefined): number {
  const d = getUnit(id).decimals;
  const f = 10 ** d;
  return Math.round((Number(qty) || 0) * f) / f;
}

/** 1.25 kg, 3 pcs - trailing zeros trimmed. */
export function formatQty(qty: number | string, id?: string | null, withUnit = true): string {
  const u = getUnit(id);
  const n = Number(qty) || 0;
  const text = n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.max(u.decimals, 0),
  });
  return withUnit ? `${text} ${u.short}` : text;
}

/** Sensible +/- nudge for quick quantity buttons. */
export function unitNudge(id: string | null | undefined): number {
  const u = getUnit(id);
  if (u.id === "kg" || u.id === "l") return 0.25;
  if (u.id === "g" || u.id === "ml") return 50;
  if (u.decimals > 0) return 0.5;
  return 1;
}

/**
 * Units offered in the product form: the business type's own units, plus the
 * product's current unit if it is something else. `showAll` adds every other unit.
 */
export function unitChoices(preferred: readonly string[], current?: string | null, showAll = false) {
  const own = unitOptions(preferred).filter((o) => o.group === "Suggested");
  if (showAll) {
    return unitOptions(preferred).map((o) => ({
      value: o.value,
      label: o.group === "Suggested" ? o.label : `${o.label} · ${o.group}`,
    }));
  }
  const list = own.map((o) => ({ value: o.value, label: o.label }));
  if (current && !list.some((o) => o.value === getUnit(current).id)) {
    const u = getUnit(current);
    list.push({ value: u.id, label: `${u.label} (${u.short})` });
  }
  return list;
}

export function unitOptions(preferred: readonly string[] = []) {
  const seen = new Set<string>();
  const out: { value: string; label: string; group: string }[] = [];
  for (const id of preferred) {
    const u = getUnit(id);
    if (seen.has(u.id)) continue;
    seen.add(u.id);
    out.push({ value: u.id, label: `${u.label} (${u.short})`, group: "Suggested" });
  }
  for (const u of UNITS) {
    if (seen.has(u.id)) continue;
    out.push({ value: u.id, label: `${u.label} (${u.short})`, group: UNIT_GROUP_LABELS[u.group] });
  }
  return out;
}
