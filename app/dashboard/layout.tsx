import type React from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardNav } from "@/components/dashboard-nav"
import { DashboardHeader } from "@/components/dashboard-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user) {
      redirect("/login")
    }

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single()

    if (!profile || !profile.is_active) {
      redirect("/login")
    }

    const cookieStore = await cookies()
    const defaultSidebarOpen = cookieStore.get("sidebar_state")?.value !== "false"

    return (
      <SidebarProvider defaultOpen={defaultSidebarOpen} className="bg-slate-50">
        <DashboardNav role={profile.role} />
        <SidebarInset className="bg-slate-50">
          <DashboardHeader user={profile} />
          <main className="min-w-0 flex-1 p-6 md:p-8">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    )
  } catch {
    redirect("/login")
  }
}
