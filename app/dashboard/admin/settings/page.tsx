import { redirect } from "next/navigation"

import { AdminSettingsClient } from "@/components/admin/settings/admin-settings-client"
import { normalizeHotelSettings } from "@/lib/hotel-settings"
import { createClient } from "@/lib/supabase/server"

export default async function AdminSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/login")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "system_administrator") {
    redirect("/dashboard")
  }

  const [{ data: hotelSettings }, { data: roomTypes }, { data: rooms }, { data: ratePlans }, { data: roomBlocks }] =
    await Promise.all([
      supabase.from("hotel_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("room_types").select("*").order("code", { ascending: true }),
      supabase.from("rooms").select("*, room_type:room_types(*)").order("room_number", { ascending: true }),
      supabase.from("rate_plans").select("*").order("is_default", { ascending: false }).order("name", { ascending: true }),
      supabase
        .from("room_blocks")
        .select("*, room:rooms(room_number)")
        .order("start_date", { ascending: false }),
    ])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Конфігурація готелю</h1>
        <p className="text-muted-foreground">
          Централізоване керування номерним фондом, тарифами, блокуваннями та правилами PMS.
        </p>
      </div>

      <AdminSettingsClient
        hotelSettings={normalizeHotelSettings(hotelSettings)}
        roomTypes={roomTypes ?? []}
        rooms={rooms ?? []}
        ratePlans={ratePlans ?? []}
        roomBlocks={roomBlocks ?? []}
      />
    </div>
  )
}
