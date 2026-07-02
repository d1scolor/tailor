import { closeDb, getSqlite } from "../src/lib/db/client";

getSqlite();
closeDb();
console.log("Migrations applied.");
