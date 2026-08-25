import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const inputPath = path.resolve("data/raw/soc-pokec-relationships.txt");

export async function getNodeIds() {
  const nodeIds = new Set();

  const inputStream = fs.createReadStream(inputPath, {
    encoding: "utf8",
  });

  const rl = readline.createInterface({
    input: inputStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      continue;
    }

    const parts = trimmedLine.split(/\s+/);

    if (parts.length < 2) {
      continue;
    }

    const [source, target] = parts;

    nodeIds.add(source);
    nodeIds.add(target);
  }

  return [...nodeIds];
}
