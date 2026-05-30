import { DocsPage } from "fumadocs-ui/layouts/docs/page"

import { PageHeader } from "@/components/page-header"
import { StructuredLogViewerDemo } from "@/components/structured-log-viewer-demo"

export default function StructuredLogViewerPage() {
  return (
    <DocsPage footer={{ enabled: false }} tableOfContent={{ enabled: false }}>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Structured Log Viewer"
          description="Show compact event headlines, expand rows, and inspect the full raw JSON payload."
          install="pnpm dlx shadcn@latest add https://shad.mp-lb.dev/r/structured-log-viewer.json"
        />
        <StructuredLogViewerDemo />
      </div>
    </DocsPage>
  )
}
