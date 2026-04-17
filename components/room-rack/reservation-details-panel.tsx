"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PAYMENT_STATUS_UK, RESERVATION_STATUS_UK, pluralizeGuests, pluralizeNights } from "@/lib/i18n/uk"
import type { RackBlock, RackRoom } from "@/lib/room-rack/types"
import {
  Calendar,
  CheckCircle2,
  Clock,
  Crown,
  DoorOpen,
  ExternalLink,
  LogIn,
  LogOut,
  Mail,
  Phone,
  Receipt,
  Users,
  X,
} from "lucide-react"
import Link from "next/link"
import { STATUS_BG, STATUS_BORDER } from "./reservation-block"
import { cn } from "@/lib/utils"
import { formatFullDate, parseISO } from "@/lib/room-rack/date-utils"

interface Props {
  block: RackBlock
  room: RackRoom | null
  onClose: () => void
}

export function ReservationDetailsPanel({ block, room, onClose }: Props) {
  const guestName = `${block.guest.first_name} ${block.guest.last_name}`.trim()
  return (
    <aside className="flex w-full shrink-0 flex-col border-l bg-card md:w-96">
      <header className="flex items-start justify-between gap-3 border-b p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {block.guest.is_vip && <Crown className="h-4 w-4 shrink-0 text-amber-500" />}
            <h2 className="truncate text-lg font-semibold">{guestName || "—"}</h2>
          </div>
          <p className="text-xs text-muted-foreground">№ {block.reservation_number}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label="Закрити">
          <X className="h-4 w-4" />
        </Button>
      </header>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className={cn("font-medium", STATUS_BG[block.status], STATUS_BORDER[block.status])}
            >
              {RESERVATION_STATUS_UK[block.status]}
            </Badge>
            <Badge variant="outline">Оплата: {PAYMENT_STATUS_UK[block.payment_status]}</Badge>
          </div>

          <Section title="Номер">
            <div className="flex items-start gap-2 text-sm">
              <DoorOpen className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">{room?.room_number ?? "Не призначено"}</div>
                <div className="text-xs text-muted-foreground">
                  {room?.room_type_name} {room?.floor != null && `· пов. ${room.floor}`}
                </div>
              </div>
            </div>
          </Section>

          <Section title="Період проживання">
            <div className="space-y-2 text-sm">
              <Row icon={<LogIn className="h-4 w-4" />} label="Заїзд">
                {formatFullDate(parseISO(block.check_in))}
              </Row>
              <Row icon={<LogOut className="h-4 w-4" />} label="Виїзд">
                {formatFullDate(parseISO(block.check_out))}
              </Row>
              <Row icon={<Clock className="h-4 w-4" />} label="Тривалість">
                {pluralizeNights(block.nights)}
              </Row>
              <Row icon={<Users className="h-4 w-4" />} label="Гостей">
                {pluralizeGuests(block.adults + block.children)}
                {block.children > 0 && (
                  <span className="text-muted-foreground"> ({block.adults} дор., {block.children} діт.)</span>
                )}
              </Row>
            </div>
          </Section>

          <Section title="Контакти гостя">
            <div className="space-y-2 text-sm">
              {block.guest.email && (
                <Row icon={<Mail className="h-4 w-4" />} label="Email">
                  <a href={`mailto:${block.guest.email}`} className="hover:underline">
                    {block.guest.email}
                  </a>
                </Row>
              )}
              {block.guest.phone && (
                <Row icon={<Phone className="h-4 w-4" />} label="Телефон">
                  <a href={`tel:${block.guest.phone}`} className="hover:underline">
                    {block.guest.phone}
                  </a>
                </Row>
              )}
              {!block.guest.email && !block.guest.phone && (
                <p className="text-xs text-muted-foreground">Контактних даних немає</p>
              )}
            </div>
          </Section>

          <Section title="Фінанси">
            <div className="space-y-2 rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Разом</span>
                <span className="font-semibold tabular-nums">{fmtMoney(block.total_amount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Сплачено</span>
                <span className="tabular-nums text-emerald-600">{fmtMoney(block.paid_amount)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="font-medium">Залишок</span>
                <span
                  className={cn(
                    "text-base font-semibold tabular-nums",
                    block.balance > 0.01 ? "text-rose-600" : "text-emerald-600",
                  )}
                >
                  {fmtMoney(block.balance)}
                </span>
              </div>
              {block.balance <= 0.01 && (
                <div className="flex items-center gap-1 text-xs text-emerald-600">
                  <CheckCircle2 className="h-3 w-3" /> Повністю оплачено
                </div>
              )}
            </div>
          </Section>

          {block.special_requests && (
            <Section title="Особливі побажання">
              <p className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">{block.special_requests}</p>
            </Section>
          )}
        </div>
      </ScrollArea>

      <footer className="grid gap-2 border-t p-4">
        {block.status === "confirmed" && (
          <Button asChild size="sm">
            <Link href={`/dashboard/front-desk/check-in/${block.reservation_id}`}>
              <LogIn className="mr-2 h-4 w-4" />
              Заселити
            </Link>
          </Button>
        )}
        {block.status === "checked_in" && (
          <Button asChild size="sm">
            <Link href={`/dashboard/front-desk/check-out/${block.reservation_id}`}>
              <LogOut className="mr-2 h-4 w-4" />
              Виселити
            </Link>
          </Button>
        )}
        {block.balance > 0.01 && (
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/dashboard/reservations/${block.reservation_id}`}>
              <Receipt className="mr-2 h-4 w-4" />
              Додати оплату
            </Link>
          </Button>
        )}
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/reservations/${block.reservation_id}`}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Відкрити картку бронювання
          </Link>
        </Button>
      </footer>
    </aside>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Calendar className="h-3 w-3" />
        {title}
      </h3>
      {children}
    </div>
  )
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  )
}

function fmtMoney(v: number): string {
  return new Intl.NumberFormat("uk-UA", { style: "currency", currency: "UAH", maximumFractionDigits: 0 }).format(v)
}
