// Codex Technomanticus — barra de domínio compartilhada com josenaldo.com.br.
// O estilo vive em quartz/styles/custom.scss (.jm-topbar).

import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const SITE = "https://josenaldo.com.br"

const LINKS: { label: string; href: string }[] = [
  { label: "Home", href: `${SITE}/pt` },
  { label: "Blog", href: `${SITE}/pt/blog` },
  { label: "Sobre", href: `${SITE}/pt/about` },
  { label: "Codex", href: "/codex-technomanticus-site/" },
  { label: "Contato", href: `${SITE}/pt/contact` },
]

const SiteHeader: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <header class={`jm-topbar ${displayClass ?? ""}`}>
      <a class="jm-brand" href={`${SITE}/pt`}>
        Josenaldo Matos
      </a>
      <nav class="jm-nav" aria-label="navegação do site">
        {LINKS.map(({ label, href }) => (
          <a href={href} aria-current={label === "Codex" ? "page" : undefined}>
            {label}
          </a>
        ))}
        <a class="jm-cta" href={`${SITE}/pt/contact`}>
          Agendar 30 min
        </a>
      </nav>
    </header>
  )
}

export default (() => SiteHeader) satisfies QuartzComponentConstructor
