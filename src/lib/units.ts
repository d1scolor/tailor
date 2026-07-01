export type UnitSystem = "metric" | "imperial";
export type MeasurementDimension = "length" | "mass";
export type ConvertibleUnitKey = "lengthLong" | "lengthShort" | "massLarge" | "massSmall";
export type StaticUnitKey = "piece" | "ball" | "spool" | "pack" | "roll" | "unspecified";
export type ManagedUnitKey = ConvertibleUnitKey | StaticUnitKey;

type DisplayUnit = {
  symbol: string;
  labelKey: string;
  intlUnit: string;
  factorToCanonical: number;
};

type ConvertibleUnitDefinition = {
  key: ConvertibleUnitKey;
  behavior: "convertible";
  dimension: MeasurementDimension;
  metric: DisplayUnit;
  imperial: DisplayUnit;
};

type StaticUnitDefinition = {
  key: StaticUnitKey;
  behavior: "static";
  labelKey: string;
};

export type ManagedUnitDefinition = ConvertibleUnitDefinition | StaticUnitDefinition;

export const managedUnitDefinitions: Record<ManagedUnitKey, ManagedUnitDefinition> = {
  lengthLong: {
    key: "lengthLong",
    behavior: "convertible",
    dimension: "length",
    metric: { symbol: "m", labelKey: "meta.units.metre", intlUnit: "meter", factorToCanonical: 1 },
    imperial: { symbol: "yd", labelKey: "meta.units.yard", intlUnit: "yard", factorToCanonical: 0.9144 }
  },
  lengthShort: {
    key: "lengthShort",
    behavior: "convertible",
    dimension: "length",
    metric: { symbol: "cm", labelKey: "meta.units.centimetre", intlUnit: "centimeter", factorToCanonical: 0.01 },
    imperial: { symbol: "in", labelKey: "meta.units.inch", intlUnit: "inch", factorToCanonical: 0.0254 }
  },
  massLarge: {
    key: "massLarge",
    behavior: "convertible",
    dimension: "mass",
    metric: { symbol: "kg", labelKey: "meta.units.kilogram", intlUnit: "kilogram", factorToCanonical: 1 },
    imperial: { symbol: "lb", labelKey: "meta.units.pound", intlUnit: "pound", factorToCanonical: 0.45359237 }
  },
  massSmall: {
    key: "massSmall",
    behavior: "convertible",
    dimension: "mass",
    metric: { symbol: "g", labelKey: "meta.units.gram", intlUnit: "gram", factorToCanonical: 0.001 },
    imperial: { symbol: "oz", labelKey: "meta.units.ounce", intlUnit: "ounce", factorToCanonical: 0.028349523125 }
  },
  piece: { key: "piece", behavior: "static", labelKey: "meta.units.piece" },
  ball: { key: "ball", behavior: "static", labelKey: "meta.units.ball" },
  spool: { key: "spool", behavior: "static", labelKey: "meta.units.spool" },
  pack: { key: "pack", behavior: "static", labelKey: "meta.units.pack" },
  roll: { key: "roll", behavior: "static", labelKey: "meta.units.roll" },
  unspecified: { key: "unspecified", behavior: "static", labelKey: "meta.units.unspecified" }
};

export const defaultManagedUnitKeys: ManagedUnitKey[] = [
  "piece",
  "lengthLong",
  "lengthShort",
  "ball",
  "spool",
  "pack",
  "roll",
  "massSmall",
  "massLarge"
];

export function normalizeUnitSystem(value: unknown): UnitSystem {
  return value === "imperial" || value === "us" ? "imperial" : "metric";
}

export function isManagedUnitKey(value: unknown): value is ManagedUnitKey {
  return typeof value === "string" && value in managedUnitDefinitions;
}

export function displayUnit(definitionKey: ConvertibleUnitKey, unitSystem: UnitSystem) {
  const definition = managedUnitDefinitions[definitionKey] as ConvertibleUnitDefinition;
  return definition[unitSystem];
}

export function toDisplayValue(canonicalValue: number, definitionKey: ConvertibleUnitKey, unitSystem: UnitSystem) {
  return canonicalValue / displayUnit(definitionKey, unitSystem).factorToCanonical;
}

export function toCanonicalValue(displayValue: number, definitionKey: ConvertibleUnitKey, unitSystem: UnitSystem) {
  return displayValue * displayUnit(definitionKey, unitSystem).factorToCanonical;
}

export function formatMeasurement(
  canonicalValue: number,
  definitionKey: ConvertibleUnitKey,
  unitSystem: UnitSystem,
  locale?: string
) {
  const unit = displayUnit(definitionKey, unitSystem);
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: unit.intlUnit,
    unitDisplay: "short",
    maximumFractionDigits: 2
  }).format(canonicalValue / unit.factorToCanonical);
}

export function fabricUnits(unitSystem: UnitSystem) {
  const length = displayUnit("lengthLong", unitSystem);
  const width = displayUnit("lengthShort", unitSystem);
  return {
    lengthUnit: length.symbol,
    widthUnit: width.symbol,
    areaUnit: unitSystem === "imperial" ? "yd²" : "m²"
  };
}

export function areaToDisplay(squareMetres: number, unitSystem: UnitSystem) {
  return unitSystem === "imperial" ? squareMetres / 0.83612736 : squareMetres;
}
