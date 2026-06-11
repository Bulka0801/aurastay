"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Edit,
  Eye,
  LogIn,
  LogOut,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import { formatCurrency, formatDate, formatReservationStatus } from "@/lib/localization"
import { useMemo } from "react"

interface Reservation {
  id: string
  reservation_number: string
  check_in_date: string
  check_out_date: string
  status: string
  total_amount: number
  adults: number
  children: number
  guests: {
    first_name: string
    last_name: string
    email: string | null
    phone: string | null
  } | null
  rate_plans: {
    name: string
  } | null
  reservation_rooms: Array<{
    rooms: {
      room_number: string
      floor?: number | null
      room_type?: {
        name: string
      } | null
    } | null
  }>
}

const statusColors: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  checked_in: "bg-green-100 text-green-800 hover:bg-green-100",
  checked_out: "bg-slate-100 text-slate-700 hover:bg-slate-100",
  cancelled: "bg-red-100 text-red-800 hover:bg-red-100",
  no_show: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
}

const statusIcons: Record<string, typeof CheckCircle2> = {
  confirmed: CheckCircle2,
  checked_in: LogIn,
  checked_out: LogOut,
  cancelled: XCircle,
  no_show: AlertTriangle,
  pending: Clock,
}

const reservationStatuses = [
  "pending",
  "confirmed",
  "checked_in",
  "checked_out",
  "cancelled",
  "no_show",
]

const statusFilterLabels = Object.fromEntries(
  reservationStatuses.map((status) => [status, formatReservationStatus(status)])
)

const statusFilterMeta = {
  pending: {
    icon: "!",
    colorClassName: "bg-yellow-100 text-yellow-800",
    description: "Потребує підтвердження або передплати.",
  },
  confirmed: {
    icon: "✓",
    colorClassName: "bg-blue-100 text-blue-800",
    description: "Очікує заїзду.",
  },
  checked_in: {
    icon: "→",
    colorClassName: "bg-green-100 text-green-800",
    description: "Гість зараз проживає.",
  },
  checked_out: {
    icon: "←",
    colorClassName: "bg-slate-100 text-slate-700",
    description: "Проживання завершено.",
  },
  cancelled: {
    icon: "×",
    colorClassName: "bg-red-100 text-red-800",
    description: "Бронювання скасовано.",
  },
  no_show: {
    icon: "!",
    colorClassName: "bg-orange-100 text-orange-800",
    description: "Гість не прибув.",
  },
}

