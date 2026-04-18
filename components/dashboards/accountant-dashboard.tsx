import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  AlertCircle,
  FileText,
} from "lucide-react";
import Link from "next/link";
import type { Profile } from "@/lib/types";

interface AccountantDashboardProps {
  profile: Profile;
}

export async function AccountantDashboard({
  profile,
}: AccountantDashboardProps) {
  const supabase = await createClient();

  // Get today's payments
  const today = new Date().toISOString().split("T")[0];
  const { data: todayPayments } = await supabase
    .from("payments")
    .select("amount")
    .gte("payment_date", `${today}T00:00:00`);

  const todayRevenue =
    todayPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

  // Get pending folios
  const { data: pendingFolios } = await supabase
    .from("folios")
    .select("balance")
    .in("status", ["pending", "partial"]);

  const pendingAmount =
    pendingFolios?.reduce((sum, f) => sum + Number(f.balance), 0) || 0;

  // Get recent payments
  const { data: recentPayments } = await supabase
    .from("payments")
    .select(
      `
      *,
      folio:folios(
        folio_number,
        guest:guests(first_name, last_name)
      )
    `
    )
    .order("payment_date", { ascending: false })
    .limit(5);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Фінансова панель
          </h1>
          <p className="text-slate-600">
            Раді знову вас бачити, {profile.first_name}! Відстежуйте фінансові
            операції та транзакції
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/finance/reports">
              <FileText className="mr-2 h-4 w-4" />
              Звіти
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Дохід за сьогодні
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${todayRevenue.toFixed(2)}</div>
            <p className="text-xs text-slate-600">Отримано сьогодні</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Платежі в очікуванні
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${pendingAmount.toFixed(2)}
            </div>
            <p className="text-xs text-slate-600">Сума до сплати</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Дохід за місяць
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <p className="text-xs text-slate-600">Цього місяця</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Транзакції</CardTitle>
            <CreditCard className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {todayPayments?.length || 0}
            </div>
            <p className="text-xs text-slate-600">Кількість за сьогодні</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Останні платежі</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentPayments && recentPayments.length > 0 ? (
              recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0"
                >
                  <div>
                    <p className="font-medium">
                      {payment.folio?.guest?.first_name}{" "}
                      {payment.folio?.guest?.last_name}
                    </p>
                    <p className="text-sm text-slate-600">
                      Фоліо: {payment.folio?.folio_number} •{" "}
                      {payment.payment_method}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      ${Number(payment.amount).toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-600">
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                Нещодавніх платежів немає
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
