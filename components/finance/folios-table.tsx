"use client"

import { useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"

import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate, formatDateTime, formatPaymentStatus } from "@/lib/localization"

interface Folio {
  id: string
  folio_number: string
  status: string
  total_charges: number
  total_payments: number
  total_refunds?: number
  pending_payment_amount?: number
  pending_refund_amount?: number
  balance: number
  financial_state?: string
  is_closed?: boolean
  created_at: string
  updated_at: string | null
  guests: {
    first_name: string
    last_name: string
  } | null
  reservations: {
    reservation_number: string
    check_in_date: string
    check_out_date: string
  } | null
}

const folioStatuses = [
  "awaiting_payment",
  "partially_paid",
  "balanced",
  "overpaid",
  "awaiting_refund",
  "pending_transaction",
]

const folioStatusLabels = {
  awaiting_payment: "Очікує оплату",
  partially_paid: "Частково оплачено",
  balanced: "Збалансований",
  overpaid: "Переплата",
  awaiting_refund: "Очікує повернення",
  pending_transaction: "Очікується операція",
}

const folioStatusMeta = {
  awaiting_payment: {
    icon: "!",
    colorClassName: "bg-yellow-100 text-yellow-800",
    description: "Оплати за рахунком ще немає.",
  },
  partially_paid: {
    icon: "◔",
    colorClassName: "bg-blue-100 text-blue-800",
    description: "Є часткова оплата.",
  },
  balanced: {
    icon: "✓",
    colorClassName: "bg-green-100 text-green-800",
    description: "Баланс рахунку дорівнює нулю.",
  },
  overpaid: {
    icon: "−",
    colorClassName: "bg-rose-100 text-rose-800",
    description: "Є сума до повернення гостю.",
  },
  awaiting_refund: {
    icon: "↺",
    colorClassName: "bg-orange-100 text-orange-800",
    description: "Повернення створено, але ще не виконано.",
  },
  pending_transaction: {
    icon: "…",
    colorClassName: "bg-slate-100 text-slate-700",
    description: "Є непідтверджена фінансова операція.",
  },
}

interface FoliosTableProps {
  folios: Folio[]
  showAll?: boolean
  totalCount?: number
  openCount?: number
}

