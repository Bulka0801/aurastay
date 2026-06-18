import fs from "node:fs"
import path from "node:path"

const root = process.cwd()
const dslPath = path.join(root, "docs/structurizr/workspace.dsl")
const fullDslPath = path.join(root, "docs/structurizr/workspace-full.dsl")
const mdPath = path.join(root, "docs/architecture/file-structure.md")

const ignoredDirs = new Set([".git", "node_modules", ".next"])
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"])

function walk(relative = ".") {
  const absolute = path.join(root, relative)
  const entries = fs
    .readdirSync(absolute, { withFileTypes: true })
    .filter((entry) => !ignoredDirs.has(entry.name))
    .sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1
      return a.name.localeCompare(b.name, "en")
    })

  const result = []
  for (const entry of entries) {
    const entryRelative = relative === "." ? entry.name : path.join(relative, entry.name)
    result.push({
      path: entryRelative,
      name: entry.name,
      type: entry.isDirectory() ? "dir" : "file",
    })
    if (entry.isDirectory()) result.push(...walk(entryRelative))
  }
  return result
}

function slash(value) {
  return value.split(path.sep).join("/")
}

function parentPath(itemPath) {
  const parent = slash(path.dirname(itemPath))
  return parent === "." ? "." : parent
}

function ext(filePath) {
  return path.extname(filePath)
}

function dslString(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ")
}

function idFor(prefix, index) {
  return `${prefix}${String(index).padStart(3, "0")}`
}

function titleFromPath(filePath) {
  const base = path.basename(filePath)
  if (base === "page.tsx") return "Next.js route page"
  if (base === "layout.tsx") return "Next.js layout"
  if (base === "loading.tsx") return "Next.js loading UI"
  if (base === "actions.ts") return "Server actions"
  if (base.endsWith(".test.ts")) return "Vitest test"
  if (base.endsWith(".tsx")) return "React component"
  if (base.endsWith(".ts")) return "TypeScript module"
  if (base.endsWith(".sql")) return "SQL migration/script"
  if (base.endsWith(".md")) return "Markdown documentation"
  if (base.endsWith(".json")) return "JSON config/data"
  if (base.endsWith(".mjs")) return "JavaScript config/module"
  if (base.endsWith(".css")) return "Stylesheet"
  if (base.endsWith(".toml")) return "TOML config"
  if (base.endsWith(".svg") || base.endsWith(".jpg") || base.endsWith(".png")) return "Static asset"
  if (base.startsWith(".env")) return "Local environment secrets"
  if (base === ".DS_Store") return "macOS metadata"
  return "Project file"
}

