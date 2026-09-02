#!/usr/bin/env node
// codex-lf-check.mjs — verificação estática do L&F do Codex Technomanticus.
//
// Roda sobre a saída do build (public/), sem dependências, sem navegador.
// Responde a UMA pergunta: os passos de spec/00-instalacao.md estão presentes
// no que foi realmente publicado?
//
//   npx quartz build
//   node handoff-codex-v2/verify/codex-lf-check.mjs public
//
// Saída: uma linha por checagem (OK / FALHA / AVISO), um resumo e exit code
// 1 se houver FALHA. AVISO nunca reprova o build — é lista de trabalho
// (ex.: cerca sem linguagem no vault).
//
// Se uma checagem der falso-positivo por diferença de versão do Quartz,
// corrija A CHECAGEM (e anote aqui por quê), não o design.

import { readdir, readFile, stat } from "node:fs/promises"
import { join, extname, relative } from "node:path"

const ROOT = process.argv[2] ?? "public"

const RESET = "\x1b[0m"
const C = {
  ok: (s) => `\x1b[32m${s}${RESET}`,
  fail: (s) => `\x1b[31m${s}${RESET}`,
  warn: (s) => `\x1b[33m${s}${RESET}`,
  dim: (s) => `\x1b[2m${s}${RESET}`,
  b: (s) => `\x1b[1m${s}${RESET}`,
}

const results = []
const record = (level, name, detail = "") => results.push({ level, name, detail })
const ok = (n, d) => record("ok", n, d)
const fail = (n, d) => record("fail", n, d)
const warn = (n, d) => record("warn", n, d)

// ---------------------------------------------------------------- utilidades

async function walk(dir, out = []) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    const p = join(dir, e.name)
    if (e.isDirectory()) await walk(p, out)
    else out.push(p)
  }
  return out
}

const files = await walk(ROOT)
if (files.length === 0) {
  console.error(
    C.fail(`Nada em "${ROOT}". Rode "npx quartz build" primeiro, ou passe o caminho: node codex-lf-check.mjs <dir>`),
  )
  process.exit(1)
}

const htmlFiles = files.filter((f) => extname(f) === ".html")
const cssFiles = files.filter((f) => extname(f) === ".css")

const read = async (f) => {
  try {
    return await readFile(f, "utf8")
  } catch {
    return ""
  }
}

const html = Object.fromEntries(await Promise.all(htmlFiles.map(async (f) => [f, await read(f)])))

// CORREÇÃO (Codex, 2026-09-02): `Plugin.AliasRedirects` emite um stub de 8
// linhas por alias — `noindex` + `meta refresh`, sem layout nenhum. Contá-los
// como página fazia a checagem da barra de domínio reprovar um build correto
// (4864/8512, sendo que 3648 eram stubs). O universo das checagens de layout é
// só a página renderizada.
const isRedirectStub = (src) => /http-equiv="refresh"/i.test(src) && !/<body/i.test(src)
const layoutHtml = Object.fromEntries(Object.entries(html).filter(([, src]) => !isRedirectStub(src)))
const layoutCount = Object.keys(layoutHtml).length
const css = Object.fromEntries(await Promise.all(cssFiles.map(async (f) => [f, await read(f)])))

const allCss = Object.values(css).join("\n")
const allHtml = Object.values(html).join("\n")
const someHtml = html[join(ROOT, "index.html")] ?? Object.values(html)[0] ?? ""

const countIn = (map, re) =>
  Object.entries(map).reduce((n, [, txt]) => n + (txt.match(re)?.length ?? 0), 0)

const filesMatching = (map, re) =>
  Object.entries(map)
    .filter(([, txt]) => re.test(txt))
    .map(([f]) => relative(ROOT, f))

// --------------------------------------------------- 1. fontes (passo 2)

const FONTS = ["Space+Grotesk", "IBM+Plex+Sans", "IBM+Plex+Mono"]
const missingFonts = FONTS.filter((f) => !allHtml.includes(f) && !allCss.includes(f.replace(/\+/g, " ")))
if (missingFonts.length === 0) ok("Fontes", "Space Grotesk + IBM Plex Sans + IBM Plex Mono no <head>")
else fail("Fontes", `faltando: ${missingFonts.join(", ")} — spec/01-tokens.md §4`)

// --------------------------------------------------- 2. paleta (passo 2)

