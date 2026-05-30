import Link from "next/link"
import { ArrowRight, Braces, FileText, ListTree, Terminal } from "lucide-react"
import { DocsPage } from "fumadocs-ui/layouts/docs/page"

const components = [
  {
    href: "/docs/components/mdkit-editor",
    title: "MDKit Editor",
    description: "A shadcn-rendered markdown editor shell powered by @mp-lb/mdkit.",
    icon: FileText,
  },
  {
    href: "/docs/components/json-viewer",
    title: "JSON Viewer",
    description: "Collapsible JSON tree with search, path copying, and themes.",
    icon: Braces,
  },
  {
    href: "/docs/components/structured-log-viewer",
    title: "Structured Log Viewer",
    description: "Expandable event logs with dot-path headline fields and raw JSON.",
    icon: Terminal,
  },
]

export default function DocsIndexPage() {
  return (
    <DocsPage
      breadcrumb={{ enabled: false }}
      footer={{ enabled: false }}
      tableOfContent={{ enabled: false }}
    >
      <div className="flex flex-col gap-8">
        <section className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ListTree className="size-4" />
            shadcn registry
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            @mp-lb/shad
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Install app-local shadcn source for MP-LB components, then edit it
            like normal project code.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {components.map((component) => {
            const Icon = component.icon
            return (
              <Link
                key={component.href}
                href={component.href}
                className="group rounded-xl border bg-card p-4 transition-colors hover:bg-muted/35"
              >
                <div className="flex items-center justify-between gap-3">
                  <Icon className="size-5 text-muted-foreground" />
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
                <h2 className="mt-4 text-sm font-semibold">
                  {component.title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {component.description}
                </p>
              </Link>
            )
          })}
        </section>
      </div>
    </DocsPage>
  )
}
