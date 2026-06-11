import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { Users, Database, Activity, AlertCircle, Plus, Shield, Settings } from "lucide-react"
import Link from "next/link"
import type { Profile } from "@/lib/types"
import { DashboardMetricCard, DashboardPageHeader, DashboardQuickActions } from "./dashboard-primitives"

interface AdminDashboardProps {
  profile: Profile
}

export async function AdminDashboard({ profile }: AdminDashboardProps) {
  const supabase = await createClient()

  const { count: userCount } = await supabase.from("profiles").select("*", { count: "exact", head: true })

  const { count: activeUsers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true)

  const inactiveUsers = Math.max(0, (userCount || 0) - (activeUsers || 0))

  // Get recent audit logs
  const { data: recentLogs } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5)

  return (
    <div className="flex flex-col gap-6">
      <DashboardPageHeader
        title="Дашборд системного адміністратора"
        description={`Користувачі, ролі, налаштування PMS і контроль системної активності, ${profile.first_name}.`}
        actions={
        <Button asChild>
          <Link href="/dashboard/admin/users/new">
            <Plus className="mr-2 h-4 w-4" />
            Додати користувача
          </Link>
        </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardMetricCard title="Усього користувачів" value={userCount || 0} description="Облікові записи PMS" icon={Users} tone="slate" href="/dashboard/admin/users" />
        <DashboardMetricCard title="Активні користувачі" value={activeUsers || 0} description="Можуть входити в систему" icon={Activity} tone="emerald" href="/dashboard/admin/users" />
        <DashboardMetricCard title="Неактивні користувачі" value={inactiveUsers} description="Потребують перевірки доступу" icon={AlertCircle} tone={inactiveUsers > 0 ? "amber" : "slate"} href="/dashboard/admin/users" />
        <DashboardMetricCard title="Стан бази даних" value="У мережі" description="Supabase доступний" icon={Database} tone="blue" href="/dashboard/admin/settings" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Остання активність
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentLogs && recentLogs.length > 0 ? (
                recentLogs.map((log) => (
                  <div key={log.id} className="flex items-start justify-between border-b pb-3 last:border-0">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{log.action}</p>
                      <p className="text-xs text-slate-600">
                        {log.entity_type} · {new Date(log.created_at).toLocaleString("uk-UA")}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Останніх системних подій немає.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <DashboardQuickActions
          actions={[
            { label: "Користувачі та ролі", href: "/dashboard/admin/users", icon: Users },
            { label: "Налаштування PMS", href: "/dashboard/admin/settings", icon: Settings },
            { label: "Журнал дій", href: "/dashboard/admin/activity", icon: Activity },
            { label: "Додати користувача", href: "/dashboard/admin/users/new", icon: Plus },
          ]}
        />
      </div>
    </div>
  )
}
