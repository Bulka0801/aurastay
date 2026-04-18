"use client"

import { Card } from "@/components/ui/card"

interface Payment {
  amount: number
  created_at: string
}

export function RevenueReport({ payments }: { payments: Payment[] }) {
  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0)
  const averageTransaction = payments.length > 0 ? totalRevenue / payments.length : 0

  // Group by date
  const revenueByDate = payments.reduce(
    (acc, payment) => {
      const date = new Date(payment.created_at).toLocaleDateString("uk-UA")
      acc[date] = (acc[date] || 0) + payment.amount
      return acc
    },
    {} as Record<string, number>,
  )

  const sortedDates = Object.entries(revenueByDate).sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Підсумок доходів (30 днів)</h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Загальний дохід</p>
            <p className="text-3xl font-bold text-green-600">${totalRevenue.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Кількість транзакцій</p>
            <p className="text-3xl font-bold">{payments.length}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Середня транзакція</p>
            <p className="text-3xl font-bold">${averageTransaction.toFixed(2)}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Дохід по днях</h3>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {sortedDates.slice(0, 10).map(([date, amount]) => (
            <div key={date} className="flex items-center justify-between py-2 border-b">
              <span className="text-sm">{date}</span>
              <span className="font-semibold text-green-600">${amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
