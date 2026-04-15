import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { HousekeepingClient } from "@/components/housekeeping/housekeeping-client"

export default async function HousekeepingPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (!profile) redirect("/login")

  // Prefetch rooms
  const { data: rooms } = await supabase
    .from("rooms")
    .select("*, room_type:room_types(name)")
    .order("room_number")

  // Prefetch housekeeping staff
  const { data: staff } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, role")
    .in("role", ["housekeeping_staff", "housekeeping_supervisor"])
    .eq("is_active", true)

  return (
    <HousekeepingClient
      profile={profile}
      initialRooms={rooms || []}
      initialStaff={staff || []}
    />
  )
}
