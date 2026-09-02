/* codex-lf-probe.js — probe de estilos computados do Codex Technomanticus.
 *
 * O check estático (codex-lf-check.mjs) prova que o código chegou ao build.
 * Este probe prova o que o BROWSER de fato calculou — cascata, especificidade
 * e estilo inline do Mermaid incluídos. São perguntas diferentes: rode os dois.
 *
 * Como usar:
 *   1. npx quartz build --serve
 *   2. abra uma NOTA densa (com wikilink, link externo, tags, bloco de código
 *      e, se possível, um diagrama). Sugestão: 02-glosas/Agent Harness Engineering.
 *   3. cole este arquivo inteiro no console do DevTools e dê Enter.
 *
 * Saída: uma tabela PASS/FAIL/SKIP com o valor esperado e o encontrado, mais
 * um resumo. SKIP = o elemento não existe nesta página; abra outra nota (não é
 * falha de CSS). Rode também em uma página de PASTA e de TAG — as laterais e o
 * header valem lá também.
 */
;(() => {
  const rgb = (r, g, b) => `rgb(${r}, ${g}, ${b})`
  const T = {
    light: rgb(11, 14, 19), // #0B0E13
    band: rgb(14, 18, 24), // #0E1218
    surface: rgb(20, 24, 31), // #14181F
    result: rgb(25, 18, 51), // #191233
    node: rgb(27, 32, 41), // #1B2029
    line: rgb(78, 86, 102), // #4E5666
    gray: rgb(124, 132, 148), // #7C8494
    body: rgb(198, 204, 216), // #C6CCD8
    ink: rgb(233, 236, 242), // #E9ECF2
    brand: rgb(136, 85, 223), // #8855DF
    brandText: rgb(182, 155, 240), // #B69BF0
    accent: rgb(255, 170, 0), // #FFAA00
    codeToken: rgb(212, 212, 212), // #d4d4d4
  }

  const rows = []
  const $ = (sel) => document.querySelector(sel)
  const cs = (el) => getComputedStyle(el)

  /** Uma checagem. get() retorna o valor real; undefined/null = SKIP. */
  const check = (group, name, expected, get, cmp) => {
    let actual
    try {
      actual = get()
    } catch {
      actual = null
    }
    if (actual === undefined || actual === null) {
      rows.push({ grupo: group, checagem: name, status: "SKIP", esperado: expected, encontrado: "—" })
      return
    }
    const pass = cmp ? cmp(actual) : String(actual) === String(expected)
    rows.push({
      grupo: group,
      checagem: name,
      status: pass ? "PASS" : "FAIL",
      esperado: String(expected),
      encontrado: String(actual),
    })
  }
  const includes = (needle) => (v) => String(v).toLowerCase().includes(String(needle).toLowerCase())
  const near = (px, tol = 1) => (v) => Math.abs(parseFloat(v) - px) <= tol

  // ---------------------------------------------------------------- 1. tema
  check("tema", "fundo da página", T.light, () => cs(document.body).backgroundColor)
  check("tema", "fonte de corpo", "IBM Plex Sans", () => cs(document.body).fontFamily, includes("IBM Plex Sans"))
  check("tema", "cor de corpo", T.body, () => {
    const el = $("article p, article li")
    return el ? cs(el).color : null
  })
  check("tema", "toggle de tema ausente", "0 elementos", () => `${document.querySelectorAll(".darkmode").length} elementos`)

  // ------------------------------------------------------- 2. barra de domínio
  const topbar = $(".jm-topbar")
  check("barra", "existe", "1", () => (topbar ? "1" : "0"))
  check("barra", "altura", "68px", () => (topbar ? cs(topbar).height : null), near(68, 1))
  check("barra", "sticky", "sticky", () => (topbar ? cs(topbar).position : null))
  check("barra", "sem borda inferior", "0px", () => (topbar ? cs(topbar).borderBottomWidth : null))
  check("barra", "marca em Space Grotesk", "Space Grotesk", () => {
    const b = $(".jm-topbar .jm-brand")
    return b ? cs(b).fontFamily : null
  }, includes("Space Grotesk"))
  check("barra", "CTA roxo", T.brand, () => {
    const c = $(".jm-topbar .jm-cta")
    return c ? cs(c).backgroundColor : null
  })
  check("barra", "item ativo marcado", "1", () => {
    const a = $('.jm-topbar [aria-current="page"]')
    return a ? "1" : "0"
  })

  // --------------------------------------------------------------- 3. laterais
  for (const [name, sel] of [
    ["explorador", ".explorer"],
    ["índice", ".toc"],
    ["backlinks", ".backlinks"],
    ["grafo", ".graph"],
  ]) {
    const el = $(sel)
    check("laterais", `${name} — superfície`, T.surface, () => (el ? cs(el).backgroundColor : null))
    check("laterais", `${name} — raio 16`, "16px", () => (el ? cs(el).borderRadius : null), near(16, 1))
    check("laterais", `${name} — sem borda`, "0px", () => (el ? cs(el).borderTopWidth : null))
    check("laterais", `${name} — sombra`, "presente", () => (el ? cs(el).boxShadow : null), (v) => v !== "none")
  }
  check("laterais", "rótulo em mono", "IBM Plex Mono", () => {
    const el = $(".explorer h2, .toc h3, .backlinks h3, .graph h3")
    return el ? cs(el).fontFamily : null
  }, includes("Mono"))
  check("laterais", "item ativo em âmbar", T.accent, () => {
    const el = $(".explorer-content a.active")
    return el ? cs(el).color : null
  })

  // ---------------------------------------------------- 4. cabeçalho da nota
  const h1 = $(".article-title, article h1")
  check("nota", "h1 em Space Grotesk", "Space Grotesk", () => (h1 ? cs(h1).fontFamily : null), includes("Space Grotesk"))
  check("nota", "h1 peso 700", "700", () => (h1 ? cs(h1).fontWeight : null))
  check("nota", "h1 line-height apertado", "≤ 1.15em", () => {
    if (!h1) return null
    const s = cs(h1)
    return (parseFloat(s.lineHeight) / parseFloat(s.fontSize)).toFixed(2)
  }, (v) => parseFloat(v) <= 1.15)
  check("nota", "breadcrumb em mono", "IBM Plex Mono", () => {
    const el = $(".breadcrumb-container")
    return el ? cs(el).fontFamily : null
  }, includes("Mono"))
  check("nota", "metadado em mono/uppercase", "uppercase", () => {
    const el = $(".content-meta")
    return el ? cs(el).textTransform : null
  })
  const tag = $(".tags a.tag-link, .tags a.internal")
  check("nota", "tag é pílula âmbar", T.accent, () => (tag ? cs(tag).color : null))
  check("nota", "tag raio pílula", "≥ 99px", () => (tag ? cs(tag).borderRadius : null), (v) => parseFloat(v) >= 99)

  // ------------------------------------------------------------------ 5. links
  const internal = $("article a.internal:not(.tag-link)")
  const external = $("article a.external")
  const para = internal?.closest("p, li") ?? $("article p")
  check("links", "wikilink com peso de corpo", "peso do parágrafo", () => {
    if (!internal || !para) return null
    return `${cs(internal).fontWeight} vs ${cs(para).fontWeight}`
  }, (v) => {
    const [a, b] = String(v).split(" vs ")
    return a === b
  })
  check("links", "wikilink com cor de corpo", T.body, () => (internal ? cs(internal).color : null))
  check("links", "wikilink sem text-decoration", "none", () => (internal ? cs(internal).textDecorationLine : null))
  check("links", "wikilink com fio roxo", "box-shadow roxo", () => (internal ? cs(internal).boxShadow : null), includes("136, 85, 223"))
  check("links", "link externo roxo-texto", T.brandText, () => (external ? cs(external).color : null))
  check("links", "código inline neutro", "não roxo", () => {
    const el = $("article code:not(pre code)")
    return el ? cs(el).color : null
  }, (v) => v !== T.brandText)

  // ------------------------------------------------------------------ 6. blocos
  check("blocos", "citação em bloco roxo", T.result, () => {
    const el = $("article blockquote")
    return el ? cs(el).backgroundColor : null
  })
  check("blocos", "citação sem border-left", "0px", () => {
    const el = $("article blockquote")
    return el ? cs(el).borderLeftWidth : null
  })
  check("blocos", "callout com barra de acento", "inset âmbar", () => {
    const el = $("article .callout")
    return el ? cs(el).boxShadow : null
  }, includes("255, 170, 0"))
  const pre = $("article pre")
  check("blocos", "código — fundo", T.band, () => (pre ? cs(pre).backgroundColor : null))
  check("blocos", "código — raio 14", "14px", () => (pre ? cs(pre).borderRadius : null), near(14, 1))
  check("blocos", "código — fonte mono", "IBM Plex Mono", () => {
    const c = pre?.querySelector("code")
    return c ? cs(c).fontFamily : null
  }, includes("Mono"))
  check("blocos", "código — token sem classe legível", T.codeToken, () => {
    const c = pre?.querySelector("code")
    return c ? cs(c).color : null
  })
  check("blocos", "tabela — head em mono", "IBM Plex Mono", () => {
    const el = $("article table th")
    return el ? cs(el).fontFamily : null
  }, includes("Mono"))

  // ---------------------------------------------------------------- 7. diagramas
  const mermaid = $(".mermaid")
  const svg = mermaid?.querySelector("svg")
  check("diagramas", "container com superfície de cartão", T.surface, () => (mermaid ? cs(mermaid).backgroundColor : null))
  check("diagramas", "texto NÃO monoespaçado", "IBM Plex Sans", () => {
    const t = svg?.querySelector(".nodeLabel, text")
    return t ? cs(t).fontFamily : null
  }, (v) => includes("IBM Plex Sans")(v) && !/mono/i.test(String(v)))
  check("diagramas", "nó — preenchimento", T.node, () => {
    const r = svg?.querySelector(".node rect, .node polygon, .node circle")
    return r ? cs(r).fill : null
  })
  check("diagramas", "nó — borda roxa", T.brand, () => {
    const r = svg?.querySelector(".node rect, .node polygon, .node circle")
    return r ? cs(r).stroke : null
  })
  check("diagramas", "cor cravada no markdown", "0 nós", () => {
    if (!svg) return null
    const inline = [...svg.querySelectorAll("g.node[style]")].filter((n) => /fill:\s*#/i.test(n.getAttribute("style") ?? ""))
    return `${inline.length} nós`
  }, (v) => parseInt(v) === 0)

  // ------------------------------------------------------------------- 8. foco
  check("acessibilidade", "foco visível em link", "outline âmbar", () => {
    const a = internal ?? $("article a")
    if (!a) return null
    a.focus()
    const s = cs(a)
    const out = `${s.outlineColor} ${s.outlineWidth}`
    a.blur()
    return out
  }, (v) => includes("255, 170, 0")(v) && parseFloat(String(v).split(" ").pop()) >= 2)

  // ---------------------------------------------------------------- relatório
  const n = (s) => rows.filter((r) => r.status === s).length
  console.clear()
  console.log("%cCodex — probe de L&F", "font: 700 16px/1.4 system-ui")
  console.log(
    `%c${location.pathname}  ·  ${n("PASS")} PASS · ${n("FAIL")} FAIL · ${n("SKIP")} SKIP`,
    "color:#888;font:12px/1.4 ui-monospace,monospace",
  )
  console.table(rows)
  const fails = rows.filter((r) => r.status === "FAIL")
  if (fails.length) {
    console.log("%cFALHAS", "font:700 13px system-ui;color:#c00")
    for (const f of fails) console.log(`  ${f.grupo} · ${f.checagem} — esperado ${f.esperado}, encontrado ${f.encontrado}`)
    console.log("Cada grupo tem a spec correspondente: tema→01, barra/laterais/nota/blocos→02, links→03, código→04, diagramas→05.")
  } else {
    console.log("%cSem falhas nesta página. Repita em uma nota MOC, uma pasta e uma tag.", "color:#0a0;font:13px system-ui")
  }
  const skips = rows.filter((r) => r.status === "SKIP")
  if (skips.length) {
    console.log(
      `%c${skips.length} SKIP — elemento inexistente nesta página (${[...new Set(skips.map((s) => s.grupo))].join(", ")}). Abra uma nota que os tenha.`,
      "color:#a80;font:12px system-ui",
    )
  }
  return { pass: n("PASS"), fail: n("FAIL"), skip: n("SKIP"), rows }
})()
