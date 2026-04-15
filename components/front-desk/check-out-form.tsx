"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Loader2, LogOut } from "lucide-react"

interface CheckOutFormProps {
  reservation: any
}

export function CheckOutForm({ reservation }: CheckOutFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("cash")

  const folio = reservation.folios?.[0]
  const totalPaid = folio?.payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0
  const balance = reservation.total_amount - totalPaid

  const handleCheckOut = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // If there's a balance, process payment
      if (balance > 0 && paymentAmount) {
        const amount = Number.parseFloat(paymentAmount)
        if (amount > 0) {
          // Create folio if not exists
          let folioId = folio?.id
          if (!folioId) {
            const { data: newFolio } = await supabase
              .from("folios")
              .insert({
                reservation_id: reservation.id,
                guest_id: reservation.guest_id,
                status: "open",
                total_charges: reservation.total_amount,
                total_payments: amount,
                balance: reservation.total_amount - amount,
              })
              .select()
              .single()

            folioId = newFolio.id
          } else {
            // Update folio
            await supabase
              .from("folios")
              .update({
                total_payments: totalPaid + amount,
                balance: balance - amount,
              })
              .eq("id", folioId)
          }

          // Record payment
          await supabase.from("payments").insert({
            folio_id: folioId,
            amount: amount,
            payment_method: paymentMethod,
            transaction_type: "payment",
            notes: "Check-out payment",
          })
        }
      }

      // Update reservation status
      const { error: reservationError } = await supabase
        .from("reservations")
        .update({
          status: "checked_out",
          actual_check_out: new Date().toISOString(),
        })
        .eq("id", reservation.id)

      if (reservationError) throw reservationError

      // Update room status to dirty
      if (reservation.reservation_rooms && reservation.reservation_rooms.length > 0) {
        await supabase.from("rooms").update({ status: "dirty" }).eq("id", reservation.reservation_rooms[0].room_id)

        // Create housekeeping task
        await supabase.from("housekeeping_tasks").insert({
          room_id: reservation.reservation_rooms[0].room_id,
          task_type: "checkout_cleaning",
          status: "pending",
          priority: "high",
          notes: `Check-out cleaning for ${reservation.guests.first_name} ${reservation.guests.last_name}`,
        })
      }

      // Close folio if exists
      if (folio?.id) {
        await supabase.from("folios").update({ status: "closed" }).eq("id", folio.id)
      }

      router.push("/dashboard/front-desk")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Reservation Summary</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Reservation #:</span>
            <span className="font-medium">{reservation.reservation_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Guest:</span>
            <span className="font-medium">
              {reservation.guests.first_name} {reservation.guests.last_name}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Room:</span>
            <span>
              {reservation.reservation_rooms?.[0]?.rooms.room_number || "N/A"} -{" "}
              {reservation.reservation_rooms?.[0]?.rooms.room_type.name || "N/A"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Check-in:</span>
            <span>{new Date(reservation.check_in_date).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Check-out:</span>
            <span>{new Date(reservation.check_out_date).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nights:</span>
            <span>
              {Math.ceil(
                (new Date(reservation.check_out_date).getTime() - new Date(reservation.check_in_date).getTime()) /
                  (1000 * 60 * 60 * 24),
              )}
            </span>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Payment Details</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Charges:</span>
              <span className="font-medium">${reservation.total_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Paid:</span>
              <span className="font-medium text-green-600">${totalPaid.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="font-semibold">Balance Due:</span>
              <span className={`font-bold text-lg ${balance > 0 ? "text-red-600" : "text-green-600"}`}>
                ${balance.toFixed(2)}
              </span>
            </div>
          </div>

          {balance > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="payment">Payment Amount *</Label>
                  <Input
                    id="payment"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={balance.toFixed(2)}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPaymentAmount(balance.toString())}
                  >
                    Pay Full Balance
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="debit_card">Debit Card</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</div>}

          <Button
            onClick={handleCheckOut}
            disabled={isLoading || (balance > 0 && !paymentAmount)}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <LogOut className="mr-2 h-4 w-4" />
                Complete Check-Out
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  )
}
