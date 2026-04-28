import { QuartzTransformerPlugin } from "../types"

/**
 * Rewrites links that point to README files to point to index files instead.
 *
 * Works in tandem with the build workflow step that copies README.md → index.md
 * in each directory. Without this plugin, wikilinks like [[README]] or markdown
 * links like [text](README.md) would break after README.md is excluded from
 * processing via ignorePatterns.
 *
 * Handles:
 *   - Wikilinks: [[README]] → [[index]], [[folder/README|alias]] → [[folder/index|alias]]
 *   - Markdown links: [text](README.md) → [text](index.md)
 */
export const ReadmeToIndex: QuartzTransformerPlugin = () => {
  return {
    name: "ReadmeToIndex",
    textTransform(_ctx, src) {
      // Rewrite wikilinks: [[README]], [[path/README]], [[README|alias]], [[path/README|alias]]
      src = src.replace(
        /\[\[([^\]|]*?)README(\|[^\]]*)?]]/g,
        (_, prefix: string, alias: string | undefined) => `[[${prefix}index${alias ?? ""}]]`,
      )

      // Rewrite standard markdown links: [text](README.md), [text](path/README.md)
      src = src.replace(/\]\(([^)]*?)README\.md\)/g, "]($1index.md)")

      return src
    },
  }
}