export function FoliosTable({ folios, showAll = false, totalCount = folios.length, openCount = folios.length }: FoliosTableProps) {
  const columns = useMemo<ColumnDef<Folio>[]>(
    () => [
      {
        accessorKey: "folio_number",
        header: "Рахунок",
        cell: ({ row }) => <span className="font-medium">{row.original.folio_number}</span>,
        meta: {
          sortable: true,
          filterable: true,
          searchable: true,
          filterType: "search",
          dataType: "text",
          searchPlaceholder: "Номер рахунку",
          sortLabel: {
            asc: "Рахунок А-Я",
            desc: "Рахунок Я-А",
          },
          minWidth: 130,
        },
      },
      {
        id: "guest",
        accessorFn: (row) => {
          const guest = row.guests
          return guest ? `${guest.first_name} ${guest.last_name}` : ""
        },
        header: "Гість",
        cell: ({ row }) => {
          const guest = row.original.guests

          return <span className="font-medium">{guest ? `${guest.first_name} ${guest.last_name}` : "—"}</span>
        },
        meta: {
          sortable: true,
          filterable: true,
          searchable: true,
          filterType: "search",
          dataType: "text",
          searchPlaceholder: "Ім’я або прізвище гостя",
          filterHelpText: "Пошук працює окремо по імені та прізвищу.",
          sortLabel: {
            asc: "Гості А-Я",
            desc: "Гості Я-А",
          },
          minWidth: 200,
        },
      },
      {
        id: "reservation_number",
        header: "Бронювання",
        accessorFn: (row) => row.reservations?.reservation_number ?? "",
        cell: ({ row }) => row.original.reservations?.reservation_number ?? "—",
        meta: {
          sortable: true,
          filterable: true,
          searchable: true,
          filterType: "search",
          dataType: "text",
          searchPlaceholder: "Номер бронювання",
          filterHelpText: "Можна шукати повний номер або частину номера.",
          sortLabel: {
            asc: "Номер бронювання А-Я",
            desc: "Номер бронювання Я-А",
          },
          minWidth: 140,
        },
      },
      {
        accessorFn: (row) => row.reservations?.check_in_date ?? "",
        id: "check_in_date",
        header: "Заїзд",
        cell: ({ row }) => formatDate(row.original.reservations?.check_in_date),
        meta: {
          sortable: true,
          filterable: true,
          filterType: "dateRange",
          searchable: false,
          dataType: "date",
          datePresets: [
            { value: "today", label: "Сьогодні" },
            { value: "thisWeek", label: "Цього тижня" },
            { value: "thisMonth", label: "Цього місяця" },
          ],
          sortLabel: {
            asc: "Найстаріші заїзди спочатку",
            desc: "Найновіші заїзди спочатку",
          },
          minWidth: 130,
        },
      },
      {
        accessorFn: (row) => row.reservations?.check_out_date ?? "",
        id: "check_out_date",
        header: "Виїзд",
        cell: ({ row }) => formatDate(row.original.reservations?.check_out_date),
        meta: {
          sortable: true,
          filterable: true,
          filterType: "dateRange",
          searchable: false,
          dataType: "date",
          datePresets: [
            { value: "todayDepartures", label: "Виїзд сьогодні" },
            { value: "tomorrowDepartures", label: "Виїзд завтра" },
          ],
          sortLabel: {
            asc: "Найближчі виїзди спочатку",
            desc: "Найпізніші виїзди спочатку",
          },
          minWidth: 130,
        },
      },
      {
        accessorKey: "total_charges",
        header: "Нарахування",
        cell: ({ row }) => formatCurrency(row.original.total_charges),
        meta: {
          sortable: true,
          filterable: true,
          filterType: "number",
          searchable: false,
          dataType: "number",
          sortLabel: {
            asc: "Нарахування: за зростанням",
            desc: "Нарахування: за спаданням",
          },
          minWidth: 130,
        },
      },
      {
        accessorKey: "total_payments",
        header: "Оплати",
        cell: ({ row }) => (
          <span className="font-medium text-green-600">{formatCurrency(row.original.total_payments)}</span>
        ),
        meta: {
          sortable: true,
          filterable: true,
          filterType: "number",
          searchable: false,
          dataType: "number",
          sortLabel: {
            asc: "Оплати: за зростанням",
            desc: "Оплати: за спаданням",
          },
          minWidth: 120,
        },
      },
      {
        accessorKey: "balance",
        header: "Баланс",
        cell: ({ row }) => (
          <span className={`font-bold ${row.original.balance > 0 ? "text-red-600" : "text-green-600"}`}>
            {formatCurrency(row.original.balance)}
          </span>
        ),
        meta: {
          sortable: true,
          filterable: true,
          filterType: "number",
          searchable: false,
          dataType: "number",
          sortLabel: {
            asc: "Баланс: від меншого до більшого",
            desc: "Баланс: від більшого до меншого",
          },
          minWidth: 120,
        },
      },
      {
        accessorKey: "financial_state",
        header: "Фінансовий стан",
        cell: ({ row }) => {
          const status = (row.original.financial_state ?? "balanced") as keyof typeof folioStatusMeta
          const meta = folioStatusMeta[status]

          return (
            <Badge variant="outline" className={`whitespace-nowrap ${meta?.colorClassName ?? ""}`}>
              {meta?.icon && <span aria-hidden="true">{meta.icon}</span>}
              {folioStatusLabels[status] ?? formatPaymentStatus(row.original.status)}
            </Badge>
          )
        },
        meta: {
          sortable: true,
          filterable: true,
          filterType: "checkbox",
          searchable: false,
          dataType: "enum",
          filterOptions: folioStatuses,
          filterLabels: folioStatusLabels,
          filterOptionMeta: folioStatusMeta,
          preserveFilterOptionOrder: true,
          minWidth: 160,
        },
      },
      {
        accessorKey: "is_closed",
        header: "Рахунок",
        cell: ({ row }) => (
          <Badge variant={row.original.is_closed ? "secondary" : "outline"}>
            {row.original.is_closed ? "Закритий" : "Відкритий"}
          </Badge>
        ),
        meta: {
          sortable: true,
          filterable: true,
          filterType: "checkbox",
          searchable: false,
          dataType: "enum",
          filterOptions: ["false", "true"],
          filterLabels: { false: "Відкритий", true: "Закритий" },
          minWidth: 120,
        },
      },
      {
        accessorKey: "updated_at",
        header: "Остання активність",
        cell: ({ row }) => formatDateTime(row.original.updated_at ?? row.original.created_at),
        meta: {
          sortable: true,
          filterable: true,
          filterType: "dateRange",
          searchable: false,
          dataType: "date",
          datePresets: [
            { value: "today", label: "Сьогодні" },
            { value: "thisWeek", label: "Цього тижня" },
            { value: "thisMonth", label: "Цього місяця" },
          ],
          sortLabel: {
            asc: "Найдавніша активність спочатку",
            desc: "Найновіша активність спочатку",
          },
          minWidth: 180,
        },
      },
    ],
    [],
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant={showAll ? "outline" : "default"} size="sm" asChild>
            <Link href="/dashboard/finance?tab=folios">Тільки відкриті ({openCount})</Link>
          </Button>
          <Button variant={showAll ? "default" : "outline"} size="sm" asChild>
            <Link href="/dashboard/finance?tab=folios&folios=all">Усі рахунки ({totalCount})</Link>
          </Button>
        </div>
      </div>

      <DataTable columns={columns} data={folios} searchPlaceholder="Пошук за рахунком, гостем або бронюванням..." enableMultiSort />
    </div>
  )
}
