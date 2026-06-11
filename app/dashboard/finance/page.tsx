import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PaymentsTable } from "@/components/finance/payments-table"
import { FoliosTable } from "@/components/finance/folios-table"
import { DollarSign, TrendingUp, TrendingDown, Wallet } from "lucide-react"
import { formatCurrency } from "@/lib/localization"
import { signedSettledPaymentAmount } from "@/lib/rules/payments"

type FinancePayment = {
  amount: number | string | null
  payment_status?: string | null
  payment_date?: string | null
  created_at?: string | null
}

type FinanceReservation = {
  total_amount: number | string | null
  payments?: FinancePayment[] | null
}

type FinancePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function localMonthStartKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")

  return `${year}-${month}-01`
}

function paymentDateKey(payment: FinancePayment) {
  return (payment.payment_date ?? payment.created_at ?? "").slice(0, 10)
}

function signedPaymentAmount(payment: FinancePayment) {
  return signedSettledPaymentAmount(payment)
}

function getSearchValue(searchParams: Record<string, string | string[] | undefined>, key: string) {
  const value = searchParams[key]
  return Array.isArray(value) ? value[0] : value
}

export default async function FinancePage({ searchParams }: FinancePageProps) {
  const supabase = await createServerClient()
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {})
  const showAllFolios = getSearchValue(resolvedSearchParams, "folios") === "all"
  const defaultTab = getSearchValue(resolvedSearchParams, "tab") === "folios" ? "folios" : "payments"

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Fetch recent payments
  const { data: payments } = await supabase
    .from("payments")
    .select(`
      *,
      reservations (
        reservation_number,
        guests (
          first_name,
          last_name
        )
      )
    `)
    .order("created_at", { ascending: false })

  const foliosQuery = supabase
    .from("v_folios_with_payments")
    .select(`
      *,
      guests (
        first_name,
        last_name
      ),
      reservations (
        reservation_number,
        check_in_date,
        check_out_date
      )
    `)
    .order("updated_at", { ascending: false })

  if (!showAllFolios) {
    foliosQuery.eq("is_closed", false)
  }

  const { data: folios } = await foliosQuery

  const [{ count: totalFolioCount }, { count: openFolioCount }] = await Promise.all([
    supabase.from("v_folios_with_payments").select("id", { count: "exact", head: true }),
    supabase.from("v_folios_with_payments").select("id", { count: "exact", head: true }).eq("is_closed", false),
  ])

  const { data: activeReservations } = await supabase
    .from("reservations")
    .select(`
      total_amount,
      payments (
        amount,
        payment_status,
        payment_date,
        created_at
      )
    `)
    .in("status", ["pending", "confirmed", "checked_in"])

  // Calculate financial statistics from the actual payments schema.
  const today = localDateKey()
  const startOfMonth = localMonthStartKey()
  const financePayments = (payments ?? []) as FinancePayment[]

  const todayRevenue = financePayments
    .filter((payment) => paymentDateKey(payment) === today)
    .reduce((sum, payment) => sum + signedPaymentAmount(payment), 0)

  const monthRevenue = financePayments
    .filter((payment) => paymentDateKey(payment) >= startOfMonth)
    .reduce((sum, payment) => sum + signedPaymentAmount(payment), 0)

  const pendingAmount =
    ((activeReservations ?? []) as FinanceReservation[]).reduce((sum, reservation) => {
      const total = Number(reservation.total_amount ?? 0)
      const paid = (reservation.payments ?? []).reduce((paymentSum, payment) => {
        return paymentSum + signedPaymentAmount(payment)
      }, 0)

      return sum + Math.max(0, (Number.isFinite(total) ? total : 0) - paid)
    }, 0) || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Фінанси</h1>
        <p className="text-muted-foreground">Керуйте платежами та фінансовими записами</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Дохід за сьогодні</p>
              <p className="text-2xl font-bold">{formatCurrency(todayRevenue)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Дохід за місяць</p>
              <p className="text-2xl font-bold">{formatCurrency(monthRevenue)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Wallet className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Сума до сплати</p>
              <p className="text-2xl font-bold">{formatCurrency(pendingAmount)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingDown className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Відкриті рахунки</p>
              <p className="text-2xl font-bold">{folios?.length || 0}</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList>
          <TabsTrigger value="payments">
            Платежі <span className="ml-2 text-xs">({payments?.length || 0})</span>
          </TabsTrigger>
          <TabsTrigger value="folios">
            Рахунки <span className="ml-2 text-xs">({showAllFolios ? totalFolioCount || 0 : openFolioCount || 0})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="mt-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Платежі</h2>
            <p className="text-sm text-muted-foreground">
              Окремі фінансові операції за бронюваннями: оплати, повернення та коригування.
            </p>
          </div>
          <PaymentsTable payments={payments || []} />
        </TabsContent>

        <TabsContent value="folios" className="mt-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Рахунки</h2>
            <p className="text-sm text-muted-foreground">
              Зведення по рахунку гостя: нарахування, внесені оплати та поточний баланс до закриття.
            </p>
          </div>
          <FoliosTable
            folios={folios || []}
            showAll={showAllFolios}
            totalCount={totalFolioCount || 0}
            openCount={openFolioCount || 0}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
