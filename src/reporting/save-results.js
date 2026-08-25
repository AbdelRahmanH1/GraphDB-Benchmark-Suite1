import fs from "node:fs/promises";
import path from "node:path";

export async function saveResults(results) {
  const reportsDirectory = path.resolve("reports");

  await fs.mkdir(reportsDirectory, { recursive: true });

  const filePath = path.join(reportsDirectory, "results.json");

  await fs.writeFile(filePath, JSON.stringify(results, null, 2), "utf8");

  console.log(`✓ Results saved to ${filePath}`);
}
