"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { uk } from "date-fns/locale"
import { CalendarIcon, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface RoomType {
  id: string
  name: string
  code: string
  base_rate: number
  base_occupancy: number
  max_occupancy: number
}

interface RatePlan {
  id: string
  name: string
  code: string
  discount_percentage: number
}

interface NewReservationFormProps {
  roomTypes: RoomType[]
  ratePlans: RatePlan[]
}

export function NewReservationForm({ roomTypes, ratePlans }: NewReservationFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(1)

  // Крок 1: Дати та гості
  const [checkInDate, setCheckInDate] = useState<Date>()
  const [checkOutDate, setCheckOutDate] = useState<Date>()
  const [adults, setAdults] = useState("2")
  const [children, setChildren] = useState("0")

  // Крок 2: Вибір типу номера і тарифу
  const [selectedRoomType, setSelectedRoomType] = useState("")
  const [selectedRatePlan, setSelectedRatePlan] = useState("")

  // Крок 3: Дані гостя
  const [guestData, setGuestData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "",
    passport: "",
    specialRequests: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Перевірити авторизацію
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Користувач не авторизований")

      // Створити гостя
      const { data: guest, error: guestError } = await supabase
        .from("guests")
        .insert({
          first_name: guestData.firstName,
          last_name: guestData.lastName,
          email: guestData.email,
          phone: guestData.phone,
          country: guestData.country,
          passport_number: guestData.passport,
        })
        .select()
        .single()

      if (guestError) throw guestError

      // Розрахувати суму
      const roomType = roomTypes.find((rt) => rt.id === selectedRoomType)
      const ratePlan = ratePlans.find((rp) => rp.id === selectedRatePlan)
      if (!roomType || !ratePlan || !checkInDate || !checkOutDate) {
        throw new Error("Не заповнені обов’язкові поля")
      }

      const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
      const baseAmount = roomType.base_rate * nights
      const discount = (baseAmount * ratePlan.discount_percentage) / 100
      const totalAmount = baseAmount - discount

      // Згенерувати номер бронювання
      const reservationNumber = `RES${Date.now().toString().slice(-8)}`

      // Створити бронювання
      const { data: reservation, error: reservationError } = await supabase
        .from("reservations")
        .insert({
          reservation_number: reservationNumber,
          guest_id: guest.id,
          check_in_date: format(checkInDate, "yyyy-MM-dd"),
          check_out_date: format(checkOutDate, "yyyy-MM-dd"),
          adults: Number.parseInt(adults),
          children: Number.parseInt(children),
          status: "confirmed",
          rate_plan_id: selectedRatePlan,
          total_amount: totalAmount,
          special_requests: guestData.specialRequests,
          channel: "Direct",
        })
        .select()
        .single()

      if (reservationError) throw reservationError

      // Знайти доступний номер
      const { data: availableRooms } = await supabase
        .from("rooms")
        .select("*")
        .eq("room_type_id", selectedRoomType)
        .eq("status", "available")
        .limit(1)

      if (availableRooms && availableRooms.length > 0) {
        // Створити зв’язок бронювання ↔ номер
        await supabase.from("reservation_rooms").insert({
          reservation_id: reservation.id,
          room_id: availableRooms[0].id,
          room_type_id: selectedRoomType,
          rate: roomType.base_rate,
        })
      }

      router.push(`/dashboard/reservations/${reservation.id}`)
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Сталася помилка")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Крок 1: Дати та гості</h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Дата заїзду *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !checkInDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {checkInDate ? format(checkInDate, "PPP", { locale: uk }) : <span>Оберіть дату</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={checkInDate}
                    onSelect={setCheckInDate}
                    locale={uk}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Дата виїзду *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !checkOutDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {checkOutDate ? format(checkOutDate, "PPP", { locale: uk }) : <span>Оберіть дату</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={checkOutDate}
                    onSelect={setCheckOutDate}
                    locale={uk}
                    initialFocus
                    disabled={(date) => !checkInDate || date <= checkInDate}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="adults">Дорослі *</Label>
              <Input
                id="adults"
                type="number"
                min="1"
                value={adults}
                onChange={(e) => setAdults(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="children">Діти</Label>
              <Input
                id="children"
                type="number"
                min="0"
                value={children}
                onChange={(e) => setChildren(e.target.value)}
              />
            </div>
          </div>

          <Button type="button" onClick={() => setStep(2)} disabled={!checkInDate || !checkOutDate}>
            Далі: Вибір номера
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Крок 2: Номер і тариф</h3>

          <div className="space-y-2">
            <Label>Тип номера *</Label>
            <Select value={selectedRoomType} onValueChange={setSelectedRoomType}>
              <SelectTrigger>
                <SelectValue placeholder="Оберіть тип номера" />
              </SelectTrigger>
              <SelectContent>
                {roomTypes.map((rt) => (
                  <SelectItem key={rt.id} value={rt.id}>
                    {rt.name} — ${rt.base_rate}/ніч (до {rt.max_occupancy} гостей)
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
                    {rp.name} (знижка {rp.discount_percentage}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {checkInDate && checkOutDate && selectedRoomType && selectedRatePlan && (
            <div className="rounded-lg border bg-slate-50 p-4">
              <h4 className="mb-2 font-semibold">Розрахунок вартості</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Ночей:</span>
                  <span>{Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Базова вартість:</span>
                  <span>
                    $
                    {(
                      roomTypes.find((rt) => rt.id === selectedRoomType)!.base_rate *
                      Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
                    ).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Знижка:</span>
                  <span className="text-green-600">
                    -{ratePlans.find((rp) => rp.id === selectedRatePlan)!.discount_percentage}%
                  </span>
                </div>
                <div className="flex justify-between border-t pt-1 font-bold">
                  <span>Разом:</span>
                  <span>
                    $
                    {(
                      roomTypes.find((rt) => rt.id === selectedRoomType)!.base_rate *
                      Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)) *
                      (1 - ratePlans.find((rp) => rp.id === selectedRatePlan)!.discount_percentage / 100)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Назад
            </Button>
            <Button type="button" onClick={() => setStep(3)} disabled={!selectedRoomType || !selectedRatePlan}>
              Далі: Дані гостя
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Крок 3: Дані гостя</h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Ім&apos;я *</Label>
              <Input
                id="firstName"
                value={guestData.firstName}
                onChange={(e) => setGuestData({ ...guestData, firstName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Прізвище *</Label>
              <Input
                id="lastName"
                value={guestData.lastName}
                onChange={(e) => setGuestData({ ...guestData, lastName: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Ел. пошта *</Label>
              <Input
                id="email"
                type="email"
                value={guestData.email}
                onChange={(e) => setGuestData({ ...guestData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Телефон *</Label>
              <Input
                id="phone"
                value={guestData.phone}
                onChange={(e) => setGuestData({ ...guestData, phone: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="country">Країна</Label>
              <Input
                id="country"
                value={guestData.country}
                onChange={(e) => setGuestData({ ...guestData, country: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="passport">Паспорт / ID</Label>
              <Input
                id="passport"
                value={guestData.passport}
                onChange={(e) => setGuestData({ ...guestData, passport: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialRequests">Побажання</Label>
            <Textarea
              id="specialRequests"
              value={guestData.specialRequests}
              onChange={(e) => setGuestData({ ...guestData, specialRequests: e.target.value })}
              placeholder="Побажання або вподобання гостя..."
              rows={3}
            />
          </div>

          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</div>}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(2)}>
              Назад
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Створення...
                </>
              ) : (
                "Створити бронювання"
              )}
            </Button>
          </div>
        </div>
      )}
    </form>
  )
}