const PALETTE = {
  "#0b0e13": "light (fundo)",
  "#1a1e26": "lightgray (fios)",
  "#7c8494": "gray (metadado)",
  "#c6ccd8": "darkgray (corpo)",
  "#e9ecf2": "dark (títulos)",
  "#b69bf0": "secondary (links)",
  "#ffaa00": "tertiary (âmbar)",
}
const cssLower = allCss.toLowerCase()
const missingColors = Object.entries(PALETTE).filter(([hex]) => !cssLower.includes(hex))
if (missingColors.length === 0) ok("Paleta", "as 9 variáveis do Quartz mapeadas nos tokens do site")
else
  fail(
    "Paleta",
    `ausentes no CSS: ${missingColors.map(([h, r]) => `${h} (${r})`).join(", ")} — spec/01-tokens.md §1`,
  )

// --------------------------------------------------- 3. custom.scss (passo 3)

const hasTopbarCss = /\.jm-topbar/.test(allCss)
const hasJmTokens = /--jm-accent/.test(allCss)
if (hasTopbarCss && hasJmTokens) ok("custom.scss", "camada visual compilada (.jm-topbar + tokens --jm-*)")
else
  fail(
    "custom.scss",
    `${!hasTopbarCss ? ".jm-topbar ausente " : ""}${!hasJmTokens ? "--jm-* ausente" : ""}— o arquivo não foi colado ou não compilou`,
  )

// o que mata o negrito global dos links (spec/03 §2)
// CORREÇÃO (Codex, 2026-09-02): procurar `font-weight: inherit` no CSS inteiro
// dava OK com a regra ausente — casava com o reset que o próprio Quartz aplica
// a `textarea`/`button`. A declaração precisa estar numa regra cujo seletor
// contenha `a`, que é onde ela mata o 600 global.
const linkWeightRule = /(^|[},])\s*([^{}]*\ba\b[^{}]*)\{[^}]*font-weight:\s*inherit/m.test(allCss)
if (linkWeightRule) ok("Links (peso)", "font-weight: inherit numa regra de `a` — o 600 global do base.scss foi neutralizado")
else fail("Links (peso)", "sem `font-weight: inherit` em `a` — a nota MOC volta a ser parede de negrito (spec/03-links.md §2)")

// --------------------------------------------------- 4. barra de domínio (passo 4)

const pagesWithTopbar = filesMatching(layoutHtml, /class="jm-topbar/)
if (pagesWithTopbar.length === layoutCount)
  ok("Barra de domínio", `presente nas ${layoutCount} páginas de layout (${htmlFiles.length - layoutCount} stubs de alias, sem header por definição)`)
else if (pagesWithTopbar.length > 0)
  fail(
    "Barra de domínio",
    `presente em ${pagesWithTopbar.length}/${layoutCount} páginas de layout — o header precisa estar em sharedPageComponents, não numa layout só`,
  )
else fail("Barra de domínio", "ausente — SiteHeader não está ligado (code/quartz.layout.patch.md §1)")

// --------------------------------------------------- 5. tema único (passo 5)

const darkmodePages = filesMatching(html, /class="darkmode"/)
if (darkmodePages.length === 0) ok("Toggle de tema", "Component.Darkmode() fora do layout")
else
  fail(
    "Toggle de tema",
    `ainda renderizado em ${darkmodePages.length} página(s) — o Codex é dark permanente (code/quartz.layout.patch.md §2)`,
  )

// --------------------------------------------------- 6. código (passo 6)

const ghDarkFiles = [...filesMatching(html, /github-dark/), ...filesMatching(css, /github-dark/)]
if (ghDarkFiles.length === 0) ok("Tema de sintaxe", "sem github-dark — dark-plus aplicado")
else fail("Tema de sintaxe", `github-dark ainda presente em: ${ghDarkFiles.slice(0, 5).join(", ")} (spec/04-codigo.md §2)`)

const preWithBg = countIn(html, /<pre[^>]*style="[^"]*background/gi)
if (preWithBg === 0) ok("keepBackground", "nenhum <pre> com fundo inline — o cartão de código é o nosso")
else fail("keepBackground", `${preWithBg} <pre> com background inline — falta keepBackground: false (spec/04-codigo.md §2)`)

