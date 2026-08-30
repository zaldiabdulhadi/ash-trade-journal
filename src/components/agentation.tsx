"use client";

import dynamic from "next/dynamic";

const Agentation = dynamic(
  () => import("agentation").then((m) => m.Agentation),
  { ssr: false }
);

export function AgentationTool() {
  return <Agentation />;
}