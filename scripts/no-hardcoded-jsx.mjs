import fs from "node:fs";
import path from "node:path";

const roots = ["src/app/(app)", "src/components"];
const allowed = new Set(["src/components/ui/button.tsx", "src/components/ui/input.tsx", "src/components/ui/card.tsx"]);
let failed = false;

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return full.endsWith(".tsx") && !full.includes(".test.") ? [full] : [];
  });
}

for (const file of roots.flatMap(walk)) {
  if (allowed.has(file)) continue;
  const source = fs.readFileSync(file, "utf8");
  const matches = source.match(/>\s*[A-Za-z][^<{}`]*\s*</g) ?? [];
  const offenders = matches.filter((match) => {
    const text = match.replace(/^>\s*/, "").replace(/\s*<$/, "").trim();
    return (
      !text.includes("http") &&
      !text.includes(".") &&
      !text.includes("(") &&
      !text.includes(")") &&
      !text.includes("?") &&
      !text.includes("|")
    );
  });
  if (offenders.length) {
    failed = true;
    console.error(`${file}: hardcoded JSX text: ${offenders[0].replace(/\s+/g, " ").trim()}`);
  }
}

if (failed) process.exit(1);
