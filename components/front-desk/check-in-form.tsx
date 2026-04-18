"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, CheckCircle } from "lucide-react"

interface CheckInFormProps {
  reservation: any
  availableRooms: any[]
}

export function CheckInForm({ reservation, availableRooms }: CheckInFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRoom, setSelectedRoom] = useState(reservation.reservation_rooms?.[0]?.room_id || "")
  const [depositAmount, setDepositAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [notes, setNotes] = useState("")

  const handleCheckIn = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Update reservation status
      const { error: reservationError } = await supabase
        .from("reservations")
        .update({
          status: "checked_in",
          actual_check_in: new Date().toISOString(),
        })
        .eq("id", reservation.id)

      if (reservationError) throw reservationError

      // If room not assigned yet, assign it now
      if (!reservation.reservation_rooms || reservation.reservation_rooms.length === 0) {
        if (!selectedRoom) {
          throw new Error("Please select a room")
        }

        // Create reservation room link
        await supabase.from("reservation_rooms").insert({
          reservation_id: reservation.id,
          room_id: selectedRoom,
          room_type_id: availableRooms.find((r) => r.id === selectedRoom)?.room_type_id,
          rate:
            reservation.total_amount /
            Math.ceil(
              (new Date(reservation.check_out_date).getTime() - new Date(reservation.check_in_date).getTime()) /
                (1000 * 60 * 60 * 24),
            ),
        })

        // Update room status
        await supabase.from("rooms").update({ status: "occupied" }).eq("id", selectedRoom)
      } else {
        // Update existing room status
        await supabase.from("rooms").update({ status: "occupied" }).eq("id", reservation.reservation_rooms[0].room_id)
      }

      // Create deposit payment if provided
      if (depositAmount && Number.parseFloat(depositAmount) > 0) {
        // Create folio if not exists
        let folioId = null
        const { data: existingFolio } = await supabase
          .from("folios")
          .select("id")
          .eq("reservation_id", reservation.id)
          .single()

        if (existingFolio) {
          folioId = existingFolio.id
        } else {
          const { data: newFolio } = await supabase
            .from("folios")
            .insert({
              reservation_id: reservation.id,
              guest_id: reservation.guest_id,
              status: "open",
              total_charges: reservation.total_amount,
              total_payments: Number.parseFloat(depositAmount),
              balance: reservation.total_amount - Number.parseFloat(depositAmount),
            })
            .select()
            .single()

          folioId = newFolio.id
        }

        // Record payment
        await supabase.from("payments").insert({
          folio_id: folioId,
          amount: Number.parseFloat(depositAmount),
          payment_method: paymentMethod,
          transaction_type: "payment",
          notes: "Check-in deposit",
        })
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
        <h2 className="text-xl font-semibold mb-4">Деталі бронювання</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Бронювання №:</span>
            <span className="font-medium">{reservation.reservation_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Гість:</span>
            <span className="font-medium">
              {reservation.guests.first_name} {reservation.guests.last_name}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Електронна пошта:</span>
            <span>{reservation.guests.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Телефон:</span>
            <span>{reservation.guests.phone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Дата заїзду:</span>
            <span>{new Date(reservation.check_in_date).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Дата виїзду:</span>
            <span>{new Date(reservation.check_out_date).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Гості:</span>
            <span>
              {reservation.adults} доросл{reservation.adults > 1 ? "их" : "ий"}
              {reservation.children > 0 && `, ${reservation.children} дит${reservation.children > 1 ? "ей" : "ина"}`}
            </span>
          </div>
          <div className="flex justify-between border-t pt-3">
            <span className="text-muted-foreground">Загальна сума:</span>
            <span className="font-bold text-lg">${reservation.total_amount.toFixed(2)}</span>
          </div>
        </div>
      </Card>
  
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Інформація про заселення</h2>
        <div className="space-y-4">
          {(!reservation.reservation_rooms || reservation.reservation_rooms.length === 0) && (
            <div className="space-y-2">
              <Label>Призначити номер *</Label>
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger>
                  <SelectValue placeholder="Оберіть номер" />
                </SelectTrigger>
                <SelectContent>
                  {availableRooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.room_number} - {room.room_type.name} (${room.room_type.base_rate}/ніч)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
  
          {reservation.reservation_rooms && reservation.reservation_rooms.length > 0 && (
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="text-sm text-muted-foreground mb-1">Призначений номер</p>
              <p className="font-semibold text-lg">
                {reservation.reservation_rooms[0].rooms.room_number} -{" "}
                {reservation.reservation_rooms[0].rooms.room_type.name}
              </p>
            </div>
          )}
  
          <div className="space-y-2">
            <Label htmlFor="deposit">Сума депозиту (необов’язково)</Label>
            <Input
              id="deposit"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
            />
          </div>
  
          <div className="space-y-2">
            <Label>Спосіб оплати</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Готівка</SelectItem>
                <SelectItem value="credit_card">Кредитна картка</SelectItem>
                <SelectItem value="debit_card">Дебетова картка</SelectItem>
                <SelectItem value="bank_transfer">Банківський переказ</SelectItem>
              </SelectContent>
            </Select>
          </div>
  
          <div className="space-y-2">
            <Label htmlFor="notes">Примітки (необов’язково)</Label>
            <Textarea
              id="notes"
              placeholder="Будь-які додаткові побажання або примітки..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
  
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</div>}
  
          <Button onClick={handleCheckIn} disabled={isLoading} className="w-full" size="lg">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Обробка...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Завершити заселення
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  )
}