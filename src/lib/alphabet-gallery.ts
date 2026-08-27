import fs from "fs/promises";
import path from "path";

const DIR = path.join(process.cwd(), "public", "alphabet");

export async function getAlphabetCards() {
  const files = await fs.readdir(DIR);
  return files
    .filter((f) => f.toLowerCase().endsWith(".png") && f.toLowerCase() !== "aparato_fonador.png")
    .sort((a, b) => a.localeCompare(b, "es"))
    .map((f) => ({ url: `/alphabet/${encodeURIComponent(f)}`, label: f.replace(/\.png$/i, "") }));
}
