"use client"

import { useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDateTime } from "@/lib/localization"
import { PAYMENT_METHOD_UK, PAYMENT_STATUS_UK } from "@/lib/i18n/uk"
import type { PaymentMethod } from "@/lib/types"

interface Payment {
  id: string
  amount: number
  payment_method: string
  transaction_type?: string | null
  payment_status?: string | null
  transaction_id?: string | null
  payment_date?: string | null
  notes: string | null
  created_at: string
  reservations?: {
    reservation_number: string
    guests: {
      first_name: string
      last_name: string
    } | null
  } | null
  folios: {
    reservation_id: string
    reservations: {
      reservation_number: string
      guests: {
        first_name: string
        last_name: string
      }
    }
  } | null
}

const paymentMethods = Object.keys(PAYMENT_METHOD_UK) as PaymentMethod[]
const paymentMethodLabels = PAYMENT_METHOD_UK

const paymentMethodMeta: Record<PaymentMethod, { icon: string; colorClassName: string; description: string }> = {
  cash: {
    icon: "₴",
    colorClassName: "bg-green-100 text-green-800",
    description: "Оплата готівкою.",
  },
  card_terminal: {
    icon: "💳",
    colorClassName: "bg-blue-100 text-blue-800",
    description: "Оплата карткою через термінал.",
  },
  bank_transfer_iban: {
    icon: "↗",
    colorClassName: "bg-orange-100 text-orange-800",
    description: "Оплата банківським переказом за IBAN.",
  },
}

const transactionTypes = ["payment", "refund", "adjustment"]

const transactionTypeLabels = {
  payment: "Оплата",
  refund: "Повернення",
  adjustment: "Коригування",
}

const transactionTypeMeta = {
  payment: {
    icon: "+",
    colorClassName: "bg-green-100 text-green-800",
    description: "Надходження коштів.",
  },
  refund: {
    icon: "↺",
    colorClassName: "bg-red-100 text-red-800",
    description: "Повернення коштів.",
  },
  adjustment: {
    icon: "≡",
    colorClassName: "bg-slate-100 text-slate-700",
    description: "Ручне коригування.",
  },
}

function getPaymentReservation(payment: Payment) {
  return payment.reservations ?? payment.folios?.reservations ?? null
}

function getTransactionType(payment: Payment) {
  if (payment.transaction_type) {
    return payment.transaction_type
  }

  if (payment.payment_status === "refunded") {
    return "refund"
  }

  return "payment"
}

function getDisplayAmount(payment: Payment) {
  if (payment.payment_status === "refunded" || payment.transaction_type === "refund") {
    return -Math.abs(Number(payment.amount ?? 0))
  }

  return Number(payment.amount ?? 0)
}

export function PaymentsTable({ payments }: { payments: Payment[] }) {
  const columns = useMemo<ColumnDef<Payment>[]>(
    () => [
      {
        accessorKey: "created_at",
        header: "Дата й час",
        cell: ({ row }) => formatDateTime(row.original.created_at),
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
            asc: "Найстаріші платежі спочатку",
            desc: "Найновіші платежі спочатку",
          },
          minWidth: 160,
        },
      },
      {
        id: "guest",
        accessorFn: (row) => {
          const guest = getPaymentReservation(row)?.guests
          return guest ? `${guest.first_name} ${guest.last_name}` : ""
        },
        header: "Гість",
        cell: ({ row }) => {
          const guest = getPaymentReservation(row.original)?.guests
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
        accessorFn: (row) => getPaymentReservation(row)?.reservation_number ?? "",
        header: "Бронювання",
        cell: ({ row }) => getPaymentReservation(row.original)?.reservation_number ?? "—",
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
        accessorKey: "amount",
        header: "Сума",
        cell: ({ row }) => {
          const amount = getDisplayAmount(row.original)
          const isPending = row.original.payment_status === "pending"

          return (
            <span className={isPending ? "font-bold text-amber-700" : amount < 0 ? "font-bold text-red-600" : "font-bold text-green-600"}>
              {formatCurrency(amount)}
            </span>
          )
        },
        meta: {
          sortable: true,
          filterable: true,
          filterType: "number",
          searchable: false,
          dataType: "number",
          sortLabel: {
            asc: "Сума: за зростанням",
            desc: "Сума: за спаданням",
          },
          minWidth: 120,
        },
      },
      {
        accessorKey: "payment_status",
        header: "Статус",
        cell: ({ row }) => {
          const status = row.original.payment_status ?? "pending"
          return (
            <Badge variant={status === "pending" ? "secondary" : "outline"}>
              {PAYMENT_STATUS_UK[status as keyof typeof PAYMENT_STATUS_UK] ?? status}
            </Badge>
          )
        },
        meta: {
          sortable: true,
          filterable: true,
          filterType: "checkbox",
          searchable: false,
          dataType: "enum",
          filterOptions: Object.keys(PAYMENT_STATUS_UK),
          filterLabels: PAYMENT_STATUS_UK,
          minWidth: 140,
        },
      },
      {
        accessorKey: "payment_method",
        header: "Спосіб",
        cell: ({ row }) => {
          const method = row.original.payment_method as PaymentMethod
          const meta = paymentMethodMeta[method]

          return (
            <Badge variant="outline" className={`whitespace-nowrap ${meta?.colorClassName ?? ""}`}>
              {meta?.icon && <span aria-hidden="true">{meta.icon}</span>}
              {paymentMethodLabels[method] ?? row.original.payment_method}
            </Badge>
          )
        },
        meta: {
          sortable: true,
          filterable: true,
          filterType: "checkbox",
          searchable: false,
          dataType: "enum",
          filterOptions: paymentMethods,
          filterLabels: paymentMethodLabels,
          filterOptionMeta: paymentMethodMeta,
          preserveFilterOptionOrder: true,
          minWidth: 160,
        },
      },
      {
        id: "transaction_type",
        accessorFn: (row) => getTransactionType(row),
        header: "Тип",
        cell: ({ row }) => {
          const transactionType = getTransactionType(row.original)
          const meta = transactionTypeMeta[transactionType as keyof typeof transactionTypeMeta]

          return (
            <Badge variant="secondary" className={`whitespace-nowrap ${meta?.colorClassName ?? ""}`}>
              {meta?.icon && <span aria-hidden="true">{meta.icon}</span>}
              {transactionTypeLabels[transactionType as keyof typeof transactionTypeLabels] ?? transactionType}
            </Badge>
          )
        },
        meta: {
          sortable: true,
          filterable: true,
          filterType: "checkbox",
          searchable: false,
          dataType: "enum",
          filterOptions: transactionTypes,
          filterLabels: transactionTypeLabels,
          filterOptionMeta: transactionTypeMeta,
          preserveFilterOptionOrder: true,
          minWidth: 140,
        },
      },
      {
        id: "notes",
        accessorFn: (row) => [row.transaction_id, row.notes].filter(Boolean).join(" "),
        header: "Примітки",
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">
            {row.original.transaction_id && <p>Інструкція №{row.original.transaction_id}</p>}
            <p>{row.original.notes || "—"}</p>
          </div>
        ),
        meta: {
          sortable: false,
          filterable: false,
          searchable: true,
          filterType: false,
          dataType: "text",
          searchPlaceholder: "Примітки, призначення платежу",
          minWidth: 220,
        },
      },
    ],
    [],
  )

  return <DataTable columns={columns} data={payments} searchPlaceholder="Пошук за гостем, бронюванням або примітками..." enableMultiSort />
}
