import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { UsersTable } from "@/components/admin/users-table"
import type { Profile } from "@/lib/types"

export default async function UsersPage() {
  const supabase = await createClient()

  const { data: users } = await supabase.from("profiles").select("*").order("created_at", { ascending: false })

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
          </div>
        </CardHeader>
        <CardContent>
          <UsersTable users={(users ?? []) as Profile[]} />
        </CardContent>
      </Card>
    </div>
  )
}
