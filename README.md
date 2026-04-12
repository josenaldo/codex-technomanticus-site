# Codex Technomanticus Site

Site do **Codex Technomanticus** -- uma base de conhecimento pessoal (digital garden) publicada como site estatico usando [Quartz v4](https://quartz.jzhao.xyz/).

O conteudo e escrito em Markdown no [Obsidian](https://obsidian.md/) e publicado automaticamente no GitHub Pages toda vez que um push e feito no repositorio de conteudo.

**URL do site:** <https://josenaldo.github.io/codex-technomanticus-site>

---

## Indice

1. [Arquitetura do projeto](#arquitetura-do-projeto)
2. [Pre-requisitos](#pre-requisitos)
3. [Como baixar os dois projetos](#como-baixar-os-dois-projetos)
4. [Como configurar localmente](#como-configurar-localmente)
5. [Como rodar localmente](#como-rodar-localmente)
6. [Como funciona o deploy](#como-funciona-o-deploy)
7. [Como publicar seu proprio site](#como-publicar-seu-proprio-site)
8. [Configuracao do Quartz](#configuracao-do-quartz)
9. [Estrutura do projeto](#estrutura-do-projeto)
10. [Troubleshooting](#troubleshooting)
11. [Links uteis](#links-uteis)

---

## Arquitetura do projeto

O projeto usa dois repositorios separados que trabalham juntos:

| Repositorio | Funcao |
| --- | --- |
| `codex-technomanticus` | Conteudo -- vault do Obsidian com todas as notas em Markdown |
| `codex-technomanticus-site` | Engine -- Quartz v4, configuracao, layout, tema e workflow de deploy |

### Como os dois repos se conectam

- **Localmente:** um symlink chamado `content` dentro do repo do site aponta para o repo de conteudo no disco.
- **No CI (GitHub Actions):** o workflow de deploy faz checkout dos dois repos. O conteudo e clonado dentro do diretorio `content/` do site.

### Diagrama da arquitetura

```text
+----------------------------------+       +----------------------------------+
|   codex-technomanticus (vault)   |       | codex-technomanticus-site (site) |
|                                  |       |                                  |
|  notas em Markdown               |       |  quartz.config.ts                |
|  imagens e anexos                |       |  quartz.layout.ts                |
|  templates do Obsidian           |       |  quartz/ (engine)                |
|  .obsidian/ (config local)       |       |  content/ -> symlink local       |
|                                  |       |            ou checkout no CI     |
+----------------+-----------------+       +----------------+-----------------+
                 |                                          |
                 |  push na main                            |  push na main
                 v                                          v
    trigger-site-deploy.yaml               deploy.yaml
    (repository_dispatch)  ------->        (build + deploy)
                                                   |
                                                   v
                                           GitHub Pages
                                    josenaldo.github.io/
                                      codex-technomanticus-site
```

---

## Pre-requisitos

| Ferramenta | Versao minima | Para que |
| --- | --- | --- |
| [Node.js](https://nodejs.org/) | 22+ | Runtime do Quartz |
| npm | (vem com Node) | Gerenciador de pacotes |
| [Git](https://git-scm.com/) | 2.x | Controle de versao |
| [GitHub CLI (`gh`)](https://cli.github.com/) | 2.x | Disparar workflows manualmente, criar tokens |

---

## Como baixar os dois projetos

Clone os dois repositorios lado a lado dentro do mesmo diretorio pai:

```bash
# Cria um diretorio de trabalho (opcional)
mkdir -p ~/repos/personal && cd ~/repos/personal

# Clona o repo de conteudo
git clone git@github.com:josenaldo/codex-technomanticus.git

# Clona o repo do site
git clone git@github.com:josenaldo/codex-technomanticus-site.git
```

Apos clonar, a estrutura deve ficar assim:

```text
~/repos/personal/
  codex-technomanticus/          <-- vault do Obsidian
  codex-technomanticus-site/     <-- engine Quartz
```

---

## Como configurar localmente

### 1. Criar o symlink de conteudo

O Quartz espera encontrar o conteudo no diretorio `content/` dentro do repo do site. Localmente, usamos um symlink para apontar para o repo de conteudo:

```bash
cd ~/repos/personal/codex-technomanticus-site

# Cria o symlink (ajuste o caminho se seus repos estiverem em outro lugar)
ln -s ~/repos/personal/codex-technomanticus content
```

> **Importante:** o diretorio `content` esta no `.gitignore` do repo do site, entao o symlink nao sera versionado. Cada pessoa que clonar o projeto precisa criar o symlink manualmente.

### 2. Instalar as dependencias

```bash
cd ~/repos/personal/codex-technomanticus-site
npm ci
```

O `npm ci` instala exatamente as versoes do `package-lock.json`. Use `npm install` apenas se precisar atualizar dependencias.

---

## Como rodar localmente

```bash
cd ~/repos/personal/codex-technomanticus-site
npx quartz build --serve
```

O servidor local sobe em:

```text
http://localhost:8080
```

O Quartz faz hot-reload: ao editar uma nota no Obsidian, o site local atualiza automaticamente.

### Opcoes uteis

```bash
# Build sem servir (gera os arquivos em public/)
npx quartz build

# Especificar outra porta
npx quartz build --serve --port 3001

# Verbose (util para debug)
npx quartz build --serve --verbose
```

---

## Como funciona o deploy

O deploy e totalmente automatico via GitHub Actions. O fluxo completo e:

### Fluxo de CI/CD

```text
1. Voce faz push na branch main do repo codex-technomanticus
                        |
                        v
2. O workflow trigger-site-deploy.yaml e acionado
   - Usa a action peter-evans/repository-dispatch@v3
   - Envia um evento "content-update" para o repo do site
   - Usa o secret SITE_DEPLOY_TOKEN para autenticacao cross-repo
                        |
                        v
3. O workflow deploy.yaml do repo do site e acionado
   (disparado pelo evento repository_dispatch tipo content-update)
   - Faz checkout do repo do site
   - Faz checkout do repo de conteudo na pasta content/
   - Instala Node.js 22
   - Roda npm ci
   - Roda npx quartz build
   - Faz upload do diretorio public/ como artifact
   - Faz deploy no GitHub Pages
                        |
                        v
4. O site e atualizado em
   https://josenaldo.github.io/codex-technomanticus-site
```

### Gatilhos do deploy

O workflow `deploy.yaml` e disparado por tres gatilhos:

1. **`push` na branch `main`** do repo do site -- quando voce altera configuracao, layout ou tema.
2. **`repository_dispatch`** tipo `content-update` -- quando o repo de conteudo envia o evento apos um push.
3. **`workflow_dispatch`** -- para disparar manualmente pela UI do GitHub ou via CLI.

### Deploy manual

```bash
# Via GitHub CLI
gh workflow run deploy.yaml --repo josenaldo/codex-technomanticus-site

# Ou dispare o trigger a partir do repo de conteudo
gh workflow run trigger-site-deploy.yaml --repo josenaldo/codex-technomanticus
```

### Sobre o SITE_DEPLOY_TOKEN

O secret `SITE_DEPLOY_TOKEN` e um Personal Access Token (PAT) do GitHub configurado no repo `codex-technomanticus`. Ele precisa ter permissao para disparar workflows no repo `codex-technomanticus-site`.

**Como criar/regenerar o token:**

1. Acesse <https://github.com/settings/tokens> (ou Settings > Developer settings > Personal access tokens > Fine-grained tokens).
2. Crie um novo token com:
   - **Repository access:** selecione `codex-technomanticus-site`.
   - **Permissions:** `Contents: Read and write` (necessario para `repository_dispatch`).
   - **Expiration:** defina conforme sua preferencia (recomendado: 1 ano).
3. Copie o token gerado.
4. No repo `codex-technomanticus`, va em Settings > Secrets and variables > Actions.
5. Crie ou atualize o secret `SITE_DEPLOY_TOKEN` com o valor do token.

> **Atencao:** se o token expirar, o deploy automatico a partir do repo de conteudo para de funcionar. O deploy direto por push no repo do site continua funcionando normalmente.

---

## Como publicar seu proprio site

Se voce quer fazer um fork deste projeto para publicar sua propria base de conhecimento, siga estes passos:

### 1. Criar o repo do site a partir do Quartz

```bash
# Usa degit para copiar o template do Quartz sem historico git
npx degit jackyzha0/quartz meu-site
cd meu-site
git init
npm install
```

### 2. Criar seu repo de conteudo

Crie um repositorio separado para suas notas. Pode ser um vault do Obsidian existente ou um novo.

```bash
mkdir meu-conteudo
cd meu-conteudo
git init
echo "# Minha Base de Conhecimento" > index.md
git add . && git commit -m "first commit"
```

### 3. Atualizar o quartz.config.ts

Edite o arquivo `quartz.config.ts` no repo do site:

```typescript
configuration: {
  pageTitle: "Meu Site",                           // titulo do site
  locale: "pt-BR",                                  // idioma
  baseUrl: "seuusuario.github.io/meu-site",        // URL base do GitHub Pages
  ignorePatterns: ["private", ".obsidian"],          // pastas a ignorar
  // ... demais configuracoes
}
```

### 4. Criar os repos no GitHub

```bash
# Repo do site
cd meu-site
gh repo create seuusuario/meu-site --public --source=. --push

# Repo de conteudo
cd meu-conteudo
gh repo create seuusuario/meu-conteudo --public --source=. --push
```

### 5. Configurar o workflow de deploy

Copie o arquivo `.github/workflows/deploy.yaml` deste projeto para o seu repo do site. Atualize a referencia ao repo de conteudo:

```yaml
- name: Checkout content
  uses: actions/checkout@v4
  with:
    repository: seuusuario/meu-conteudo   # <-- seu repo de conteudo
    path: content
```

### 6. Configurar o GitHub Pages

1. No repo do site, va em Settings > Pages.
2. Em **Source**, selecione **GitHub Actions**.
3. Faca um push na main para disparar o primeiro deploy.

### 7. Configurar o dispatch cross-repo (opcional)

Se quiser que o deploy dispare automaticamente ao fazer push no repo de conteudo:

1. Crie um Personal Access Token seguindo os passos da secao [Sobre o SITE_DEPLOY_TOKEN](#sobre-o-site_deploy_token).
2. Adicione o token como secret `SITE_DEPLOY_TOKEN` no repo de conteudo.
3. Crie o workflow `.github/workflows/trigger-site-deploy.yaml` no repo de conteudo:

```yaml
name: Trigger Site Deploy

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: Dispatch deploy to site repo
        uses: peter-evans/repository-dispatch@v3
        with:
          token: ${{ secrets.SITE_DEPLOY_TOKEN }}
          repository: seuusuario/meu-site
          event-type: content-update
```

---

## Configuracao do Quartz

O arquivo principal de configuracao e o `quartz.config.ts`. Aqui estao as configuracoes mais importantes:

### Configuracao geral

| Chave | Valor atual | Descricao |
| --- | --- | --- |
| `pageTitle` | `"Codex Technomanticus"` | Titulo exibido no header do site |
| `pageTitleSuffix` | `" . Codex Technomanticus"` | Sufixo adicionado ao titulo de cada pagina no `<title>` |
| `enableSPA` | `true` | Navegacao SPA (Single Page Application) para transicoes mais rapidas |
| `enablePopovers` | `true` | Previews de links ao passar o mouse |
| `locale` | `"pt-BR"` | Idioma do site (afeta datas, labels, etc.) |
| `baseUrl` | `"josenaldo.github.io/codex-technomanticus-site"` | URL base para links absolutos, sitemap e RSS |
| `defaultDateType` | `"modified"` | Exibe a data de modificacao nas paginas (nao a de criacao) |

### Padroes ignorados

```typescript
ignorePatterns: ["private", "_templates", ".obsidian", "00 - Inbox"]
```

Esses diretorios do vault sao ignorados pelo Quartz e nao aparecem no site publicado.

### Analytics

```typescript
analytics: {
  provider: "plausible",
}
```

Usa [Plausible Analytics](https://plausible.io/) para analytics respeitando privacidade.

### Tema

- **Fontes:** Schibsted Grotesk (titulos), Source Sans Pro (corpo), IBM Plex Mono (codigo)
- **Origem das fontes:** Google Fonts com CDN caching habilitado
- **Cores:** configuracao separada para light mode e dark mode

### Plugins

**Transformers** (processam o conteudo):

- `FrontMatter` -- extrai metadados YAML das notas
- `CreatedModifiedDate` -- datas de criacao/modificacao (prioridade: frontmatter > git > filesystem)
- `SyntaxHighlighting` -- destaque de sintaxe com temas github-light e github-dark
- `ObsidianFlavoredMarkdown` -- suporte a callouts, wikilinks, etc.
- `GitHubFlavoredMarkdown` -- tabelas, checklists, etc.
- `TableOfContents` -- sumario automatico
- `CrawlLinks` -- resolucao de links (modo: shortest)
- `Description` -- gera descricoes para SEO
- `Latex` -- renderizacao de formulas matematicas via KaTeX

**Filters:**

- `RemoveDrafts` -- remove notas com `draft: true` no frontmatter

**Emitters** (geram arquivos de saida):

- `AliasRedirects` -- redirecionamentos para aliases do Obsidian
- `ComponentResources` -- CSS e JS dos componentes
- `ContentPage` -- paginas de conteudo
- `FolderPage` -- paginas de indice por pasta
- `TagPage` -- paginas de indice por tag
- `ContentIndex` -- sitemap e RSS
- `Assets` -- copia arquivos estaticos
- `Static` -- arquivos estaticos do Quartz
- `Favicon` -- favicon
- `NotFoundPage` -- pagina 404
- `CustomOgImages` -- gera imagens Open Graph para compartilhamento em redes sociais

---

## Estrutura do projeto

```text
codex-technomanticus-site/
|-- .github/
|   `-- workflows/
|       `-- deploy.yaml            # Workflow de build e deploy no GitHub Pages
|-- content/                       # Symlink para o repo de conteudo (gitignored)
|-- docs/                          # Documentacao interna do Quartz
|-- quartz/                        # Engine do Quartz v4
|   |-- cli/                       # CLI (build, serve, etc.)
|   |-- components/                # Componentes React do site
|   |-- i18n/                      # Internacionalizacao
|   |-- plugins/                   # Plugins (transformers, filters, emitters)
|   |-- processors/                # Processadores de Markdown
|   |-- static/                    # Arquivos estaticos (favicon, fonts, etc.)
|   |-- styles/                    # CSS/SCSS do tema
|   `-- util/                      # Utilitarios
|-- public/                        # Diretorio de saida do build (gitignored)
|-- quartz.config.ts               # Configuracao principal do Quartz
|-- quartz.layout.ts               # Configuracao de layout (sidebar, footer, etc.)
|-- package.json                   # Dependencias e scripts npm
|-- package-lock.json              # Lock das dependencias
|-- tsconfig.json                  # Configuracao do TypeScript
|-- .gitignore                     # Arquivos ignorados pelo git
|-- LICENSE.txt                    # Licenca do Quartz (MIT)
`-- README.md                      # Este arquivo
```

---

## Troubleshooting

### Porta ja em uso

```text
Error: listen EADDRINUSE :::8080
```

Outra instancia do Quartz (ou outro processo) esta usando a porta. Solucoes:

```bash
# Use outra porta
npx quartz build --serve --port 3001

# Ou mate o processo que esta usando a porta
lsof -i :8080
kill -9 <PID>
```

### Avisos "isn't yet tracked by git"

```text
Warning: file "content/alguma-nota.md" isn't yet tracked by git
```

Isso acontece porque o Quartz usa o git para determinar datas de criacao/modificacao. Notas que ainda nao foram commitadas no repo de conteudo geram esse aviso. E inofensivo -- a nota ainda sera renderizada, mas a data pode ficar incorreta. Para resolver, faca commit das notas no repo de conteudo.

### Erro "pathspec beyond a symbolic link"

```text
fatal: pathspec 'content/...' is beyond a symbolic link
```

Esse erro ocorre se voce tentar fazer `git add` de algo dentro do symlink `content/` a partir do repo do site. O git do repo do site nao deve versionar o conteudo -- isso e feito pelo repo de conteudo separadamente.

### Token de deploy expirado

Se o deploy automatico parar de funcionar ao fazer push no repo de conteudo, mas o deploy direto (push no repo do site) continuar funcionando, provavelmente o `SITE_DEPLOY_TOKEN` expirou.

Veja a secao [Sobre o SITE_DEPLOY_TOKEN](#sobre-o-site_deploy_token) para instrucoes de como regenerar.

Para verificar, va em Actions no repo `codex-technomanticus` e veja se o workflow `Trigger Site Deploy` esta falhando.

### Conteudo nao atualiza apos push

1. **Verifique se o push foi na branch `main`** -- os workflows so disparam na main.
2. **Verifique o status dos workflows** no GitHub Actions de ambos os repos.
3. **Verifique o token** -- pode ter expirado (veja item acima).
4. **Aguarde alguns minutos** -- o deploy leva de 2 a 5 minutos e o GitHub Pages pode ter cache.
5. **Faca hard refresh no navegador** (Ctrl+Shift+R) para limpar cache local.
6. **Dispare o deploy manualmente:**

```bash
gh workflow run deploy.yaml --repo josenaldo/codex-technomanticus-site
```

---

## Links uteis

- [Quartz v4 -- Documentacao](https://quartz.jzhao.xyz/)
- [Quartz v4 -- Repositorio](https://github.com/jackyzha0/quartz)
- [Obsidian](https://obsidian.md/)
- [GitHub Pages -- Documentacao](https://docs.github.com/en/pages)
- [GitHub Actions -- Documentacao](https://docs.github.com/en/actions)
- [peter-evans/repository-dispatch](https://github.com/peter-evans/repository-dispatch) -- action usada para o dispatch cross-repo
