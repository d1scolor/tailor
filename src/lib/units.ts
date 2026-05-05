export type UnitSystem = "metric" | "us";

export function normalizeUnitSystem(value: unknown): UnitSystem {
  return value === "us" ? "us" : "metric";
}

export function clothUnits(unitSystem: UnitSystem) {
  return unitSystem === "us" ? { lengthUnit: "yd", widthUnit: "in", areaUnit: "yd²", widthPerLength: 36 } : { lengthUnit: "m", widthUnit: "cm", areaUnit: "m²", widthPerLength: 100 };
}

export function convertLength(value: number, fromUnit: string, toUnit: string) {
  const metres = fromUnit === "yd" ? value * 0.9144 : fromUnit === "cm" ? value / 100 : value;
  if (toUnit === "yd") return metres / 0.9144;
  if (toUnit === "cm") return metres * 100;
  return metres;
}

export function convertWidth(value: number | null | undefined, fromUnit: string | null | undefined, toUnit: string) {
  if (value == null) return value;
  const centimetres = fromUnit === "in" ? value * 2.54 : fromUnit === "m" ? value * 100 : value;
  if (toUnit === "in") return centimetres / 2.54;
  if (toUnit === "m") return centimetres / 100;
  return centimetres;
}
