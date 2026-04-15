import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { GuestsClient } from "@/components/guests/guests-client"

export default async function GuestsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (!profile) redirect("/login")

  return <GuestsClient profile={profile} />
}
