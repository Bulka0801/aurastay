import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BedDouble,
  Calendar,
  DollarSign,
  Mail,
  Phone,
  ReceiptText,
  Users,
} from "lucide-react";

import { formatMoney, formatDate, formatDateTime, nightsBetween } from "@/lib/format";
import { normalizeHotelSettings } from "@/lib/hotel-settings";
import { paymentFinancialSummary } from "@/lib/rules/payments";
import {
  PAYMENT_METHOD_UK,
  PAYMENT_STATUS_UK,
  pluralizeNights,
} from "@/lib/i18n/uk";
import { ReservationActions } from "@/components/reservations/reservation-actions";
import { ReservationStatusTimeline } from "@/components/reservations/reservation-status-timeline";
import { RoomMoveNote } from "@/components/reservations/room-move-note";
import { FolioActions } from "@/components/reservations/folio-actions";
import type { UserRole } from "@/lib/types";

function dateKeyFromTimestamp(value?: string | null) {
  return value ? String(value).slice(0, 10) : null;
}

export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: reservation } = await supabase
    .from("reservations")
    .select(
      `
      *,
      guests (*),
      rate_plans (*),
      reservation_rooms (
        *,
        rooms!reservation_rooms_room_id_fkey (*, room_types (*)),
        moved_from_room:rooms!reservation_rooms_moved_from_room_id_fkey (id, room_number)
      ),
      payments (*),
      folios (
        *,
        folio_charges (*)
      )
    `
    )
    .eq("id", id)
    .single();

  if (!reservation) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: currentProfile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };

  const { data: hotelSettingsRow } = await supabase
    .from("hotel_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  const hotelSettings = normalizeHotelSettings(hotelSettingsRow);
  const money = (amount: number | string | null | undefined) => formatMoney(amount, hotelSettings);

  const payments = reservation.payments ?? [];
  const paymentSummary = paymentFinancialSummary(payments);
  const totalPaid = paymentSummary.netPaid;
  const total = Number(reservation.total_amount || 0);
  const folio = reservation.folios?.[0] ?? null;
  const charges = folio?.folio_charges ?? [];
  const confirmedCharges = charges
    .filter((charge: any) => (charge.charge_status ?? "confirmed") === "confirmed")
    .reduce((sum: number, charge: any) => sum + Number(charge.amount || 0) * Number(charge.quantity || 1), 0);
  const effectiveCharges = confirmedCharges > 0 ? confirmedCharges : total;
  const balance = Number(folio?.balance ?? effectiveCharges - totalPaid);
  const pendingRefundAmount = paymentSummary.pendingRefunds;
  const financialState =
    balance > 0.01
      ? paymentSummary.paidPayments > 0
        ? "Частково оплачено"
        : "Очікує оплату"
      : balance < -0.01
        ? pendingRefundAmount > 0.01
          ? "Очікує повернення"
          : "Переплата"
        : paymentSummary.pendingPayments > 0.01 || pendingRefundAmount > 0.01
          ? "Очікується операція"
          : "Збалансований";
  const nights = nightsBetween(
    reservation.check_in_date,
    reservation.check_out_date
  );
  const actualCheckOutDate = dateKeyFromTimestamp(
    reservation.reservation_rooms?.find((rr: any) => rr.actual_check_out)?.actual_check_out
  );
  const billableNights =
    reservation.status === "checked_out" && actualCheckOutDate
      ? Math.max(1, nightsBetween(reservation.check_in_date, actualCheckOutDate))
      : nights;
  const hasAdjustedStay = billableNights !== nights;
  const roomPriceLines = (reservation.reservation_rooms ?? []).map((rr: any) => {
    const nightlyRate = Number(rr.rate || 0);
    const grossTotal = nightlyRate * billableNights;
    const discountPercentage = Number(
      reservation.rate_plans?.discount_percentage || 0
    );
    const discountAmount = grossTotal * (discountPercentage / 100);
    const calculatedTotal = grossTotal - discountAmount;

    return {
      id: rr.id,
      roomNumber: rr.rooms?.room_number ?? "Не призначено",
      roomType: rr.rooms?.room_types?.name ?? "—",
      nightlyRate,
      grossTotal,
      discountPercentage,
      discountAmount,
      calculatedTotal,
    };
  });
  const calculatedAccommodationTotal = roomPriceLines.reduce(
    (sum: number, line: { calculatedTotal: number }) => sum + line.calculatedTotal,
    0
  );
  const fallbackNightlyRate =
    roomPriceLines.length === 0 && billableNights > 0 ? total / billableNights : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Бронювання №{reservation.reservation_number}
          </h1>
          <p className="text-muted-foreground">
            Перегляд та керування бронюванням
          </p>
        </div>
      </div>

      <ReservationStatusTimeline status={reservation.status} />

      <ReservationActions
        reservation={reservation}
        hotelSettings={hotelSettings}
        currentUserRole={(currentProfile?.role as UserRole | undefined) ?? null}
        folioIsClosed={Boolean(folio?.is_closed)}
      />

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
              <p className="font-medium">
                {formatDate(reservation.check_in_date)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Виїзд</p>
              <p className="font-medium">
                {formatDate(reservation.check_out_date)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Тривалість</p>
              <p className="font-medium">{pluralizeNights(nights)}</p>
            </div>
            {hasAdjustedStay && (
              <div>
                <p className="text-sm text-muted-foreground">Нараховано</p>
                <p className="font-medium">{pluralizeNights(billableNights)}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Гостей</p>
              <p className="font-medium">
                {reservation.adults} дорослих
                {reservation.children > 0
                  ? `, ${reservation.children} дітей`
                  : ""}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BedDouble className="h-5 w-5" />
              Деталі номера
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {reservation.reservation_rooms.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Номер ще не призначено
              </p>
            )}
            {reservation.reservation_rooms.map((rr: any) => (
              <div key={rr.id} className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Номер кімнати</p>
                  <p className="font-medium">
                    {rr.rooms?.room_number || "Не призначено"}
                  </p>
                </div>
                <RoomMoveNote
                  previousRoomNumber={rr.moved_from_room?.room_number}
                  currentRoomNumber={rr.rooms?.room_number}
                />
                <div>
                  <p className="text-sm text-muted-foreground">Тип номера</p>
                  <p className="font-medium">
                    {rr.rooms?.room_types?.name ?? "—"}
                  </p>
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
            {roomPriceLines.length > 0 ? (
              <div className="overflow-hidden rounded-lg border bg-background">
                <div className="border-b px-4 py-3">
                  <p className="text-sm font-semibold">
                    {hasAdjustedStay ? "Розрахунок фактичного проживання" : "Розрахунок проживання"}
                  </p>
                  {reservation.rate_plans?.name && (
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span>{reservation.rate_plans.name}</span>
                      <span aria-hidden="true">·</span>
                      <span>знижка {Number(reservation.rate_plans.discount_percentage || 0)}%</span>
                    </div>
                  )}
                </div>
                <div className="divide-y">
                  {roomPriceLines.map((line: any) => (
                    <div key={line.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium">
                            № {line.roomNumber} — {line.roomType}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {money(line.nightlyRate)} за ніч · {pluralizeNights(billableNights)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">До знижки</p>
                          <p className="font-semibold tabular-nums">{money(line.grossTotal)}</p>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex items-center justify-between gap-3 text-muted-foreground">
                          <span>Ставка за ніч</span>
                          <span className="tabular-nums">{money(line.nightlyRate)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-muted-foreground">
                          <span>Кількість ночей</span>
                          <span className="tabular-nums">{billableNights}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Підсумок до знижки</span>
                          <span className="font-medium tabular-nums">{money(line.grossTotal)}</span>
                        </div>
                        {line.discountAmount > 0.01 && (
                          <div className="flex items-center justify-between gap-3 text-emerald-700">
                            <span>Знижка {line.discountPercentage}%</span>
                            <span className="font-medium tabular-nums">−{money(line.discountAmount)}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3 rounded-md bg-muted/50 px-3 py-2">
                        <span className="text-sm font-medium">Разом за проживання</span>
                        <span className="text-lg font-bold tabular-nums">{money(line.calculatedTotal)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-sm text-muted-foreground">Орієнтовно за 1 ніч</p>
                <p className="mt-1 font-medium">{money(fallbackNightlyRate)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {money(fallbackNightlyRate)} × {pluralizeNights(billableNights)} = {money(total)}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Повна сума</p>
              <p className="text-2xl font-bold">{money(total)}</p>
            </div>
            {roomPriceLines.length > 0 && Math.abs(calculatedAccommodationTotal - total) > 0.01 && (
              <div>
                <p className="text-sm text-muted-foreground">Сума за формулою</p>
                <p className="font-medium">{money(calculatedAccommodationTotal)}</p>
                <p className="text-xs text-muted-foreground">
                  Повна сума може відрізнятися через знижки, ручні коригування або додаткові нарахування.
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Сплачено</p>
              <p className="font-medium text-emerald-600">
                {money(totalPaid)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Залишок</p>
              <p
                className={`font-medium ${
                  balance > 0.01 ? "text-amber-600" : balance < -0.01 ? "text-rose-600" : "text-emerald-600"
                }`}
              >
                {balance < -0.01 ? `Переплата ${money(Math.abs(balance))}` : money(balance)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Стан folio</p>
              <p className="font-medium">{financialState}</p>
            </div>
            {pendingRefundAmount > 0.01 && (
              <div>
                <p className="text-sm text-muted-foreground">Очікує повернення</p>
                <p className="font-medium text-amber-700">{money(pendingRefundAmount)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {folio && (
        <Card id="folio">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5" />
              Folio №{folio.folio_number}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Нарахування</p>
                <p className="font-semibold">{money(effectiveCharges)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Підтверджені оплати</p>
                <p className="font-semibold text-emerald-700">{money(paymentSummary.paidPayments)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Виконані повернення</p>
                <p className="font-semibold text-rose-700">{money(paymentSummary.completedRefunds)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Життєвий цикл</p>
                <p className="font-semibold">{folio.is_closed ? "Закритий" : "Відкритий"}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Нарахування folio</p>
              {charges.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Нарахування проживання буде створено міграцією фінансової моделі.
                </p>
              ) : (
                <div className="divide-y rounded-lg border">
                  {charges
                    .slice()
                    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((charge: any) => (
                      <div key={charge.id} className="flex items-start justify-between gap-4 p-3">
                        <div>
                          <p className={charge.charge_status === "voided" ? "text-muted-foreground line-through" : "font-medium"}>
                            {charge.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {charge.category ?? charge.charge_type ?? "Нарахування"} · {formatDate(charge.charge_date)}
                            {charge.charge_status === "voided" ? " · Анульовано" : ""}
                          </p>
                          {charge.void_reason && (
                            <p className="text-xs text-muted-foreground">{charge.void_reason}</p>
                          )}
                        </div>
                        <p className="font-semibold tabular-nums">
                          {money(Number(charge.amount || 0) * Number(charge.quantity || 1))}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <FolioActions
              reservationId={reservation.id}
              reservationStatus={reservation.status}
              reservationTotal={total}
              payments={payments}
              folio={{
                id: folio.id,
                balance,
                is_closed: folio.is_closed,
                pending_refund_amount: pendingRefundAmount,
              }}
              currentUserRole={(currentProfile?.role as UserRole | undefined) ?? null}
              hotelSettings={hotelSettings}
              financialResolutionRecorded={charges.some(
                (charge: any) =>
                  ["no_show_fee", "cancellation_fee"].includes(charge.category) &&
                  (charge.charge_status ?? "confirmed") === "confirmed"
              )}
            />
          </CardContent>
        </Card>
      )}

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
                    new Date(a.payment_date ?? a.created_at).getTime()
                )
                .map((p: any) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-semibold">
                        {(p.transaction_type === "refund" || p.payment_status === "refunded") ? "−" : ""}
                        {money(Number(p.amount))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {PAYMENT_METHOD_UK[
                          p.payment_method as keyof typeof PAYMENT_METHOD_UK
                        ] ?? p.payment_method}
                        {" · "}
                        {formatDateTime(p.payment_date ?? p.created_at)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.transaction_type === "refund" || p.payment_status === "refunded"
                          ? "Повернення"
                          : "Оплата"}
                      </p>
                      {p.payment_method === "bank_transfer_iban" && p.transaction_id && (
                        <p className="text-xs text-muted-foreground">
                          Платіжна інструкція №{p.transaction_id}
                        </p>
                      )}
                      {p.failure_reason && (
                        <p className="text-xs text-destructive">{p.failure_reason}</p>
                      )}
                      {p.notes && (
                        <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">
                          Примітка: {p.notes}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline">
                      {PAYMENT_STATUS_UK[
                        p.payment_status as keyof typeof PAYMENT_STATUS_UK
                      ] ?? p.payment_status}
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
            <p className="whitespace-pre-line">
              {reservation.special_requests}
            </p>
          </CardContent>
        </Card>
      )}

      {reservation.cancellation_reason && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive">
              Причина скасування
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{reservation.cancellation_reason}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
