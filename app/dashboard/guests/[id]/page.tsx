import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Mail,
  Phone,
  Globe,
  Building2,
  Crown,
  CalendarDays,
  Wallet,
  BedDouble,
  History as HistoryIcon,
} from "lucide-react"
import { RESERVATION_STATUS_UK } from "@/lib/i18n/uk"

const currencyFmt = new Intl.NumberFormat("uk-UA", {
  style: "currency",
  currency: "UAH",
  maximumFractionDigits: 0,
})

const dateFmt = new Intl.DateTimeFormat("uk-UA", { dateStyle: "medium" })

export default async function GuestProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: guest } = await supabase.from("guests").select("*").eq("id", id).maybeSingle()
  if (!guest) notFound()

  const { data: reservations } = await supabase
    .from("reservations")
    .select(
      `
      id,
      reservation_number,
      status,
      check_in_date,
      check_out_date,
      adults,
      children,
      total_amount,
      paid_amount,
      balance_due,
      created_at,
      reservation_rooms (
        rooms (room_number, room_type:room_types (name))
      )
    `,
    )
    .eq("guest_id", id)
    .order("check_in_date", { ascending: false })

  const all = reservations ?? []
  const completed = all.filter((r) => r.status === "checked_out")
  const staysCount = completed.length
  const totalSpent = completed.reduce((s, r) => s + Number(r.paid_amount ?? 0), 0)
  const lastStayAt = completed[0]?.check_out_date ?? null
  const upcoming = all.filter((r) => ["pending", "confirmed"].includes(r.status))
  const inHouse = all.find((r) => r.status === "checked_in")

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/guests">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              До списку
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">
                {guest.first_name} {guest.last_name}
              </h1>
              {guest.is_vip && (
                <Badge className="gap-1 bg-amber-500 text-white">
                  <Crown className="h-3 w-3" /> VIP
                </Badge>
              )}
              {guest.loyalty_tier && (
                <Badge variant="outline" className="capitalize">
                  {guest.loyalty_tier}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Профіль гостя</p>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Кількість заїздів</CardTitle>
            <BedDouble className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{staysCount}</div>
            <p className="text-xs text-muted-foreground">Завершених бронювань</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Загальна сума</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{currencyFmt.format(totalSpent)}</div>
            <p className="text-xs text-muted-foreground">Сплачено за весь час</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Останнє перебування</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{lastStayAt ? dateFmt.format(new Date(lastStayAt)) : "—"}</div>
            <p className="text-xs text-muted-foreground">Дата виїзду</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contact & details */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-base">Контакти</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {guest.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${guest.email}`} className="text-primary hover:underline">
                  {guest.email}
                </a>
              </div>
            )}
            {guest.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${guest.phone}`} className="hover:underline">
                  {guest.phone}
                </a>
              </div>
            )}
            {(guest.country || guest.city) && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span>
                  {[guest.city, guest.country].filter(Boolean).join(", ")}
                </span>
              </div>
            )}
            {guest.company && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{guest.company}</span>
              </div>
            )}
            <Separator />
            <div className="grid grid-cols-2 gap-2 text-xs">
              {guest.passport_number && (
                <div>
                  <div className="text-muted-foreground">Паспорт</div>
                  <div className="font-medium">{guest.passport_number}</div>
                </div>
              )}
              {guest.nationality && (
                <div>
                  <div className="text-muted-foreground">Громадянство</div>
                  <div className="font-medium">{guest.nationality}</div>
                </div>
              )}
              {guest.date_of_birth && (
                <div>
                  <div className="text-muted-foreground">Дата народження</div>
                  <div className="font-medium">{dateFmt.format(new Date(guest.date_of_birth))}</div>
                </div>
              )}
            </div>
            {guest.preferences && (
              <>
                <Separator />
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Уподобання</div>
                  <p className="text-sm">{guest.preferences}</p>
                </div>
              </>
            )}
            {guest.notes && (
              <>
                <Separator />
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Нотатки</div>
                  <p className="text-sm">{guest.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Reservations history */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <HistoryIcon className="h-4 w-4" /> Історія бронювань ({all.length})
            </CardTitle>
            {inHouse && (
              <Badge className="bg-blue-600 text-white">Зараз у готелі — № {inHouse.reservation_number}</Badge>
            )}
          </CardHeader>
          <CardContent>
            {all.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                У цього гостя ще немає бронювань.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {upcoming.length > 0 && (
                  <>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Майбутні ({upcoming.length})
                    </div>
                    {upcoming.map((r) => (
                      <ReservationRow key={r.id} r={r} />
                    ))}
                    <Separator className="my-2" />
                  </>
                )}
                {completed.length > 0 && (
                  <>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Завершені ({completed.length})
                    </div>
                    {completed.map((r) => (
                      <ReservationRow key={r.id} r={r} />
                    ))}
                  </>
                )}
                {all
                  .filter(
                    (r) =>
                      !["pending", "confirmed", "checked_out"].includes(r.status),
                  )
                  .map((r) => (
                    <ReservationRow key={r.id} r={r} />
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ReservationRow({ r }: { r: any }) {
  const room = r.reservation_rooms?.[0]?.rooms
  const nights = Math.max(
    1,
    Math.ceil(
      (new Date(r.check_out_date).getTime() - new Date(r.check_in_date).getTime()) / (1000 * 60 * 60 * 24),
    ),
  )
  const statusVariant =
    r.status === "checked_out"
      ? "secondary"
      : r.status === "checked_in"
        ? "default"
        : r.status === "cancelled" || r.status === "no_show"
          ? "destructive"
          : "outline"

  return (
    <Link
      href={`/dashboard/reservations/${r.id}`}
      className="flex items-center justify-between gap-4 rounded-md border bg-card p-3 transition-colors hover:bg-accent"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{r.reservation_number}</span>
          <Badge variant={statusVariant as any} className="text-xs">
            {RESERVATION_STATUS_UK[r.status as keyof typeof RESERVATION_STATUS_UK] ?? r.status}
          </Badge>
          {room && (
            <span className="text-xs text-muted-foreground">
              № {room.room_number}
              {room.room_type?.name ? ` · ${room.room_type.name}` : ""}
            </span>
          )}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {dateFmt.format(new Date(r.check_in_date))} — {dateFmt.format(new Date(r.check_out_date))} · {nights} ноч.
        </div>
      </div>
      <div className="text-right">
        <div className="font-semibold">{currencyFmt.format(Number(r.total_amount ?? 0))}</div>
        <div className="text-xs text-muted-foreground">
          сплачено {currencyFmt.format(Number(r.paid_amount ?? 0))}
        </div>
      </div>
    </Link>
  )
}
