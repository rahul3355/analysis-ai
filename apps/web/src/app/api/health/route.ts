import { NextResponse } from "next/server";

const SERVER_START = Date.now();

type ServiceStatus = "ok" | "degraded" | "error";

interface HealthCheck {
  pinecone: ServiceStatus;
  r2: ServiceStatus;
  bigquery: ServiceStatus;
  openrouter: ServiceStatus;
}

interface HealthResponse {
  status: "active" | "starting" | "inactive";
  uptime: number;
  startedAt: string;
  checks: HealthCheck;
  estimatedReadySec: number;
  message: string;
}

async function checkPinecone(): Promise<ServiceStatus> {
  try {
    const host = process.env.PINECONE_INDEX_HOST;
    if (!host) return "error";
    const res = await fetch(`${host}/describe_index_stats`, {
      method: "POST",
      headers: {
        "Api-Key": process.env.PINECONE_API_KEY || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    return res.ok ? "ok" : "degraded";
  } catch {
    return "error";
  }
}

async function checkR2(): Promise<ServiceStatus> {
  try {
    const endpoint = process.env.R2_ENDPOINT;
    const bucket = process.env.R2_BUCKET_NAME;
    if (!endpoint || !bucket) return "error";
    const res = await fetch(`${endpoint}/${bucket}?max-keys=1`, {
      method: "GET",
      headers: {
        Authorization: `AWS4-HMAC-SHA256 Credential=${process.env.R2_ACCESS_KEY_ID}/20260101/auto/s3/aws4_request`,
      },
    });
    return res.status === 200 || res.status === 403 ? "ok" : "degraded";
  } catch {
    return "degraded";
  }
}

async function checkBigQuery(): Promise<ServiceStatus> {
  try {
    const { getBigQueryConfig, BQ_DATASET_ID } = await import("@/server/config/bigquery");
    const { BigQuery } = await import("@google-cloud/bigquery");
    const config = getBigQueryConfig();
    const bq = process.env.BQ_KEY_CONTENT
      ? new BigQuery({ projectId: config.projectId, credentials: JSON.parse(process.env.BQ_KEY_CONTENT) })
      : config.keyFile
        ? new BigQuery({ projectId: config.projectId, keyFilename: config.keyFile })
        : null;
    if (!bq) return "error";
    const [datasets] = await bq.getDatasets();
    const found = datasets.some((d: { id?: string }) => d.id === BQ_DATASET_ID);
    return found ? "ok" : "degraded";
  } catch {
    return "error";
  }
}

async function checkOpenRouter(): Promise<ServiceStatus> {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return "error";
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    return res.ok ? "ok" : "degraded";
  } catch {
    return "degraded";
  }
}

export async function GET() {
  const elapsed = Date.now() - SERVER_START;
  const ESTIMATED_STARTUP_SEC = 45;

  const status: "active" | "starting" | "inactive" =
    elapsed < 10000 ? "starting" : "active";

  const [pinecone, r2, bigquery, openrouter] = await Promise.all([
    checkPinecone(),
    checkR2(),
    checkBigQuery(),
    checkOpenRouter(),
  ]);

  const checks: HealthCheck = { pinecone, r2, bigquery, openrouter };
  const allOk = Object.values(checks).every((s) => s === "ok");

  const message = status === "starting"
    ? `Server starting up — services will be ready in ~${Math.max(1, Math.ceil((ESTIMATED_STARTUP_SEC * 1000 - elapsed) / 1000))}s`
    : allOk
      ? "All systems active"
      : "Some services degraded";

  return NextResponse.json({
    status,
    uptime: Math.floor(elapsed / 1000),
    startedAt: new Date(SERVER_START).toISOString(),
    checks,
    estimatedReadySec: status === "starting" ? ESTIMATED_STARTUP_SEC : 0,
    message,
  } satisfies HealthResponse);
}
