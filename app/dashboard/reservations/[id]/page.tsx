import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, DollarSign, Mail, Phone, Users } from "lucide-react"

import { formatUAH, formatDate, nightsBetween } from "@/lib/format"
import {
  PAYMENT_METHOD_UK,
  PAYMENT_STATUS_UK,
  RESERVATION_STATUS_UK,
  pluralizeNights,
} from "@/lib/i18n/uk"
import { ReservationActions } from "@/components/reservations/reservation-actions"

export default async function ReservationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: reservation } = await supabase
    .from("reservations")
    .select(
      `
      *,
      guests (*),
      rate_plans (*),
      reservation_rooms (
        *,
        rooms (*, room_types (*))
      ),
      payments (*)
    `,
    )
    .eq("id", id)
    .single()

  if (!reservation) {
    notFound()
  }

  const statusColors: Record<string, string> = {
    confirmed: "bg-blue-100 text-blue-800",
    checked_in: "bg-green-100 text-green-800",
    checked_out: "bg-gray-100 text-gray-800",
    cancelled: "bg-red-100 text-red-800",
    no_show: "bg-orange-100 text-orange-800",
    pending: "bg-yellow-100 text-yellow-800",
  }

  const payments = reservation.payments ?? []
  const totalPaid = payments
    .filter((p: any) => p.payment_status !== "refunded" && p.payment_status !== "failed")
    .reduce((s: number, p: any) => s + Number(p.amount || 0), 0)
  const total = Number(reservation.total_amount || 0)
  const balance = Math.max(0, total - totalPaid)
  const nights = nightsBetween(reservation.check_in_date, reservation.check_out_date)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Бронювання №{reservation.reservation_number}
          </h1>
          <p className="text-muted-foreground">Перегляд та керування бронюванням</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={statusColors[reservation.status] || "bg-gray-100 text-gray-800"}>
            {RESERVATION_STATUS_UK[reservation.status as keyof typeof RESERVATION_STATUS_UK] ?? reservation.status}
          </Badge>
        </div>
      </div>

      <ReservationActions reservation={reservation} />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Інформація про гостя
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Ім&apos;я</p>
              <p className="font-medium">
                {reservation.guests.first_name} {reservation.guests.last_name}
              </p>
            </div>
            {reservation.guests.email && (
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {reservation.guests.email}
                </p>
              </div>
            )}
            {reservation.guests.phone && (
              <div>
                <p className="text-sm text-muted-foreground">Телефон</p>
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {reservation.guests.phone}
                </p>
              </div>
            )}
            {reservation.guests.country && (
              <div>
                <p className="text-sm text-muted-foreground">Країна</p>
                <p>{reservation.guests.country}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Дати та гості
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Заїзд</p>
              <p className="font-medium">{formatDate(reservation.check_in_date)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Виїзд</p>
              <p className="font-medium">{formatDate(reservation.check_out_date)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Тривалість</p>
              <p className="font-medium">{pluralizeNights(nights)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Гостей</p>
              <p className="font-medium">
                {reservation.adults} дорослих
                {reservation.children > 0 ? `, ${reservation.children} дітей` : ""}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Деталі номера</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {reservation.reservation_rooms.length === 0 && (
              <p className="text-sm text-muted-foreground">Номер ще не призначено</p>
            )}
            {reservation.reservation_rooms.map((rr: any) => (
              <div key={rr.id} className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Номер кімнати</p>
                  <p className="font-medium">{rr.rooms?.room_number || "Не призначено"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Тип номера</p>
                  <p className="font-medium">{rr.rooms?.room_types?.name ?? "—"}</p>
                </div>
                {reservation.rate_plans?.name && (
                  <div>
                    <p className="text-sm text-muted-foreground">Тариф</p>
                    <p className="font-medium">{reservation.rate_plans.name}</p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Фінанси
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Повна сума</p>
              <p className="text-2xl font-bold">{formatUAH(total)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Сплачено</p>
              <p className="font-medium text-emerald-600">{formatUAH(totalPaid)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Залишок</p>
              <p className={`font-medium ${balance > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                {formatUAH(balance)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Історія платежів</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {payments
                .sort(
                  (a: any, b: any) =>
                    new Date(b.payment_date ?? b.created_at).getTime() -
                    new Date(a.payment_date ?? a.created_at).getTime(),
                )
                .map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-semibold">{formatUAH(Number(p.amount))}</p>
                      <p className="text-xs text-muted-foreground">
                        {PAYMENT_METHOD_UK[p.payment_method as keyof typeof PAYMENT_METHOD_UK] ?? p.payment_method}
                        {" · "}
                        {formatDate(p.payment_date ?? p.created_at)}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {PAYMENT_STATUS_UK[p.payment_status as keyof typeof PAYMENT_STATUS_UK] ?? p.payment_status}
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {reservation.special_requests && (
        <Card>
          <CardHeader>
            <CardTitle>Особливі побажання</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line">{reservation.special_requests}</p>
          </CardContent>
        </Card>
      )}

      {reservation.cancellation_reason && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive">Причина скасування</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{reservation.cancellation_reason}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
