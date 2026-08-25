import fs from "node:fs";
import readline from "node:readline";

const DATASET_PATH = "data/raw/soc-pokec-relationships.txt";

export async function* readRelationships(
  batchSize = 1000,
  maxRelationships = Infinity,
) {
  const stream = fs.createReadStream(DATASET_PATH);

  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  let batch = [];
  let relationshipCount = 0;

  try {
    for await (const line of rl) {
      if (!line.trim()) {
        continue;
      }

      const [source, target] = line.trim().split(/\s+/);

      batch.push({
        source: Number(source),
        target: Number(target),
      });

      relationshipCount++;

      if (batch.length >= batchSize) {
        yield batch;
        batch = [];
      }

      if (relationshipCount >= maxRelationships) {
        break;
      }
    }

    if (batch.length > 0) {
      yield batch;
    }
  } finally {
    rl.close();
    stream.destroy();
  }
}
