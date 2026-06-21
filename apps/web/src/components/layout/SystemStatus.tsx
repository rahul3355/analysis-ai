"use client";

import { useEffect, useRef } from "react";
import { useHealth } from "@/hooks/useHealth";
import { HealthBadge } from "./HealthBadge";
import { StartingOverlay } from "./StartingOverlay";

function getIsLocalhost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function SystemStatusInner() {
  const { state } = useHealth();
  if (state === "active") {
    return <HealthBadge />;
  }
  return <StartingOverlay state={state} />;
}

export function SystemStatus() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (container && getIsLocalhost()) {
      container.style.display = "none";
    }
  }, []);

  return (
    <div ref={containerRef}>
      <SystemStatusInner />
    </div>
  );
}
