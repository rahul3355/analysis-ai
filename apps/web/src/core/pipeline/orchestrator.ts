import { type Citation } from "@analysis-ai/types";
import { executeRagPipeline } from "@/core/pipeline/pipeline";
import type { RagPipelineResult } from "@/core/pipeline/pipeline";
import { processChatWithMessagesStream } from "@/server/services/chatService";
import { executeBqQuestion } from "@/server/services/bigqueryService";
import { classifyIntentFull, type IntentCategory } from "@/core/pipeline/classifier";
import { embed } from "@/server/clients/embeddingClient";
import type { BigQueryResult } from "@/server/clients/bigqueryClient";
import { StreamEvent } from "@/lib/sse";

const MIN_RELEVANCE_SCORE = 0.001;

export interface OrchestrateInput {
  message: string;
  documentIds?: string[];
}

type BqValue = { sql: string; results: BigQueryResult; context: string };

function summarizeRow(row: Record<string, unknown>): string {
  return Object.entries(row).map(([k, v]) => `${k}: ${v}`).join(", ");
}

function getMaxRelevanceScore(chunks: RagPipelineResult["chunks"]): number {
  if (chunks.length === 0) return 0;
  return Math.max(...chunks.map((c) => c.rerankerScore ?? c.score ?? 0));
}

function buildDocCitations(
  reply: string,
  docChunks: RagPipelineResult["chunks"]
): Citation[] {
  const citations: Citation[] = [];
  if (docChunks.length === 0) return citations;

  const used = new Set<number>();
  const regex = /\[(\d+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(reply)) !== null) {
    const idx = parseInt(match[1], 10) - 1;
    if (idx >= 0 && idx < docChunks.length && !used.has(idx)) {
      used.add(idx);
      const chunk = docChunks[idx];
      citations.push({
        id: crypto.randomUUID?.() ?? `${Date.now()}`,
        sourceId: chunk.metadata.documentId,
        label: chunk.metadata.documentName,
        excerpt:
          chunk.metadata.chunkText.length > 200
            ? chunk.metadata.chunkText.slice(0, 200) + "..."
            : chunk.metadata.chunkText,
        documentName: chunk.metadata.documentName,
        relevanceScore: chunk.rerankerScore,
        type: "document",
      });
    }
  }
  return citations;
}

function buildBqText(bqVal: BqValue, docChunkCount: number): string {
  const bqIndex = docChunkCount + 1;
  const rows = bqVal.results.rows.slice(0, 15);
  const hasActualData =
    rows.length > 0 &&
    !rows.every((row) =>
      Object.values(row).every(
        (val) => val === null || val === undefined || val === ""
      )
    );

  if (hasActualData) {
    const rowText = rows.map((r) => `  ${summarizeRow(r)}`).join("\n");
    return `[${bqIndex}] BigQuery: ${bqVal.results.rowCount} rows:\n${rowText}\n\nQuery: ${bqVal.sql}`;
  }

  return `[${bqIndex}] BigQuery: Query executed successfully. 0 records found matching the criteria.\n\nQuery: ${bqVal.sql}`;
}

function buildBqCitation(bqVal: BqValue): Citation {
  return {
    id: crypto.randomUUID?.() ?? `${Date.now()}`,
    sourceId: "bigquery",
    label: "BigQuery Query",
    excerpt:
      bqVal.results.rowCount > 0
        ? `Returned ${bqVal.results.rowCount} rows.\n\n${bqVal.sql}`
        : `Query returned no rows.\n\n${bqVal.sql}`,
    documentName: "BigQuery Query",
    type: "bigquery",
  };
}

function emitSources(writer: StreamEvent, chunks: RagPipelineResult["chunks"]): void {
  if (chunks.length === 0) return;
  const top = chunks.slice(0, 2);
  writer.sources({
    sources: top.map((c) => ({
      id: c.id,
      documentName: c.metadata.documentName,
      excerpt:
        c.metadata.chunkText.length > 200
          ? c.metadata.chunkText.slice(0, 200) + "..."
          : c.metadata.chunkText,
      relevanceScore: c.rerankerScore,
      pageNumber: c.metadata.pageNumber,
    })),
  });
}

