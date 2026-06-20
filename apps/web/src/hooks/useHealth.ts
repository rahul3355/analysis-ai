"use client";

import { useState, useEffect } from "react";

export type HealthState = "checking" | "active" | "inactive";

export interface HealthData {
  status: string;
  uptime: number;
  startedAt: string;
}

const ACTIVE_INTERVAL_MS = 60000;
const INACTIVE_INTERVAL_MS = 4000;
const FETCH_TIMEOUT_MS = 8000;
const CACHE_KEY = "health-state";

function readCache(): { state: HealthState; data: HealthData | null } {
  if (typeof sessionStorage === "undefined") {
    return { state: "checking", data: null };
  }
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return { state: "checking", data: null };
    const parsed = JSON.parse(raw) as { state: HealthState; data: HealthData };
    if (parsed.state === "active") return { state: "active", data: parsed.data };
  } catch {
    // ignore parse errors
  }
  return { state: "checking", data: null };
}

function writeCache(state: HealthState, data: HealthData | null): void {
  try {
    if (state === "active" && data) {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ state, data }));
    } else {
      sessionStorage.removeItem(CACHE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function useHealth() {
  const [cached] = useState(readCache);
  const [state, setState] = useState<HealthState>(cached.state);
  const [data, setData] = useState<HealthData | null>(cached.data);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const doFetch = (): Promise<HealthData> => {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      return fetch("/api/health", { cache: "no-store", signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error("health failed");
          return res.json() as Promise<HealthData>;
        })
        .finally(() => clearTimeout(t));
    };

    const onSuccess = (json: HealthData): void => {
      if (cancelled) return;
      setData(json);
      setState("active");
      writeCache("active", json);
    };

    const onFailure = (): void => {
      if (cancelled) return;
      setState("inactive");
      setData(null);
      writeCache("inactive", null);
    };

    const schedule = (delay: number) => {
      if (cancelled) return;
      timer = setTimeout(() => {
        doFetch()
          .then((json) => {
            onSuccess(json);
            schedule(ACTIVE_INTERVAL_MS);
          })
          .catch(() => {
            onFailure();
            schedule(INACTIVE_INTERVAL_MS);
          });
      }, delay);
    };

    // Always fetch immediately on mount to confirm/refresh the cached state.
    // If we started from cache as "active", the UI already shows the badge
    // with no overlay flash; this fetch just confirms and refreshes uptime.
    doFetch()
      .then((json) => {
        onSuccess(json);
        schedule(ACTIVE_INTERVAL_MS);
      })
      .catch(() => {
        onFailure();
        schedule(INACTIVE_INTERVAL_MS);
      });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return { state, data };
}
