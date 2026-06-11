import Link from "next/link"
import { redirect } from "next/navigation"
import { Activity, Filter } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createClient } from "@/lib/supabase/server"
import { formatDateTime } from "@/lib/localization"
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ENTITY_LABELS,
  formatAuditAction,
  formatAuditEntity,
  formatAuditRole,
  formatAuditUserName,
  getAuditActionBadgeVariant,
  getAuditActionIcon,
  getAuditChangeSummary,
  shortenId,
  type AuditLogEntry,
  type AuditLogUser,
} from "@/lib/audit-log"

import { ActivityFilters } from "./activity-filters"

type AdminActivityPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const PAGE_SIZE = 20

const UUID_REGEXP = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function getStringParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key]
  if (Array.isArray(value)) return value[0]
  return value
}

function getPageParam(params: Record<string, string | string[] | undefined>) {
  const rawPage = Number(getStringParam(params, "page") ?? "1")
  return Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1
}

function sanitizeSearchValue(value: string) {
  return value.replace(/[(),]/g, " ").trim()
}

function buildActivityHref(filters: Record<string, string | undefined>, page: number) {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value)
  }

  if (page > 1) {
    params.set("page", String(page))
  }

  const queryString = params.toString()
  return queryString ? `/dashboard/admin/activity?${queryString}` : "/dashboard/admin/activity"
}

