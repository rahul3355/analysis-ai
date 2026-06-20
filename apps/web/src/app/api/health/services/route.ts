import { NextResponse } from "next/server";

const SERVER_START = Date.now();
const ESTIMATED_STARTUP_SEC = 45;
const CHECK_TIMEOUT_MS = 4000;

type ServiceStatus = "ok" | "degraded" | "error";

interface HealthCheck {
  pinecone: ServiceStatus;
  openrouter: ServiceStatus;
}

interface ServicesHealthResponse {
  status: "active" | "starting" | "inactive";
  uptime: number;
  startedAt: string;
  checks: HealthCheck;
  estimatedReadySec: number;
  message: string;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

async function checkPinecone(): Promise<ServiceStatus> {
  try {
    const host = process.env.PINECONE_INDEX_HOST;
    if (!host) return "error";
    const res = await withTimeout(
      fetch(`${host}/describe_index_stats`, {
        method: "POST",
        headers: { "Api-Key": process.env.PINECONE_API_KEY || "", "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      CHECK_TIMEOUT_MS
    );
    return res.ok ? "ok" : "degraded";
  } catch {
    return "error";
  }
}

async function checkOpenRouter(): Promise<ServiceStatus> {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return "error";
    const res = await withTimeout(
      fetch("https://openrouter.ai/api/v1/models", { headers: { Authorization: `Bearer ${apiKey}` } }),
      CHECK_TIMEOUT_MS
    );
    return res.ok ? "ok" : "degraded";
  } catch {
    return "degraded";
  }
}

export async function GET() {
  const elapsed = Date.now() - SERVER_START;
  const uptimeSec = Math.floor(elapsed / 1000);

  const [pinecone, openrouter] = await Promise.all([
    checkPinecone(),
    checkOpenRouter(),
  ]);

  const checks: HealthCheck = { pinecone, openrouter };
  const allOk = Object.values(checks).every((s) => s === "ok");
  const remaining = Math.max(0, ESTIMATED_STARTUP_SEC - uptimeSec);

  const status: ServicesHealthResponse["status"] = allOk ? "active" : "starting";
  const message = allOk
    ? "All systems active"
    : remaining > 0
      ? "Starting services — checking resources"
      : "Services still connecting";

  return NextResponse.json({
    status,
    uptime: uptimeSec,
    startedAt: new Date(SERVER_START).toISOString(),
    checks,
    estimatedReadySec: status === "active" ? 0 : Math.max(1, remaining),
    message,
  } satisfies ServicesHealthResponse);
}
