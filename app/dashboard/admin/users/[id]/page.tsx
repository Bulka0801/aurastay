import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { EditUserForm } from "@/components/admin/edit-user-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { formatDateTime, formatRole } from "@/lib/localization"
import type { Profile } from "@/lib/types"

type EditUserPageProps = {
  params: Promise<{ id: string }>
}

export default async function EditUserPage({ params }: EditUserPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user: currentUser },
    error: currentUserError,
  } = await supabase.auth.getUser()

  if (currentUserError || !currentUser) {
    redirect("/login")
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", currentUser.id)
    .single()

  if (currentProfile?.role !== "system_administrator") {
    redirect("/dashboard")
  }

  const { data: user } = await supabase.from("profiles").select("*").eq("id", id).single()

  if (!user) {
    notFound()
  }

  const profile = user as Profile

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <Button asChild variant="ghost" size="sm" className="w-fit px-0">
            <Link href="/dashboard/admin/users">
              <ArrowLeft className="mr-2 h-4 w-4" />
              До списку користувачів
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {profile.first_name} {profile.last_name}
            </h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant={profile.is_active ? "default" : "secondary"}>
                {profile.is_active ? "Активний" : "Неактивний"}
              </Badge>
              <Badge variant="outline">{formatRole(profile.role)}</Badge>
            </div>
            <p className="text-muted-foreground">Редагування облікового запису та профілю користувача</p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-4 text-sm md:grid-cols-3">
          <div>
            <p className="text-muted-foreground">Email</p>
            <p className="font-medium">{profile.email}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Створено</p>
            <p className="font-medium">{formatDateTime(profile.created_at)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Оновлено</p>
            <p className="font-medium">{formatDateTime(profile.updated_at)}</p>
          </div>
        </CardContent>
      </Card>

      <EditUserForm user={profile} currentUserId={currentUser.id} />
    </div>
  )
}
