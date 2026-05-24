import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const out = join(root, "www");

const files = [
  "index.html",
  "v2.html",
  "styles.css",
  "app.js",
  "manifest.webmanifest",
  "icon.svg",
  "service-worker.js"
];

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

for (const file of files) {
  await cp(join(root, file), join(out, file));
}

const indexPath = join(out, "index.html");
const v2Path = join(out, "v2.html");
let index = await readFile(v2Path, "utf8");
index = index
  .replaceAll("styles.css?v=3", "styles.css")
  .replaceAll("app.js?v=3", "app.js")
  .replaceAll("manifest.webmanifest?v=2", "manifest.webmanifest");
await writeFile(indexPath, index, "utf8");

console.log(`Prepared ${files.length} web files in ${out}`);
