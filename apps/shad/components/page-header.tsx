import { CodeLine } from "./code-line"

export function PageHeader({
  description,
  install,
  title,
}: {
  description: string
  install: string
  title: string
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      <CodeLine>{install}</CodeLine>
    </div>
  )
}
