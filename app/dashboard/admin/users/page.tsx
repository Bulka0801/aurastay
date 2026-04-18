import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Search } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

export default async function UsersPage() {
  const supabase = await createClient()

  const { data: users } = await supabase.from("profiles").select("*").order("created_at", { ascending: false })

  const formatRole = (role: string) => {
    return role
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Управління користувачами</h1>
          <p className="text-muted-foreground">Керуйте користувачами системи та їхніми ролями</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/admin/users/new">
            <Plus className="mr-2 h-4 w-4" />
            Додати нового користувача
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Усі користувачі</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Пошук користувачів..." className="pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users && users.length > 0 ? (
              <div className="divide-y">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                    <div className="space-y-1">
                      <p className="font-medium">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      {user.employee_id && (
                        <p className="text-xs text-muted-foreground">ID співробітника: {user.employee_id}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <Badge variant={user.is_active ? "default" : "secondary"}>{formatRole(user.role)}</Badge>
                        {!user.is_active && <p className="mt-1 text-xs text-muted-foreground">Неактивний</p>}
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/admin/users/${user.id}`}>Редагувати</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Користувачів не знайдено</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
