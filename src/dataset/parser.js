import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { createObjectCsvWriter } from "csv-writer";

const inputPath = path.resolve("data/raw/soc-pokec-relationships.txt");

const outputPath = path.resolve("data/processed/pokec-100k.csv");

const SAMPLE_SIZE = 100_000;
const BATCH_SIZE = 5_000;

async function createSample() {
  console.log("Starting dataset sampling...");
  console.log(`Input:  ${inputPath}`);
  console.log(`Output: ${outputPath}`);
  console.log(`Target: ${SAMPLE_SIZE.toLocaleString()} relationships\n`);

  try {
    await fs.promises.access(outputPath, fs.constants.F_OK);

    console.log("Sample already exists.");
    console.log(`Skipping creation: ${outputPath}`);

    return;
  } catch {}

  try {
    await fs.promises.access(inputPath, fs.constants.F_OK);
  } catch {
    throw new Error(`Input dataset not found: ${inputPath}`);
  }

  await fs.promises.mkdir(path.dirname(outputPath), {
    recursive: true,
  });

  const csvWriter = createObjectCsvWriter({
    path: outputPath,
    header: [
      {
        id: "source",
        title: "source",
      },
      {
        id: "target",
        title: "target",
      },
    ],
  });

  const inputStream = fs.createReadStream(inputPath, {
    encoding: "utf8",
  });

  const rl = readline.createInterface({
    input: inputStream,
    crlfDelay: Infinity,
  });

  let relationships = [];
  const nodes = new Set();

  let lineCount = 0;
  let relationshipsCount = 0;
  let invalidLines = 0;

  for await (const line of rl) {
    lineCount++;

    const trimmedLine = line.trim();

    if (!trimmedLine) {
      continue;
    }

    if (trimmedLine.startsWith("#")) {
      continue;
    }

    const parts = trimmedLine.split(/\s+/);

    if (parts.length < 2) {
      invalidLines++;
      continue;
    }

    const [source, target] = parts;

    relationships.push({
      source,
      target,
    });

    nodes.add(source);
    nodes.add(target);

    relationshipsCount++;

    if (relationships.length >= BATCH_SIZE) {
      await csvWriter.writeRecords(relationships);
      relationships = [];

      console.log(
        `Sampled ${relationshipsCount.toLocaleString()} / ${SAMPLE_SIZE.toLocaleString()} relationships`,
      );
    }

    if (relationshipsCount >= SAMPLE_SIZE) {
      break;
    }
  }

  if (relationships.length > 0) {
    await csvWriter.writeRecords(relationships);
  }

  rl.close();
  inputStream.destroy();

  console.log("\nSample creation completed!");
  console.log("-------------------------");
  console.log(`Relationships: ${relationshipsCount.toLocaleString()}`);
  console.log(`Unique nodes:  ${nodes.size.toLocaleString()}`);
  console.log(`Lines read:    ${lineCount.toLocaleString()}`);
  console.log(`Invalid lines: ${invalidLines.toLocaleString()}`);
  console.log(`Output:        ${outputPath}`);
}

createSample().catch((error) => {
  console.error("\nSample creation failed:");
  console.error(error);
  process.exit(1);
});
