"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import useSWR from "swr";
import {
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subYears,
} from "date-fns";
import { uk } from "date-fns/locale";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CalendarIcon,
  ClipboardCheck,
  FileText,
  Hotel,
  LoaderCircle,
  Printer,
  TableProperties,
  TrendingUp,
  UserRoundCheck,
  UserRoundX,
  Users,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  formatRole,
  formatPaymentMethod,
  formatPaymentStatus,
  formatReservationStatus,
} from "@/lib/localization";
import {
  calculateDailyOccupancy,
  occupiedNightsInPeriod,
  proratedRoomRevenue,
  reservationOccupiesDate,
  reservationOverlapsPeriod,
  reservationPeopleCount,
  reservationRoomCount,
} from "@/lib/reports/hotel-reporting";
import { signedSettledPaymentAmount } from "@/lib/rules/payments";

type PeriodPreset = "day" | "week" | "month" | "quarter" | "year" | "custom";
type ReportTemplate =
  | "manager"
  | "forecast"
  | "arrivals"
  | "departures"
  | "in_house"
  | "room_categories"
  | "revenue"
  | "reservations"
  | "folios"
  | "cancellations";

interface ReportsClientProps {
  totalRooms: number;
  generatedAt: string;
  preparedBy: {
    name: string;
    role: string | null;
  };
}

type ReportPayment = {
  id?: string;
  reservation_id?: string | null;
  folio_id?: string | null;
  amount: number | string | null;
  created_at: string | null;
  payment_date?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  transaction_type?: string | null;
  processed_by?: string | null;
};

type ReportReservation = {
  id: string;
  reservation_number?: string | null;
  check_in_date: string;
  check_out_date: string;
  status: string;
  total_amount: number | string | null;
  paid_amount?: number | string | null;
  adults?: number | null;
  children?: number | null;
  channel?: string | null;
  notes?: string | null;
  created_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  cancelled_by?: string | null;
  guests?: {
    first_name?: string | null;
    last_name?: string | null;
    country?: string | null;
    company?: string | null;
    notes?: string | null;
  } | null;
  rate_plans?: { name?: string | null } | null;
  reservation_rooms?: Array<{
    room_id?: string | null;
    room_type_id?: string | null;
    rate?: number | string | null;
    actual_check_in?: string | null;
    actual_check_out?: string | null;
    rooms?: {
      room_number?: string | null;
      status?: string | null;
      room_types?: { id?: string | null; name?: string | null } | null;
    } | null;
  }> | null;
  folios?: Array<{
    id?: string | null;
    folio_number?: string | null;
    total_amount?: number | string | null;
    grand_total?: number | string | null;
    status?: string | null;
    created_at?: string | null;
  }> | null;
  canceller?: { first_name?: string | null; last_name?: string | null } | null;
};

type ReportRoom = {
  id: string;
  room_number?: string | null;
  status: string | null;
  operational_status?: string | null;
  room_type_id?: string | null;
  room_types?: { id?: string | null; name?: string | null } | null;
};

type ReportFolio = {
  id: string;
  folio_number?: string | null;
  status?: string | null;
  total_amount?: number | string | null;
  total_charges?: number | string | null;
  paid_amount?: number | string | null;
  total_payments?: number | string | null;
  balance?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  guests?: { first_name?: string | null; last_name?: string | null } | null;
  reservations?: {
    reservation_number?: string | null;
    check_out_date?: string | null;
  } | null;
};

type ReportCharge = {
  id: string;
  description?: string | null;
  category?: string | null;
  amount?: number | string | null;
  quantity?: number | null;
  charge_date?: string | null;
  folios?: { reservation_id?: string | null } | null;
};

type ReportMetrics = {
  revenue: number;
  refunds: number;
  soldNights: number;
  reservationValue: number;
  occupancyRate: number;
  adr: number;
  revpar: number;
  pickup: number;
  cancellationCount: number;
  cancellationRate: number;
  openFolios: number;
  openBalance: number;
  guestCount: number;
  averageLengthOfStay: number;
  doubleOccupancy: number;
};

const currencyFmt = new Intl.NumberFormat("uk-UA", {
  style: "currency",
  currency: "UAH",
  maximumFractionDigits: 0,
});

const numberFmt = new Intl.NumberFormat("uk-UA");
const percentFmt = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 1 });

const REPORT_TEMPLATES: Record<
  ReportTemplate,
  { title: string; shortTitle: string; description: string; icon: ReactNode }
> = {
  manager: {
    title: "Звіт менеджера",
    shortTitle: "Менеджер",
    description:
      "Основні показники готелю та порівняння з аналогічним періодом минулого року.",
    icon: <ClipboardCheck className="h-4 w-4" />,
  },
  forecast: {
    title: "Прогноз завантаженості: факт і план",
    shortTitle: "Прогноз",
    description:
      "Щоденна завантаженість, заїзди, виїзди, гості та плановий дохід.",
    icon: <TrendingUp className="h-4 w-4" />,
  },
  arrivals: {
    title: "Список гостей, що прибувають",
    shortTitle: "Прибуття",
    description:
      "Операційний список заїздів із номерами, тарифами, оплатами та примітками.",
    icon: <ArrowDownToLine className="h-4 w-4" />,
  },
  departures: {
    title: "Список гостей, що виїжджають",
    shortTitle: "Виїзди",
    description:
      "Операційний список виїздів із балансом і фактичним статусом виселення.",
    icon: <ArrowUpFromLine className="h-4 w-4" />,
  },
  in_house: {
    title: "Реєстр проживання гостей",
    shortTitle: "Проживають",
    description: "Гості, чиє проживання перетинається з обраним періодом.",
    icon: <UserRoundCheck className="h-4 w-4" />,
  },
  room_categories: {
    title: "Завантаженість за категоріями номерів",
    shortTitle: "Категорії",
    description:
      "Номеро-ночі, гості, дохід, завантаженість і середній тариф за категоріями.",
    icon: <Hotel className="h-4 w-4" />,
  },
  revenue: {
    title: "Дохід та платежі",
    shortTitle: "Дохід",
    description:
      "Касова дисципліна, способи оплати, повернення та щоденна динаміка.",
    icon: <Wallet className="h-4 w-4" />,
  },
  reservations: {
    title: "Бронювання та канали",
    shortTitle: "Бронювання",
    description: "Попит, статуси, канали продажів і конверсія бронювань.",
    icon: <Users className="h-4 w-4" />,
  },
  folios: {
    title: "Реєстр рахунків",
    shortTitle: "Рахунки",
    description: "Нарахування, оплати, баланс і статус рахунків гостей.",
    icon: <TableProperties className="h-4 w-4" />,
  },
  cancellations: {
    title: "Реєстр ануляцій бронювань",
    shortTitle: "Ануляції",
    description:
      "Скасовані бронювання, причини, відповідальні працівники та фінансовий вплив.",
    icon: <UserRoundX className="h-4 w-4" />,
  },
};

const REPORT_FILE_NAMES: Record<ReportTemplate, string> = {
  manager: "Звіт менеджера",
  forecast: "Прогноз завантаженості",
  arrivals: "Список гостей що прибувають",
  departures: "Список гостей що виїжджають",
  in_house: "Реєстр проживання гостей",
  room_categories: "Завантаженість за категоріями номерів",
  revenue: "Дохід та платежі",
  reservations: "Бронювання та канали",
  folios: "Реєстр рахунків",
  cancellations: "Реєстр ануляцій бронювань",
};

function sanitizeFilename(value: string) {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/[. ]+$/g, "");
}

function getRangeForPreset(
  preset: PeriodPreset,
  anchor: Date
): { from: Date; to: Date } {
  switch (preset) {
    case "day":
      return { from: startOfDay(anchor), to: endOfDay(anchor) };
    case "week":
      return {
        from: startOfWeek(anchor, { weekStartsOn: 1 }),
        to: endOfWeek(anchor, { weekStartsOn: 1 }),
      };
    case "month":
      return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
    case "quarter": {
      const month = anchor.getMonth();
      const startMonth = Math.floor(month / 3) * 3;
      const from = startOfMonth(new Date(anchor.getFullYear(), startMonth, 1));
      return {
        from,
        to: endOfMonth(new Date(anchor.getFullYear(), startMonth + 2, 1)),
      };
    }
    case "year":
      return { from: startOfYear(anchor), to: endOfYear(anchor) };
    default:
      return { from: subDays(startOfDay(anchor), 29), to: endOfDay(anchor) };
  }
}

