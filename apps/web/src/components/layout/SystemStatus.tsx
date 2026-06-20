"use client";

import { useHealth } from "@/hooks/useHealth";
import { HealthBadge } from "./HealthBadge";
import { StartingOverlay } from "./StartingOverlay";

export function SystemStatus() {
  const { state, data } = useHealth();

  if (state === "active" && data) {
    return <HealthBadge data={data} />;
  }
  return <StartingOverlay state={state} data={data} />;
}
