export function createStartNodes(nodeIds, sampleSize = 100, seed = 12345) {
  if (sampleSize > nodeIds.length) {
    throw new Error(
      `Sample size ${sampleSize} exceeds available nodes ${nodeIds.length}`,
    );
  }

  const random = createSeededRandom(seed);

  const shuffled = [...nodeIds];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));

    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, sampleSize);
}

function createSeededRandom(seed) {
  let value = seed;

  return function random() {
    value = (value * 1664525 + 1013904223) % 4294967296;

    return value / 4294967296;
  };
}