function toNumber(value: number | string | null | undefined) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function getPaymentDate(payment: ReportPayment) {
  return new Date(payment.payment_date ?? payment.created_at ?? "");
}

function signedPaymentAmount(payment: ReportPayment) {
  return signedSettledPaymentAmount(payment);
}

function reservationNights(reservation: ReportReservation) {
  const nights = differenceInCalendarDays(
    new Date(reservation.check_out_date),
    new Date(reservation.check_in_date)
  );
  return Math.max(1, Number.isFinite(nights) ? nights : 1);
}

function isLiveReservation(reservation: ReportReservation) {
  return reservation.status !== "cancelled" && reservation.status !== "no_show";
}

function folioGuestName(folio: ReportFolio) {
  const guest = folio.guests;
  return guest?.first_name || guest?.last_name
    ? `${guest.first_name ?? ""} ${guest.last_name ?? ""}`.trim()
    : "—";
}

function calculateReportMetrics({
  payments,
  reservations,
  folios,
  sellableRoomCount,
  fromDate,
  toDate,
}: {
  payments: ReportPayment[];
  reservations: ReportReservation[];
  folios: ReportFolio[];
  sellableRoomCount: number;
  fromDate: string;
  toDate: string;
}): ReportMetrics {
  const days = Math.max(
    1,
    differenceInCalendarDays(
      new Date(`${toDate}T00:00:00`),
      new Date(`${fromDate}T00:00:00`)
    ) + 1
  );
  const capacity = sellableRoomCount * days;
  const revenue = payments.reduce(
    (sum, payment) => sum + signedPaymentAmount(payment),
    0
  );
  const refunds = payments.reduce((sum, payment) => {
    const amount = signedPaymentAmount(payment);
    return amount < 0 ? sum + Math.abs(amount) : sum;
  }, 0);
  const liveReservations = reservations.filter(isLiveReservation);
  const soldNights = liveReservations.reduce(
    (sum, reservation) =>
      sum +
      occupiedNightsInPeriod(reservation, fromDate, toDate) *
        reservationRoomCount(reservation),
    0
  );
  const reservationValue = liveReservations.reduce(
    (sum, reservation) =>
      sum + proratedRoomRevenue(reservation, fromDate, toDate),
    0
  );
  const cancellationCount = reservations.filter((reservation) =>
    ["cancelled", "no_show"].includes(reservation.status)
  ).length;
  const openFolios = folios.filter((folio) => toNumber(folio.balance) > 0);
  const personNights = liveReservations.reduce(
    (sum, reservation) =>
      sum +
      reservationPeopleCount(reservation) *
        occupiedNightsInPeriod(reservation, fromDate, toDate),
    0
  );
  const occupiedStays = liveReservations.reduce(
    (sum, reservation) => sum + reservationRoomCount(reservation),
    0
  );

  return {
    revenue,
    refunds,
    soldNights,
    reservationValue,
    occupancyRate:
      capacity > 0 ? Math.min(100, (soldNights / capacity) * 100) : 0,
    adr: soldNights > 0 ? reservationValue / soldNights : 0,
    revpar: capacity > 0 ? reservationValue / capacity : 0,
    pickup: reservations.filter((reservation) => {
      const createdDate = reservation.created_at?.slice(0, 10);
      return Boolean(
        createdDate && createdDate >= fromDate && createdDate <= toDate
      );
    }).length,
    cancellationCount,
    cancellationRate:
      reservations.length > 0
        ? (cancellationCount / reservations.length) * 100
        : 0,
    openFolios: openFolios.length,
    openBalance: openFolios.reduce(
      (sum, folio) => sum + toNumber(folio.balance),
      0
    ),
    guestCount: liveReservations.reduce(
      (sum, reservation) => sum + reservationPeopleCount(reservation),
      0
    ),
    averageLengthOfStay: occupiedStays > 0 ? soldNights / occupiedStays : 0,
    doubleOccupancy: soldNights > 0 ? personNights / soldNights : 0,
  };
}

