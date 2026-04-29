import { seedDatabase } from "../src/lib/db/seed";

seedDatabase({ requireBootstrapEnv: true });
console.log("Seed complete.");
