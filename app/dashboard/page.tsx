import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { FrontDeskDashboard } from "@/components/dashboards/front-desk-dashboard"
import { AdminDashboard } from "@/components/dashboards/admin-dashboard"
import { HousekeepingDashboard } from "@/components/dashboards/housekeeping-dashboard"
import { AccountantDashboard } from "@/components/dashboards/accountant-dashboard"
import { ManagerDashboard } from "@/components/dashboards/manager-dashboard"

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single()

  if (!profile) {
    redirect("/login")
  }

  // Render role-specific dashboard
  switch (profile.role) {
    case "front_desk_agent":
    case "front_desk_manager":
    case "reservations_manager":
      return <FrontDeskDashboard profile={profile} />

    case "housekeeping_supervisor":
    case "housekeeping_staff":
      return <HousekeepingDashboard profile={profile} />

    case "accountant":
      return <AccountantDashboard profile={profile} />

    case "general_manager":
    case "revenue_manager":
    case "sales_manager":
      return <ManagerDashboard profile={profile} />

    case "system_admin":
      return <AdminDashboard profile={profile} />

    default:
      return <FrontDeskDashboard profile={profile} />
  }
}
