"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { format } from "date-fns"
import { uk } from "date-fns/locale"
import { AlertCircle, Baby, Loader2, Pencil, UserRound, Users } from "lucide-react"
import { formatMoney } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  getRoomStateAvailabilityReason,
  isRoomStateReadyForCheckIn,
} from "@/lib/rooms/availability"
import { useNewReservationForm } from "../form-context"
import { PricingSummary } from "../ui/pricing-summary"

export function StepRoomRate() {
  const {
    hotelSettings,
    roomTypes,
    ratePlans,
    initialReservationContext,
    checkInDate,
    checkOutDate,
    checkInIso,
    checkOutIso,
    adults,
    setAdults,
    children,
    setChildren,
    effectiveRoomTypeId,
    setSelectedRoomType,
    selectedRatePlan,
    setSelectedRatePlan,
    selectedRoomId,
    setSelectedRoomId,
    hasGuestCount,
    totalGuests,
    capacityExceeded,
    roomType,
    ratePlan,
    isLoadingRooms,
    availableRooms,
    availabilityResult,
    setStep,
    canGoToStep3,
  } = useNewReservationForm()

  const maxOccupancy = roomType?.max_occupancy ?? 6
  const adultCount = Math.max(1, Number.parseInt(adults || "1", 10) || 1)
  const childCount = Math.max(0, Number.parseInt(children || "0", 10) || 0)
  const maxChildren = Math.max(0, maxOccupancy - adultCount)

  const updateAdults = (nextValue: number) => {
    const nextAdults = Math.min(Math.max(nextValue, 1), maxOccupancy)
    const nextChildren = Math.min(childCount, Math.max(0, maxOccupancy - nextAdults))
    setAdults(String(nextAdults))
    setChildren(String(nextChildren))
  }

  const updateChildren = (nextValue: number) => {
    setChildren(String(Math.min(Math.max(nextValue, 0), maxChildren)))
  }

  const guestCountHint = hasGuestCount
    ? null
    : "Щоб продовжити, поверніться на попередній крок і вкажіть кількість гостей."

  return (
    <div className="space-y-4">
      {initialReservationContext && (
        <div className="space-y-4 rounded-lg border border-amber-200 bg-amber-50/70 p-4 text-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  З шахматки
                </Badge>
                <span className="font-medium text-amber-950">
                  № {initialReservationContext.roomNumber} ·{" "}
                  {checkInDate ? format(checkInDate, "d MMM yyyy", { locale: uk }) : ""} →{" "}
                  {checkOutDate ? format(checkOutDate, "d MMM yyyy", { locale: uk }) : ""}
                </span>
              </div>
              <div className="flex items-start gap-2 text-amber-900">
                <Users className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Перевірте кількість гостей перед вибором тарифу. Room-rack підставляє період і номер, але кількість
                  гостей потрібно підтвердити або змінити вручну.
                </p>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setStep(1)} className="shrink-0 bg-white">
              <Pencil className="mr-2 h-4 w-4" />
              Змінити дати та гостей
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <Label htmlFor="step2-adults" className="flex items-center gap-2 text-sm">
                  <UserRound className="h-4 w-4 text-muted-foreground" />
                  Дорослі
                </Label>
                <span className="text-xs text-muted-foreground">мін. 1</span>
              </div>
              <div className="grid grid-cols-[2.5rem_1fr_2.5rem] gap-2">
                <Button type="button" variant="outline" size="icon" onClick={() => updateAdults(adultCount - 1)} aria-label="Зменшити кількість дорослих">
                  -
                </Button>
                <Input
                  id="step2-adults"
                  type="number"
                  min={1}
                  max={maxOccupancy}
                  value={adults}
                  onChange={(event) => updateAdults(Number.parseInt(event.target.value || "1", 10))}
                  className="text-center"
                />
                <Button type="button" variant="outline" size="icon" onClick={() => updateAdults(adultCount + 1)} aria-label="Збільшити кількість дорослих">
                  +
                </Button>
              </div>
            </div>

            <div className="rounded-lg border bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <Label htmlFor="step2-children" className="flex items-center gap-2 text-sm">
                  <Baby className="h-4 w-4 text-muted-foreground" />
                  Діти
                </Label>
                <span className="text-xs text-muted-foreground">макс. {maxChildren}</span>
              </div>
              <div className="grid grid-cols-[2.5rem_1fr_2.5rem] gap-2">
                <Button type="button" variant="outline" size="icon" onClick={() => updateChildren(childCount - 1)} aria-label="Зменшити кількість дітей">
                  -
                </Button>
                <Input
                  id="step2-children"
                  type="number"
                  min={0}
                  max={maxChildren}
                  value={children}
                  onChange={(event) => updateChildren(Number.parseInt(event.target.value || "0", 10))}
                  className="text-center"
                />
                <Button type="button" variant="outline" size="icon" onClick={() => updateChildren(childCount + 1)} aria-label="Збільшити кількість дітей">
                  +
                </Button>
              </div>
            </div>
          </div>

          <p className="text-xs text-amber-900">
            Поточна кількість: <span className="font-semibold">{totalGuests} гост.</span>
            {roomType ? ` · місткість вибраного типу: до ${roomType.max_occupancy}` : ""}
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Тип номера *</Label>
          <Select
            value={effectiveRoomTypeId}
            onValueChange={(v) => {
              setSelectedRoomType(v)
              setSelectedRoomId("")
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Оберіть тип номера" />
            </SelectTrigger>
            <SelectContent>
              {roomTypes.map((rt) => (
                <SelectItem key={rt.id} value={rt.id}>
                  {rt.name} — {formatMoney(rt.base_rate, hotelSettings, { maximumFractionDigits: 0 })}/ніч · до {rt.max_occupancy} гостей
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Тарифний план *</Label>
          <Select value={selectedRatePlan} onValueChange={setSelectedRatePlan}>
            <SelectTrigger>
              <SelectValue placeholder="Оберіть тариф" />
            </SelectTrigger>
            <SelectContent>
              {ratePlans.map((rp) => (
                <SelectItem key={rp.id} value={rp.id}>
                  {rp.name} {rp.discount_percentage > 0 ? `(знижка ${rp.discount_percentage}%)` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!hasGuestCount && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Щоб продовжити, поверніться на попередній крок і оберіть кількість гостей. Поки гостей не вказано,
          перехід далі недоступний.
        </div>
      )}

      {hasGuestCount && initialReservationContext && !selectedRoomId && availabilityResult && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Обраний у шахматці номер більше не доступний на ці дати. Будь ласка, оберіть інший вільний номер нижче.
        </div>
      )}

      {capacityExceeded && roomType && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            Кількість гостей ({totalGuests}) перевищує місткість номера «{roomType.name}» (макс.{" "}
            {roomType.max_occupancy}). Оберіть інший тип або змініть кількість гостей.
          </div>
        </div>
      )}

      {/* Room picker */}
      {effectiveRoomTypeId && (
        <div className="space-y-2">
          <Label>Конкретний номер *</Label>
          <p className="text-xs text-muted-foreground">
            Система показує лише номери, вільні на період {checkInIso} — {checkOutIso}
          </p>
          <div className="rounded-lg border bg-card">
            {isLoadingRooms ? (
              <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Перевіряємо доступність…
              </div>
            ) : !availableRooms || availableRooms.length === 0 ? (
              <div className="flex items-start gap-2 p-4 text-sm text-muted-foreground">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground">Немає доступних номерів цього типу на вибрані дати.</p>
                  {availabilityResult?.totalRoomsOfType === 0 ? (
                    <p>Для цього типу номера немає активних номерів у довіднику.</p>
                  ) : availabilityResult?.sellableRoomsOfType === 0 ? (
                    <p>Є номери цього типу, але вони в ремонті, заблоковані або не в експлуатації.</p>
                  ) : availabilityResult?.blockedByActiveReservation ? (
                    <p>
                      {availabilityResult.blockedByActiveReservation} номер(и) цього типу вже мають перетин з
                      активними бронюваннями. Скасовані, no-show і виселені бронювання не блокують доступність.
                    </p>
                  ) : availabilityResult?.blockedByRoomBlock ? (
                    <p>
                      {availabilityResult.blockedByRoomBlock} номер(и) цього типу заблоковано адміністративно або
                      технічно на вибраний період.
                    </p>
                  ) : (
                    <p>Спробуйте інші дати або інший тип номера.</p>
                  )}
                </div>
              </div>
            ) : (
              <RadioGroup
                value={selectedRoomId}
                onValueChange={setSelectedRoomId}
                className="grid gap-2 p-3 sm:grid-cols-2 md:grid-cols-3"
              >
                {availableRooms.map((room) => (
                  <Label
                    key={room.id}
                    htmlFor={`room-${room.id}`}
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-2 rounded-md border bg-background p-3 text-sm transition-colors",
                      selectedRoomId === room.id
                        ? "border-primary ring-2 ring-primary/20"
                        : "hover:border-primary/40",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem id={`room-${room.id}`} value={room.id} />
                      <div>
                        <div className="font-medium text-foreground">№ {room.room_number}</div>
                        <div className="text-xs text-muted-foreground">
                          Поверх {room.floor} · {getRoomStateAvailabilityReason(room)}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {isRoomStateReadyForCheckIn(room) ? "Готовий" : "Можна бронювати"}
                    </Badge>
                  </Label>
                ))}
              </RadioGroup>
            )}
          </div>
        </div>
      )}

      {/* Price summary */}
      <PricingSummary />

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={() => setStep(1)}>
          Назад
        </Button>
        <Button type="button" onClick={() => setStep(3)} disabled={!canGoToStep3}>
          Далі: гість
        </Button>
      </div>
      {!hasGuestCount && guestCountHint && (
        <p className="text-sm text-amber-700">{guestCountHint}</p>
      )}
    </div>
  )
}
