import { SpanStatusCode, SpanKind } from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import {
  SEMRESATTRS_PROJECT_NAME,
  INPUT_VALUE,
  OUTPUT_VALUE,
  LLM_TOKEN_COUNT_PROMPT,
  LLM_TOKEN_COUNT_COMPLETION,
  SemanticConventions,
  OpenInferenceSpanKind,
} from "@arizeai/openinference-semantic-conventions";

let initialized = false;
let provider: NodeTracerProvider | null = null;

function ensureInit() {
  if (initialized) return;
  initialized = true;
  const spaceId = process.env.ARIZE_SPACE_ID;
  const apiKey = process.env.ARIZE_API_KEY;
  if (!spaceId || !apiKey) return;

  provider = new NodeTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: "analysis-ai",
      [SEMRESATTRS_PROJECT_NAME]: "analysis-ai",
    }),
    spanProcessors: [
      new SimpleSpanProcessor(
        new OTLPTraceExporter({
          url: "https://otlp.arize.com/v1/traces",
          headers: { "arize-space-id": spaceId, "arize-api-key": apiKey },
        })
      ),
    ],
  });
}

export interface SpanData {
  intent?: string;
  model?: string;
  answerPreview?: string;
  citationsCount?: number;
  classifyMs?: number;
  embedMs?: number;
  ragMs?: number;
  bqMs?: number;
  generateMs?: number;
  topSources?: string;
  bqSql?: string;
  estimatedCost?: number;
  promptTokens?: number;
  completionTokens?: number;
  contextValue?: string;
}

export function startChatTrace(question: string): { data: SpanData; end: (error?: string) => void } {
  ensureInit();
  const noop = { data: {} as SpanData, end: (_error?: string) => {} };

  if (!provider) return noop;

  const tracer = provider.getTracer("analysis-ai");
  const span = tracer.startSpan("chat_request", { kind: SpanKind.SERVER });
  span.setAttribute(SemanticConventions.OPENINFERENCE_SPAN_KIND, OpenInferenceSpanKind.CHAIN);
  span.setAttribute(INPUT_VALUE, question);
  span.setAttribute("question", question);

  const data: SpanData = {};

  return {
    data,
    end(error?: string) {
      if (data.answerPreview) {
        span.setAttribute(OUTPUT_VALUE, data.answerPreview.slice(0, 2000));
        span.setAttribute("answer_preview", data.answerPreview.slice(0, 500));
      }
      if (data.model) span.setAttribute("model", data.model);
      if (data.intent) span.setAttribute("intent", data.intent);
      if (data.citationsCount !== undefined) span.setAttribute("citations_count", data.citationsCount);
      if (data.classifyMs !== undefined) span.setAttribute("classify_ms", data.classifyMs);
      if (data.embedMs !== undefined) span.setAttribute("embed_ms", data.embedMs);
      if (data.ragMs !== undefined) span.setAttribute("rag_ms", data.ragMs);
      if (data.bqMs !== undefined) span.setAttribute("bq_ms", data.bqMs);
      if (data.generateMs !== undefined) span.setAttribute("generate_ms", data.generateMs);
      if (data.topSources) span.setAttribute("top_sources", data.topSources);
      if (data.bqSql) span.setAttribute("bq_sql", data.bqSql);
      if (data.estimatedCost !== undefined) span.setAttribute("estimated_cost_usd", data.estimatedCost);
      if (data.promptTokens !== undefined) span.setAttribute(LLM_TOKEN_COUNT_PROMPT, data.promptTokens);
      if (data.completionTokens !== undefined) span.setAttribute(LLM_TOKEN_COUNT_COMPLETION, data.completionTokens);
      if (data.contextValue) span.setAttribute("context.value", data.contextValue.slice(0, 3000));
      if (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: error });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }
      span.end();
    },
  };
}
