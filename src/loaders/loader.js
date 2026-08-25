import { readRelationships } from "../dataset/reader.js";

export async function loadDatabase(
  database,
  batchSize = 1000,
  maxRelationships = Infinity,
) {
  const start = performance.now();

  let relationshipCount = 0;
  const nodeIds = new Set();

  for await (const batch of readRelationships(batchSize, maxRelationships)) {
    for (const relationship of batch) {
      nodeIds.add(String(relationship.source));
      nodeIds.add(String(relationship.target));
    }

    await database.loadBatch(batch);

    relationshipCount += batch.length;
  }

  const elapsedMs = performance.now() - start;

  const relationshipsPerSecond =
    elapsedMs > 0 ? relationshipCount / (elapsedMs / 1000) : 0;

  return {
    relationshipCount,
    nodeIds: [...nodeIds],
    elapsedMs,
    relationshipsPerSecond,
  };
}
