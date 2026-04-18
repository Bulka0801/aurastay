import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import {
  Users,
  Database,
  Activity,
  AlertCircle,
  Plus,
  Shield,
} from "lucide-react";
import Link from "next/link";
import type { Profile } from "@/lib/types";

interface AdminDashboardProps {
  profile: Profile;
}

export async function AdminDashboard({ profile }: AdminDashboardProps) {
  const supabase = await createClient();

  const { count: userCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  const { count: activeUsers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  // Get recent audit logs
  const { data: recentLogs } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Панель адміністрування
          </h1>
          <p className="text-slate-600">
            Огляд системи та керування користувачами
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/admin/users/new">
            <Plus className="mr-2 h-4 w-4" />
            Додати користувача
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Усього користувачів
            </CardTitle>
            <Users className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userCount || 0}</div>
            <p className="text-xs text-slate-600">Користувачі системи</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Активні користувачі
            </CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers || 0}</div>
            <p className="text-xs text-slate-600">Активні зараз</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Стан бази даних
            </CardTitle>
            <Database className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">У мережі</div>
            <p className="text-xs text-slate-600">Усі системи працюють</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Системні сповіщення
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-slate-600">Сповіщень немає</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Останні дії
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentLogs && recentLogs.length > 0 ? (
                recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between border-b pb-3 last:border-0"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{log.action}</p>
                      <p className="text-xs text-slate-600">
                        {log.entity_type} -{" "}
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Нещодавніх дій немає</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Швидкі дії</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              asChild
              className="w-full justify-start bg-transparent"
              variant="outline"
            >
              <Link href="/dashboard/admin/users">
                <Users className="mr-2 h-4 w-4" />
                Керування користувачами
              </Link>
            </Button>
            <Button
              asChild
              className="w-full justify-start bg-transparent"
              variant="outline"
            >
              <Link href="/dashboard/admin/settings">
                <Database className="mr-2 h-4 w-4" />
                Налаштування системи
              </Link>
            </Button>
            <Button
              asChild
              className="w-full justify-start bg-transparent"
              variant="outline"
            >
              <Link href="/dashboard/admin/logs">
                <Activity className="mr-2 h-4 w-4" />
                Переглянути журнали аудиту
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
