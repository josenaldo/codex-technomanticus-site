import { registerEscapeHandler, removeAllChildren } from "./util"

interface Position {
  x: number
  y: number
}

class DiagramPanZoom {
  private isDragging = false
  private startPan: Position = { x: 0, y: 0 }
  private currentPan: Position = { x: 0, y: 0 }
  private scale = 1
  private readonly MIN_SCALE = 0.5
  private readonly MAX_SCALE = 3

  cleanups: (() => void)[] = []

  constructor(
    private container: HTMLElement,
    private content: HTMLElement,
  ) {
    this.setupEventListeners()
    this.setupNavigationControls()
    this.resetTransform()
  }

  private setupEventListeners() {
    // Mouse drag events
    const mouseDownHandler = this.onMouseDown.bind(this)
    const mouseMoveHandler = this.onMouseMove.bind(this)
    const mouseUpHandler = this.onMouseUp.bind(this)

    // Touch drag events
    const touchStartHandler = this.onTouchStart.bind(this)
    const touchMoveHandler = this.onTouchMove.bind(this)
    const touchEndHandler = this.onTouchEnd.bind(this)

    const resizeHandler = this.resetTransform.bind(this)

    this.container.addEventListener("mousedown", mouseDownHandler)
    document.addEventListener("mousemove", mouseMoveHandler)
    document.addEventListener("mouseup", mouseUpHandler)

    this.container.addEventListener("touchstart", touchStartHandler, { passive: false })
    document.addEventListener("touchmove", touchMoveHandler, { passive: false })
    document.addEventListener("touchend", touchEndHandler)

    window.addEventListener("resize", resizeHandler)

    this.cleanups.push(
      () => this.container.removeEventListener("mousedown", mouseDownHandler),
      () => document.removeEventListener("mousemove", mouseMoveHandler),
      () => document.removeEventListener("mouseup", mouseUpHandler),
      () => this.container.removeEventListener("touchstart", touchStartHandler),
      () => document.removeEventListener("touchmove", touchMoveHandler),
      () => document.removeEventListener("touchend", touchEndHandler),
      () => window.removeEventListener("resize", resizeHandler),
    )
  }

  cleanup() {
    for (const cleanup of this.cleanups) {
      cleanup()
    }
  }

  private setupNavigationControls() {
    const controls = document.createElement("div")
    controls.className = "mermaid-controls"

    // Zoom controls
    const zoomIn = this.createButton("+", () => this.zoom(0.1))
    const zoomOut = this.createButton("-", () => this.zoom(-0.1))
    const resetBtn = this.createButton("Reset", () => this.resetTransform())

    controls.appendChild(zoomOut)
    controls.appendChild(resetBtn)
    controls.appendChild(zoomIn)

    this.container.appendChild(controls)
  }

  private createButton(text: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement("button")
    button.textContent = text
    button.className = "mermaid-control-button"
    button.addEventListener("click", onClick)
    window.addCleanup(() => button.removeEventListener("click", onClick))
    return button
  }

  private onMouseDown(e: MouseEvent) {
    if (e.button !== 0) return // Only handle left click
    this.isDragging = true
    this.startPan = { x: e.clientX - this.currentPan.x, y: e.clientY - this.currentPan.y }
    this.container.style.cursor = "grabbing"
  }

  private onMouseMove(e: MouseEvent) {
    if (!this.isDragging) return
    e.preventDefault()

    this.currentPan = {
      x: e.clientX - this.startPan.x,
      y: e.clientY - this.startPan.y,
    }

    this.updateTransform()
  }

  private onMouseUp() {
    this.isDragging = false
    this.container.style.cursor = "grab"
  }

  private onTouchStart(e: TouchEvent) {
    if (e.touches.length !== 1) return
    this.isDragging = true
    const touch = e.touches[0]
    this.startPan = { x: touch.clientX - this.currentPan.x, y: touch.clientY - this.currentPan.y }
  }

  private onTouchMove(e: TouchEvent) {
    if (!this.isDragging || e.touches.length !== 1) return
    e.preventDefault() // Prevent scrolling

    const touch = e.touches[0]
    this.currentPan = {
      x: touch.clientX - this.startPan.x,
      y: touch.clientY - this.startPan.y,
    }

    this.updateTransform()
  }

  private onTouchEnd() {
    this.isDragging = false
  }

  private zoom(delta: number) {
    const newScale = Math.min(Math.max(this.scale + delta, this.MIN_SCALE), this.MAX_SCALE)

    // Zoom around center
    const rect = this.content.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const scaleDiff = newScale - this.scale
    this.currentPan.x -= centerX * scaleDiff
    this.currentPan.y -= centerY * scaleDiff

    this.scale = newScale
    this.updateTransform()
  }

  private updateTransform() {
    this.content.style.transform = `translate(${this.currentPan.x}px, ${this.currentPan.y}px) scale(${this.scale})`
  }