function folderDescription(folderPath) {
  const p = slash(folderPath)
  const map = {
    ".": "Корінь проекту: конфігурація, залежності, документація і головні директорії застосунку.",
    ".qodo": "Локальна конфігурація Qodo/агентів; не бере участі у runtime Next.js.",
    ".qodo/agents": "Налаштування агентів Qodo.",
    ".qodo/workflows": "Налаштування workflow Qodo.",
    app: "Next.js App Router: маршрути, layouts, loading states і серверні сторінки.",
    "app/dashboard": "Захищена dashboard-зона готельної системи.",
    "app/dashboard/admin": "Адміністративні сторінки.",
    "app/dashboard/admin/activity": "Журнал активності та фільтри audit log.",
    "app/dashboard/admin/settings": "Налаштування готелю і server actions для них.",
    "app/dashboard/admin/users": "Керування користувачами.",
    "app/dashboard/admin/users/[id]": "Редагування конкретного користувача.",
    "app/dashboard/admin/users/new": "Створення нового користувача.",
    "app/dashboard/finance": "Фінансовий розділ.",
    "app/dashboard/front-desk": "Front desk: заїзди, виїзди, гості в готелі.",
    "app/dashboard/front-desk/check-in": "Маршрути check-in.",
    "app/dashboard/front-desk/check-in/[id]": "Check-in конкретного бронювання.",
    "app/dashboard/front-desk/check-out": "Маршрути check-out.",
    "app/dashboard/front-desk/check-out/[id]": "Check-out конкретного бронювання.",
    "app/dashboard/guests": "Сторінки гостей.",
    "app/dashboard/guests/[id]": "Деталі конкретного гостя.",
    "app/dashboard/housekeeping": "Housekeeping сторінка.",
    "app/dashboard/maintenance": "Maintenance сторінка.",
    "app/dashboard/profile": "Профіль користувача.",
    "app/dashboard/reports": "Звіти.",
    "app/dashboard/reservations": "Маршрути бронювань.",
    "app/dashboard/reservations/[id]": "Деталі конкретного бронювання.",
    "app/dashboard/reservations/[id]/edit": "Редагування бронювання.",
    "app/dashboard/reservations/new": "Створення бронювання.",
    "app/dashboard/room-rack": "Room rack календар/сітка номерів.",
    "app/dashboard/rooms": "Керування номерами.",
    "app/login": "Сторінка входу.",
    backups: "Локальні SQL backup-файли.",
    components: "React-компоненти, розбиті за доменами і UI-системою.",
    "components/admin": "Адмінські форми, таблиці та клієнти.",
    "components/admin/settings": "Клієнт налаштувань адміністратора.",
    "components/dashboards": "Dashboard-віджети для ролей і спільні primitives.",
    "components/data-table": "Логіка таблиць, фільтрів і меню колонок.",
    "components/finance": "Фінансові таблиці.",
    "components/front-desk": "Компоненти front desk workflow.",
    "components/guests": "Компоненти для гостей.",
    "components/housekeeping": "Компоненти прибирання і станів номерів.",
    "components/maintenance": "Компоненти технічного обслуговування.",
    "components/profile": "Компоненти профілю.",
    "components/reports": "Компоненти звітності.",
    "components/reservations": "Компоненти бронювань.",
    "components/reservations/steps": "Кроки multi-step форми бронювання.",
    "components/reservations/ui": "Малі UI-компоненти для бронювань.",
    "components/room-rack": "Компоненти календарної сітки номерів.",
    "components/rooms": "Компоненти типів/класів номерів.",
    "components/ui": "Базові shadcn/Radix UI primitives.",
    hooks: "Спільні React hooks.",
    lib: "Бізнес-логіка, форматування, типи, Supabase клієнти.",
    "lib/i18n": "Українські словники і лейбли.",
    "lib/reports": "Обчислення для звітів.",
    "lib/room-rack": "Domain logic room rack.",
    "lib/rooms": "Domain logic станів і доступності номерів.",
    "lib/rules": "Бізнес-правила платежів, передплати і transitions.",
    "lib/supabase": "Supabase клієнти для server/client/proxy контекстів.",
    public: "Публічні статичні файли.",
    scripts: "SQL-скрипти та допоміжні maintenance-файли.",
    "scripts/legacy": "Legacy SQL repair/backfill scripts.",
    styles: "Додаткові глобальні стилі.",
    supabase: "Supabase local project config and migrations.",
    "supabase/.temp": "Локальний кеш Supabase CLI; середовище-залежний.",
    "supabase/migrations": "Версійні Supabase migrations.",
    tests: "Vitest тести і тестова документація.",
    "tests/support": "Fixtures/helpers для тестів.",
    docs: "Згенерована архітектурна документація.",
    "docs/architecture": "Markdown-пояснення структури.",
    "docs/structurizr": "Structurizr DSL workspace.",
  }
  return map[p] ?? `Папка ${p}: групує пов'язані файли проекту.`
}

