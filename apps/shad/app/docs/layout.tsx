import type { ReactNode } from "react"
import { Braces, FileText, Github, Terminal } from "lucide-react"
import { DocsLayout as FumadocsDocsLayout } from "fumadocs-ui/layouts/docs"

import { source } from "@/lib/source"

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <FumadocsDocsLayout
      tree={source.pageTree}
      nav={{
        title: "@mp-lb/shad",
        url: "/docs",
      }}
      links={[
        {
          type: "main",
          text: "MDKit Editor",
          url: "/docs/components/mdkit-editor",
          icon: <FileText className="size-4" />,
        },
        {
          type: "main",
          text: "JSON Viewer",
          url: "/docs/components/json-viewer",
          icon: <Braces className="size-4" />,
        },
        {
          type: "main",
          text: "Structured Logs",
          url: "/docs/components/structured-log-viewer",
          icon: <Terminal className="size-4" />,
        },
        {
          type: "icon",
          text: "GitHub",
          label: "GitHub",
          url: "https://github.com/mp-lb/shad",
          icon: <Github className="size-4" />,
          external: true,
        },
      ]}
    >
      {children}
    </FumadocsDocsLayout>
  )
}
