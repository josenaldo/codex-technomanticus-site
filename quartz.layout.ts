import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

const explorerOptions = {
  filterFn: (node: any) => {
    const excluded = new Set(["tags", "docs", "copilot"])
    return !excluded.has(node.slugSegment)
  },
  // Mostra a numeração do arquivo/pasta no explorador ("01 - Título"), já que o
  // `title` do frontmatter não carrega o prefixo numérico do nome do arquivo.
  // NOTA: esta função é serializada com toString() e reavaliada no browser —
  // ela precisa ser autocontida (sem referências a nada fora do próprio corpo).
  mapFn: (node: any) => {
    const source: string = node.isFolder
      ? (node.slugSegment ?? "")
      : (node.data?.filePath ?? node.slugSegment ?? "")
    const raw = (source.split("/").pop() ?? "").replace(/\.mdx?$/i, "")
    const match = raw.match(/^(\d+[a-z]?)\s*[-–—_.]/i)
    if (!match) return
    const prefix = match[1]
    const name = node.displayName ?? ""
    if (name.toLowerCase().startsWith(prefix.toLowerCase())) return
    node.displayName = `${prefix} - ${name}`
  },
  // Ordena pelo slug (que preserva o prefixo numérico do nome do arquivo), e não
  // pelo título — assim a ordem do site bate com a ordem do vault no Obsidian.
  sortFn: (a: any, b: any) => {
    if (a.isFolder !== b.isFolder) {
      return a.isFolder ? -1 : 1
    }
    return (a.slugSegment ?? "").localeCompare(b.slugSegment ?? "", undefined, {
      numeric: true,
      sensitivity: "base",
    })
  },
}

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [Component.SiteHeader()],
  afterBody: [],
  footer: Component.Footer({
    links: {
      "Repositório do Codex": "https://github.com/josenaldo/codex-technomanticus",
      "Feito com Quartz": "https://github.com/jackyzha0/quartz",
    },
  }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.ConditionalRender({
      component: Component.Breadcrumbs(),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ArticleTitle(),
    Component.ContentMeta(),
    Component.TagList(),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.ReaderMode() },
      ],
    }),
    Component.Explorer(explorerOptions),
  ],
  right: [
    Component.Graph(),
    Component.DesktopOnly(Component.TableOfContents()),
    Component.Backlinks(),
  ],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.Breadcrumbs(), Component.ArticleTitle(), Component.ContentMeta()],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
      ],
    }),
    Component.Explorer(explorerOptions),
  ],
  right: [],
}