function emitBqResult(writer: StreamEvent, bqVal: BqValue): void {
  writer.bqResult({
    sql: bqVal.sql,
    rowCount: bqVal.results.rowCount,
    previewRows: bqVal.results.rows.slice(0, 5),
    latencyMs: bqVal.results.latencyMs,
  });
}

function checkAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new Error("Request cancelled");
  }
}

function mapErrorMessage(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("does not support image input") || lower.includes("image input")) {
    return "This question requires image analysis, which the current AI model doesn't support. Please try a text-based question.";
  }
  if (lower.includes("insufficient credits") || lower.includes("402")) {
    return "The AI service is out of credits. Please contact support.";
  }
  if (lower.includes("authentication failed") || lower.includes("401") || lower.includes("403")) {
    return "The AI service credentials are invalid. Please contact support.";
  }
  if (lower.includes("rate limit") || lower.includes("429")) {
    return "The AI service is busy. Please wait a moment and try again.";
  }
  if (lower.includes("empty streaming response") || lower.includes("empty response")) {
    return "The AI service returned no response. Please try rephrasing your question.";
  }
  return raw;
}

function isRowsEmpty(rows: Record<string, unknown>[]): boolean {
  return (
    rows.length === 0 ||
    rows.every((row) =>
      Object.values(row).every(
        (val) => val === null || val === undefined || val === ""
      )
    )
  );
}

