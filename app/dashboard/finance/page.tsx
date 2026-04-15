import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PaymentsTable } from "@/components/finance/payments-table"
import { FoliosTable } from "@/components/finance/folios-table"
import { DollarSign, TrendingUp, TrendingDown, Wallet } from "lucide-react"

export default async function FinancePage() {
  const supabase = await createServerClient()

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
      folios (
        reservation_id,
        reservations (
          reservation_number,
          guests (
            first_name,
            last_name
          )
        )
      )
    `)
    .order("created_at", { ascending: false })
    .limit(50)

  // Fetch active folios
  const { data: folios } = await supabase
    .from("folios")
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
    .eq("status", "open")

  // Calculate financial statistics
  const today = new Date().toISOString().split("T")[0]
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]

  const { data: todayPayments } = await supabase
    .from("payments")
    .select("amount")
    .eq("transaction_type", "payment")
    .gte("created_at", today)

  const { data: monthPayments } = await supabase
    .from("payments")
    .select("amount")
    .eq("transaction_type", "payment")
    .gte("created_at", startOfMonth)

  const { data: pendingPayments } = await supabase.from("folios").select("balance").eq("status", "open")

  const todayRevenue = todayPayments?.reduce((sum, p) => sum + p.amount, 0) || 0
  const monthRevenue = monthPayments?.reduce((sum, p) => sum + p.amount, 0) || 0
  const pendingAmount = pendingPayments?.reduce((sum, f) => sum + f.balance, 0) || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Finance</h1>
        <p className="text-muted-foreground">Manage payments and financial records</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Today's Revenue</p>
              <p className="text-2xl font-bold">${todayRevenue.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Month Revenue</p>
              <p className="text-2xl font-bold">${monthRevenue.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Wallet className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Amount</p>
              <p className="text-2xl font-bold">${pendingAmount.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingDown className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Open Folios</p>
              <p className="text-2xl font-bold">{folios?.length || 0}</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="payments" className="w-full">
        <TabsList>
          <TabsTrigger value="payments">
            Payments <span className="ml-2 text-xs">({payments?.length || 0})</span>
          </TabsTrigger>
          <TabsTrigger value="folios">
            Open Folios <span className="ml-2 text-xs">({folios?.length || 0})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="mt-6">
          <PaymentsTable payments={payments || []} />
        </TabsContent>

        <TabsContent value="folios" className="mt-6">
          <FoliosTable folios={folios || []} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
