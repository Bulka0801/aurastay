"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { format } from "date-fns"
import { uk } from "date-fns/locale"
import { AlertCircle, Loader2 } from "lucide-react"
import { formatMoney } from "@/lib/format"
import { useNewReservationForm } from "../form-context"
import { GuestLookupInput } from "../ui/guest-lookup-input"

export function StepGuestConfirm() {
  const {
    hotelSettings,
    checkInDate,
    checkOutDate,
    nights,
    totalAdults,
    totalChildren,
    initialReservationContext,
    selectedRoomNumber,
    roomType,
    ratePlan,
    totalAmount,
    prepaymentDue,
    prepaymentRequired,
    specialRequests,
    setSpecialRequests,
    error,
    isLoading,
    canSubmit,
    setStep,
  } = useNewReservationForm()

  return (
    <div className="space-y-4">
      {/* Guest Selection */}
      <GuestLookupInput />

      {/* Special Requests */}
      <div className="space-y-2">
        <Label htmlFor="specialRequests">Особливі побажання</Label>
        <Textarea
          id="specialRequests"
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
          placeholder="Тихий номер, дитяче ліжечко, алергії, пізній заїзд…"
          rows={3}
        />
      </div>

      {/* Reservation summary */}
      <div className="rounded-lg border bg-muted/40 p-4 text-sm">
        <h4 className="mb-2 font-semibold">Підсумок бронювання</h4>
        <dl className="mx-auto grid max-w-5xl grid-cols-[max-content_minmax(0,1fr)] items-baseline gap-x-3 gap-y-2 md:grid-cols-[max-content_minmax(10rem,1fr)_max-content_minmax(10rem,1fr)]">
          <dt className="text-right text-muted-foreground">Період:</dt>
          <dd className="min-w-0 text-left font-medium">
            {checkInDate ? format(checkInDate, "d MMM yyyy", { locale: uk }) : "—"} →{" "}
            {checkOutDate ? format(checkOutDate, "d MMM yyyy", { locale: uk }) : "—"} ({nights} ноч.)
          </dd>
          <dt className="text-right text-muted-foreground">Гостей:</dt>
          <dd className="min-w-0 text-left font-medium">
            {totalAdults} дор. {totalChildren > 0 ? `+ ${totalChildren} діт.` : ""}
          </dd>

          <dt className="text-right text-muted-foreground">Номер:</dt>
          <dd className="min-w-0 text-left font-medium">
            {initialReservationContext ? `№ ${selectedRoomNumber || "—"}` : roomType?.name || "—"}
            {!initialReservationContext && selectedRoomNumber ? ` · № ${selectedRoomNumber}` : ""}
          </dd>
          <dt className="text-right text-muted-foreground">Тариф:</dt>
          <dd className="min-w-0 text-left font-medium">{ratePlan?.name || "—"}</dd>

          <dt className="text-right text-muted-foreground">Разом:</dt>
          <dd className="min-w-0 text-left font-semibold">{formatMoney(totalAmount, hotelSettings, { maximumFractionDigits: 0 })}</dd>
          <dt className="text-right text-muted-foreground">Передплата:</dt>
          <dd className="min-w-0 text-left font-medium">
            {prepaymentRequired ? formatMoney(prepaymentDue, hotelSettings, { maximumFractionDigits: 0 }) : "Не вимагається"}
          </dd>
        </dl>
        <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {prepaymentRequired
              ? `Бронювання буде створене зі статусом «Очікує передплату». Підтвердження відбудеться автоматично після внесення ${hotelSettings.prepayment_percent}% передплати.`
              : "Передплата вимкнена в налаштуваннях готелю, тому бронювання буде створене одразу зі статусом «Підтверджено»."}
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{error}</div>
        </div>
      )}

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={() => setStep(2)}>
          Назад
        </Button>
        <Button type="submit" disabled={!canSubmit || isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Створюємо…
            </>
          ) : (
            "Створити бронювання"
          )}
        </Button>
      </div>
    </div>
  )
}
