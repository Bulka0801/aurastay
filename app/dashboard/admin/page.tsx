import Link from "next/link"
import { redirect } from "next/navigation"
import { Activity, BedDouble, Settings, Users } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"

const adminSections = [
  {
    href: "/dashboard/admin/users",
    title: "Користувачі та ролі",
    description: "Облікові записи, ролі, статус активності та скидання пароля.",
    icon: Users,
  },
  {
    href: "/dashboard/admin/settings",
    title: "Налаштування готелю",
    description: "Типи номерів, номери, тарифи, блокування та правила роботи готелю.",
    icon: BedDouble,
  },
  {
    href: "/dashboard/admin/activity",
    title: "Журнал дій",
    description: "Останні системні події, зміни бронювань і фінансові операції.",
    icon: Activity,
  },
]

export default async function AdminPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()

  if (!data?.user) {
    redirect("/login")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single()

  if (profile?.role !== "system_administrator") {
    redirect("/dashboard")
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-3">
          <Settings className="h-7 w-7 text-muted-foreground" />
          <h1 className="text-3xl font-bold tracking-tight">Адміністрування</h1>
        </div>
        <p className="text-muted-foreground">
          Системні розділи для керування доступами, номерним фондом і правилами PMS.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {adminSections.map((section) => {
          const Icon = section.icon

          return (
            <Link
              key={section.href}
              href={section.href}
              className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="h-full cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/30 hover:shadow-md active:translate-y-0 active:shadow-sm">
                <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                  <div className="rounded-md border p-2">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">Відкрити розділ</CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
