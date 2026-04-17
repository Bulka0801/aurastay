import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { ReportsClient } from "@/components/reports/reports-client"

export default async function ReportsPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: rooms } = await supabase.from("rooms").select("id, status, room_type_id")

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Звіти та аналітика</h1>
        <p className="text-muted-foreground">Показники роботи готелю з фільтрами та експортом</p>
      </div>

      <ReportsClient totalRooms={rooms?.length ?? 0} />
    </div>
  )
}