// censo das cercas
const langCensus = {}
for (const [, txt] of Object.entries(html)) {
  for (const m of txt.matchAll(/data-language="([a-z0-9#+-]*)"/gi)) {
    const k = m[1] || "(vazio)"
    langCensus[k] = (langCensus[k] ?? 0) + 1
  }
}
const censusList = Object.entries(langCensus).sort((a, b) => b[1] - a[1])
if (censusList.length > 0) {
  const textCount = (langCensus.text ?? 0) + (langCensus["(vazio)"] ?? 0)
  const line = censusList.map(([k, n]) => `${k}:${n}`).join("  ")
  if (textCount === 0) ok("Cercas de código", line)
  else {
    const pages = filesMatching(html, /data-language="text"/)
    warn(
      "Cercas de código",
      `${textCount} bloco(s) sem linguagem (data-language="text"). Esperado em terminal/árvore de diretórios; nos demais é varredura no vault.\n      ${C.dim(line)}\n      páginas: ${pages.slice(0, 8).join(", ")}${pages.length > 8 ? ` … +${pages.length - 8}` : ""}`,
    )
  }
} else warn("Cercas de código", "nenhum bloco de código encontrado no build — não deu para censar")

// --------------------------------------------------- 7. diagramas (passo 7)

const mermaidBlocks = countIn(html, /class="mermaid"/g)
if (mermaidBlocks > 0) ok("Diagramas", `${mermaidBlocks} bloco(s) Mermaid no build`)
else warn("Diagramas", "nenhum bloco Mermaid no build — nada a verificar aqui")

const inlineStyled = filesMatching(html, /style\s+\w+\s+fill:#|fill:#[0-9a-f]{3,6},stroke:/i)
if (inlineStyled.length === 0) ok("Cor cravada em diagrama", "nenhum `style X fill:#…` no markdown publicado")
else
  warn(
    "Cor cravada em diagrama",
    `${inlineStyled.length} página(s) com cor inline no diagrama — estilo inline ganha do tema e do CSS. Trocar por classDef/:::classe (spec/05-mermaid.md §5):\n      ${inlineStyled.slice(0, 8).join(", ")}${inlineStyled.length > 8 ? ` … +${inlineStyled.length - 8}` : ""}`,
  )

// --------------------------------------------------- 8. resíduos da paleta antiga

const cyan = [...filesMatching(html, /64d8cb/i), ...filesMatching(css, /64d8cb/i)]
if (cyan.length === 0) ok("Paleta antiga", "sem ciano #64D8CB")
else fail("Paleta antiga", `ciano #64D8CB ainda presente em: ${cyan.slice(0, 5).join(", ")}`)

// --------------------------------------------------- 9. favicon e OG (passo 8)

const hasFavicon = files.some((f) => /favicon\.(ico|svg|png)$/i.test(f))
if (hasFavicon) ok("Favicon", "presente no build")
else warn("Favicon", "não encontrei favicon no build — alinhar com o domínio principal (spec/00 §2)")

const ogFiles = files.filter((f) => /og[-.]?image|\.og\./i.test(f))
if (ogFiles.length > 0) ok("Imagens OG", `${ogFiles.length} arquivo(s) gerado(s)`)
else warn("Imagens OG", "nenhuma imagem OG no build — conferir Plugin.CustomOgImages (spec/00 §2)")

// --------------------------------------------------- relatório

const pad = (s, n) => s + " ".repeat(Math.max(0, n - s.length))
const label = { ok: C.ok("OK   "), fail: C.fail("FALHA"), warn: C.warn("AVISO") }

console.log("")
console.log(C.b(`Codex — verificação de L&F  ${C.dim(`(${htmlFiles.length} páginas, ${cssFiles.length} css em ${ROOT}/)`)}`))
console.log("")
for (const r of results) {
  console.log(`  ${label[r.level]}  ${pad(r.name, 24)} ${r.detail}`)
}

const fails = results.filter((r) => r.level === "fail")
const warns = results.filter((r) => r.level === "warn")
console.log("")
console.log(
  `  ${C.b("Resumo:")} ${results.length - fails.length - warns.length} OK · ${fails.length} falha(s) · ${warns.length} aviso(s)`,
)
if (fails.length) {
  console.log(C.fail("\n  Reprovado. Cada falha aponta o passo de spec/00-instalacao.md que não chegou ao build."))
  console.log(C.dim("  Depois de corrigir: rode de novo e só então passe para o probe (spec/06-verificacao.md §2).\n"))
} else {
  console.log(C.ok("\n  Estático aprovado. Siga para o probe no navegador (spec/06-verificacao.md §2).\n"))
}
process.exit(fails.length ? 1 : 0)
