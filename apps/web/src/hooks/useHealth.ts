"use client";

import { useState, useEffect } from "react";

export type HealthState = "checking" | "starting" | "active" | "inactive";

export interface ServiceChecks {
  pinecone: string;
  openrouter: string;
}

export interface HealthData {
  status: "active" | "starting" | "inactive";
  message: string;
  uptime: number;
  estimatedReadySec: number;
  checks: ServiceChecks;
}

const STARTING_INTERVAL_MS = 4000;
const ACTIVE_INTERVAL_MS = 60000;
const FETCH_TIMEOUT_MS = 8000;

export function useHealth() {
  const [state, setState] = useState<HealthState>("checking");
  const [data, setData] = useState<HealthData | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const doFetch = (): Promise<HealthData> => {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      return fetch("/api/health/services", { cache: "no-store", signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error("health failed");
          return res.json() as Promise<HealthData>;
        })
        .finally(() => clearTimeout(t));
    };

    const schedule = (delay: number) => {
      if (cancelled) return;
      timer = setTimeout(() => {
        doFetch()
          .then((json) => {
            if (cancelled) return;
            setData(json);
            setState(json.status === "active" ? "active" : "starting");
            schedule(json.status === "active" ? ACTIVE_INTERVAL_MS : STARTING_INTERVAL_MS);
          })
          .catch(() => {
            if (cancelled) return;
            setState("inactive");
            schedule(STARTING_INTERVAL_MS);
          });
      }, delay);
    };

    doFetch()
      .then((json) => {
        if (cancelled) return;
        setData(json);
        setState(json.status === "active" ? "active" : "starting");
        schedule(json.status === "active" ? ACTIVE_INTERVAL_MS : STARTING_INTERVAL_MS);
      })
      .catch(() => {
        if (cancelled) return;
        setState("inactive");
        schedule(STARTING_INTERVAL_MS);
      });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return { state, data };
}
