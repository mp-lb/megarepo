"use client"

import { useMemo } from "react"

import { StructuredLogViewer } from "../registry/structured-log-viewer/structured-log-viewer"

const sampleEvents = [
  {
    _id: "evt_001",
    timestamp: "2026-05-21T13:30:00.000Z",
    level: "info",
    eventType: "mdkit.document.loaded",
    message: "Loaded markdown document.",
    details: {
      documentId: "docs/release-notes.md",
      version: 41,
    },
    trace: { traceId: "trc_7fd932" },
  },
  {
    _id: "evt_002",
    timestamp: "2026-05-21T13:31:15.000Z",
    level: "warn",
    eventType: "mdkit.save.pending",
    message: "Autosave is waiting for debounce.",
    details: {
      documentId: "docs/release-notes.md",
      debounceMs: 1000,
    },
    trace: { traceId: "trc_7fd932" },
  },
  {
    _id: "evt_003",
    timestamp: "2026-05-21T13:31:16.000Z",
    level: "info",
    eventType: "mdkit.save.completed",
    message: "Document saved successfully.",
    details: {
      documentId: "docs/release-notes.md",
      version: 42,
      statusCode: 200,
    },
    trace: { traceId: "trc_7fd932" },
  },
]

export function StructuredLogViewerDemo() {
  const fields = useMemo(
    () => [
      { label: "doc", path: "details.documentId" },
      { label: "version", path: "details.version" },
      { label: "trace", path: "trace.traceId" },
    ],
    []
  )

  return (
    <StructuredLogViewer
      title="MDKit events"
      events={sampleEvents}
      fields={fields}
      levelPath="level"
      messagePath="message"
      statusPath="details.statusCode"
      timestampPath="timestamp"
      titlePath="eventType"
    />
  )
}