function fileDescription(filePath) {
  const p = slash(filePath)
  const base = path.basename(p)

  const exact = {
    "app/dashboard/front-desk/check-in/[id]/page.tsx":
      "Server page маршруту check-in: перевіряє user, читає reservation/settings/profile/rooms з Supabase, рахує доступні номери і рендерить CheckInForm.",
    "components/front-desk/check-in-form.tsx":
      "Client component check-in форми: валідує статус бронювання, готовність номера, передплату, ранній заїзд, записує reservation_rooms/payments/reservations і навігує назад у front desk.",
    "components/reservations/room-move-note.tsx":
      "Показує нотатку про перенесення гостя між номерами.",
    "components/ui/textarea.tsx": "Базовий textarea primitive, який використовується у формах.",
    "components/front-desk/arrivals-tab.tsx":
      "Клієнтська вкладка today's arrivals: пошук, список заїздів і кнопка переходу до check-in.",
    "components/finance/payments-table.tsx": "Таблиця платежів у фінансовому розділі.",
    "package.json": "Маніфест npm: скрипти, runtime dependencies і devDependencies.",
    "package-lock.json": "Зафіксований dependency tree npm.",
    ".env.local": "Локальні змінні середовища; не документуємо значення, бо це секрети/локальні ключі.",
    "tsconfig.json": "TypeScript config, включно з path aliases.",
    "next.config.mjs": "Next.js configuration.",
    "vitest.config.ts": "Vitest test runner configuration.",
    "components.json": "shadcn/ui configuration.",
    "proxy.ts": "Next/Supabase proxy middleware entry.",
    "app/layout.tsx": "Root layout: глобальна HTML-обгортка застосунку.",
    "app/page.tsx": "Root route: стартова логіка переходу/доступу.",
    "app/globals.css": "Глобальні Tailwind/CSS стилі для App Router.",
    "styles/globals.css": "Додатковий legacy/global stylesheet.",
  }
  if (exact[p]) return exact[p]

  if (p.startsWith("app/") && base === "page.tsx") return `Next.js page route для ${p.replace(/\/page\.tsx$/, "")}.`
  if (p.startsWith("app/") && base === "layout.tsx") return "Layout для вкладених маршрутів цієї гілки."
  if (p.startsWith("app/") && base === "loading.tsx") return "Loading UI для маршруту."
  if (p.startsWith("app/") && base === "actions.ts") return "Server actions для цієї dashboard-гілки."
  if (p.startsWith("components/ui/")) return `Базовий UI primitive ${base.replace(/\.(tsx|ts)$/, "")}, переважно wrapper навколо Radix/shadcn API.`
  if (p.startsWith("components/front-desk/")) return "Front desk component для arrivals/in-house/check-in/check-out workflow."
  if (p.startsWith("components/reservations/steps/")) return "Крок форми створення/редагування бронювання."
  if (p.startsWith("components/reservations/ui/")) return "Допоміжний UI component для reservation forms."
  if (p.startsWith("components/reservations/")) return "Reservation domain component."
  if (p.startsWith("components/dashboards/")) return "Dashboard component/primitives for role-specific dashboard pages."
  if (p.startsWith("components/data-table/")) return "Data table helper: фільтри, логіка, типи або column menu."
  if (p === "components/data-table.tsx") return "Reusable DataTable component поверх TanStack Table."
  if (p.startsWith("components/finance/")) return "Finance component для folios/payments UI."
  if (p.startsWith("components/housekeeping/")) return "Housekeeping component для задач, kanban або стану номерів."
  if (p.startsWith("components/maintenance/")) return "Maintenance component для заявок/статусів техобслуговування."
  if (p.startsWith("components/reports/")) return "Reports component для occupancy/revenue/reservations analytics."
  if (p.startsWith("components/room-rack/")) return "Room rack UI component для календаря номерів, легенди, toolbar або drag/move flow."
  if (p.startsWith("components/rooms/")) return "Rooms component для типів/класів номерів."
  if (p.startsWith("components/admin/")) return "Admin component для користувачів або налаштувань."
  if (p.startsWith("components/guests/")) return "Guests domain client/component."
  if (p.startsWith("components/profile/")) return "Profile settings component."
  if (p.startsWith("hooks/")) return "Reusable React hook/helper для table URL state, mobile/media query або toast."
  if (p.startsWith("lib/supabase/")) return "Supabase helper для відповідного runtime context."
  if (p.startsWith("lib/rules/")) return "Бізнес-правила HMS domain."
  if (p.startsWith("lib/room-rack/")) return "Room rack domain logic: dates, pricing, filters, KPI, types, errors."
  if (p.startsWith("lib/rooms/")) return "Room availability/state domain logic."
  if (p.startsWith("lib/reports/")) return "Reporting calculations."
  if (p.startsWith("lib/i18n/")) return "Українська локалізація enum/value labels."
  if (p.startsWith("lib/")) return "Shared TypeScript utility/domain module."
  if (p.startsWith("scripts/legacy/")) return "Legacy SQL repair/backfill script; тримати для історії міграцій."
  if (p.startsWith("scripts/")) return "SQL migration/verification/business-rule script."
  if (p.startsWith("supabase/migrations/")) return "Supabase migration file."
  if (p.startsWith("supabase/.temp/")) return "Локальний Supabase CLI cache/metadata file."
  if (p.startsWith("tests/support/")) return "Test helper/fixture/model."
  if (p.startsWith("tests/") && p.endsWith(".test.ts")) return "Vitest test for the named domain/module."
  if (p.startsWith("tests/")) return "Test documentation or support artifact."
  if (p.startsWith("public/")) return "Static public asset served by Next.js."
  if (p.startsWith("backups/")) return "Local database backup SQL dump."
  if (base === ".DS_Store") return "macOS Finder metadata; не частина application logic."
  if (base === ".gitignore") return "Git ignore rules."
  if (base === ".pnpm-lock.yaml") return "pnpm lockfile present alongside npm lock; verify package manager before changing deps."
  return `${titleFromPath(p)}: ${p}.`
}

