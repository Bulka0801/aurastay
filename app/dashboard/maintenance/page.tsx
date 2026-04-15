import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { MaintenanceClient } from "@/components/maintenance/maintenance-client"

export default async function MaintenancePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (!profile) redirect("/login")

  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, room_number, floor")
    .order("room_number")

  const { data: staff } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, role")
    .in("role", ["maintenance_manager", "maintenance_staff"])
    .eq("is_active", true)

  return (
    <MaintenanceClient
      profile={profile}
      initialRooms={rooms || []}
      initialStaff={staff || []}
    />
  )
}