export function ReservationsTable({ reservations }: { reservations: Reservation[] }) {
  const roomFilterConfig = useMemo(() => {
    const roomMap = new Map<
      string,
      {
        floor?: number | null
        roomType?: string
      }
    >()

    reservations.forEach((reservation) => {
      reservation.reservation_rooms?.forEach((reservationRoom) => {
        const room = reservationRoom.rooms

        if (room?.room_number) {
          roomMap.set(room.room_number, {
            floor: room.floor,
            roomType: room.room_type?.name,
          })
        }
      })
    })

    const roomNumbers = Array.from(roomMap.keys()).sort((left, right) =>
      left.localeCompare(right, "uk", { numeric: true })
    )
    const floors = [1, 2, 3]
      .map((floor) => ({
        label: `Поверх ${floor}`,
        values: roomNumbers.filter((roomNumber) => roomMap.get(roomNumber)?.floor === floor),
      }))
      .filter((group) => group.values.length > 0)
    const roomTypes = Array.from(
      new Set(
        Array.from(roomMap.values())
          .map((room) => room.roomType)
          .filter((roomType): roomType is string => Boolean(roomType))
      )
    )
      .sort((left, right) => left.localeCompare(right, "uk"))
      .map((roomType) => ({
        label: roomType,
        description: "За типом номера",
        values: roomNumbers.filter((roomNumber) => roomMap.get(roomNumber)?.roomType === roomType),
      }))

    return {
      options: roomNumbers,
      labels: Object.fromEntries(roomNumbers.map((roomNumber) => [roomNumber, `№ ${roomNumber}`])),
      groups: [...floors, ...roomTypes],
    }
  }, [reservations])

  const columns = useMemo<ColumnDef<Reservation>[]>(
    () => [
    {
      accessorKey: "reservation_number",
      header: "№ бронювання",
      meta: {
        sortable: true,
        filterable: true,
        filterType: "search",
        searchable: true,
        dataType: "text",
        searchPlaceholder: "Наприклад: 4821",
        filterHelpText: "Можна шукати повний номер бронювання або лише останні 4 цифри.",
        sortLabel: {
          asc: "Номер бронювання А-Я",
          desc: "Номер бронювання Я-А",
        },
        minWidth: 150,
      },
    },
    {
      id: "guest",
      accessorFn: (row) => {
        const guest = row.guests

        if (!guest) {
          return ""
        }

        return [
          guest.first_name,
          guest.last_name,
          guest.email,
          guest.phone,
        ]
          .filter(Boolean)
          .join(" ")
      },
      header: "Гість",
      cell: ({ row }) => {
        const guest = row.original.guests
        return (
          <div>
            <p className="font-medium">
              {guest ? `${guest.first_name} ${guest.last_name}` : "—"}
            </p>
            <p className="text-sm text-slate-500">{guest?.email || guest?.phone || "—"}</p>
          </div>
        )
      },
      meta: {
        sortable: true,
        filterable: true,
        filterType: "search",
        searchable: true,
        dataType: "text",
        searchPlaceholder: "Ім’я, прізвище, email або телефон",
        filterHelpText: "Пошук працює окремо по імені, прізвищу, email і телефону.",
        sortLabel: {
          asc: "Гості А-Я",
          desc: "Гості Я-А",
        },
        minWidth: 220,
      },
    },
    {
      accessorKey: "check_in_date",
      header: "Заїзд",
      cell: ({ row }) => formatDate(row.original.check_in_date),
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
        minWidth: 140,
      },
    },
    {
      accessorKey: "check_out_date",
      header: "Виїзд",
      cell: ({ row }) => formatDate(row.original.check_out_date),
      meta: {
        sortable: true,
        filterable: true,
        filterType: "dateRange",
        searchable: false,
        dataType: "date",
        datePresets: [
          { value: "todayDepartures", label: "Виїзди сьогодні" },
          { value: "tomorrowDepartures", label: "Виїзди завтра" },
          {
            value: "overdueDepartures",
            label: "Прострочені виїзди",
            description: "Гість мав виїхати, але статус ще «Заселено».",
          },
          {
            value: "longStays",
            label: "Довгі проживання",
            description: "Показує бронювання довше 7 ночей.",
          },
        ],
        sortLabel: {
          asc: "Найближчі виїзди спочатку",
          desc: "Найпізніші виїзди спочатку",
        },
        minWidth: 140,
      },
    },
    {
      id: "roomNumber",
      accessorFn: (row) => row.reservation_rooms?.[0]?.rooms?.room_number ?? "",
      header: "Номер",
      cell: ({ row }) => {
        const rooms = row.original.reservation_rooms
        return rooms?.[0]?.rooms?.room_number || "—"
      },
      meta: {
        sortable: false,
        filterable: true,
        filterType: "checkbox",
        searchable: true,
        dataType: "enum",
        filterOptions: roomFilterConfig.options,
        filterLabels: roomFilterConfig.labels,
        filterOptionGroups: roomFilterConfig.groups,
        filterGroupMode: "collapsibleSections",
        preserveFilterOptionOrder: true,
        minWidth: 120,
      },
    },
    {
      accessorKey: "status",
      header: "Статус",
      cell: ({ row }) => {
        const status = row.original.status
        const StatusIcon = statusIcons[status] ?? Clock

        return (
          <Badge className={statusColors[status] || "bg-gray-100 text-gray-800"}>
            <StatusIcon className="mr-1 h-3.5 w-3.5" />
            {formatReservationStatus(status)}
          </Badge>
        )
      },
      meta: {
        sortable: false,
        filterable: true,
        filterType: "checkbox",
        searchable: false,
        dataType: "enum",
        filterOptions: reservationStatuses,
        filterLabels: statusFilterLabels,
        filterOptionMeta: statusFilterMeta,
        filterOptionGroups: [
          {
            label: "Тільки активні бронювання",
            description: "Підтверджені бронювання та гості, які вже заселені.",
            values: ["confirmed", "checked_in"],
          },
          {
            label: "Проблемні бронювання",
            description: "Очікують дії, скасовані або гість не прибув.",
            values: ["pending", "no_show", "cancelled"],
          },
        ],
        filterGroupMode: "shortcuts",
        preserveFilterOptionOrder: true,
        minWidth: 150,
      },
    },
    {
      accessorKey: "total_amount",
      header: "Сума",
      cell: ({ row }) => formatCurrency(row.original.total_amount),
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
      id: "actions",
      header: "",
      cell: ({ row }) => {
        return (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/reservations/${row.original.id}`} aria-label="Переглянути бронювання">
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/reservations/${row.original.id}/edit`} aria-label="Редагувати бронювання">
                <Edit className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )
      },
      meta: {
        sortable: false,
        filterable: false,
        filterType: false,
        searchable: false,
        dataType: "text",
        minWidth: 96,
      },
    },
  ],
    [roomFilterConfig]
  )

  return (
    <DataTable
      columns={columns}
      data={reservations}
      searchPlaceholder="Пошук за бронюванням, гостем або номером..."
      enableMultiSort
    />
  )
}
