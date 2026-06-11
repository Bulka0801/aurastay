import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { CreditCard, AlertCircle, FileText, Wallet } from "lucide-react"
import type { Profile } from "@/lib/types"
import { formatCurrency } from "@/lib/localization"
import { signedSettledPaymentAmount } from "@/lib/rules/payments"
import { DashboardMetricCard, DashboardPageHeader, DashboardQuickActions } from "./dashboard-primitives"

interface AccountantDashboardProps {
  profile: Profile
}

export async function AccountantDashboard({ profile }: AccountantDashboardProps) {
  const supabase = await createClient()

  // Get today's payments
  const today = new Date().toISOString().split("T")[0]
  const { data: todayPayments } = await supabase
    .from("payments")
    .select("amount, payment_status")
    .gte("payment_date", `${today}T00:00:00`)

  const todayRevenue =
    todayPayments?.reduce((sum, payment) => sum + signedSettledPaymentAmount(payment), 0) || 0
  const todaySettledPaymentCount =
    todayPayments?.filter((payment) => signedSettledPaymentAmount(payment) !== 0).length || 0

  // Get pending folios
  const { data: pendingFolios } = await supabase.from("folios").select("balance").in("status", ["pending", "partial"])

  const pendingAmount = pendingFolios?.reduce((sum, f) => sum + Number(f.balance), 0) || 0

  // Get recent payments
  const { data: recentPayments } = await supabase
    .from("payments")
    .select(`
      *,
      folio:folios(
        folio_number,
        guest:guests(first_name, last_name)
      )
    `)
    .order("payment_date", { ascending: false })
    .limit(5)

  return (
    <div className="flex flex-col gap-6">
      <DashboardPageHeader
        title="Фінансовий дашборд"
        description={`Контроль оплат, відкритих рахунків і останніх транзакцій, ${profile.first_name}.`}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardMetricCard title="Дохід за сьогодні" value={formatCurrency(todayRevenue)} description="Отримано сьогодні" icon={Wallet} tone="emerald" href="/dashboard/finance" />
        <DashboardMetricCard title="Незавершені оплати" value={formatCurrency(pendingAmount)} description="Несплачений залишок" icon={AlertCircle} tone="amber" href="/dashboard/finance?tab=folios" />
        <DashboardMetricCard title="Транзакції" value={todaySettledPaymentCount} description="Кількість оплат за сьогодні" icon={CreditCard} tone="slate" href="/dashboard/finance" />
        <DashboardMetricCard title="Фінансові звіти" value="Звіти" description="Експорт і аналітика" icon={FileText} tone="blue" href="/dashboard/reports" />
      </div>

      <DashboardQuickActions
        actions={[
          { label: "Відкрити фінанси", href: "/dashboard/finance", icon: Wallet },
          { label: "Відкриті рахунки", href: "/dashboard/finance?tab=folios", icon: AlertCircle },
          { label: "Звіти", href: "/dashboard/reports", icon: FileText },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Останні платежі</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentPayments && recentPayments.length > 0 ? (
              recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div>
                    <p className="font-medium">
                      {payment.folio?.guest?.first_name} {payment.folio?.guest?.last_name}
                    </p>
                    <p className="text-sm text-slate-600">
                      Рахунок: {payment.folio?.folio_number} • {payment.payment_method}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">{formatCurrency(Number(payment.amount))}</p>
                    <p className="text-xs text-slate-600">{new Date(payment.payment_date).toLocaleDateString("uk-UA")}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">Останніх платежів немає</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
