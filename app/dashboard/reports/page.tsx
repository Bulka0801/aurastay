import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { ReportsClient } from "@/components/reports/reports-client"

export default async function ReportsPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: rooms }, { data: profile }] = await Promise.all([
    supabase.from("rooms").select("id, status, room_type_id"),
    supabase.from("profiles").select("first_name, last_name, role").eq("id", user.id).single(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div className="print:hidden">
        <h1 className="text-3xl font-bold">Звіти та аналітика</h1>
        <p className="text-muted-foreground">Показники роботи готелю з фільтрами та експортом</p>
      </div>

      <ReportsClient
        totalRooms={rooms?.length ?? 0}
        preparedBy={{
          name: profile ? `${profile.first_name} ${profile.last_name}`.trim() : user.email ?? "Користувач",
          role: profile?.role ?? null,
        }}
        generatedAt={new Date().toISOString()}
      />
    </div>
  )
}
