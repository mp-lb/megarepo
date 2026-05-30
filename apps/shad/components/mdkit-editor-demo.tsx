"use client"

import { useState } from "react"

import { MdKitLocalEditor } from "../registry/mdkit-editor/mdkit-editor"

const sampleMarkdown = `# Release notes

Ship the editor shell as app-local shadcn source.

- Editable markdown surface from \`@mp-lb/mdkit\`
- shadcn toolbar and dialogs from \`@mp-lb/shad\`
- Source installed into the consuming app
`

export function MdKitEditorDemo() {
  const [markdown, setMarkdown] = useState(sampleMarkdown)

  return (
    <div className="rounded-lg border bg-card p-3">
      <MdKitLocalEditor
        title="Release notes"
        value={markdown}
        onChange={setMarkdown}
      />
    </div>
  )
}
