import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const htmlPath = root + "index.html";
const outputPath = root + "data/activities.json";
const html = readFileSync(htmlPath, "utf8");

const marker = "const builtinActivities = [";
const start = html.indexOf(marker);
const end = html.indexOf("];", start + marker.length) + 1;
if(start < 0 || end < 1) throw new Error("builtinActivities not found in index.html");

const source = html.slice(start, end);
const getActivities = new Function(`${source}\nreturn builtinActivities;`);
const items = getActivities();
const payload = {
  updatedAt: new Date().toISOString(),
  source: "activity-radar-web/data",
  items
};

mkdirSync(root + "data", { recursive: true });
writeFileSync(outputPath, JSON.stringify(payload, null, 2), "utf8");
console.log(`Wrote ${items.length} activities to data/activities.json`);
