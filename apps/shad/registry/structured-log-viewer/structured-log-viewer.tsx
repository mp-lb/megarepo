"use client"

import * as React from "react"
import {
  Check,
  ChevronRight,
  Copy,
  Download,
  Search,
  Terminal,
} from "lucide-react"

import { JsonViewer, type JsonValue } from "@/components/json-viewer"
import { cn } from "@/lib/utils"

type LogEvent = Record<string, unknown>

export type StructuredLogTone =
  | "default"
  | "debug"
  | "info"
  | "success"
  | "warn"
  | "error"

export type StructuredLogField = {
  label: string
  path: string
  className?: string
  format?: (value: unknown, event: LogEvent) => React.ReactNode
}

export type StructuredLogViewerProps<TEvent extends LogEvent = LogEvent> =
  Omit<React.ComponentProps<"section">, "children"> & {
    events: TEvent[]
    fields?: StructuredLogField[] | ((event: TEvent) => StructuredLogField[])
    title?: string
    keyPath?: string
    timestampPath?: string
    levelPath?: string
    titlePath?: string
    messagePath?: string
    statusPath?: string
    maxHeight?: number
    defaultExpanded?: boolean
    emptyMessage?: string
    toneMap?: Record<string, StructuredLogTone>
    formatTimestamp?: (value: unknown, event: TEvent) => React.ReactNode
  }

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "short",
  timeStyle: "medium",
})

const defaultToneMap: Record<string, StructuredLogTone> = {
  "2xx": "success",
  "3xx": "info",
  "4xx": "warn",
  "5xx": "error",
  debug: "debug",
  error: "error",
  failed: "error",
  failure: "error",
  info: "info",
  ok: "success",
  success: "success",
  succeeded: "success",
  warn: "warn",
  warning: "warn",
}

const toneClassNames: Record<StructuredLogTone, string> = {
  default: "border-border/70 bg-muted/30 text-muted-foreground",
  debug: "border-zinc-500/20 bg-zinc-500/10 text-zinc-600 dark:text-zinc-300",
  error: "border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400",
  info: "border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  success:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warn: "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400",
}

function getValueAtPath(value: unknown, path?: string): unknown {
  if (!path) return undefined

  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined
    return (current as Record<string, unknown>)[key]
  }, value)
}

function formatFieldValue(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)

  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function formatDefaultTimestamp(value: unknown): React.ReactNode {
  if (typeof value !== "string" && typeof value !== "number") return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return formatFieldValue(value)

  return dateTimeFormatter.format(date)
}

function stringifyEvent(event: unknown): string {
  try {
    return JSON.stringify(event, null, 2)
  } catch {
    return String(event)
  }
}

function resolveTone(
  value: unknown,
  toneMap: Record<string, StructuredLogTone>
): StructuredLogTone {
  const formatted = formatFieldValue(value)?.toLowerCase()
  if (!formatted) return "default"
  if (toneMap[formatted]) return toneMap[formatted]

  const numeric = Number(formatted)
  if (Number.isFinite(numeric)) {
    if (numeric >= 200 && numeric < 300) return toneMap["2xx"] ?? "success"
    if (numeric >= 300 && numeric < 400) return toneMap["3xx"] ?? "info"
    if (numeric >= 400 && numeric < 500) return toneMap["4xx"] ?? "warn"
    if (numeric >= 500 && numeric < 600) return toneMap["5xx"] ?? "error"
  }

  return "default"
}

function useCopy() {
  const [copied, setCopied] = React.useState(false)

  const copy = React.useCallback(async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }, [])

  return { copied, copy }
}

