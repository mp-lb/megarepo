export function CodeLine({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-md border bg-muted/35 px-3 py-2 font-mono text-xs text-muted-foreground">
      <code>{children}</code>
    </pre>
  )
}
