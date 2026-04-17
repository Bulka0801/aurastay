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
import { CalendarIcon, Loader2, AlertCircle, Save } from "lucide-react"
import { format } from "date-fns"
import { uk } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { RESERVATION_STATUS_UK } from "@/lib/i18n/uk"

interface EditReservationFormProps {
  reservation: any
  roomTypes: Array<{ id: string; name: string; base_rate: number; base_occupancy: number; max_occupancy: number }>
}

export function EditReservationForm({ reservation, roomTypes }: EditReservationFormProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [checkInDate, setCheckInDate] = useState<Date>(new Date(reservation.check_in_date))
  const [checkOutDate, setCheckOutDate] = useState<Date>(new Date(reservation.check_out_date))
  const [adults, setAdults] = useState(String(reservation.adults ?? 1))
  const [children, setChildren] = useState(String(reservation.children ?? 0))
  const [specialRequests, setSpecialRequests] = useState<string>(reservation.special_requests ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nights = useMemo(() => {
    const ms = checkOutDate.getTime() - checkInDate.getTime()
    return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)))
  }, [checkInDate, checkOutDate])

  const roomRate = reservation.reservation_rooms?.[0]?.rate ?? 0
  const newTotal = roomRate * nights

  async function handleSave() {
    setError(null)
    if (checkOutDate <= checkInDate) {
      setError("Дата виїзду має бути пізніше за дату заїзду.")
      return
    }
    setSaving(true)
    try {
      const { error: updErr } = await supabase
        .from("reservations")
        .update({
          check_in_date: format(checkInDate, "yyyy-MM-dd"),
          check_out_date: format(checkOutDate, "yyyy-MM-dd"),
          adults: Number(adults),
          children: Number(children),
          special_requests: specialRequests || null,
          total_amount: newTotal,
          balance_due: newTotal - (reservation.paid_amount ?? 0),
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
        <Card>
          <CardHeader>
            <CardTitle>Дати та гості</CardTitle>
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
                  <Calendar mode="single" selected={checkInDate} onSelect={(d) => d && setCheckInDate(d)} />
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
                  <Calendar mode="single" selected={checkOutDate} onSelect={(d) => d && setCheckOutDate(d)} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Дорослі</Label>
              <Input type="number" min={1} value={adults} onChange={(e) => setAdults(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Діти</Label>
              <Input type="number" min={0} value={children} onChange={(e) => setChildren(e.target.value)} />
            </div>
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
            />
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
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
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Ночей</span>
            <span className="font-medium">{nights}</span>
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
