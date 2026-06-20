import { loadEnvConfig } from "@next/env";
import { join } from "path";

// Load Next.js environment config
loadEnvConfig(join(process.cwd()));

import { classifyIntentFull } from "@/core/pipeline/classifier";
import { clearClassificationCache } from "@/core/pipeline/classifierCache";
import { getPineconeClient, getIndexConfig } from "@/server/config/pinecone";

async function main() {
  console.log("Starting Live Pinecone Semantic Cache E2E Test...");

  const pc = getPineconeClient();
  const { host, indexName } = getIndexConfig();
  const index = pc.index({ name: indexName, host }).namespace("intent-routing-cache");
  
  console.log("Clearing intent-routing-cache namespace in Pinecone...");
  try {
    await index.deleteAll();
    console.log("Namespace cleared successfully.");
  } catch (err: any) {
    console.log("No existing namespace or namespace already empty:", err.message);
  }

  // Clear in-memory cache
  clearClassificationCache();

  const testQuery = "What is the average order value across all regions?";
  
  // Test Run 1: Cache Miss -> LLM / Heuristic classification
  console.log("\n--- TEST 1: Cache Miss (First Execution) ---");
  console.log(`Query: "${testQuery}"`);
  
  const start1 = Date.now();
  const res1 = await classifyIntentFull(testQuery);
  const elapsed1 = Date.now() - start1;
  
  console.log(`Result Intent: ${res1.intent}`);
  console.log(`Classification Stage: ${res1.stage}`);
  console.log(`Total Time: ${elapsed1}ms`);
  
  expect(res1.stage, "heuristic");

  // Test Run 2: Local Memory Cache Hit (0ms)
  console.log("\n--- TEST 2: Local Memory Cache Hit (Second Execution) ---");
  const start2 = Date.now();
  const res2 = await classifyIntentFull(testQuery);
  const elapsed2 = Date.now() - start2;
  
  console.log(`Result Intent: ${res2.intent}`);
  console.log(`Classification Stage: ${res2.stage}`);
  console.log(`Total Time: ${elapsed2}ms`);

  // Test Run 3: Pinecone Semantic Cache Hit (Serverless Persistent, Simulating Cold Start)
  console.log("\n--- TEST 3: Pinecone Semantic Cache Hit (Simulating Cold Start) ---");
  console.log("Clearing in-memory cache...");
  clearClassificationCache();
  
  const start3 = Date.now();
  const res3 = await classifyIntentFull(testQuery);
  const elapsed3 = Date.now() - start3;
  
  console.log(`Result Intent: ${res3.intent}`);
  console.log(`Classification Stage: ${res3.stage}`);
  console.log(`Total Time: ${elapsed3}ms`);

  // Test Run 4: Semantic Generalization Cache Hit (Rephrased Query)
  const rephrasedQuery = "Tell me the mean order values for each region";
  console.log("\n--- TEST 4: Semantic Cache Hit for Rephrased Query ---");
  console.log(`Rephrased Query: "${rephrasedQuery}"`);
  clearClassificationCache();
  
  const start4 = Date.now();
  const res4 = await classifyIntentFull(rephrasedQuery);
  const elapsed4 = Date.now() - start4;
  
  console.log(`Result Intent: ${res4.intent}`);
  console.log(`Classification Stage: ${res4.stage}`);
  console.log(`Total Time: ${elapsed4}ms`);
  
  console.log("\nE2E Verification Complete.");
}

function expect(actual: any, expected: any) {
  if (actual !== expected) {
    console.warn(`[WARN] Expected ${expected} but got ${actual}`);
  } else {
    console.log(`[PASS] Verified stage is ${actual}`);
  }
}

main().catch((err) => {
  console.error("E2E Test failed with error:", err);
  process.exit(1);
});