export function ReportsClient({
  totalRooms,
  generatedAt,
  preparedBy,
}: ReportsClientProps) {
  const [preset, setPreset] = useState<PeriodPreset>("month");
  const [template, setTemplate] = useState<ReportTemplate>("manager");
  const [selectedTemplate, setSelectedTemplate] =
    useState<ReportTemplate>("manager");
  const [reportGeneratedAt, setReportGeneratedAt] = useState<Date>(
    () => new Date(generatedAt)
  );
  const [roomTypeFilter, setRoomTypeFilter] = useState("all");
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [customFrom, setCustomFrom] = useState<Date>(subDays(new Date(), 29));
  const [customTo, setCustomTo] = useState<Date>(new Date());
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  const range = useMemo(() => {
    if (preset === "custom") {
      const from = startOfDay(customFrom);
      const to = endOfDay(customTo);
      return from <= to
        ? { from, to }
        : { from: startOfDay(customTo), to: endOfDay(customFrom) };
    }
    return getRangeForPreset(preset, anchor);
  }, [preset, anchor, customFrom, customTo]);

  const fromISO = range.from.toISOString();
  const toISO = range.to.toISOString();
  const fromDate = format(range.from, "yyyy-MM-dd");
  const toDate = format(range.to, "yyyy-MM-dd");
  const previousFromDate = format(subYears(range.from, 1), "yyyy-MM-dd");
  const previousToDate = format(subYears(range.to, 1), "yyyy-MM-dd");
  const previousFromISO = subYears(range.from, 1).toISOString();
  const previousToISO = subYears(range.to, 1).toISOString();
  const rangeLabel = `${format(range.from, "d MMM yyyy", {
    locale: uk,
  })} - ${format(range.to, "d MMM yyyy", { locale: uk })}`;

  const {
    data,
    error: loadError,
    isLoading,
  } = useSWR(
    [
      "enterprise-reports",
      fromISO,
      toISO,
      fromDate,
      toDate,
      previousFromISO,
      previousToISO,
    ],
    async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const reservationSelect = `
        id,
        reservation_number,
        check_in_date,
        check_out_date,
        status,
        total_amount,
        paid_amount,
        adults,
        children,
        channel,
        notes,
        created_at,
        cancelled_at,
        cancellation_reason,
        guests (first_name, last_name, country, company, notes),
        rate_plans (name),
        reservation_rooms (
          room_id,
          room_type_id,
          rate,
          actual_check_in,
          actual_check_out,
          rooms!reservation_rooms_room_id_fkey (
            room_number,
            status,
            room_types (id, name)
          )
        ),
        folios (id, folio_number, total_amount, grand_total, status, created_at)
      `;
      const loadCancellations = async () => {
        const withAudit = await supabase
          .from("reservations")
          .select(
            `${reservationSelect}, cancelled_by, canceller:profiles!reservations_cancelled_by_fkey (first_name, last_name)`
          )
          .eq("status", "cancelled")
          .gte("cancelled_at", fromISO)
          .lte("cancelled_at", toISO);

        if (!withAudit.error) return withAudit;

        return supabase
          .from("reservations")
          .select(reservationSelect)
          .eq("status", "cancelled")
          .gte("cancelled_at", fromISO)
          .lte("cancelled_at", toISO);
      };
      const [
        payments,
        reservations,
        rooms,
        folios,
        charges,
        cancellations,
        previousPayments,
        previousReservations,
      ] = await Promise.all([
        supabase
          .from("payments")
          .select(
            "id, reservation_id, folio_id, amount, created_at, payment_date, payment_method, payment_status, processed_by"
          )
          .gte("payment_date", fromISO)
          .lte("payment_date", toISO),
        supabase
          .from("reservations")
          .select(reservationSelect)
          .lte("check_in_date", toDate)
          .gte("check_out_date", fromDate),
        supabase
          .from("rooms")
          .select(
            "id, room_number, status, operational_status, room_type_id, room_types(id, name)"
          ),
        supabase
          .from("v_folios_with_payments")
          .select(
            `
            id,
            folio_number,
            status,
            total_charges,
            total_payments,
            balance,
            created_at,
            updated_at,
            guests (first_name, last_name),
            reservations (reservation_number, check_out_date)
          `
          )
          .order("updated_at", { ascending: false }),
        supabase
          .from("folio_charges")
          .select(
            "id, description, category, amount, quantity, charge_date, folios(reservation_id)"
          )
          .gte("charge_date", fromDate)
          .lte("charge_date", toDate),
        loadCancellations(),
        supabase
          .from("payments")
          .select(
            "id, reservation_id, folio_id, amount, created_at, payment_date, payment_method, payment_status"
          )
          .gte("payment_date", previousFromISO)
          .lte("payment_date", previousToISO),
        supabase
          .from("reservations")
          .select(reservationSelect)
          .lte("check_in_date", previousToDate)
          .gte("check_out_date", previousFromDate),
      ]);
      const errors = [
        { label: "Платежі", error: payments.error },
        { label: "Бронювання", error: reservations.error },
        { label: "Номери", error: rooms.error },
        { label: "Рахунки", error: folios.error },
        { label: "Нарахування", error: charges.error },
        { label: "Анулювання", error: cancellations.error },
        {
          label: "Платежі попереднього періоду",
          error: previousPayments.error,
        },
        {
          label: "Бронювання попереднього періоду",
          error: previousReservations.error,
        },
      ].flatMap(({ label, error }) =>
        error ? [`${label}: ${error.message}`] : []
      );

      return {
        payments: payments.data ?? [],
        reservations: reservations.data ?? [],
        rooms: rooms.data ?? [],
        folios: folios.data ?? [],
        charges: charges.data ?? [],
        cancellations: cancellations.data ?? [],
        previousPayments: previousPayments.data ?? [],
        previousReservations: previousReservations.data ?? [],
        errors,
      };
    },
    { refreshInterval: 60000 }
  );

  const payments = (data?.payments ?? []) as ReportPayment[];
  const reservations = (data?.reservations ?? []) as ReportReservation[];
  const rooms = (data?.rooms ?? []) as ReportRoom[];
  const folios = (data?.folios ?? []) as ReportFolio[];
  const charges = (data?.charges ?? []) as ReportCharge[];
  const cancellations = (data?.cancellations ?? []) as ReportReservation[];
  const previousPayments = (data?.previousPayments ?? []) as ReportPayment[];
  const previousReservations = (data?.previousReservations ??
    []) as ReportReservation[];
  const reportErrors = data?.errors ?? [];
  const activeRooms = rooms;
  const sellableRoomCount =
    activeRooms.filter((room) =>
      room.operational_status
        ? room.operational_status === "operational"
        : !["maintenance", "out_of_order", "blocked"].includes(
            room.status ?? ""
          )
    ).length || totalRooms;
  const days = Math.max(1, differenceInCalendarDays(range.to, range.from) + 1);

  const roomTypes = useMemo(
    () =>
      Array.from(
        new Map(
          activeRooms
            .filter((room) => room.room_type_id)
            .map((room) => [
              room.room_type_id as string,
              room.room_types?.name?.trim() || "Без категорії",
            ])
        ).entries()
      ).sort((a, b) => a[1].localeCompare(b[1], "uk")),
    [activeRooms]
  );

  const matchesReportFilters = (reservation: ReportReservation) => {
    const roomTypeMatches =
      roomTypeFilter === "all" ||
      (reservation.reservation_rooms ?? []).some(
        (room) =>
          room.room_type_id === roomTypeFilter ||
          room.rooms?.room_types?.id === roomTypeFilter
      );
    return roomTypeMatches;
  };

  const filteredReservations = reservations.filter(matchesReportFilters);
  const filteredPreviousReservations =
    previousReservations.filter(matchesReportFilters);
  const filteredCancellations = cancellations.filter(matchesReportFilters);
  const filteredReservationIds = new Set(
    filteredReservations.map((reservation) => reservation.id)
  );
  const filteredPreviousReservationIds = new Set(
    filteredPreviousReservations.map((reservation) => reservation.id)
  );
  const hasReservationFilters = roomTypeFilter !== "all";
  const filteredPayments = hasReservationFilters
    ? payments.filter(
        (payment) =>
          !payment.reservation_id ||
          filteredReservationIds.has(payment.reservation_id)
      )
    : payments;
  const filteredPreviousPayments = hasReservationFilters
    ? previousPayments.filter(
        (payment) =>
          !payment.reservation_id ||
          filteredPreviousReservationIds.has(payment.reservation_id)
      )
    : previousPayments;

  const metrics = useMemo(
    () =>
      calculateReportMetrics({
        payments: filteredPayments,
        reservations: filteredReservations,
        folios,
        sellableRoomCount,
        fromDate,
        toDate,
      }),
    [
      filteredPayments,
      filteredReservations,
      folios,
      sellableRoomCount,
      fromDate,
      toDate,
    ]
  );

  const previousMetrics = useMemo(
    () =>
      calculateReportMetrics({
        payments: filteredPreviousPayments,
        reservations: filteredPreviousReservations,
        folios: [],
        sellableRoomCount,
        fromDate: previousFromDate,
        toDate: previousToDate,
      }),
    [
      filteredPreviousPayments,
      filteredPreviousReservations,
      sellableRoomCount,
      previousFromDate,
      previousToDate,
    ]
  );

  const timeSeries = useMemo(() => {
    const useMonthBucket = preset === "year" || days > 70;
    const buckets = useMonthBucket
      ? eachMonthOfInterval({ start: range.from, end: range.to })
      : eachDayOfInterval({ start: range.from, end: range.to });

    return buckets.map((date) => {
      const label = useMonthBucket
        ? format(date, "LLL yyyy", { locale: uk })
        : format(date, "d MMM", { locale: uk });
      const matchBucket = (value: Date) =>
        useMonthBucket ? isSameMonth(value, date) : isSameDay(value, date);
      const bucketReservations = filteredReservations.filter((reservation) =>
        matchBucket(new Date(reservation.check_in_date))
      );
      const bucketFrom = format(date, "yyyy-MM-dd");
      const bucketTo = useMonthBucket
        ? format(
            endOfMonth(date) < range.to ? endOfMonth(date) : range.to,
            "yyyy-MM-dd"
          )
        : bucketFrom;

      return {
        label,
        revenue: filteredPayments
          .filter((payment) => matchBucket(getPaymentDate(payment)))
          .reduce((sum, payment) => sum + signedPaymentAmount(payment), 0),
        reservations: bucketReservations.length,
        soldNights: filteredReservations
          .filter(isLiveReservation)
          .reduce(
            (sum, reservation) =>
              sum +
              occupiedNightsInPeriod(reservation, bucketFrom, bucketTo) *
                reservationRoomCount(reservation),
            0
          ),
      };
    });
  }, [
    filteredPayments,
    filteredReservations,
    range.from,
    range.to,
    preset,
    days,
  ]);

  const methodBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const payment of filteredPayments) {
      const method = payment.payment_method ?? "other";
      map.set(method, (map.get(method) ?? 0) + signedPaymentAmount(payment));
    }

    return Array.from(map.entries())
      .filter(([, amount]) => amount > 0)
      .map(([method, amount]) => ({
        name: formatPaymentMethod(method),
        value: amount,
      }));
  }, [filteredPayments]);

  const statusBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const reservation of filteredReservations)
      map.set(reservation.status, (map.get(reservation.status) ?? 0) + 1);
    return Array.from(map.entries()).map(([status, value]) => ({
      name: formatReservationStatus(status),
      value,
    }));
  }, [filteredReservations]);

  const channelBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const reservation of filteredReservations) {
      const channel = reservation.channel?.trim() || "Без каналу";
      map.set(channel, (map.get(channel) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredReservations]);

  const arrivals = useMemo(
    () =>
      filteredReservations
        .filter(
          (reservation) =>
            isLiveReservation(reservation) &&
            reservation.check_in_date >= fromDate &&
            reservation.check_in_date <= toDate
        )
        .sort((a, b) => a.check_in_date.localeCompare(b.check_in_date)),
    [filteredReservations, fromDate, toDate]
  );

  const departures = useMemo(
    () =>
      filteredReservations
        .filter(
          (reservation) =>
            isLiveReservation(reservation) &&
            reservation.check_out_date >= fromDate &&
            reservation.check_out_date <= toDate
        )
        .sort((a, b) => a.check_out_date.localeCompare(b.check_out_date)),
    [filteredReservations, fromDate, toDate]
  );

  const inHouseReservations = useMemo(
    () =>
      filteredReservations
        .filter(
          (reservation) =>
            isLiveReservation(reservation) &&
            reservationOverlapsPeriod(reservation, fromDate, toDate)
        )
        .sort((a, b) => a.check_in_date.localeCompare(b.check_in_date)),
    [filteredReservations, fromDate, toDate]
  );

  const forecastRows = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");

    return eachDayOfInterval({ start: range.from, end: range.to }).map(
      (date) => {
        const dateKey = format(date, "yyyy-MM-dd");
        const occupancy = calculateDailyOccupancy(
          dateKey,
          activeRooms,
          filteredReservations
        );
        const arriving = filteredReservations.filter(
          (reservation) =>
            isLiveReservation(reservation) &&
            reservation.check_in_date === dateKey
        );
        const departing = filteredReservations.filter(
          (reservation) =>
            isLiveReservation(reservation) &&
            reservation.check_out_date === dateKey
        );
        const roomRevenue = filteredReservations
          .filter(
            (reservation) =>
              isLiveReservation(reservation) &&
              reservationOccupiesDate(reservation, dateKey)
          )
          .reduce(
            (sum, reservation) =>
              sum + proratedRoomRevenue(reservation, dateKey, dateKey),
            0
          );

        return {
          date: dateKey,
          mode: dateKey <= today ? "Факт" : "План",
          totalRooms: activeRooms.length,
          roomsForSale: occupancy.roomsForSale,
          repairRooms: occupancy.roomsOutOfService,
          arrivals: arriving.reduce(
            (sum, reservation) => sum + reservationRoomCount(reservation),
            0
          ),
          departures: departing.reduce(
            (sum, reservation) => sum + reservationRoomCount(reservation),
            0
          ),
          occupiedRooms: occupancy.occupiedRooms,
          occupancyRate: occupancy.occupancyRate,
          arrivingPeople: arriving.reduce(
            (sum, reservation) => sum + reservationPeopleCount(reservation),
            0
          ),
          peopleInHouse: occupancy.peopleInHouse,
          departingPeople: departing.reduce(
            (sum, reservation) => sum + reservationPeopleCount(reservation),
            0
          ),
          roomRevenue,
          adr:
            occupancy.occupiedRooms > 0
              ? roomRevenue / occupancy.occupiedRooms
              : 0,
        };
      }
    );
  }, [activeRooms, filteredReservations, range.from, range.to]);

  const roomCategoryRows = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        roomCount: number;
        roomsOutOfService: number;
        soldNights: number;
        guests: number;
        personNights: number;
        arrivals: number;
        departures: number;
        revenue: number;
      }
    >();

    for (const [id, name] of roomTypes) {
      const categoryRooms = activeRooms.filter(
        (room) => room.room_type_id === id
      );
      map.set(id, {
        id,
        name,
        roomCount: categoryRooms.length,
        roomsOutOfService: categoryRooms.filter((room) =>
          room.operational_status
            ? room.operational_status !== "operational"
            : ["maintenance", "out_of_order", "blocked"].includes(
                room.status ?? ""
              )
        ).length,
        soldNights: 0,
        guests: 0,
        personNights: 0,
        arrivals: 0,
        departures: 0,
        revenue: 0,
      });
    }

    for (const reservation of filteredReservations.filter(isLiveReservation)) {
      const roomAssignments = reservation.reservation_rooms ?? [];
      const categoryIds = Array.from(
        new Set(
          roomAssignments
            .map((room) => room.room_type_id ?? room.rooms?.room_types?.id)
            .filter((id): id is string => Boolean(id))
        )
      );
      const effectiveCategoryIds =
        categoryIds.length > 0 ? categoryIds : ["unassigned"];
      if (
        !map.has("unassigned") &&
        effectiveCategoryIds.includes("unassigned")
      ) {
        map.set("unassigned", {
          id: "unassigned",
          name: "Без призначеної категорії",
          roomCount: 0,
          roomsOutOfService: 0,
          soldNights: 0,
          guests: 0,
          personNights: 0,
          arrivals: 0,
          departures: 0,
          revenue: 0,
        });
      }

      const nights = occupiedNightsInPeriod(reservation, fromDate, toDate);
      const people = reservationPeopleCount(reservation);
      const revenueShare =
        proratedRoomRevenue(reservation, fromDate, toDate) /
        effectiveCategoryIds.length;

      for (const categoryId of effectiveCategoryIds) {
        const row = map.get(categoryId);
        if (!row) continue;
        const assignedRoomsInCategory = roomAssignments.filter(
          (room) =>
            (room.room_type_id ?? room.rooms?.room_types?.id) === categoryId
        ).length;
        row.soldNights += nights * Math.max(1, assignedRoomsInCategory);
        row.guests += 1;
        row.personNights += people * nights;
        row.arrivals +=
          reservation.check_in_date >= fromDate &&
          reservation.check_in_date <= toDate
            ? people
            : 0;
        row.departures +=
          reservation.check_out_date >= fromDate &&
          reservation.check_out_date <= toDate
            ? people
            : 0;
        row.revenue += revenueShare;
      }
    }

    return Array.from(map.values()).filter(
      (row) => roomTypeFilter === "all" || row.id === roomTypeFilter
    );
  }, [
    roomTypes,
    activeRooms,
    filteredReservations,
    fromDate,
    toDate,
    roomTypeFilter,
  ]);

  const periodFolios = useMemo(() => {
    const allowedReservationNumbers = new Set(
      filteredReservations.map((reservation) => reservation.reservation_number)
    );

    return folios.filter((folio) => {
      const createdDate = folio.created_at?.slice(0, 10);
      const reservationNumber = folio.reservations?.reservation_number;
      return (
        Boolean(
          createdDate && createdDate >= fromDate && createdDate <= toDate
        ) &&
        (!reservationNumber || allowedReservationNumbers.has(reservationNumber))
      );
    });
  }, [folios, filteredReservations, fromDate, toDate]);

  const chargeBreakdown = useMemo(() => {
    const map = new Map<
      string,
      { name: string; quantity: number; amount: number }
    >();
    const allowedReservationIds = new Set(
      filteredReservations.map((reservation) => reservation.id)
    );
    for (const charge of charges) {
      if (
        roomTypeFilter !== "all" &&
        charge.folios?.reservation_id &&
        !allowedReservationIds.has(charge.folios.reservation_id)
      ) {
        continue;
      }
      const name =
        charge.category?.trim() || charge.description?.trim() || "Інше";
      const current = map.get(name) ?? { name, quantity: 0, amount: 0 };
      current.quantity += Number(charge.quantity ?? 1);
      current.amount += toNumber(charge.amount) * Number(charge.quantity ?? 1);
      map.set(name, current);
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [charges, filteredReservations, roomTypeFilter]);
  const selectedRoomTypeName =
    roomTypes.find(([id]) => id === roomTypeFilter)?.[1] ?? "Усі категорії";
  const criteriaLabel =
    roomTypeFilter === "all" ? "Усі категорії номерів" : selectedRoomTypeName;

  useEffect(() => {
    if (isLoading) return;
    setIsGeneratingPreview(true);
    const timeoutId = window.setTimeout(
      () => setIsGeneratingPreview(false),
      700
    );
    return () => window.clearTimeout(timeoutId);
  }, [roomTypeFilter, preset, anchor, customFrom, customTo, isLoading]);

  function handleGenerateReport() {
    setTemplate(selectedTemplate);
    setReportGeneratedAt(new Date());
    setIsGeneratingPreview(true);
    window.setTimeout(() => setIsGeneratingPreview(false), 1200);
  }

  function makeReportFileName(extension: "doc" | "pdf") {
    const reportName = REPORT_FILE_NAMES[template];
    const generatedDate = format(reportGeneratedAt, "yyyy-MM-dd");

    return `${sanitizeFilename(
      `${reportName}_${fromDate}_${toDate}_сформовано_${generatedDate}`
    )}.${extension}`;
  }

  function exportPDF() {
    const previousTitle = document.title;
    const pdfFileName = makeReportFileName("pdf").replace(/\.pdf$/i, "");

    document.title = pdfFileName;

    window.print();

    window.setTimeout(() => {
      document.title = previousTitle;
    }, 1000);
  }

  function exportWord() {
    const reportElement =
      document.querySelector<HTMLElement>(".report-document");

    if (!reportElement) {
      console.error("Не знайдено .report-document для експорту у Word");
      return;
    }

    const htmlContent = reportElement.outerHTML;

    const wordDocument = `
      <!DOCTYPE html>
      <html
        xmlns:o="urn:schemas-microsoft-com:office:office"
        xmlns:w="urn:schemas-microsoft-com:office:word"
        xmlns="http://www.w3.org/TR/REC-html40"
      >
        <head>
          <meta charset="utf-8" />
          <title>${REPORT_TEMPLATES[template].title}</title>
  
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm;
            }
  
            body {
              margin: 0;
              font-family: "Times New Roman", Times, serif;
              font-size: 14px;
              line-height: 1.5;
              color: #000;
              background: #fff;
            }
  
            .report-document {
              width: 100%;
              box-sizing: border-box;
              font-family: "Times New Roman", Times, serif;
              font-size: 14px;
              line-height: 1.5;
              color: #000;
            }
  
            .report-document * {
              font-family: "Times New Roman", Times, serif;
              box-sizing: border-box;
            }
  
            .report-document-header {
              border-bottom: 1px solid #000;
              padding-bottom: 10px;
              margin-bottom: 16px;
            }
  
            .report-title {
              font-size: 18px;
              line-height: 1.5;
              font-weight: bold;
              margin: 0;
            }
  
            .report-meta {
              text-align: right;
              font-size: 14px;
              line-height: 1.5;
            }
  
            .report-meta p {
              margin: 0;
            }
  
            .report-section {
              margin: 0 0 12px;
              padding: 0;
              border: 0;
              background: transparent;
            }
  
            .report-section-title {
              margin: 0 0 6px;
              font-size: 14px;
              line-height: 1.5;
              font-weight: bold;
              text-align: left;
            }
  
            .report-table-wrapper {
              width: 100%;
              max-width: 100%;
              overflow: visible;
            }
  
            table,
            .report-table {
              width: 100%;
              max-width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              font-family: "Times New Roman", Times, serif;
              font-size: 14px;
              line-height: 1.5;
            }
  
            th,
            td,
            .report-table th,
            .report-table td {
              border: 1px solid #000;
              padding: 3px 4px;
              vertical-align: top;
              white-space: normal;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
  
            th,
            .report-table th {
              font-weight: bold;
              text-align: center;
              background: transparent;
            }
  
            td,
            .report-table td {
              text-align: left;
            }
  
            .text-right {
              text-align: right;
            }
  
            .font-semibold {
              font-weight: bold;
            }
  
            .font-bold {
              font-weight: bold;
            }
  
            p {
              margin: 0 0 6px;
            }
          </style>
        </head>
  
        <body>
          ${htmlContent}
        </body>
      </html>
    `;

    const blob = new Blob(["\ufeff", wordDocument], {
      type: "application/msword;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = makeReportFileName("doc");
    link.click();

    URL.revokeObjectURL(url);
  }

  const reportContent = (() => {
    switch (template) {
      case "manager":
        return (
          <ManagerReport
            metrics={metrics}
            previousMetrics={previousMetrics}
            timeSeries={timeSeries}
            statusBreakdown={statusBreakdown}
            channelBreakdown={channelBreakdown}
          />
        );
      case "forecast":
        return <ForecastReport rows={forecastRows} />;
      case "arrivals":
        return (
          <GuestMovementReport
            mode="arrivals"
            reservations={arrivals}
            payments={filteredPayments}
          />
        );
      case "departures":
        return (
          <GuestMovementReport
            mode="departures"
            reservations={departures}
            payments={filteredPayments}
          />
        );
      case "in_house":
        return (
          <InHouseReport
            reservations={inHouseReservations}
            payments={filteredPayments}
          />
        );
      case "room_categories":
        return <RoomCategoriesReport rows={roomCategoryRows} days={days} />;
      case "revenue":
        return (
          <RevenueReport
            metrics={metrics}
            timeSeries={timeSeries}
            methodBreakdown={methodBreakdown}
            chargeBreakdown={chargeBreakdown}
          />
        );
      case "reservations":
        return (
          <ReservationsReport
            metrics={metrics}
            timeSeries={timeSeries}
            statusBreakdown={statusBreakdown}
            channelBreakdown={channelBreakdown}
            reservations={filteredReservations}
          />
        );
      case "folios":
        return <FoliosReport metrics={metrics} folios={periodFolios} />;
      case "cancellations":
        return <CancellationsReport reservations={filteredCancellations} />;
      default:
        return null;
    }
  })();

  return (
    <div className="flex flex-col gap-6 print:block">
      <Card className="print:hidden">
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Тип звіту</Label>
            <Select
              value={selectedTemplate}
              onValueChange={(value) =>
                setSelectedTemplate(value as ReportTemplate)
              }
            >
              <SelectTrigger className="w-[240px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(REPORT_TEMPLATES) as ReportTemplate[]).map(
                  (key) => (
                    <SelectItem key={key} value={key}>
                      {REPORT_TEMPLATES[key].title}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Період</Label>
            <Select
              value={preset}
              onValueChange={(value) => setPreset(value as PeriodPreset)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">День</SelectItem>
                <SelectItem value="week">Тиждень</SelectItem>
                <SelectItem value="month">Місяць</SelectItem>
                <SelectItem value="quarter">Квартал</SelectItem>
                <SelectItem value="year">Рік</SelectItem>
                <SelectItem value="custom">Власний</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Категорія номера</Label>
            <Select value={roomTypeFilter} onValueChange={setRoomTypeFilter}>
              <SelectTrigger className="w-[190px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Усі категорії</SelectItem>
                {roomTypes.map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {preset !== "custom" ? (
            <DateButton label="Дата" date={anchor} onSelect={setAnchor} />
          ) : (
            <>
              <DateButton
                label="Від"
                date={customFrom}
                onSelect={setCustomFrom}
              />
              <DateButton label="До" date={customTo} onSelect={setCustomTo} />
            </>
          )}

          <div className="ml-auto flex gap-2">
            <Button onClick={handleGenerateReport}>
              <FileText className="mr-2 h-4 w-4" />
              Сформувати звіт
            </Button>

            <Button variant="outline" onClick={exportWord}>
            Завантажити у Word
            </Button>
            <Button variant="outline" onClick={exportPDF}>
              <Printer className="mr-2 h-4 w-4" />
              Друк або PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {(loadError || reportErrors.length > 0) && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm print:hidden">
          <div className="font-semibold text-destructive">
            Не всі дані звіту вдалося завантажити
          </div>
          <div className="mt-1 text-muted-foreground">
            {loadError instanceof Error
              ? loadError.message
              : reportErrors.join(" · ")}
          </div>
        </div>
      )}

      <div className="report-preview-shell rounded-xl bg-slate-200/70 p-3 sm:p-6 print:bg-transparent print:p-0">
        <section className="report-document mx-auto box-border w-full max-w-[210mm] min-h-[297mm] bg-white p-[12mm] text-slate-950 shadow-xl print:min-h-0 print:max-w-none print:p-0 print:shadow-none">
          <ReportHeader
            template={template}
            rangeLabel={rangeLabel}
            generatedAt={reportGeneratedAt}
            criteriaLabel={criteriaLabel}
            preparedBy={preparedBy}
          />

          {(isLoading || isGeneratingPreview) && (
            <div className="report-loading-banner mt-6 flex items-start gap-3 rounded-md border border-slate-400 bg-slate-100 px-4 py-4 print:hidden">
              <LoaderCircle className="mt-0.5 h-5 w-5 animate-spin text-slate-700" />
              <div>
                <div className="font-semibold">Формуємо звіт у форматі A4</div>
                <div className="text-sm text-slate-600">
                  Систематизуємо таблиці, перевіряємо межі сторінки та готуємо
                  документ до друку.
                </div>
              </div>
            </div>
          )}

          <div className="mt-6">{reportContent}</div>
        </section>
      </div>
    </div>
  );
}

function DateButton({
  label,
  date,
  onSelect,
}: {
  label: string;
  date: Date;
  onSelect: (date: Date) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("justify-start bg-transparent")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(date, "d MMM yyyy", { locale: uk })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(selected) => selected && onSelect(selected)}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function ReportHeader({
  template,
  rangeLabel,
  generatedAt,
  criteriaLabel,
  preparedBy,
}: {
  template: ReportTemplate;
  rangeLabel: string;
  generatedAt: Date;
  criteriaLabel: string;
  preparedBy: {
    name: string;
    role: string | null;
  };
}) {
  const report = REPORT_TEMPLATES[template];

  return (
    <div className="report-document-header flex flex-col gap-4 border-b border-slate-950 pb-5">
      <div className="grid grid-cols-[1fr_auto] items-start gap-4">
        <div className="min-w-0">
          <h2 className="report-title text-[22px] font-bold">{report.title}</h2>
          <p className="mt-2 max-w-3xl text-[14px] text-slate-700">
            {report.description}
          </p>
        </div>

        <div className="report-meta justify-self-end text-right text-[14px] leading-[1.5]">
          <p>
            <strong>Період:</strong> {rangeLabel}
          </p>
          <p>
            <strong>Тип:</strong> {report.shortTitle}
          </p>
          <p>
            <strong>Фільтр:</strong> {criteriaLabel}
          </p>
          <p>
            <strong>Дата формування:</strong>{" "}
            {format(generatedAt, "dd.MM.yyyy", { locale: uk })}
          </p>
          <p>
            <strong>Сформував(ла):</strong> {preparedBy.name || "—"}
          </p>
          <p>
            <strong>Посада:</strong> {formatRole(preparedBy.role)}
          </p>
        </div>
      </div>
    </div>
  );
}

function managerMetricRows(metrics: ReportMetrics): Array<[string, string]> {
  return [
    ["Дохід за оплатами", currencyFmt.format(metrics.revenue)],
    ["Вартість проживання", currencyFmt.format(metrics.reservationValue)],
    ["Нових бронювань", numberFmt.format(metrics.pickup)],
    ["Проданих номеро-ночей", numberFmt.format(metrics.soldNights)],
    ["Завантаженість", `${percentFmt.format(metrics.occupancyRate)}%`],
    ["ADR", currencyFmt.format(metrics.adr)],
    ["RevPAR", currencyFmt.format(metrics.revpar)],
    ["Гостей", numberFmt.format(metrics.guestCount)],
    [
      "Середня тривалість проживання (ALoS)",
      `${percentFmt.format(metrics.averageLengthOfStay)} дн.`,
    ],
    [
      "Середня кількість гостей у номері",
      percentFmt.format(metrics.doubleOccupancy),
    ],
  ];
}

function ManagerReport({
  metrics,
  previousMetrics,
  timeSeries,
  statusBreakdown,
  channelBreakdown,
}: {
  metrics: ReportMetrics;
  previousMetrics: ReportMetrics;
  timeSeries: Array<{
    label: string;
    revenue: number;
    reservations: number;
    soldNights: number;
  }>;
  statusBreakdown: Array<{ name: string; value: number }>;
  channelBreakdown: Array<{ name: string; value: number }>;
}) {
  return (
    <div className="grid gap-4">
      <MetricTable title="Поточний період" rows={managerMetricRows(metrics)} />
      <MetricTable
        title="Аналогічний період минулого року"
        rows={managerMetricRows(previousMetrics)}
      />
      <BreakdownCard title="Статуси бронювань" data={statusBreakdown} />
      <BreakdownCard title="Канали продажів" data={channelBreakdown} />
      <PeriodDataTable
        title="Динаміка за періодом"
        data={timeSeries}
        valueKey="revenue"
        valueLabel="Дохід"
        valueFormat={currencyFmt.format}
      />
    </div>
  );
}

type ForecastRow = {
  date: string;
  mode: string;
  totalRooms: number;
  roomsForSale: number;
  repairRooms: number;
  arrivals: number;
  departures: number;
  occupiedRooms: number;
  occupancyRate: number;
  arrivingPeople: number;
  peopleInHouse: number;
  departingPeople: number;
  roomRevenue: number;
  adr: number;
};

function ForecastReport({ rows }: { rows: ForecastRow[] }) {
  const totals = rows.reduce(
    (result, row) => ({
      arrivals: result.arrivals + row.arrivals,
      departures: result.departures + row.departures,
      occupiedRooms: result.occupiedRooms + row.occupiedRooms,
      arrivingPeople: result.arrivingPeople + row.arrivingPeople,
      peopleInHouse: result.peopleInHouse + row.peopleInHouse,
      departingPeople: result.departingPeople + row.departingPeople,
      roomRevenue: result.roomRevenue + row.roomRevenue,
    }),
    {
      arrivals: 0,
      departures: 0,
      occupiedRooms: 0,
      arrivingPeople: 0,
      peopleInHouse: 0,
      departingPeople: 0,
      roomRevenue: 0,
    }
  );

  return (
    <ReportTableCard title="Щоденний прогноз завантаженості">
      <div className="report-table-wrapper">
        <table className="report-table report-table-compact">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Тип</th>
              <th className="text-right">Всього</th>
              <th className="text-right">До продажу</th>
              <th className="text-right">Ремонт</th>
              <th className="text-right">Заїзд</th>
              <th className="text-right">Виїзд</th>
              <th className="text-right">Проживає</th>
              <th className="text-right">Завантаження</th>
              <th className="text-right">Людей заїзд</th>
              <th className="text-right">Людей проживає</th>
              <th className="text-right">Людей виїзд</th>
              <th className="text-right">Дохід проживання</th>
              <th className="text-right">Середній тариф</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.date}>
                <td className="font-semibold">
                  {format(new Date(`${row.date}T00:00:00`), "dd.MM.yyyy", {
                    locale: uk,
                  })}
                </td>
                <td>{row.mode}</td>
                <td className="text-right">{row.totalRooms}</td>
                <td className="text-right">{row.roomsForSale}</td>
                <td className="text-right">{row.repairRooms}</td>
                <td className="text-right">{row.arrivals}</td>
                <td className="text-right">{row.departures}</td>
                <td className="text-right">{row.occupiedRooms}</td>
                <td className="text-right font-semibold">
                  {percentFmt.format(row.occupancyRate)}%
                </td>
                <td className="text-right">{row.arrivingPeople}</td>
                <td className="text-right">{row.peopleInHouse}</td>
                <td className="text-right">{row.departingPeople}</td>
                <td className="text-right">
                  {currencyFmt.format(row.roomRevenue)}
                </td>
                <td className="text-right">{currencyFmt.format(row.adr)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th colSpan={5}>Разом / середнє</th>
              <th className="text-right">{totals.arrivals}</th>
              <th className="text-right">{totals.departures}</th>
              <th className="text-right">{totals.occupiedRooms}</th>
              <th className="text-right">
                {percentFmt.format(
                  rows.length > 0
                    ? rows.reduce((sum, row) => sum + row.occupancyRate, 0) /
                        rows.length
                    : 0
                )}
                %
              </th>
              <th className="text-right">{totals.arrivingPeople}</th>
              <th className="text-right">{totals.peopleInHouse}</th>
              <th className="text-right">{totals.departingPeople}</th>
              <th className="text-right">
                {currencyFmt.format(totals.roomRevenue)}
              </th>
              <th className="text-right">
                {currencyFmt.format(
                  totals.occupiedRooms > 0
                    ? totals.roomRevenue / totals.occupiedRooms
                    : 0
                )}
              </th>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="px-4 py-3 text-xs text-slate-500">
        Статуси «ремонт» і «до продажу» відображають поточний стан номерного
        фонду на момент формування звіту.
      </p>
    </ReportTableCard>
  );
}

function GuestMovementReport({
  mode,
  reservations,
  payments,
}: {
  mode: "arrivals" | "departures";
  reservations: ReportReservation[];
  payments: ReportPayment[];
}) {
  const title =
    mode === "arrivals" ? "Реєстр прибуття гостей" : "Реєстр виїзду гостей";
  const totalPeople = reservations.reduce(
    (sum, reservation) => sum + reservationPeopleCount(reservation),
    0
  );
  const totalBalance = reservations.reduce(
    (sum, reservation) =>
      sum +
      Math.max(
        0,
        toNumber(reservation.total_amount) - toNumber(reservation.paid_amount)
      ),
    0
  );

  return (
    <ReportTableCard title={title}>
      {reservations.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="report-table-wrapper">
          <table className="report-table">
            <thead>
              <tr>
                <th>Рахунок</th>
                <th>Категорія</th>
                <th>Номер</th>
                <th>Гість</th>
                <th>Заїзд</th>
                <th>Виїзд</th>
                <th className="text-right">Дор./діти</th>
                <th>Оплата</th>
                <th>Тариф</th>
                <th className="text-right">Залишок</th>
                <th>Канал</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((reservation) => {
                const room = reservation.reservation_rooms?.[0];
                const folio = reservation.folios?.[0];
                const reservationPayments = payments.filter(
                  (payment) => payment.reservation_id === reservation.id
                );
                const paymentMethods = Array.from(
                  new Set(
                    reservationPayments
                      .filter((payment) => signedPaymentAmount(payment) !== 0)
                      .map((payment) =>
                        formatPaymentMethod(payment.payment_method)
                      )
                  )
                );

                return (
                  <tr key={reservation.id}>
                    <td className="font-semibold">
                      {folio?.folio_number ??
                        reservation.reservation_number ??
                        "—"}
                    </td>
                    <td>{room?.rooms?.room_types?.name ?? "—"}</td>
                    <td>{room?.rooms?.room_number ?? "Не призначено"}</td>
                    <td>{reservationGuestName(reservation)}</td>
                    <td>{formatDateKey(reservation.check_in_date)}</td>
                    <td>{formatDateKey(reservation.check_out_date)}</td>
                    <td className="text-right">
                      {reservation.adults ?? 0}/{reservation.children ?? 0}
                    </td>
                    <td>{paymentMethods.join(", ") || "Не оплачено"}</td>
                    <td>{reservation.rate_plans?.name ?? "—"}</td>
                    <td className="text-right font-semibold">
                      {currencyFmt.format(
                        Math.max(
                          0,
                          toNumber(reservation.total_amount) -
                            toNumber(reservation.paid_amount)
                        )
                      )}
                    </td>
                    <td>{reservation.channel?.trim() || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={2}>Разом</th>
                <th className="text-right">{reservations.length} номерів</th>
                <th colSpan={3} />
                <th className="text-right">{totalPeople} людей</th>
                <th colSpan={2} />
                <th className="text-right">
                  {currencyFmt.format(totalBalance)}
                </th>
                <th />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </ReportTableCard>
  );
}

function InHouseReport({
  reservations,
  payments,
}: {
  reservations: ReportReservation[];
  payments: ReportPayment[];
}) {
  return (
    <ReportTableCard title="Гості, що проживають у вибраному періоді">
      {reservations.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="report-table-wrapper">
          <table className="report-table">
            <thead>
              <tr>
                <th>Номер</th>
                <th>Категорія</th>
                <th>Гість</th>
                <th>Folio</th>
                <th className="text-right">Людей</th>
                <th>Заїзд</th>
                <th>Виїзд</th>
                <th className="text-right">Ночей</th>
                <th>Тариф</th>
                <th className="text-right">Нараховано</th>
                <th className="text-right">Оплачено</th>
                <th className="text-right">Баланс</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((reservation) => {
                const room = reservation.reservation_rooms?.[0];
                const folio = reservation.folios?.[0];
                const paid = payments
                  .filter(
                    (payment) => payment.reservation_id === reservation.id
                  )
                  .reduce(
                    (sum, payment) => sum + signedPaymentAmount(payment),
                    0
                  );
                const charged = toNumber(
                  folio?.total_amount ?? reservation.total_amount
                );

                return (
                  <tr key={reservation.id}>
                    <td>{room?.rooms?.room_number ?? "—"}</td>
                    <td>{room?.rooms?.room_types?.name ?? "—"}</td>
                    <td className="font-semibold">
                      {reservationGuestName(reservation)}
                    </td>
                    <td>{folio?.folio_number ?? "—"}</td>
                    <td className="text-right">
                      {reservationPeopleCount(reservation)}
                    </td>
                    <td>{formatDateKey(reservation.check_in_date)}</td>
                    <td>{formatDateKey(reservation.check_out_date)}</td>
                    <td className="text-right">
                      {reservationNights(reservation)}
                    </td>
                    <td>{reservation.rate_plans?.name ?? "—"}</td>
                    <td className="text-right">
                      {currencyFmt.format(charged)}
                    </td>
                    <td className="text-right">{currencyFmt.format(paid)}</td>
                    <td className="text-right font-semibold">
                      {currencyFmt.format(Math.max(0, charged - paid))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </ReportTableCard>
  );
}

type RoomCategoryRow = {
  id: string;
  name: string;
  roomCount: number;
  roomsOutOfService: number;
  soldNights: number;
  guests: number;
  personNights: number;
  arrivals: number;
  departures: number;
  revenue: number;
};

function RoomCategoriesReport({
  rows,
  days,
}: {
  rows: RoomCategoryRow[];
  days: number;
}) {
  return (
    <ReportTableCard title="Завантаженість та доходи за категоріями номерів">
      <div className="report-table-wrapper">
        <table className="report-table">
          <thead>
            <tr>
              <th>Категорія</th>
              <th className="text-right">Номеро-днів</th>
              <th className="text-right">На ремонті</th>
              <th className="text-right">Продано днів</th>
              <th className="text-right">Завантаженість</th>
              <th className="text-right">Бронювань</th>
              <th className="text-right">Людино-діб</th>
              <th className="text-right">Людей заїхало</th>
              <th className="text-right">Людей виїхало</th>
              <th className="text-right">Дохід</th>
              <th className="text-right">Середній тариф</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const availableRoomNights =
                Math.max(0, row.roomCount - row.roomsOutOfService) * days;
              return (
                <tr key={row.id}>
                  <td className="font-semibold">{row.name}</td>
                  <td className="text-right">{row.roomCount * days}</td>
                  <td className="text-right">{row.roomsOutOfService * days}</td>
                  <td className="text-right">{row.soldNights}</td>
                  <td className="text-right">
                    {percentFmt.format(
                      availableRoomNights > 0
                        ? (row.soldNights / availableRoomNights) * 100
                        : 0
                    )}
                    %
                  </td>
                  <td className="text-right">{row.guests}</td>
                  <td className="text-right">{row.personNights}</td>
                  <td className="text-right">{row.arrivals}</td>
                  <td className="text-right">{row.departures}</td>
                  <td className="text-right">
                    {currencyFmt.format(row.revenue)}
                  </td>
                  <td className="text-right">
                    {currencyFmt.format(
                      row.soldNights > 0 ? row.revenue / row.soldNights : 0
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ReportTableCard>
  );
}

function RevenueReport({
  metrics,
  timeSeries,
  methodBreakdown,
  chargeBreakdown,
}: {
  metrics: ReportMetrics;
  timeSeries: Array<{
    label: string;
    revenue: number;
    reservations: number;
    soldNights: number;
  }>;
  methodBreakdown: Array<{ name: string; value: number }>;
  chargeBreakdown: Array<{ name: string; quantity: number; amount: number }>;
}) {
  return (
    <div className="grid gap-4">
      <MetricTable
        title="Фінансовий контроль"
        rows={[
          ["Грошовий потік", currencyFmt.format(metrics.revenue)],
          ["Повернення", currencyFmt.format(metrics.refunds)],
          ["ADR", currencyFmt.format(metrics.adr)],
          ["RevPAR", currencyFmt.format(metrics.revpar)],
        ]}
      />
      <BreakdownCard
        title="Структура оплат"
        data={methodBreakdown.map((item) => ({
          name: item.name,
          value: item.value,
        }))}
      />
      <ReportTableCard title="Нарахування за групами послуг">
        {chargeBreakdown.length === 0 ? (
          <EmptyState />
        ) : (
          <table className="report-table">
            <thead>
              <tr>
                <th>Група послуг</th>
                <th className="text-right">Кількість</th>
                <th className="text-right">Сума</th>
              </tr>
            </thead>
            <tbody>
              {chargeBreakdown.map((item) => (
                <tr key={item.name}>
                  <td>{item.name}</td>
                  <td className="text-right">
                    {numberFmt.format(item.quantity)}
                  </td>
                  <td className="text-right font-semibold">
                    {currencyFmt.format(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ReportTableCard>
      <PeriodDataTable
        title="Реєстр доходу за періодами"
        data={timeSeries}
        valueKey="revenue"
        valueLabel="Дохід"
        valueFormat={currencyFmt.format}
      />
    </div>
  );
}

function ReservationsReport({
  metrics,
  timeSeries,
  statusBreakdown,
  channelBreakdown,
  reservations,
}: {
  metrics: ReportMetrics;
  timeSeries: Array<{
    label: string;
    revenue: number;
    reservations: number;
    soldNights: number;
  }>;
  statusBreakdown: Array<{ name: string; value: number }>;
  channelBreakdown: Array<{ name: string; value: number }>;
  reservations: ReportReservation[];
}) {
  return (
    <div className="grid gap-4">
      <BreakdownCard title="Статуси" data={statusBreakdown} />
      <BreakdownCard title="Канали продажів" data={channelBreakdown} />
      <MetricTable
        title="Якість попиту"
        rows={[
          ["Усього бронювань", numberFmt.format(reservations.length)],
          ["Нових бронювань", numberFmt.format(metrics.pickup)],
          ["Скасовано / no-show", numberFmt.format(metrics.cancellationCount)],
          [
            "Cancellation rate",
            `${percentFmt.format(metrics.cancellationRate)}%`,
          ],
          ["Гостей у живих бронюваннях", numberFmt.format(metrics.guestCount)],
        ]}
      />
      <PeriodDataTable
        title="Пікап бронювань за періодом"
        data={timeSeries}
        valueKey="soldNights"
        valueLabel="Продані ночі"
        valueFormat={numberFmt.format}
      />
      <ReservationsRegistry reservations={reservations} />
    </div>
  );
}

function FoliosReport({
  metrics,
  folios,
}: {
  metrics: ReportMetrics;
  folios: ReportFolio[];
}) {
  const closed = folios.filter((folio) => toNumber(folio.balance) <= 0).length;
  const totalBilled = folios.reduce(
    (sum, folio) => sum + toNumber(folio.total_charges ?? folio.total_amount),
    0
  );
  const totalPaid = folios.reduce(
    (sum, folio) => sum + toNumber(folio.total_payments ?? folio.paid_amount),
    0
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.4fr]">
      <MetricTable
        title="Контроль рахунків"
        rows={[
          ["Рахунків у реєстрі", numberFmt.format(folios.length)],
          ["Закриті / без боргу", numberFmt.format(closed)],
          ["Відкриті до сплати", numberFmt.format(metrics.openFolios)],
          ["Нараховано", currencyFmt.format(totalBilled)],
          ["Оплачено", currencyFmt.format(totalPaid)],
          ["Баланс до сплати", currencyFmt.format(metrics.openBalance)],
        ]}
      />
      <Card className="report-table-card">
        <CardHeader className="report-table-title">
          <CardTitle className="text-base">Реєстр рахунків за період</CardTitle>
        </CardHeader>
        <CardContent>
          {folios.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="report-table-wrapper">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Рахунок</th>
                    <th>Дата</th>
                    <th>Гість</th>
                    <th>Бронювання</th>
                    <th className="text-right">Нараховано</th>
                    <th className="text-right">Оплачено</th>
                    <th className="text-right">Баланс</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {folios.map((folio) => (
                    <tr key={folio.id}>
                      <td className="font-semibold">
                        {folio.folio_number ?? "—"}
                      </td>
                      <td>
                        {folio.created_at
                          ? formatDateKey(folio.created_at)
                          : "—"}
                      </td>
                      <td>{folioGuestName(folio)}</td>
                      <td>{folio.reservations?.reservation_number ?? "—"}</td>
                      <td className="text-right">
                        {currencyFmt.format(
                          toNumber(folio.total_charges ?? folio.total_amount)
                        )}
                      </td>
                      <td className="text-right">
                        {currencyFmt.format(
                          toNumber(folio.total_payments ?? folio.paid_amount)
                        )}
                      </td>
                      <td className="text-right font-semibold">
                        {currencyFmt.format(toNumber(folio.balance))}
                      </td>
                      <td>{formatPaymentStatus(folio.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CancellationsReport({
  reservations,
}: {
  reservations: ReportReservation[];
}) {
  const lostValue = reservations.reduce(
    (sum, reservation) => sum + toNumber(reservation.total_amount),
    0
  );
  const refunded = reservations.reduce(
    (sum, reservation) => sum + toNumber(reservation.paid_amount),
    0
  );

  return (
    <ReportTableCard title="Ануляції бронювань за період">
      {reservations.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="report-table-wrapper">
          <table className="report-table">
            <thead>
              <tr>
                <th>Бронювання</th>
                <th>Гість</th>
                <th>Заплановане проживання</th>
                <th>Причина</th>
                <th>Дата ануляції</th>
                <th>Анулював(ла)</th>
                <th className="text-right">Вартість</th>
                <th className="text-right">Було сплачено</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((reservation) => (
                <tr key={reservation.id}>
                  <td className="font-semibold">
                    {reservation.reservation_number ?? "—"}
                  </td>
                  <td>{reservationGuestName(reservation)}</td>
                  <td>
                    {formatDateKey(reservation.check_in_date)} -{" "}
                    {formatDateKey(reservation.check_out_date)}
                  </td>
                  <td>{reservation.cancellation_reason ?? "Не вказано"}</td>
                  <td>
                    {reservation.cancelled_at
                      ? formatDateTimeKey(reservation.cancelled_at)
                      : "—"}
                  </td>
                  <td>{profileName(reservation.canceller)}</td>
                  <td className="text-right">
                    {currencyFmt.format(toNumber(reservation.total_amount))}
                  </td>
                  <td className="text-right">
                    {currencyFmt.format(toNumber(reservation.paid_amount))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={6}>Разом: {reservations.length} ануляцій</th>
                <th className="text-right">{currencyFmt.format(lostValue)}</th>
                <th className="text-right">{currencyFmt.format(refunded)}</th>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </ReportTableCard>
  );
}

function ReportTableCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="report-table-card">
      <CardHeader className="report-table-title">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function BreakdownCard({
  title,
  data,
}: {
  title: string;
  data: Array<{ name: string; value: number }>;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="report-table-card">
      <CardHeader className="report-table-title">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState />
        ) : (
          <table className="report-table">
            <thead>
              <tr>
                <th>{title}</th>
                <th className="text-right">Кількість</th>
                <th className="text-right">Частка</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.name}>
                  <td>{item.name}</td>
                  <td className="text-right font-semibold">
                    {numberFmt.format(item.value)}
                  </td>
                  <td className="text-right">
                    {percentFmt.format(
                      total > 0 ? (item.value / total) * 100 : 0
                    )}
                    %
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

function MetricTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <Card className="report-table-card">
      <CardHeader className="report-table-title">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <table className="report-table">
          <thead>
            <tr>
              <th>Показник</th>
              <th className="text-right">Значення</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label}>
                <td>{label}</td>
                <td className="text-right font-semibold">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function PeriodDataTable({
  title,
  data,
  valueKey,
  valueLabel,
  valueFormat,
}: {
  title: string;
  data: Array<{
    label: string;
    revenue: number;
    reservations: number;
    soldNights: number;
  }>;
  valueKey: "revenue" | "soldNights";
  valueLabel: string;
  valueFormat: (value: number) => string;
}) {
  return (
    <Card className="report-table-card xl:col-span-2">
      <CardHeader className="report-table-title">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState />
        ) : (
          <table className="report-table">
            <thead>
              <tr>
                <th>Період</th>
                <th className="text-right">{valueLabel}</th>
                <th className="text-right">Бронювання</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.label}>
                  <td>{item.label}</td>
                  <td className="text-right font-semibold">
                    {valueFormat(item[valueKey])}
                  </td>
                  <td className="text-right">
                    {numberFmt.format(item.reservations)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

function ReservationsRegistry({
  reservations,
}: {
  reservations: ReportReservation[];
}) {
  return (
    <Card className="report-table-card xl:col-span-2">
      <CardHeader className="report-table-title">
        <CardTitle className="text-base">Реєстр бронювань</CardTitle>
      </CardHeader>
      <CardContent>
        {reservations.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="report-table-wrapper">
            <table className="report-table">
              <thead>
                <tr>
                  <th>№</th>
                  <th>Гість</th>
                  <th>Заїзд</th>
                  <th>Виїзд</th>
                  <th>Статус</th>
                  <th>Канал</th>
                  <th className="text-right">Сума</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((reservation) => (
                  <tr key={reservation.id}>
                    <td className="font-semibold">
                      {reservation.reservation_number ?? "—"}
                    </td>
                    <td>{reservationGuestName(reservation)}</td>
                    <td>
                      {format(
                        new Date(reservation.check_in_date),
                        "dd.MM.yyyy"
                      )}
                    </td>
                    <td>
                      {format(
                        new Date(reservation.check_out_date),
                        "dd.MM.yyyy"
                      )}
                    </td>
                    <td>{formatReservationStatus(reservation.status)}</td>
                    <td>{reservation.channel?.trim() || "—"}</td>
                    <td className="text-right font-semibold">
                      {currencyFmt.format(toNumber(reservation.total_amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function reservationGuestName(reservation: ReportReservation) {
  const guest = reservation.guests;
  return guest?.first_name || guest?.last_name
    ? `${guest.first_name ?? ""} ${guest.last_name ?? ""}`.trim()
    : "—";
}

function profileName(
  profile?: { first_name?: string | null; last_name?: string | null } | null
) {
  if (!profile?.first_name && !profile?.last_name) return "Не зафіксовано";
  return `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
}

function formatDateKey(value: string) {
  return format(new Date(`${value.slice(0, 10)}T00:00:00`), "dd.MM.yyyy");
}

function formatDateTimeKey(value: string) {
  return format(new Date(value), "dd.MM.yyyy HH:mm");
}

function EmptyState() {
  return (
    <div className="flex min-h-[120px] items-center justify-center text-sm text-muted-foreground">
      Немає даних для обраного періоду
    </div>
  );
}
