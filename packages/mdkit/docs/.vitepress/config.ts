import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Markdown Editor Kit",
  description: "Docs for the mdkit markdown editor package",
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: "Quick Start", link: "/" },
      { text: "Plain Text", link: "/plain-text" },
      { text: "Styling", link: "/styling" },
      { text: "Shadcn", link: "/shadcn" },
      { text: "REST", link: "/rest" },
      { text: "Use Cases", link: "/use-cases" },
      { text: "Permissions", link: "/permissions" },
      { text: "Collaboration Persistence", link: "/collaboration-persistence" },
      { text: "API", link: "/api" },
      { text: "Architecture", link: "/architecture" },
    ],
    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Quick Start", link: "/" },
          { text: "Plain Text Editors", link: "/plain-text" },
          { text: "Styling", link: "/styling" },
          { text: "Shadcn Plugin", link: "/shadcn" },
          { text: "REST Backend", link: "/rest" },
          { text: "Use Cases", link: "/use-cases" },
          { text: "Permissions", link: "/permissions" },
          {
            text: "Collaboration Persistence",
            link: "/collaboration-persistence",
          },
          { text: "API Reference", link: "/api" },
          { text: "Architecture", link: "/architecture" },
        ],
      },
    ],
    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/mp-lb/mdkit",
      },
    ],
  },
});
