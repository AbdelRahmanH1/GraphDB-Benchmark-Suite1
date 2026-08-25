import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const datasetPath = path.resolve("data/processed/pokec-100k.csv");

async function validateDataset() {
  console.log("Validating dataset...");
  console.log(`File: ${datasetPath}\n`);

  try {
    await fs.promises.access(datasetPath, fs.constants.F_OK);
  } catch {
    throw new Error(`Dataset not found: ${datasetPath}`);
  }

  const inputStream = fs.createReadStream(datasetPath, {
    encoding: "utf8",
  });

  const rl = readline.createInterface({
    input: inputStream,
    crlfDelay: Infinity,
  });

  const nodes = new Set();
  const relationships = new Set();

  let relationshipCount = 0;
  let invalidRows = 0;
  let selfLoops = 0;
  let duplicateRelationships = 0;

  let isHeader = true;

  for await (const line of rl) {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      continue;
    }

    if (isHeader) {
      isHeader = false;
      continue;
    }

    const parts = trimmedLine.split(",");

    if (parts.length !== 2) {
      invalidRows++;
      continue;
    }

    const source = parts[0].trim();
    const target = parts[1].trim();

    if (!source || !target) {
      invalidRows++;
      continue;
    }

    relationshipCount++;

    nodes.add(source);
    nodes.add(target);

    if (source === target) {
      selfLoops++;
    }

    const relationshipKey = `${source}->${target}`;

    if (relationships.has(relationshipKey)) {
      duplicateRelationships++;
    } else {
      relationships.add(relationshipKey);
    }
  }

  console.log("\nDataset validation");
  console.log("------------------");
  console.log(`Relationships:           ${relationshipCount.toLocaleString()}`);
  console.log(`Unique nodes:            ${nodes.size.toLocaleString()}`);
  console.log(
    `Duplicate relationships: ${duplicateRelationships.toLocaleString()}`,
  );
  console.log(`Self-loops:              ${selfLoops.toLocaleString()}`);
  console.log(`Invalid rows:            ${invalidRows.toLocaleString()}`);

  if (relationshipCount < 100_000) {
    console.warn(
      "\nWARNING: Dataset contains fewer than 100,000 relationships.",
    );
  }

  if (invalidRows > 0) {
    console.warn(`WARNING: Found ${invalidRows} invalid rows.`);
  }

  console.log("\nValidation completed.");
}

validateDataset().catch((error) => {
  console.error("\nDataset validation failed:");
  console.error(error);
  process.exit(1);
});
