import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

/**
 * Quartz 4 Configuration
 *
 * See https://quartz.jzhao.xyz/configuration for more information.
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "Codex Technomanticus",
    pageTitleSuffix: " · Codex Technomanticus",
    enableSPA: true,
    enablePopovers: true,
    analytics: {
      provider: "plausible",
    },
    locale: "pt-BR",
    baseUrl: "josenaldo.github.io/codex-technomanticus-site",
    ignorePatterns: [
      "private",
      ".obsidian",
      "**/README.md",
      "docs",
      "docs/**",
      "copilot",
      "copilot/**",
      // O site publica o que tem valor pra quem chega de fora: os domínios e as
      // sendas. As zonas de trabalho do grimório (meta, pergaminhos, glosas) e a
      // governança de conteúdo (roadmaps de galho, specs de design) continuam no
      // Obsidian, mas não viram página pública. A exceção é 00-Meta/mestres, que
      // é conteúdo de referência e recebe links das notas dos domínios.
      "**/roadmap.md",
      "00-Meta/Roadmap.md",
      "00-Meta/index.md",
      "00-Meta/specs",
      "00-Meta/specs/**",
      "00-Meta/guia",
      "00-Meta/guia/**",
      "00-Meta/health-audits",
      "00-Meta/health-audits/**",
      "00-Meta/pesquisas",
      "00-Meta/pesquisas/**",
      "00-Meta/revisoes",
      "00-Meta/revisoes/**",
      "00-Meta/scripts",
      "00-Meta/scripts/**",
      "00-Meta/templates",
      "00-Meta/templates/**",
      "01-Pergaminhos",
      "01-Pergaminhos/**",
      "02-Glosas",
      "02-Glosas/**",
      "monkey-patching.md",
    ],
    defaultDateType: "modified",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Space Grotesk",
        body: "IBM Plex Sans",
        code: "IBM Plex Mono",
      },
      colors: {
        // Papel de cada variável no Quartz:
        //   light        fundo da página
        //   lightgray    bordas, fios, fundo de bloco de código
        //   gray         metadado, data, links do grafo
        //   darkgray     corpo de texto
        //   dark         títulos e texto forte
        //   secondary    links, título do site, nós do grafo
        //   tertiary     hover de link, foco do grafo
        //   highlight    fundo de link interno e de código inline
        //   textHighlight  marcação ==assim==
        //
        // lightMode e darkMode são IGUAIS de propósito: o Codex é dark
        // permanente, alinhado a josenaldo.com.br. Por isso o Darkmode() foi
        // removido do quartz.layout.ts.
        lightMode: {
          light: "#0B0E13",
          lightgray: "#1A1E26",
          gray: "#7C8494",
          darkgray: "#C6CCD8",
          dark: "#E9ECF2",
          secondary: "#B69BF0",
          tertiary: "#FFAA00",
          highlight: "rgba(136, 85, 223, 0.14)",
          textHighlight: "rgba(255, 170, 0, 0.35)",
        },
        darkMode: {
          light: "#0B0E13",
          lightgray: "#1A1E26",
          gray: "#7C8494",
          darkgray: "#C6CCD8",
          dark: "#E9ECF2",
          secondary: "#B69BF0",
          tertiary: "#FFAA00",
          highlight: "rgba(136, 85, 223, 0.14)",
          textHighlight: "rgba(255, 170, 0, 0.35)",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.ReadmeToIndex(),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
      // Comment out CustomOgImages to speed up build time
      Plugin.CustomOgImages(),
    ],
  },
}

export default config
