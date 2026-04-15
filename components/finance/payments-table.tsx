"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search } from "lucide-react"

interface Payment {
  id: string
  amount: number
  payment_method: string
  transaction_type: string
  notes: string | null
  created_at: string
  folios: {
    reservation_id: string
    reservations: {
      reservation_number: string
      guests: {
        first_name: string
        last_name: string
      }
    }
  }
}

export function PaymentsTable({ payments }: { payments: Payment[] }) {
  const [search, setSearch] = useState("")

  const filteredPayments = payments.filter(
    (payment) =>
      payment.folios.reservations.guests.first_name.toLowerCase().includes(search.toLowerCase()) ||
      payment.folios.reservations.guests.last_name.toLowerCase().includes(search.toLowerCase()) ||
      payment.folios.reservations.reservation_number.toLowerCase().includes(search.toLowerCase()),
  )

  const paymentMethodColors: Record<string, string> = {
    cash: "bg-green-100 text-green-800",
    credit_card: "bg-blue-100 text-blue-800",
    debit_card: "bg-purple-100 text-purple-800",
    bank_transfer: "bg-orange-100 text-orange-800",
  }

  return (
    <Card>
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by guest name or reservation number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date & Time</TableHead>
              <TableHead>Guest</TableHead>
              <TableHead>Reservation</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No payments found
                </TableCell>
              </TableRow>
            ) : (
              filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="text-sm">{new Date(payment.created_at).toLocaleString()}</TableCell>
                  <TableCell className="font-medium">
                    {payment.folios.reservations.guests.first_name} {payment.folios.reservations.guests.last_name}
                  </TableCell>
                  <TableCell className="text-sm">{payment.folios.reservations.reservation_number}</TableCell>
                  <TableCell className="font-bold text-green-600">${payment.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={paymentMethodColors[payment.payment_method] || "bg-gray-100 text-gray-800"}
                    >
                      {payment.payment_method.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">{payment.transaction_type}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{payment.notes || "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