export default async function AdminActivityPage({ searchParams }: AdminActivityPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {}

  const filters = {
    q: getStringParam(resolvedSearchParams, "q")?.trim(),
    action: getStringParam(resolvedSearchParams, "action"),
    entity: getStringParam(resolvedSearchParams, "entity"),
    user_id: getStringParam(resolvedSearchParams, "user_id"),
    date_from: getStringParam(resolvedSearchParams, "date_from"),
    date_to: getStringParam(resolvedSearchParams, "date_to"),
  }

  const page = getPageParam(resolvedSearchParams)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "system_administrator") {
    redirect("/dashboard")
  }

  const { data: usersData } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, role, employee_id")
    .order("last_name", { ascending: true })

  const users = (usersData ?? []) as AuditLogUser[]

  const usersById = new Map(users.map((item) => [item.id, item]))

  const matchingUserIds =
    filters.q && filters.q.length >= 2
      ? users
          .filter((item) => {
            const haystack = [
              item.first_name,
              item.last_name,
              item.email,
              item.employee_id,
              item.role,
              formatAuditRole(item.role),
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()

            return haystack.includes(filters.q!.toLowerCase())
          })
          .map((item) => item.id)
      : []

  const { data: optionRows } = await supabase
    .from("audit_logs")
    .select("action, entity_type")
    .order("created_at", { ascending: false })
    .limit(500)

  const actionValues = Array.from(
    new Set([
      ...Object.keys(AUDIT_ACTION_LABELS),
      ...((optionRows ?? []).map((item) => item.action).filter(Boolean) as string[]),
    ]),
  )

  const entityValues = Array.from(
    new Set([
      ...Object.keys(AUDIT_ENTITY_LABELS),
      ...((optionRows ?? []).map((item) => item.entity_type).filter(Boolean) as string[]),
    ]),
  )

  const actionOptions = actionValues
    .map((value) => ({
      value,
      label: formatAuditAction(value),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "uk"))

  const entityOptions = entityValues
    .map((value) => ({
      value,
      label: formatAuditEntity(value),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "uk"))

  const userOptions = users.map((item) => ({
    id: item.id,
    label: formatAuditUserName(item),
    description: [formatAuditRole(item.role), item.email].filter(Boolean).join(" · "),
  }))

  let auditQuery = supabase
    .from("audit_logs")
    .select("id, user_id, action, entity_type, entity_id, changes, ip_address, user_agent, created_at", {
      count: "exact",
    })

  if (filters.action) {
    auditQuery = auditQuery.eq("action", filters.action)
  }

  if (filters.entity) {
    auditQuery = auditQuery.eq("entity_type", filters.entity)
  }

  if (filters.user_id === "system") {
    auditQuery = auditQuery.is("user_id", null)
  } else if (filters.user_id) {
    auditQuery = auditQuery.eq("user_id", filters.user_id)
  }

  if (filters.date_from) {
    auditQuery = auditQuery.gte("created_at", `${filters.date_from}T00:00:00.000Z`)
  }

  if (filters.date_to) {
    auditQuery = auditQuery.lte("created_at", `${filters.date_to}T23:59:59.999Z`)
  }

  if (filters.q) {
    const safeSearch = sanitizeSearchValue(filters.q)
    const conditions: string[] = []

    if (UUID_REGEXP.test(safeSearch)) {
      conditions.push(`id.eq.${safeSearch}`)
      conditions.push(`user_id.eq.${safeSearch}`)
      conditions.push(`entity_id.eq.${safeSearch}`)
    } else if (safeSearch) {
      conditions.push(`action.ilike.%${safeSearch}%`)
      conditions.push(`entity_type.ilike.%${safeSearch}%`)

      if (matchingUserIds.length > 0) {
        conditions.push(`user_id.in.(${matchingUserIds.join(",")})`)
      }

      const loweredSearch = safeSearch.toLowerCase()

      if ("система".includes(loweredSearch) || "system".includes(loweredSearch)) {
        conditions.push("user_id.is.null")
      }
    }

    if (conditions.length > 0) {
      auditQuery = auditQuery.or(conditions.join(","))
    }
  }

  const {
    data: auditLogs,
    count,
    error,
  } = await auditQuery.order("created_at", { ascending: false }).range(from, to)

  if (error) {
    throw new Error(error.message)
  }

  const logs = (auditLogs ?? []) as AuditLogEntry[]
  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const currentFiltersForHref = {
    q: filters.q,
    action: filters.action,
    entity: filters.entity,
    user_id: filters.user_id,
    date_from: filters.date_from,
    date_to: filters.date_to,
  }

  const currentRangeStart = totalCount === 0 ? 0 : from + 1
  const currentRangeEnd = Math.min(from + logs.length, totalCount)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Activity className="h-7 w-7 text-muted-foreground" />
          <h1 className="text-3xl font-bold tracking-tight">Журнал дій</h1>
        </div>
        <p className="max-w-3xl text-muted-foreground">
          Системний журнал подій з фінансових, резервних та адміністративних операцій. Сторінка призначена для
          адміністратора та використовується для контролю змін у системі.
        </p>
      </div>

      <ActivityFilters actions={actionOptions} entities={entityOptions} users={userOptions} current={filters} />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Знайдено записів</CardTitle>
            <CardDescription>З урахуванням активних фільтрів</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-bold tabular-nums">{totalCount}</CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Поточна сторінка</CardTitle>
            <CardDescription>
              {currentRangeStart}–{currentRangeEnd} із {totalCount}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-bold tabular-nums">
            {page} / {totalPages}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Останній запис</CardTitle>
            <CardDescription>{page === 1 ? "Найновіша подія у вибірці" : "Найновіша подія на сторінці"}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm font-medium">
            {logs[0]?.created_at ? formatDateTime(logs[0].created_at) : "Немає даних"}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Список подій
          </CardTitle>
          <CardDescription>Відсортовано від нових до старих</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Подія</TableHead>
                  <TableHead>Сутність</TableHead>
                  <TableHead>Користувач</TableHead>
                  <TableHead>Час</TableHead>
                  <TableHead>Деталі</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {logs.length > 0 ? (
                  logs.map((log) => {
                    const Icon = getAuditActionIcon(log.action)
                    const logUser = log.user_id ? usersById.get(log.user_id) : null

                    return (
                      <TableRow key={log.id}>
                        <TableCell className="align-top">
                          <div className="flex items-start gap-2">
                            <span className="rounded-md border bg-muted/40 p-1.5 text-muted-foreground">
                              <Icon className="h-4 w-4" />
                            </span>

                            <div className="space-y-1">
                              <Badge variant={getAuditActionBadgeVariant(log.action)}>
                                {formatAuditAction(log.action)}
                              </Badge>
                              <p className="text-xs text-muted-foreground">{log.action}</p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="align-top">
                          <div className="space-y-1">
                            <Badge variant="outline">{formatAuditEntity(log.entity_type)}</Badge>
                            {log.entity_id ? (
                              <p className="text-xs text-muted-foreground">ID: {shortenId(log.entity_id)}</p>
                            ) : null}
                          </div>
                        </TableCell>

                        <TableCell className="max-w-[260px] align-top">
                          {logUser ? (
                            <div className="space-y-1">
                              <p className="truncate font-medium">{formatAuditUserName(logUser)}</p>
                              <p className="truncate text-xs text-muted-foreground">{formatAuditRole(logUser.role)}</p>
                              <p className="truncate text-xs text-muted-foreground">{logUser.email}</p>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <Badge variant="secondary">Система</Badge>
                              <p className="text-xs text-muted-foreground">Автоматична системна дія</p>
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="whitespace-nowrap align-top">
                          {log.created_at ? formatDateTime(log.created_at) : "—"}
                        </TableCell>

                        <TableCell className="max-w-[460px] align-top text-xs text-muted-foreground">
                          <div className="space-y-2">
                            <p>{getAuditChangeSummary(log.changes)}</p>

                            <div className="space-y-0.5">
                              <p>Запис: {shortenId(log.id)}</p>
                              {log.ip_address ? <p>IP: {log.ip_address}</p> : null}
                              {log.user_agent ? <p className="truncate">UA: {log.user_agent}</p> : null}
                            </div>

                            {log.changes ? (
                              <details className="rounded-md border bg-muted/30 p-2">
                                <summary className="cursor-pointer font-medium text-foreground">Переглянути JSON</summary>
                                <pre className="mt-2 max-h-72 overflow-auto font-mono whitespace-pre-wrap text-sm">
                                  {JSON.stringify(log.changes, null, 2)}
                                </pre>
                              </details>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      За вказаними параметрами подій не знайдено.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 border-x border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Показано {currentRangeStart}–{currentRangeEnd} із {totalCount}
            </p>

            <div className="flex items-center gap-2">
              {page > 1 ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={buildActivityHref(currentFiltersForHref, page - 1)}>Попередня</Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Попередня
                </Button>
              )}

              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>

              {page < totalPages ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={buildActivityHref(currentFiltersForHref, page + 1)}>Наступна</Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Наступна
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}