  private resetTransform() {
    const svg = this.content.querySelector("svg")!
    const rect = svg.getBoundingClientRect()
    const width = rect.width / this.scale
    const height = rect.height / this.scale

    this.scale = 1
    this.currentPan = {
      x: (this.container.clientWidth - width) / 2,
      y: (this.container.clientHeight - height) / 2,
    }
    this.updateTransform()
  }
}

let mermaidImport = undefined
document.addEventListener("nav", async () => {
  const center = document.querySelector(".center") as HTMLElement
  const nodes = center.querySelectorAll("code.mermaid") as NodeListOf<HTMLElement>
  if (nodes.length === 0) return

  mermaidImport ||= await import(
    // @ts-ignore
    "https://cdnjs.cloudflare.com/ajax/libs/mermaid/11.4.0/mermaid.esm.min.mjs"
  )
  const mermaid = mermaidImport.default

  const textMapping: WeakMap<HTMLElement, string> = new WeakMap()
  for (const node of nodes) {
    textMapping.set(node, node.innerText)
  }

  async function renderMermaid() {
    // de-init any other diagrams
    for (const node of nodes) {
      node.removeAttribute("data-processed")
      const oldText = textMapping.get(node)
      if (oldText) {
        node.innerHTML = oldText
      }
    }

    // Tema do Mermaid — handoff v2, spec/05-mermaid.md.
    // O init original passava 9 themeVariables genéricas, que governam só o
    // flowchart: sequenceDiagram, stateDiagram-v2 e mindmap caíam no tema
    // "dark" do próprio Mermaid (nota amarelo-papel, ator cinza, mindmap em
    // arco-íris). Cada tipo tem o seu conjunto de variáveis; aqui vão todos.
    // `theme: "base"` porque é o único que respeita todas elas.
    // O original está no histórico do git (antes deste commit).
    const JM = {
      ink: "#E9ECF2", // texto forte
      body: "#C6CCD8", // corpo
      meta: "#98A0B0", // metadado
      line: "#4E5666", // aresta
      node: "#1B2029", // caixa
      surface: "#14181F", // cartão em volta
      band: "#0E1218",
      brand: "#8855DF", // roxo — borda de nó
      brandSoft: "#3A2F56",
      accent: "#FFAA00", // âmbar — destaque
      accentSoft: "rgba(255,170,0,.14)",
    }

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      // "base" nas duas: é o único tema que respeita TODAS as themeVariables.
      // Com "dark", parte do que passamos é ignorada.
      theme: "base",
      fontFamily: 'IBM Plex Sans, system-ui, sans-serif',
      themeVariables: {
        darkMode: true,
        fontFamily: 'IBM Plex Sans, system-ui, sans-serif',
        fontSize: "14px",

        // ---- base / flowchart / graph -------------------------------------
        background: JM.surface,
        mainBkg: JM.node,
        primaryColor: JM.node,
        primaryTextColor: JM.ink,
        primaryBorderColor: JM.brand,
        secondaryColor: JM.band,
        secondaryTextColor: JM.body,
        secondaryBorderColor: JM.line,
        tertiaryColor: JM.accentSoft,
        tertiaryTextColor: JM.ink,
        tertiaryBorderColor: JM.accent,
        nodeBorder: JM.brand,
        nodeTextColor: JM.ink,
        lineColor: JM.line,
        titleColor: JM.ink,
        textColor: JM.body,
        clusterBkg: "rgba(255,255,255,.03)",
        clusterBorder: "rgba(255,255,255,.10)",
        edgeLabelBackground: JM.surface,
        defaultLinkColor: JM.line,

        // ---- sequenceDiagram ----------------------------------------------
        actorBkg: JM.node,
        actorBorder: JM.brand,
        actorTextColor: JM.ink,
        actorLineColor: JM.brandSoft,
        signalColor: JM.line,
        signalTextColor: JM.meta,
        labelBoxBkgColor: JM.band,
        labelBoxBorderColor: JM.line,
        labelTextColor: JM.ink,
        loopTextColor: JM.meta,
        // as notas eram o amarelo mais fora de lugar do conjunto
        noteBkgColor: JM.accentSoft,
        noteBorderColor: JM.accent,
        noteTextColor: JM.ink,
        activationBkgColor: "rgba(136,85,223,.18)",
        activationBorderColor: JM.brand,
        sequenceNumberColor: JM.band,

        // ---- stateDiagram-v2 ----------------------------------------------
        stateBkg: JM.node,
        stateBorder: JM.brand,
        labelColor: JM.ink,
        altBackground: JM.band,
        transitionColor: JM.line,
        transitionLabelColor: JM.meta,
        compositeBackground: "rgba(255,255,255,.03)",
        compositeBorder: "rgba(255,255,255,.10)",
        compositeTitleBackground: JM.band,
        innerEndBackground: JM.accent,
        specialStateColor: JM.accent,

        // ---- mindmap (e qualquer coisa que use a escala categórica) -------
        // Aqui morava o arco-íris. Ordem fixa: raiz em âmbar, ramos em roxo
        // decrescente, depois neutros. Nunca verde/vermelho — no site essas
        // cores têm significado semântico e num mindmap significariam nada.
        cScale0: JM.accentSoft,
        cScaleLabel0: JM.ink,
        cScale1: "rgba(136,85,223,.26)",
        cScaleLabel1: JM.ink,
        cScale2: "rgba(136,85,223,.18)",
        cScaleLabel2: JM.ink,
        cScale3: "rgba(136,85,223,.12)",
        cScaleLabel3: JM.body,
        cScale4: "rgba(255,255,255,.08)",
        cScaleLabel4: JM.body,
        cScale5: "rgba(255,255,255,.05)",
        cScaleLabel5: JM.body,
        cScale6: "rgba(255,170,0,.10)",
        cScaleLabel6: JM.body,
        cScale7: "rgba(136,85,223,.09)",
        cScaleLabel7: JM.body,
        cScale8: "rgba(255,255,255,.04)",
        cScaleLabel8: JM.meta,
        cScale9: "rgba(136,85,223,.06)",
        cScaleLabel9: JM.meta,
        cScale10: "rgba(255,170,0,.07)",
        cScaleLabel10: JM.meta,
        cScale11: "rgba(255,255,255,.03)",
        cScaleLabel11: JM.meta,

        // ---- classDiagram / erDiagram (preventivo) ------------------------
        classText: JM.ink,
        attributeBackgroundColorOdd: JM.node,
        attributeBackgroundColorEven: JM.band,

        // ---- gantt / pie (preventivo) ------------------------------------
        sectionBkgColor: "rgba(255,255,255,.03)",
        sectionBkgColor2: "rgba(255,255,255,.05)",
        taskBkgColor: JM.node,
        taskBorderColor: JM.brand,
        taskTextColor: JM.ink,
        taskTextLightColor: JM.ink,
        taskTextOutsideColor: JM.body,
        gridColor: "rgba(255,255,255,.08)",
        todayLineColor: JM.accent,
        pie1: JM.accent,
        pie2: JM.brand,
        pie3: JM.line,
        pieTitleTextColor: JM.ink,
        pieSectionTextColor: JM.ink,
        pieStrokeColor: JM.surface,
      },
      // menos espaço morto nas caixas do mindmap
      mindmap: { padding: 12 },
      flowchart: { curve: "basis", padding: 16, useMaxWidth: true },
      sequence: { useMaxWidth: true, actorMargin: 60, boxMargin: 12 },
    })

    await mermaid.run({ nodes })
  }

  await renderMermaid()
  document.addEventListener("themechange", renderMermaid)
  window.addCleanup(() => document.removeEventListener("themechange", renderMermaid))

  for (let i = 0; i < nodes.length; i++) {
    const codeBlock = nodes[i] as HTMLElement
    const pre = codeBlock.parentElement as HTMLPreElement
    const clipboardBtn = pre.querySelector(".clipboard-button") as HTMLButtonElement
    const expandBtn = pre.querySelector(".expand-button") as HTMLButtonElement

    const clipboardStyle = window.getComputedStyle(clipboardBtn)
    const clipboardWidth =
      clipboardBtn.offsetWidth +
      parseFloat(clipboardStyle.marginLeft || "0") +
      parseFloat(clipboardStyle.marginRight || "0")

    // Set expand button position
    expandBtn.style.right = `calc(${clipboardWidth}px + 0.3rem)`
    pre.prepend(expandBtn)

    // query popup container
    const popupContainer = pre.querySelector("#mermaid-container") as HTMLElement
    if (!popupContainer) return

    let panZoom: DiagramPanZoom | null = null
    function showMermaid() {
      const container = popupContainer.querySelector("#mermaid-space") as HTMLElement
      const content = popupContainer.querySelector(".mermaid-content") as HTMLElement
      if (!content) return
      removeAllChildren(content)

      // Clone the mermaid content
      const mermaidContent = codeBlock.querySelector("svg")!.cloneNode(true) as SVGElement
      content.appendChild(mermaidContent)

      // Show container
      popupContainer.classList.add("active")
      container.style.cursor = "grab"

      // Initialize pan-zoom after showing the popup
      panZoom = new DiagramPanZoom(container, content)
    }

    function hideMermaid() {
      popupContainer.classList.remove("active")
      panZoom?.cleanup()
      panZoom = null
    }

    expandBtn.addEventListener("click", showMermaid)
    registerEscapeHandler(popupContainer, hideMermaid)

    window.addCleanup(() => {
      panZoom?.cleanup()
      expandBtn.removeEventListener("click", showMermaid)
    })
  }
})
