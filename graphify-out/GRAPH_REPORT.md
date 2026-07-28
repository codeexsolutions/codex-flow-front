# Graph Report - .  (2026-07-28)

## Corpus Check
- 89 files · ~154,119 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 628 nodes · 1130 edges · 37 communities (27 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.6)
- Token cost: 40,197 input · 0 output

## Community Hubs (Navigation)
- Auth & Settings Forms
- Sales & POS Dashboard
- Invoice & UI Kit
- Client Management
- Build & Dev Tooling
- Runtime Dependencies
- App Shell, Routing & Theme
- Auth Store & Alerts
- Service Worker Core (Workbox)
- TypeScript App Config
- Company Signup Flow
- Landing Page
- Stock & Product Management
- Checkout & Enterprise Billing
- TypeScript Node Config
- Workbox Strategy Handler
- Workbox Precache Controller
- Workbox Router
- Brand & Docs
- Workbox Lifecycle Events
- Pedido View Types (Duplicate)
- Workbox Strategy Base
- Workbox Precache Strategy
- Workbox Install Report Plugin
- Date Selector Component
- Workbox Navigation Route
- Workbox Cache Key Plugin
- Autocomplete Input Component
- TypeScript Root Config
- Invoice Props Type

## God Nodes (most connected - your core abstractions)
1. `useAlert()` - 30 edges
2. `onlyDigits()` - 24 edges
3. `formatDocument()` - 23 edges
4. `useEnterprise` - 18 edges
5. `formatCurrency()` - 16 edges
6. `compilerOptions` - 16 edges
7. `StrategyHandler` - 14 edges
8. `compilerOptions` - 14 edges
9. `PrecacheController` - 13 edges
10. `formatNumber()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `CodEx Flow` --references--> `CodEx Flow Logo (stylized F icon, purple-to-blue gradient)`  [EXTRACTED]
  README.md → public/logo.png
- `CodEx Flow HTML App Shell (index.html)` --references--> `CodEx Flow Favicon (stylized F icon, purple-to-blue gradient)`  [EXTRACTED]
  index.html → public/favicon2.png
- `CodEx Flow HTML App Shell (index.html)` --conceptually_related_to--> `CodEx Flow`  [EXTRACTED]
  index.html → README.md
- `ClienteForm()` --calls--> `useAlert()`  [EXTRACTED]
  src/pages/Clientes/Components/Form/cliente.form.tsx → src/components/Alert/Alert.tsx
- `CodEx Flow Favicon (stylized F icon, purple-to-blue gradient)` --semantically_similar_to--> `CodEx Flow Logo (stylized F icon, purple-to-blue gradient)`  [INFERRED] [semantically similar]
  public/favicon2.png → public/logo.png

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CodEx Flow Technology Stack** — readme_react, readme_typescript, readme_vite, readme_tailwindcss, readme_react_router [EXTRACTED 0.90]
- **CodEx Flow Brand Identity Artifacts** — readme_codex_flow, public_logo_png, public_favicon2_png, index_app_shell [INFERRED 0.85]

## Communities (37 total, 10 thin omitted)

### Community 0 - "Auth & Settings Forms"
Cohesion: 0.08
Nodes (45): useAlert(), HeaderInterprise(), Field, FieldProps, Sidebar(), AuthForm(), AuthFormProps, AuthFormInputs (+37 more)

### Community 1 - "Sales & POS Dashboard"
Cohesion: 0.07
Nodes (43): HEIGHT_CLASS, Modal, ModalProps, ModalSize, SIZE_CLASS, C, ClienteSalesChart(), ClienteSalesChartProps (+35 more)

### Community 2 - "Invoice & UI Kit"
Cohesion: 0.06
Nodes (31): handleDownload(), CurrencyInput(), formatCurrencyFromCents(), gerarUID(), Invoice(), InvoiceProps, STATUS_STYLE, TIPOS_PAGAMENTO (+23 more)

### Community 3 - "Client Management"
Cohesion: 0.08
Nodes (28): Clientes(), contactDigits(), Filtro, FILTROS, C, ClientesGrowthChartProps, MONTHS, Props (+20 more)

### Community 4 - "Build & Dev Tooling"
Cohesion: 0.05
Nodes (43): autoprefixer, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies, autoprefixer (+35 more)

### Community 5 - "Runtime Dependencies"
Cohesion: 0.05
Nodes (43): axios, class-variance-authority, dom-to-image, dotenv, framer-motion, @hookform/resolvers, html-to-image, jwt-decode (+35 more)

### Community 6 - "App Shell, Routing & Theme"
Cohesion: 0.08
Nodes (25): HeaderPageProps, HeaderTab, applyMode(), applyMotion(), useTheme(), TabsConfig, ConfiguracoesPage(), ACCENTS (+17 more)

### Community 7 - "Auth Store & Alerts"
Cohesion: 0.09
Nodes (22): ACCENT, accentVars(), alert, AlertContext, AlertOptions, AlertProvider(), AlertResult, AlertType (+14 more)

### Community 8 - "Service Worker Core (Workbox)"
Cohesion: 0.10
Nodes (19): addRoute(), cacheMatchIgnoreParams(), cacheWillUpdate(), canConstructResponseFromBodyStream(), copyResponse(), Deferred, executeQuotaErrorCallbacks(), generateURLVariations() (+11 more)

### Community 9 - "TypeScript App Config"
Cohesion: 0.09
Nodes (21): DOM, DOM.Iterable, ES2020, src, compilerOptions, allowImportingTsExtensions, isolatedModules, jsx (+13 more)

### Community 10 - "Company Signup Flow"
Cohesion: 0.16
Nodes (20): cadastrarEmpresa(), cadastroEmpresaDto, CadastroEmpresaPage(), CadastroFormInputs, CadastroResponse, cadastroSchema, contatoEmpresaDto, enderecoEmpresaDto (+12 more)

### Community 11 - "Landing Page"
Cohesion: 0.10
Nodes (9): AUDIENCE, FAQ, FEATURES, HOW_IT_WORKS, LandingPage(), NAV, PLANS, SCREEN_CONTENT (+1 more)

### Community 12 - "Stock & Product Management"
Cohesion: 0.16
Nodes (13): ProductForm(), Props, ProductFormData, productSchema, brl(), Estoque(), Filtro, FILTROS (+5 more)

### Community 13 - "Checkout & Enterprise Billing"
Cohesion: 0.16
Nodes (11): CheckoutPage(), ehPagavel(), Fatura, FaturaStatus, Filtro, PLANO, TODO: trocar por dados vindos do seu serviço de faturas, statusMeta (+3 more)

### Community 14 - "TypeScript Node Config"
Cohesion: 0.11
Nodes (17): ES2023, vite.config.ts, compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection (+9 more)

### Community 16 - "Workbox Precache Controller"
Cohesion: 0.19
Nodes (3): createCacheKey(), PrecacheController, PrecacheRoute

### Community 18 - "Brand & Docs"
Cohesion: 0.22
Nodes (10): CodEx Flow HTML App Shell (index.html), CodEx Flow Favicon (stylized F icon, purple-to-blue gradient), CodEx Flow Logo (stylized F icon, purple-to-blue gradient), CodEx Flow, CodEx Solutions, React, React Router, Tailwind CSS (+2 more)

### Community 19 - "Workbox Lifecycle Events"
Cohesion: 0.25
Nodes (5): cleanupOutdatedCaches(), _nestedGroup(), printCleanupDetails(), printInstallDetails(), waitUntil()

### Community 20 - "Pedido View Types (Duplicate)"
Cohesion: 0.25
Nodes (7): clientePedido, itemPedido, itemUpdate, pedidoCliente, pedidoUpdate, produtoPedido, produtosPedido

### Community 24 - "Date Selector Component"
Cohesion: 0.67
Nodes (3): DateSelector(), DateSelectorProps, formatDate()

## Knowledge Gaps
- **186 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+181 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAlert()` connect `Auth & Settings Forms` to `Invoice & UI Kit`, `Client Management`, `App Shell, Routing & Theme`, `Auth Store & Alerts`, `Stock & Product Management`, `Checkout & Enterprise Billing`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `onlyDigits()` connect `Company Signup Flow` to `Auth & Settings Forms`, `Client Management`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Runtime Dependencies` to `Build & Dev Tooling`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _186 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Auth & Settings Forms` be split into smaller, more focused modules?**
  _Cohesion score 0.08134920634920635 - nodes in this community are weakly interconnected._
- **Should `Sales & POS Dashboard` be split into smaller, more focused modules?**
  _Cohesion score 0.06638714185883997 - nodes in this community are weakly interconnected._
- **Should `Invoice & UI Kit` be split into smaller, more focused modules?**
  _Cohesion score 0.05959183673469388 - nodes in this community are weakly interconnected._