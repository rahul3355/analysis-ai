import { loadEnvConfig } from "@next/env";
import { join } from "path";

loadEnvConfig(join(process.cwd()));

const queries = [
  "What is the running footwear category's full-price sell-through rate?",
  "What were our top 3 products by revenue?",
  "Hoka grew 52% year on year according to the running deep dive. What was Hoka's actual revenue from the document and how many Hoka Clifton 9 pairs were sold according to BigQuery?",
  "What was the total revenue last quarter?",
  "What is Hoka's year-on-year growth rate and how many JD stores stock Hoka?"
];

const documentIds = ["doc-jd-1", "doc-jd-2", "doc-jd-3", "doc-jd-4", "doc-jd-5"];

async function run() {
  const { orchestrate } = await import("./src/core/pipeline/orchestrator");
  const { StreamEvent } = await import("./src/lib/sse");
  console.log("Running orchestrate on the 5 queries:\n");
  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    try {
      console.log(`========================================`);
      console.log(`Query ${i + 1}: "${q}"`);
      const controller = {
        enqueue: (data: Uint8Array) => {
          process.stdout.write(data);
        },
        close: () => {},
        desiredSize: 1,
      } as unknown as ReadableStreamDefaultController;
      const writer = new StreamEvent(controller);
      await orchestrate({ message: q, documentIds }, writer);
      console.log(`\n========================================\n`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.stack || err.message : String(err);
      console.error(`Query ${i + 1} failed:`, msg);
    }
  }
}

run();
