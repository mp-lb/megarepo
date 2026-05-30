"use client"

import { JsonViewer } from "../registry/json-viewer/json-viewer"

const samplePayload = {
  documentId: "docs/release-notes.md",
  status: "saved",
  version: 42,
  updatedAt: "2026-05-21T13:35:00.000Z",
  author: {
    id: "usr_123",
    name: "Felix",
  },
  features: ["markdown", "version-history", "conflict-resolution"],
  transport: {
    type: "trpc",
    endpoint: "/trpc",
  },
}

export function JsonViewerDemo() {
  return (
    <JsonViewer
      data={samplePayload}
      title="Document payload"
      rootName="payload"
      defaultExpanded={2}
    />
  )
}
