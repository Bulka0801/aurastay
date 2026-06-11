import Link from "next/link"
import type { ComponentType, ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type DashboardPageHeaderProps = {
  title: string
  description?: ReactNode
  eyebrow?: string
  actions?: ReactNode
}

type DashboardMetricCardProps = {
  title: string
  value: ReactNode
  description?: ReactNode
  icon: LucideIcon
  tone?: "slate" | "blue" | "emerald" | "amber" | "red" | "indigo"
  href?: string
}

type DashboardAction = {
  label: string
  href?: string
  onClick?: () => void
  icon: LucideIcon
  disabled?: boolean
}

type DashboardQuickActionsProps = {
  title?: string
  actions: DashboardAction[]
  columns?: "one" | "two"
}

type DashboardAlertLinkProps = {
  label: string
  count: number
  href: string
  icon: LucideIcon
  tone?: "slate" | "blue" | "emerald" | "amber" | "red" | "indigo"
}

const toneClasses = {
  slate: {
    icon: "border-slate-200 bg-slate-50 text-slate-700",
    link: "border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300",
  },
  blue: {
    icon: "border-blue-200 bg-blue-50 text-blue-700",
    link: "border-blue-200 bg-blue-50 text-blue-800 hover:border-blue-300",
  },
  emerald: {
    icon: "border-emerald-200 bg-emerald-50 text-emerald-700",
    link: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300",
  },
  amber: {
    icon: "border-amber-200 bg-amber-50 text-amber-700",
    link: "border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300",
  },
  red: {
    icon: "border-red-200 bg-red-50 text-red-700",
    link: "border-red-200 bg-red-50 text-red-800 hover:border-red-300",
  },
  indigo: {
    icon: "border-indigo-200 bg-indigo-50 text-indigo-700",
    link: "border-indigo-200 bg-indigo-50 text-indigo-800 hover:border-indigo-300",
  },
}

export function DashboardPageHeader({ title, description, eyebrow, actions }: DashboardPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{eyebrow}</p>}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-600 md:text-base">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function DashboardMetricCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "slate",
  href,
}: DashboardMetricCardProps) {
  const content = (
    <Card
      className={cn(
        "h-full transition-all duration-200",
        href &&
          "cursor-pointer hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:translate-y-0 active:shadow-sm"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-600">{title}</p>
            <p className="mt-1 truncate text-2xl font-bold tabular-nums text-slate-950">{value}</p>
            {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
          </div>
          <div className={cn("shrink-0 rounded-lg border p-2", toneClasses[tone].icon)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (!href) return content

  return (
    <Link
      href={href}
      className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {content}
    </Link>
  )
}

export function DashboardQuickActions({ title = "Швидкі дії", actions, columns = "one" }: DashboardQuickActionsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className={cn("grid gap-2", columns === "two" && "grid-cols-2")}>
        {actions.map((action) => {
          const Icon = action.icon
          const className = cn(
            "min-h-11 justify-start gap-2 whitespace-normal text-left",
            columns === "two" && "h-auto min-h-16 flex-col justify-center px-2 py-3 text-center text-xs"
          )
          const content = (
            <>
              <Icon className="h-4 w-4 shrink-0" />
              <span>{action.label}</span>
            </>
          )

          if (action.href) {
            return (
              <Button key={action.label} asChild variant="outline" className={className} disabled={action.disabled}>
                <Link href={action.href}>{content}</Link>
              </Button>
            )
          }

          return (
            <Button key={action.label} variant="outline" className={className} onClick={action.onClick} disabled={action.disabled}>
              {content}
            </Button>
          )
        })}
      </CardContent>
    </Card>
  )
}

export function DashboardAlertLink({ label, count, href, icon: Icon, tone = "slate" }: DashboardAlertLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "block rounded-xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        toneClasses[tone].link
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-bold tabular-nums">{count}</p>
          <p className="mt-1 text-sm font-medium leading-snug">{label}</p>
        </div>
        <div className="rounded-lg border border-white/70 bg-white/75 p-2">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Link>
  )
}

export function DashboardSection({
  title,
  icon: Icon,
  children,
  action,
}: {
  title: string
  icon?: ComponentType<{ className?: string }>
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
          {title}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
