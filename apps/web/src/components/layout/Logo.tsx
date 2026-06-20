"use client";

import { cn } from "@/lib/cn";

export interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <svg
      viewBox="-24 -28 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("logo-container cursor-pointer select-none", className)}
      aria-hidden="true"
    >
      {/* Edges */}
      <line
        className="stroke-hairline dark:stroke-muted stroke-[1.5] anim-edge-blue delay-1"
        x1="0"
        y1="-15"
        x2="0"
        y2="2"
      />
      <line
        className="stroke-hairline dark:stroke-muted stroke-[1.5] anim-edge-orange delay-2"
        x1="-18"
        y1="8"
        x2="0"
        y2="2"
      />
      <line
        className="stroke-hairline dark:stroke-muted stroke-[1.5] anim-edge-blue delay-3"
        x1="18"
        y1="8"
        x2="0"
        y2="2"
      />
      <line
        className="stroke-hairline dark:stroke-muted stroke-[1.5] anim-edge-orange delay-1"
        x1="0"
        y1="-15"
        x2="-18"
        y2="8"
      />
      <line
        className="stroke-hairline dark:stroke-muted stroke-[1.5] anim-edge-blue delay-2"
        x1="0"
        y1="-15"
        x2="18"
        y2="8"
      />
      <line
        className="stroke-hairline dark:stroke-muted stroke-[1.5] anim-edge-orange delay-3"
        x1="-18"
        y1="8"
        x2="18"
        y2="8"
      />

      {/* Vertices */}
      <circle
        className="stroke-ink dark:stroke-on-dark fill-canvas dark:fill-cohere-black stroke-[1.5] anim-node-blue delay-0"
        cx="0"
        cy="-15"
        r="4.5"
      />
      <circle
        className="stroke-ink dark:stroke-on-dark fill-canvas dark:fill-cohere-black stroke-[1.5] anim-node-orange delay-4"
        cx="-18"
        cy="8"
        r="4.5"
      />
      <circle
        className="stroke-ink dark:stroke-on-dark fill-canvas dark:fill-cohere-black stroke-[1.5] anim-node-blue delay-4"
        cx="18"
        cy="8"
        r="4.5"
      />
      <circle
        className="stroke-ink dark:stroke-on-dark fill-canvas dark:fill-cohere-black stroke-[1.5] anim-node-orange delay-2"
        cx="0"
        cy="2"
        r="4.5"
      />
    </svg>
  );
}