function exportEvents(events: LogEvent[]) {
  const blob = new Blob([stringifyEvent(events)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `logs-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function StructuredLogViewer<TEvent extends LogEvent = LogEvent>({
  events,
  fields = [],
  title = "Logs",
  keyPath = "_id",
  timestampPath = "timestamp",
  levelPath = "level",
  titlePath = "eventType",
  messagePath = "message",
  statusPath,
  maxHeight = 520,
  defaultExpanded = false,
  emptyMessage = "No log entries.",
  toneMap,
  formatTimestamp,
  className,
  ...props
}: StructuredLogViewerProps<TEvent>) {
  const [query, setQuery] = React.useState("")
  const { copied, copy } = useCopy()
  const mergedToneMap = React.useMemo(
    () => ({ ...defaultToneMap, ...toneMap }),
    [toneMap]
  )

  const filteredEvents = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return events

    return events.filter((event) =>
      stringifyEvent(event).toLowerCase().includes(normalizedQuery)
    )
  }, [events, query])

  return (
    <section
      data-slot="structured-log-viewer"
      className={cn(
        "overflow-hidden rounded-md border border-border/70 bg-card font-mono text-[10px] leading-4 text-card-foreground shadow-sm",
        className
      )}
      {...props}
    >
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border/60 bg-muted/25 px-2 py-1">
        <Terminal className="size-3 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1 overflow-x-auto">
          <h2 className="w-max whitespace-nowrap font-medium">{title}</h2>
        </div>
        <div className="text-muted-foreground">
          {filteredEvents.length}
          {query ? ` / ${events.length}` : ""} events
        </div>
        <button
          type="button"
          onClick={() => copy(stringifyEvent(filteredEvents))}
          className="inline-flex size-5 items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-1 focus-visible:ring-ring"
          aria-label={copied ? "Copied logs" : "Copy logs"}
        >
          {copied ? (
            <Check className="size-3 text-emerald-500" />
          ) : (
            <Copy className="size-3" />
          )}
        </button>
        <button
          type="button"
          onClick={() => exportEvents(filteredEvents)}
          className="inline-flex size-5 items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-1 focus-visible:ring-ring"
          aria-label="Download logs"
        >
          <Download className="size-3" />
        </button>
      </div>

      <div className="flex items-center gap-1.5 border-b border-border/60 px-2 py-1">
        <Search className="size-3 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search logs..."
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="overflow-auto" style={{ maxHeight }}>
        {filteredEvents.length === 0 ? (
          <div className="px-3 py-10 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          filteredEvents.map((event, index) => {
            const keyValue = formatFieldValue(getValueAtPath(event, keyPath))
            return (
              <StructuredLogRow
                defaultExpanded={defaultExpanded}
                event={event}
                fields={typeof fields === "function" ? fields(event) : fields}
                formatTimestamp={formatTimestamp}
                key={keyValue ?? index}
                levelPath={levelPath}
                messagePath={messagePath}
                statusPath={statusPath ?? levelPath}
                timestampPath={timestampPath}
                titlePath={titlePath}
                toneMap={mergedToneMap}
              />
            )
          })
        )}
      </div>
    </section>
  )
}

type StructuredLogRowProps<TEvent extends LogEvent> = {
  event: TEvent
  fields: StructuredLogField[]
  timestampPath: string
  levelPath: string
  titlePath: string
  messagePath: string
  statusPath: string
  toneMap: Record<string, StructuredLogTone>
  defaultExpanded: boolean
  formatTimestamp?: (value: unknown, event: TEvent) => React.ReactNode
}

function StructuredLogRow<TEvent extends LogEvent>({
  event,
  fields,
  timestampPath,
  levelPath,
  titlePath,
  messagePath,
  statusPath,
  toneMap,
  defaultExpanded,
  formatTimestamp,
}: StructuredLogRowProps<TEvent>) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded)
  const timestampValue = getValueAtPath(event, timestampPath)
  const levelValue = getValueAtPath(event, levelPath)
  const titleValue = getValueAtPath(event, titlePath)
  const messageValue = getValueAtPath(event, messagePath)
  const statusValue = getValueAtPath(event, statusPath)
  const tone = resolveTone(statusValue, toneMap)

  const visibleFields = fields
    .map((field) => {
      const value = getValueAtPath(event, field.path)
      return {
        ...field,
        formatted: field.format?.(value, event) ?? formatFieldValue(value),
      }
    })
    .filter((field) => field.formatted !== null && field.formatted !== undefined)

  const title = formatFieldValue(titleValue)
  const message = formatFieldValue(messageValue)
  const level = formatFieldValue(levelValue)
  const timestamp =
    formatTimestamp?.(timestampValue, event) ?? formatDefaultTimestamp(timestampValue)

  return (
    <article className="border-b border-border/50 last:border-b-0">
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((current) => !current)}
        className="flex min-w-max items-center gap-1.5 px-1.5 py-0.5 text-left outline-none transition-colors hover:bg-muted/30 focus-visible:bg-muted/40"
      >
        <ChevronRight
          className={cn("size-3 shrink-0 text-muted-foreground transition-transform", {
            "rotate-90": isExpanded,
          })}
        />
        <span className="hidden shrink-0 whitespace-nowrap text-muted-foreground md:block">
          {timestamp}
        </span>
        <span
          className={cn(
            "shrink-0 whitespace-nowrap rounded-sm border px-1 py-0 text-center font-semibold uppercase",
            toneClassNames[tone]
          )}
        >
          {level ?? formatFieldValue(statusValue) ?? "event"}
        </span>
        <span className="shrink-0 whitespace-nowrap font-semibold">
          {title ?? "log.event"}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {message ? (
            <span className="shrink-0 whitespace-nowrap text-muted-foreground">
              {message}
            </span>
          ) : null}
          {visibleFields.map((field) => (
            <span
              key={field.path}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-sm border border-border/60 bg-muted/20 px-1 py-0 text-muted-foreground",
                field.className
              )}
              title={`${field.label}=${String(field.formatted)}`}
            >
              {field.label}={field.formatted}
            </span>
          ))}
        </span>
      </button>

      {isExpanded ? (
        <div className="border-t border-border/40 bg-muted/10 p-1.5">
          <JsonViewer
            data={event as JsonValue}
            rootName="event"
            defaultExpanded={2}
            className="rounded-sm shadow-none"
          />
        </div>
      ) : null}
    </article>
  )
}
