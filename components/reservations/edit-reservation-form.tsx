"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, Loader2, AlertCircle, Save, Info } from "lucide-react"
import { format } from "date-fns"
import { uk } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { RESERVATION_STATUS_UK } from "@/lib/i18n/uk"
import { RoomMoveNote } from "@/components/reservations/room-move-note"

interface EditReservationFormProps {
  reservation: any
  roomTypes: Array<{ id: string; name: string; base_rate: number; base_occupancy: number; max_occupancy: number }>
  requiresRescheduleReason?: boolean
}

export function EditReservationForm({ reservation, roomTypes, requiresRescheduleReason = false }: EditReservationFormProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [checkInDate, setCheckInDate] = useState<Date>(new Date(reservation.check_in_date))
  const [checkOutDate, setCheckOutDate] = useState<Date>(new Date(reservation.check_out_date))
  const [adults, setAdults] = useState(String(reservation.adults ?? 1))
  const [children, setChildren] = useState(String(reservation.children ?? 0))
  const [specialRequests, setSpecialRequests] = useState<string>(reservation.special_requests ?? "")
  const [rescheduleReason, setRescheduleReason] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const checkInIso = format(checkInDate, "yyyy-MM-dd")
  const checkOutIso = format(checkOutDate, "yyyy-MM-dd")
  const adultCount = Number(adults)
  const childCount = Number(children)
  const currentRoomTypeId = reservation.reservation_rooms?.[0]?.rooms?.room_type_id
  const currentRoomType = roomTypes.find((type) => type.id === currentRoomTypeId)
  const totalGuests = (Number.isFinite(adultCount) ? adultCount : 0) + (Number.isFinite(childCount) ? childCount : 0)

  const nights = useMemo(() => {
    const ms = checkOutDate.getTime() - checkInDate.getTime()
    return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)))
  }, [checkInDate, checkOutDate])

  const roomRate = reservation.reservation_rooms?.[0]?.rate ?? 0
  const newTotal = roomRate * nights
  const minCheckOutDate = useMemo(() => {
    const date = new Date(checkInDate)
    date.setDate(date.getDate() + 1)
    return date
  }, [checkInDate])
  const initialValues = useMemo(
    () => ({
      check_in_date: String(reservation.check_in_date).slice(0, 10),
      check_out_date: String(reservation.check_out_date).slice(0, 10),
      adults: String(reservation.adults ?? 1),
      children: String(reservation.children ?? 0),
      special_requests: (reservation.special_requests ?? "").trim(),
    }),
    [reservation],
  )
  const currentValues = useMemo(
    () => ({
      check_in_date: checkInIso,
      check_out_date: checkOutIso,
      adults: String(adults).trim(),
      children: String(children).trim(),
      special_requests: specialRequests.trim(),
    }),
    [adults, checkInIso, checkOutIso, children, specialRequests],
  )
  const hasChanges = JSON.stringify(initialValues) !== JSON.stringify(currentValues)
  const validationErrors = useMemo(() => {
    const errors: string[] = []

    if (checkOutDate <= checkInDate) {
      errors.push("Дата виїзду має бути пізніше за дату заїзду.")
    }
    if (!Number.isInteger(adultCount) || adultCount < 1) {
      errors.push("Кількість дорослих має бути мінімум 1.")
    }
    if (!Number.isInteger(childCount) || childCount < 0) {
      errors.push("Кількість дітей не може бути відʼємною.")
    }
    if (currentRoomType && totalGuests > currentRoomType.max_occupancy) {
      errors.push(`Для цього типу номера максимум ${currentRoomType.max_occupancy} гостей.`)
    }
    if (specialRequests.trim().length > 1000) {
      errors.push("Особливі побажання не можуть бути довшими за 1000 символів.")
    }
    if (requiresRescheduleReason && !rescheduleReason.trim()) {
      errors.push("Для перенесення простроченої броні потрібно вказати причину.")
    }

    return errors
  }, [adultCount, checkInDate, checkOutDate, childCount, currentRoomType, requiresRescheduleReason, rescheduleReason, specialRequests, totalGuests])
  const canSave = hasChanges && validationErrors.length === 0 && !saving

  async function handleSave() {
    setError(null)
    if (validationErrors.length > 0) {
      setError(validationErrors[0])
      return
    }
    if (!hasChanges) return

    setSaving(true)
    try {
      const { error: updErr } = await supabase
        .from("reservations")
        .update({
          check_in_date: checkInIso,
          check_out_date: checkOutIso,
          adults: adultCount,
          children: childCount,
          special_requests: specialRequests.trim() || null,
          total_amount: newTotal,
          reschedule_reason: requiresRescheduleReason ? rescheduleReason.trim() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reservation.id)

      if (updErr) throw updErr
      router.push(`/dashboard/reservations/${reservation.id}`)
      router.refresh()
    } catch (e: any) {
      setError(e.message ?? "Не вдалося зберегти зміни")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 flex flex-col gap-6">
        {requiresRescheduleReason && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Період бронювання вже минув. Зміна дат буде записана в аудит як службове перенесення.
            </AlertDescription>
          </Alert>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Дати та гості</CardTitle>
            <p className="text-sm text-muted-foreground">
              Зміна дат перерахує кількість ночей і суму за поточною ставкою номера.
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Дата заїзду</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal bg-transparent")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(checkInDate, "d MMM yyyy", { locale: uk })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={checkInDate}
                    numberOfMonths={1}
                    modifiers={{
                      range_start: checkInDate,
                      range_middle: { after: checkInDate, before: checkOutDate },
                      range_end: checkOutDate,
                    }}
                    disabled={(date) => date >= checkOutDate}
                    onSelect={(d) => {
                      if (!d) return
                      setCheckInDate(d)
                      if (checkOutDate <= d) {
                        const nextCheckOut = new Date(d)
                        nextCheckOut.setDate(nextCheckOut.getDate() + 1)
                        setCheckOutDate(nextCheckOut)
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Дата виїзду</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal bg-transparent")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(checkOutDate, "d MMM yyyy", { locale: uk })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={checkOutDate}
                    numberOfMonths={1}
                    modifiers={{
                      range_start: checkInDate,
                      range_middle: { after: checkInDate, before: checkOutDate },
                      range_end: checkOutDate,
                    }}
                    disabled={(date) => date < minCheckOutDate}
                    onSelect={(d) => d && setCheckOutDate(d)}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Дорослі</Label>
              <Input type="number" min={1} step={1} value={adults} onChange={(e) => setAdults(e.target.value)} aria-invalid={!Number.isInteger(adultCount) || adultCount < 1} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Діти</Label>
              <Input type="number" min={0} step={1} value={children} onChange={(e) => setChildren(e.target.value)} aria-invalid={!Number.isInteger(childCount) || childCount < 0} />
            </div>
            {requiresRescheduleReason && (
              <div className="md:col-span-2 flex flex-col gap-2">
                <Label htmlFor="reschedule-reason">Причина перенесення *</Label>
                <Textarea
                  id="reschedule-reason"
                  value={rescheduleReason}
                  onChange={(event) => setRescheduleReason(event.target.value)}
                  placeholder="Наприклад: гість погодив нові дати прибуття"
                />
              </div>
            )}
            {validationErrors.length > 0 && (
              <div className="md:col-span-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {validationErrors[0]}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Особливі побажання</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={4}
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="Пізній заїзд, дитяче ліжко тощо..."
              maxLength={1000}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {specialRequests.trim().length}/1000 символів
            </p>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSave} disabled={!canSave}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Зберегти зміни
          </Button>
          <Button variant="outline" onClick={() => router.push(`/dashboard/reservations/${reservation.id}`)}>
            Скасувати
          </Button>
        </div>
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Підсумок</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Статус</span>
            <Badge>
              {RESERVATION_STATUS_UK[reservation.status as keyof typeof RESERVATION_STATUS_UK] ?? reservation.status}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Гість</span>
            <span className="font-medium">
              {reservation.guests?.first_name} {reservation.guests?.last_name}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Номер</span>
            <span className="font-medium">{reservation.reservation_rooms?.[0]?.rooms?.room_number ?? "—"}</span>
          </div>
          <RoomMoveNote
            previousRoomNumber={reservation.reservation_rooms?.[0]?.moved_from_room?.room_number}
            currentRoomNumber={reservation.reservation_rooms?.[0]?.rooms?.room_number}
          />
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Тип номера</span>
            <span className="text-right font-medium">
              {currentRoomType?.name ?? reservation.reservation_rooms?.[0]?.rooms?.room_type?.name ?? "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Ночей</span>
            <span className="font-medium">{nights}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Гостей</span>
            <span className="font-medium">
              {totalGuests}
              {currentRoomType ? ` / ${currentRoomType.max_occupancy}` : ""}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Ставка / ніч</span>
            <span className="font-medium">
              {new Intl.NumberFormat("uk-UA", { style: "currency", currency: "UAH", maximumFractionDigits: 0 }).format(
                roomRate,
              )}
            </span>
          </div>
          <div className="border-t pt-3 flex items-center justify-between">
            <span className="text-muted-foreground">Нова сума</span>
            <span className="text-lg font-bold">
              {new Intl.NumberFormat("uk-UA", { style: "currency", currency: "UAH", maximumFractionDigits: 0 }).format(
                newTotal,
              )}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Редагування номера (кімнати) доступне через створення нового бронювання. Тут можна міняти дати, кількість
            гостей та побажання.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
