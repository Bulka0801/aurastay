import { redirect } from "next/navigation"

import { ProfileSettings } from "@/components/profile/profile-settings"
import { createClient } from "@/lib/supabase/server"

export default async function ProfilePage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, phone, role, is_active, created_at")
    .eq("id", data.user.id)
    .single()

  if (!profile) {
    redirect("/login")
  }

  return (
    <ProfileSettings
      profile={profile}
      authEmail={data.user.email ?? profile.email}
    />
  )
}