export async function orchestrate(
  input: OrchestrateInput,
  writer: StreamEvent,
  signal?: AbortSignal
): Promise<void> {
  const docIds = input.documentIds ?? [];

  writer.status("classifying", "Analyzing your question...");

  const [embeddings, classification] = await Promise.all([
    embed([input.message]),
    classifyIntentFull(input.message),
  ]);
  const queryEmbedding = embeddings[0];

  checkAborted(signal);

  console.log(
    `[orchestrate] Intent: ${classification.intent} (stage: ${classification.stage}, confidence: ${classification.confidence.toFixed(2)})`
  );

  if (classification.intent === "UNKNOWN") {
    writer.textDelta("No relevant data found.");
    writer.status("complete", "Done");
    writer.done();
    return;
  }

  const intent = classification.intent as Exclude<IntentCategory, "UNKNOWN">;

  let docResult: PromiseSettledResult<RagPipelineResult> | null = null;
  let bqResult: PromiseSettledResult<BqValue> | null = null;

  async function execDoc(): Promise<void> {
    writer.status("searching_docs", "Searching documents...");
    try {
      docResult = {
        status: "fulfilled",
        value: await executeRagPipeline({
          message: input.message,
          documentIds: docIds,
          queryEmbedding,
        }),
      };
    } catch (err) {
      docResult = { status: "rejected", reason: err };
    }
  }

  async function execBq(): Promise<void> {
    writer.status("querying_bq", "Querying database...");
    try {
      bqResult = {
        status: "fulfilled",
        value: await executeBqQuestion(input.message, queryEmbedding),
      };
    } catch (err) {
      bqResult = { status: "rejected", reason: err };
    }
  }

  if (intent === "DATABASE") {
    await execBq();
    checkAborted(signal);

    const bqRes = bqResult as PromiseSettledResult<BqValue> | null;
    let isBqEmpty = true;
    if (bqRes?.status === "fulfilled" && bqRes.value) {
      isBqEmpty = isRowsEmpty(bqRes.value.results.rows);
      if (!isBqEmpty) {
        emitBqResult(writer, bqRes.value);
      }
    }

    if (isBqEmpty) {
      console.log("[orchestrate] DATABASE returned nothing, trying DOCUMENT fallback");
      await execDoc();
      checkAborted(signal);
    }
  } else if (intent === "DOCUMENT") {
    await execDoc();
    checkAborted(signal);

    const docRes = docResult as PromiseSettledResult<RagPipelineResult> | null;
    let isDocEmpty = true;
    if (docRes?.status === "fulfilled" && docRes.value) {
      const chunks = docRes.value.chunks;
      isDocEmpty = chunks.length === 0 || getMaxRelevanceScore(chunks) < MIN_RELEVANCE_SCORE;
      if (!isDocEmpty) {
        emitSources(writer, chunks);
      }
    }

    if (isDocEmpty) {
      console.log("[orchestrate] DOCUMENT returned nothing, trying DATABASE fallback");
      await execBq();
      checkAborted(signal);
      const fbBqRes = bqResult as PromiseSettledResult<BqValue> | null;
      if (fbBqRes?.status === "fulfilled" && fbBqRes.value && !isRowsEmpty(fbBqRes.value.results.rows)) {
        emitBqResult(writer, fbBqRes.value);
      }
    }
  } else {
    await Promise.all([execDoc(), execBq()]);
    checkAborted(signal);
  }

  const docResFinal = docResult as PromiseSettledResult<RagPipelineResult> | null;
  let docContext = "";
  let docChunks: RagPipelineResult["chunks"] = [];

  if (docResFinal?.status === "fulfilled" && docResFinal.value) {
    const rag = docResFinal.value;
    const maxScore = getMaxRelevanceScore(rag.chunks);
    const threshold = intent === "HYBRID" ? 0.001 : MIN_RELEVANCE_SCORE;
    if (rag.chunks.length > 0 && maxScore >= threshold) {
      docContext = rag.context;
      docChunks = rag.chunks;
      if (intent === "HYBRID") {
        emitSources(writer, rag.chunks);
      }
    }
  } else if (docResFinal?.status === "rejected") {
    console.error("Document RAG failed:", docResFinal.reason);
  }

  const bqResFinal = bqResult as PromiseSettledResult<BqValue> | null;
  let bqVal: BqValue | null = null;
  let bqText = "";

  if (bqResFinal?.status === "fulfilled" && bqResFinal.value) {
    bqVal = bqResFinal.value;
    bqText = buildBqText(bqVal, docChunks.length);
    if (!isRowsEmpty(bqVal.results.rows) && (intent === "HYBRID" || intent === "DATABASE")) {
      emitBqResult(writer, bqVal);
    }
  } else if (bqResFinal?.status === "rejected") {
    console.error("BigQuery failed:", bqResFinal.reason);
  }

  if (!docContext && !bqText) {
    writer.textDelta("No relevant data found.");
    writer.status("complete", "Done");
    writer.done();
    return;
  }

  checkAborted(signal);

  const parts: string[] = [];
  if (docContext) parts.push(docContext);
  if (bqText) parts.push(bqText);
  const mergedContext = parts.join("\n\n");

  const promptPreamble = `You are Analysis AI. Answer ONLY using the sources below. Use inline citations like [1], [2] referencing source indices. If a database query successfully returned 0 rows, state that no records match the criteria rather than saying "No relevant data found." If no source answers the question, say "No relevant data found." Do not make up information.\n\nSOURCES:\n`;
  const systemPrompt = promptPreamble + mergedContext;

  writer.status("generating", "Generating answer...");

  try {
    const streamCallbacks = { onToken: (token: string) => writer.textDelta(token), signal };

    const completeReply = await processChatWithMessagesStream(
      [
        { role: "system" as const, content: systemPrompt },
        { role: "user" as const, content: input.message },
      ],
      streamCallbacks
    );

    const docCitations = buildDocCitations(completeReply, docChunks);
    const allCitations: Citation[] = [...docCitations];
    if (bqVal) {
      allCitations.push(buildBqCitation(bqVal));
    }

    writer.citations({
      citations: allCitations.map((c) => ({
        id: c.id,
        sourceId: c.sourceId,
        label: c.label,
        excerpt: c.excerpt,
        documentName: c.documentName,
        pageNumber: c.pageNumber,
        relevanceScore: c.relevanceScore,
        type: c.type as "document" | "bigquery",
      })),
    });

    writer.status("complete", "Done");
    writer.done();
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    console.error("Orchestration failed:", rawMsg);
    if (!writer.closed) {
      writer.error(mapErrorMessage(rawMsg));
      writer.done();
    }
  }
}
