import { NextResponse } from "next/server";

const SERVER_START = Date.now();

export async function GET() {
  return NextResponse.json({
    status: "active",
    uptime: Math.floor((Date.now() - SERVER_START) / 1000),
    startedAt: new Date(SERVER_START).toISOString(),
  });
}
