import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function HomePage() {
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()

    if (data?.user) {
      redirect("/dashboard")
    }
  } catch {
    // Якщо Supabase недоступний, лишаємо користувача на публічному вході.
  }

  redirect("/login")
}
