export function nowIso() {
  return new Date().toISOString();
}

export function addDaysIso(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export function dateForFile() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}