function technologyFor(item) {
  if (item.type === "dir") return "Folder"
  const extension = ext(item.path)
  if (extension === ".tsx") return "TSX"
  if (extension === ".ts") return "TypeScript"
  if (extension === ".sql") return "SQL"
  if (extension === ".md") return "Markdown"
  if (extension === ".json") return "JSON"
  if (extension === ".mjs") return "MJS"
  if (extension === ".css") return "CSS"
  if (extension === ".toml") return "TOML"
  if ([".svg", ".jpg", ".png"].includes(extension)) return "Static asset"
  if (item.path.startsWith(".env")) return "Environment"
  return "File"
}

function extractImports(filePath) {
  if (!sourceExtensions.has(ext(filePath))) return []
  const text = fs.readFileSync(path.join(root, filePath), "utf8")
  const imports = []
  const importRe = /(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g
  for (const match of text.matchAll(importRe)) imports.push(match[1])
  return imports
}

function resolveImport(fromPath, specifier, filePathSet) {
  if (specifier.startsWith("@/")) {
    const candidate = specifier.slice(2)
    return resolveCandidate(candidate, filePathSet)
  }
  if (specifier.startsWith(".")) {
    const base = slash(path.join(path.dirname(fromPath), specifier))
    return resolveCandidate(base, filePathSet)
  }
  return null
}

function resolveCandidate(candidate, filePathSet) {
  const normalized = slash(candidate)
  const candidates = [
    normalized,
    `${normalized}.ts`,
    `${normalized}.tsx`,
    `${normalized}.js`,
    `${normalized}.jsx`,
    `${normalized}.mjs`,
    `${normalized}/index.ts`,
    `${normalized}/index.tsx`,
  ]
  return candidates.find((candidatePath) => filePathSet.has(candidatePath)) ?? null
}

function renderTree(items) {
  const byParent = new Map()
  for (const item of items) {
    const parent = parentPath(item.path)
    if (!byParent.has(parent)) byParent.set(parent, [])
    byParent.get(parent).push(item)
  }
  const lines = []
  function visit(parent, prefix = "") {
    const children = byParent.get(parent) ?? []
    children.forEach((child, index) => {
      const isLast = index === children.length - 1
      const marker = isLast ? "`-- " : "|-- "
      const nextPrefix = `${prefix}${isLast ? "    " : "|   "}`
      lines.push(`${prefix}${marker}${child.name}${child.type === "dir" ? "/" : ""}`)
      if (child.type === "dir") visit(child.path, nextPrefix)
    })
  }
  lines.push(".")
  visit(".")
  return lines.join("\n")
}

const items = walk(".").map((item) => ({ ...item, path: slash(item.path) }))
const fileItems = items.filter((item) => item.type === "file")
const folderItems = [{ path: ".", name: ".", type: "dir" }, ...items.filter((item) => item.type === "dir")]
const allForModel = [...folderItems, ...fileItems]
const filePathSet = new Set(fileItems.map((item) => item.path))

const ids = new Map()
allForModel.forEach((item, index) => ids.set(item.path, idFor(item.type === "dir" ? "d" : "f", index + 1)))

const importEdges = []
const importEdgeKeys = new Set()
const externalImports = new Map()
for (const file of fileItems) {
  for (const specifier of extractImports(file.path)) {
    const resolved = resolveImport(file.path, specifier, filePathSet)
    if (resolved) {
      const key = `${file.path}->${resolved}`
      if (!importEdgeKeys.has(key)) {
        importEdges.push([file.path, resolved, specifier])
        importEdgeKeys.add(key)
      }
    } else if (!specifier.startsWith(".")) {
      if (!externalImports.has(file.path)) externalImports.set(file.path, new Set())
      externalImports.get(file.path).add(specifier)
    }
  }
}

const focusedPaths = [
  "app/dashboard/front-desk/check-in/[id]/page.tsx",
  "components/front-desk/check-in-form.tsx",
  "components/reservations/room-move-note.tsx",
  "components/ui/alert.tsx",
  "components/ui/badge.tsx",
  "components/ui/button.tsx",
  "components/ui/card.tsx",
  "components/ui/checkbox.tsx",
  "components/ui/input.tsx",
  "components/ui/label.tsx",
  "components/ui/radio-group.tsx",
  "components/ui/select.tsx",
  "components/ui/separator.tsx",
  "components/ui/textarea.tsx",
  "lib/supabase/server.ts",
  "lib/supabase/client.ts",
  "lib/format.ts",
  "lib/hotel-settings.ts",
  "lib/rules/prepayment.ts",
  "lib/rules/payments.ts",
  "lib/rules/transitions.ts",
  "lib/rooms/availability.ts",
  "lib/localization.ts",
  "lib/i18n/uk.ts",
  "lib/types.ts",
]

const scopedViews = [
  {
    key: "Root_File_Map",
    title: "Root project files and folders",
    description: "Перший рівень проекту: головні папки, конфіги, lockfiles, документація і локальні службові файли.",
    prefixes: [""],
    mode: "root",
  },
  {
    key: "App_Router_File_Map",
    title: "app directory file structure",
    description: "Повне вкладення Next.js App Router: маршрути, layouts, loading states і сторінки dashboard.",
    prefixes: ["app"],
  },
  {
    key: "Components_File_Map",
    title: "components directory file structure",
    description: "Повне вкладення React components: domain components, dashboards, reservation flows і UI primitives.",
    prefixes: ["components"],
  },
  {
    key: "Lib_Hooks_File_Map",
    title: "lib and hooks file structure",
    description: "Бізнес-логіка, Supabase helpers, rules, formatting, localization, room rack logic і reusable hooks.",
    prefixes: ["lib", "hooks"],
  },
  {
    key: "Database_Scripts_File_Map",
    title: "database scripts and Supabase migrations",
    description: "SQL scripts, legacy repair/backfill files, Supabase config and versioned migrations.",
    prefixes: ["scripts", "supabase"],
  },
  {
    key: "Tests_Docs_File_Map",
    title: "tests and documentation file structure",
    description: "Vitest tests, fixtures, architecture docs, Structurizr DSL workspaces and generated markdown.",
    prefixes: ["tests", "docs", "appendix-code-listing.md"],
  },
]

function isImmediateRootItem(itemPath) {
  if (itemPath === ".") return true
  return !slash(itemPath).includes("/")
}

function matchesViewScope(itemPath, view) {
  const p = slash(itemPath)
  if (view.mode === "root") return isImmediateRootItem(p)
  return view.prefixes.some((prefix) => p === prefix || p.startsWith(`${prefix}/`))
}

function scopedIdentifiers(view) {
  return allForModel.filter((item) => matchesViewScope(item.path, view)).map((item) => ids.get(item.path))
}

const renderBlocks = [
  ["rbHeader", "Header: Check-in gostia", "Заголовок маршруту, пояснює оператору front desk що треба перевірити перед заселенням."],
  ["rbExpiredActions", "Expired reservation actions", "Умовний блок ReservationActions, якщо дата виїзду вже минула."],
  ["rbDetails", "Card: Detali broniuvannia", "Ліва колонка CheckInForm: номер броні, гість, дати, ночі, гості, суми, передплата, прогрес оплати."],
  ["rbCheckIn", "Card: Zaselennia", "Права колонка CheckInForm: вибір/стан номера, early check-in, оплата, спосіб оплати, примітки, помилки і submit."],
  ["rbAssignedRoom", "Assigned room state", "Показує призначений номер, room status badge і RoomMoveNote."],
  ["rbRoomPicker", "Available rooms picker", "RadioGroup зі списком доступних кімнат, бейджами готовності і типу номера."],
  ["rbEarly", "Early check-in guard", "Alert + Checkbox + Textarea для раннього заїзду."],
  ["rbPayment", "Payment input block", "Input суми, quick buttons, Select payment method і prepayment validation."],
  ["rbNotes", "Notes block", "Textarea для приміток check-in."],
  ["rbBlockers", "Blocking/error alerts", "Alert-и для transition, room readiness, overpay, missing prepayment або runtime error."],
  ["rbSubmit", "Submit button", "Button з Loader2/CheckCircle, викликає handleCheckIn і disabled через canSubmit."],
  ["rbSupabaseRead", "Server Supabase reads", "reservation, hotel_settings, profile, available rooms, overlapping reservation_rooms."],
  ["rbSupabaseWrite", "Client Supabase writes", "rooms re-check, reservation_rooms insert/update, payments insert, reservations status update."],
  ["rbRouter", "Next router navigation", "router.push('/dashboard/front-desk') і router.refresh після успішного check-in."],
]

function buildDsl() {
  const lines = []
  lines.push('workspace "AuraStay architecture" "File structure and check-in render/import diagrams generated from the repository." {')
  lines.push("  model {")
  lines.push('    user = person "Hotel staff" "Front desk/admin/manager/housekeeping users who operate AuraStay."')
  lines.push('    supabase = softwareSystem "Supabase" "Database, auth and API backend used by the Next.js app." {')
  lines.push('      tags "External"')
  lines.push("    }")
  lines.push('    lucide = softwareSystem "lucide-react" "Icon library used in buttons and alerts." {')
  lines.push('      tags "External"')
  lines.push("    }")
  lines.push('    nextRuntime = softwareSystem "Next.js runtime" "App Router, server components, client components and navigation." {')
  lines.push('      tags "External"')
  lines.push("    }")
  lines.push('    aura = softwareSystem "AuraStay" "Hotel management system repository." {')
  lines.push('      codebase = container "AuraStay repository" "Complete file/folder inventory plus import relationships." "Next.js 16, React 19, TypeScript, Supabase" {')

  for (const item of allForModel) {
    const id = ids.get(item.path)
    const name = item.type === "dir" ? `${item.path}/` : item.path
    const description = item.type === "dir" ? folderDescription(item.path) : fileDescription(item.path)
    const tags = item.type === "dir" ? "Folder" : "File"
    lines.push(`        ${id} = component "${dslString(name)}" "${dslString(description)}" "${dslString(technologyFor(item))}" {`)
    lines.push(`          tags "${tags}"`)
    lines.push("        }")
  }

  for (const [id, name, description] of renderBlocks) {
    lines.push(`        ${id} = component "${dslString(name)}" "${dslString(description)}" "Render block" {`)
    lines.push('          tags "RenderBlock"')
    lines.push("        }")
  }

  lines.push("      }")
  lines.push("    }")
  lines.push("    user -> aura \"uses\"")
  lines.push("    aura -> supabase \"reads/writes hotel data\"")

  for (const item of allForModel.filter((item) => item.path !== ".")) {
    const parent = parentPath(item.path)
    if (ids.has(parent)) lines.push(`    ${ids.get(parent)} -> ${ids.get(item.path)} "contains"`)
  }

  for (const [from, to, specifier] of importEdges) {
    lines.push(`    ${ids.get(from)} -> ${ids.get(to)} "imports ${dslString(specifier)}"`)
  }

  const pageId = ids.get("app/dashboard/front-desk/check-in/[id]/page.tsx")
  const formId = ids.get("components/front-desk/check-in-form.tsx")
  const reservationActionsId = ids.get("components/reservations/reservation-actions.tsx")
  const roomMoveNoteId = ids.get("components/reservations/room-move-note.tsx")
  lines.push(`    ${pageId} -> rbHeader "renders"`)
  lines.push(`    ${pageId} -> rbSupabaseRead "loads data"`)
  lines.push(`    rbSupabaseRead -> supabase "queries auth/reservations/settings/profile/rooms"`)
  lines.push(`    ${pageId} -> rbExpiredActions "conditionally renders"`)
  if (reservationActionsId) lines.push(`    rbExpiredActions -> ${reservationActionsId} "uses"`)
  lines.push(`    ${formId} -> rbDetails "renders"`)
  lines.push(`    ${formId} -> rbCheckIn "renders"`)
  lines.push(`    rbCheckIn -> rbAssignedRoom "if room already assigned"`)
  lines.push(`    rbAssignedRoom -> ${roomMoveNoteId} "renders move note"`)
  lines.push(`    rbCheckIn -> rbRoomPicker "if room assignment needed"`)
  lines.push(`    rbCheckIn -> rbEarly "if today is before planned check-in"`)
  lines.push(`    rbCheckIn -> rbPayment "if balance remains"`)
  lines.push(`    rbCheckIn -> rbNotes "always renders"`)
  lines.push(`    rbCheckIn -> rbBlockers "when validation blocks submit or error exists"`)
  lines.push(`    rbCheckIn -> rbSubmit "renders"`)
  lines.push(`    ${formId} -> rbSubmit "handles confirm check-in click"`)
  lines.push(`    rbSubmit -> rbSupabaseWrite "calls handleCheckIn"`)
  lines.push(`    rbSupabaseWrite -> supabase "re-checks and updates rooms/reservation_rooms/payments/reservations"`)
  lines.push(`    rbSubmit -> rbRouter "navigates on success"`)
  lines.push(`    rbRouter -> nextRuntime "uses next/navigation router"`)
  lines.push(`    ${formId} -> lucide "uses AlertCircle, CheckCircle, Loader2, LockKeyhole icons"`)

  lines.push("  }")
  lines.push("  views {")
  lines.push('    systemContext aura "System_Context" {')
  lines.push("      include *")
  lines.push("      autolayout lr")
  lines.push('      title "AuraStay system context"')
  lines.push("    }")
  lines.push('    container aura "Containers" {')
  lines.push("      include *")
  lines.push("      autolayout lr")
  lines.push('      title "AuraStay containers and external systems"')
  lines.push("    }")
  lines.push('    component codebase "File_Structure_Full" {')
  lines.push("      include *")
  lines.push("      autolayout lr")
  lines.push('      title "Full repository file/folder structure and imports"')
  lines.push('      description "Large inventory view: every tracked local folder/file except .git, node_modules and .next, with contains/imports relationships."')
  lines.push("    }")
  for (const view of scopedViews) {
    lines.push(`    component codebase "${view.key}" {`)
    for (const identifier of scopedIdentifiers(view)) lines.push(`      include ${identifier}`)
    lines.push("      autolayout tb")
    lines.push(`      title "${dslString(view.title)}"`)
    lines.push(`      description "${dslString(view.description)}"`)
    lines.push("    }")
  }
  lines.push('    component codebase "CheckIn_Render_And_Imports" {')
  for (const p of focusedPaths) {
    if (ids.has(p)) lines.push(`      include ${ids.get(p)}`)
  }
  for (const [id] of renderBlocks) lines.push(`      include ${id}`)
  lines.push("      include supabase")
  lines.push("      include lucide")
  lines.push("      include nextRuntime")
  lines.push("      autolayout lr")
  lines.push('      title "Check-in page render tree and dependencies"')
  lines.push('      description "Route /dashboard/front-desk/check-in/{id}: server reads, CheckInForm render blocks, UI primitives, business rules and client writes."')
  lines.push("    }")
  lines.push('    dynamic codebase "CheckIn_Submit_Flow" {')
  lines.push(`      ${formId} -> rbSubmit "Operator clicks confirm"`)
  lines.push('      rbSubmit -> rbSupabaseWrite "handleCheckIn validates fresh room, writes reservation room, payment and reservation status"')
  lines.push('      rbSupabaseWrite -> supabase "mutations"')
  lines.push('      rbSubmit -> rbRouter "push + refresh"')
  lines.push("      autolayout lr")
  lines.push('      title "Check-in submit flow"')
  lines.push("    }")
  lines.push("    styles {")
  lines.push('      element "Person" { shape Person background "#334155" color "#ffffff" }')
  lines.push('      element "Software System" { background "#2563eb" color "#ffffff" }')
  lines.push('      element "External" { background "#6b7280" color "#ffffff" }')
  lines.push('      element "Container" { background "#0f766e" color "#ffffff" }')
  lines.push('      element "Folder" { shape Folder background "#f8fafc" color "#0f172a" stroke "#94a3b8" }')
  lines.push('      element "File" { shape Component background "#ffffff" color "#111827" stroke "#64748b" }')
  lines.push('      element "RenderBlock" { shape RoundedBox background "#fff7ed" color "#7c2d12" stroke "#fb923c" }')
  lines.push("    }")
  lines.push("  }")
  lines.push("}")
  return `${lines.join("\n")}\n`
}

function buildMarkdown() {
  const lines = []
  lines.push("# AuraStay File Structure")
  lines.push("")
  lines.push("Generated from the local repository. It intentionally excludes `.git`, `node_modules`, and `.next`; local metadata such as `.env.local`, `.DS_Store`, `supabase/.temp`, and backups are listed but their contents are not copied.")
  lines.push("")
  lines.push("## Structurizr")
  lines.push("")
  lines.push("- Primary Structurizr workspace: `docs/structurizr/workspace.dsl`")
  lines.push("- Same full generated workspace copy: `docs/structurizr/workspace-full.dsl`")
  lines.push("- Lightweight check-in-only workspace: `docs/structurizr/check-in-lite.dsl`")
  lines.push("- Views: `System_Context`, `Containers`, `File_Structure_Full`, `Root_File_Map`, `App_Router_File_Map`, `Components_File_Map`, `Lib_Hooks_File_Map`, `Database_Scripts_File_Map`, `Tests_Docs_File_Map`, `CheckIn_Render_And_Imports`, `CheckIn_Submit_Flow`")
  lines.push("")
  lines.push("## Tree")
  lines.push("")
  lines.push("```text")
  lines.push(renderTree(items))
  lines.push("```")
  lines.push("")
  lines.push("## Folders")
  lines.push("")
  for (const folder of folderItems) {
    lines.push(`- \`${folder.path === "." ? "." : `${folder.path}/`}\`: ${folderDescription(folder.path)}`)
  }
  lines.push("")
  lines.push("## Files")
  lines.push("")
  for (const file of fileItems) {
    const imports = extractImports(file.path)
    const internal = imports
      .map((specifier) => resolveImport(file.path, specifier, filePathSet))
      .filter(Boolean)
    const external = [...(externalImports.get(file.path) ?? [])]
    const details = []
    if (internal.length) details.push(`internal imports: ${[...new Set(internal)].map((p) => `\`${p}\``).join(", ")}`)
    if (external.length) details.push(`external imports: ${external.map((p) => `\`${p}\``).join(", ")}`)
    lines.push(`- \`${file.path}\`: ${fileDescription(file.path)}${details.length ? ` (${details.join("; ")})` : ""}`)
  }
  lines.push("")
  lines.push("## Check-In Page Render Map")
  lines.push("")
  lines.push("Route: `/dashboard/front-desk/check-in/{id}`")
  lines.push("")
  lines.push("1. `app/dashboard/front-desk/check-in/[id]/page.tsx` runs on the server, checks Supabase auth, loads reservation/settings/profile data, and redirects if the user or reservation is missing.")
  lines.push("2. If the reservation still needs a room, the page queries ready vacant rooms, removes date-overlapping blocked rooms, marks requested-type matches, and sorts rooms for display.")
  lines.push("3. The page renders a header, optionally `ReservationActions` for expired reservations, then `CheckInForm` with `reservation`, `availableRooms`, and normalized `hotelSettings`.")
  lines.push("4. `CheckInForm` renders two main cards: reservation/payment summary and the check-in action card.")
  lines.push("5. The action card conditionally renders assigned-room state with `RoomMoveNote`, or a `RadioGroup` room picker; early check-in alert; payment amount and method controls; notes; blocker/error alerts; and the final submit button.")
  lines.push("6. On submit, `handleCheckIn` re-checks room readiness, optionally adjusts early check-in dates, inserts/updates `reservation_rooms`, inserts payment if needed, verifies prepayment, updates reservation status to `checked_in`, then routes back to `/dashboard/front-desk`.")
  lines.push("")
  lines.push("See the Structurizr view `CheckIn_Render_And_Imports` for the visual component/import map and `CheckIn_Submit_Flow` for the mutation sequence.")
  lines.push("")
  return `${lines.join("\n")}\n`
}

fs.mkdirSync(path.dirname(dslPath), { recursive: true })
fs.mkdirSync(path.dirname(mdPath), { recursive: true })
const dsl = buildDsl()
fs.writeFileSync(fullDslPath, dsl)
fs.writeFileSync(dslPath, dsl)
fs.writeFileSync(mdPath, buildMarkdown())

console.log(`Wrote ${path.relative(root, dslPath)}`)
console.log(`Wrote ${path.relative(root, fullDslPath)}`)
console.log(`Wrote ${path.relative(root, mdPath)}`)
