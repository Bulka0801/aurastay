import type { ColumnDef } from "@tanstack/react-table"

import { applySmartColumnDefaults } from "@/components/data-table/table-logic"
import type { ReservationStatus } from "@/lib/types"

export type ReservationTableRow = {
  id: string
  reservation_number: string
  check_in_date: string
  check_out_date: string
  status: ReservationStatus
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

const reservationStatuses: ReservationStatus[] = [
  "pending",
  "confirmed",
  "checked_in",
  "checked_out",
  "cancelled",
  "no_show",
]

export const reservationFixtures: ReservationTableRow[] = [
  {
    id: "res-001",
    reservation_number: "AUR-2026-04821",
    check_in_date: "2026-05-23",
    check_out_date: "2026-05-26",
    status: "confirmed",
    total_amount: 12500,
    adults: 2,
    children: 0,
    guests: {
      first_name: "Anna",
      last_name: "O'Connor",
      email: "anna.oconnor+vip@example.com",
      phone: "+380671234567",
    },
    rate_plans: { name: "Flexible Rate" },
    reservation_rooms: [
      {
        rooms: {
          room_number: "101",
          floor: 1,
          room_type: { name: "Standard" },
        },
      },
    ],
  },
  {
    id: "res-002",
    reservation_number: "AUR-2026-04822",
    check_in_date: "2026-05-22",
    check_out_date: "2026-05-29",
    status: "checked_in",
    total_amount: 24000,
    adults: 2,
    children: 1,
    guests: {
      first_name: "Ірина",
      last_name: "Коваль",
      email: "iryna.koval@example.com",
      phone: "+380501112233",
    },
    rate_plans: { name: "Breakfast Included" },
    reservation_rooms: [
      {
        rooms: {
          room_number: "205",
          floor: 2,
          room_type: { name: "Deluxe" },
        },
      },
    ],
  },
  {
    id: "res-003",
    reservation_number: "AUR-2026-04823",
    check_in_date: "2026-05-18",
    check_out_date: "2026-05-27",
    status: "pending",
    total_amount: 9300,
    adults: 1,
    children: 0,
    guests: {
      first_name: "Dmytro",
      last_name: "Shevchenko",
      email: "dmytro@example.com",
      phone: null,
    },
    rate_plans: { name: "Non-refundable" },
    reservation_rooms: [
      {
        rooms: {
          room_number: "12A",
          floor: 1,
          room_type: { name: "Standard" },
        },
      },
    ],
  },
  {
    id: "res-004",
    reservation_number: "AUR-2026-04824",
    check_in_date: "2026-05-10",
    check_out_date: "2026-05-12",
    status: "checked_out",
    total_amount: 7800,
    adults: 2,
    children: 0,
    guests: {
      first_name: "Marta",
      last_name: "López",
      email: "marta.lopez@example.com",
      phone: "+380671998877",
    },
    rate_plans: { name: "Corporate" },
    reservation_rooms: [
      {
        rooms: {
          room_number: "301",
          floor: 3,
          room_type: { name: "Superior" },
        },
      },
    ],
  },
  {
    id: "res-005",
    reservation_number: "AUR-2026/04825",
    check_in_date: "2026-05-21",
    check_out_date: "2026-05-24",
    status: "cancelled",
    total_amount: 16500,
    adults: 2,
    children: 0,
    guests: {
      first_name: "Oleksandr",
      last_name: "D'Angelo",
      email: "oleksandr.dangelo+spa@example.com",
      phone: "+380632223344",
    },
    rate_plans: { name: "Spa Package" },
    reservation_rooms: [
      {
        rooms: {
          room_number: "102",
          floor: 1,
          room_type: { name: "Standard" },
        },
      },
    ],
  },
  {
    id: "res-006",
    reservation_number: "AUR-2026-04826",
    check_in_date: "2026-05-01",
    check_out_date: "2026-05-10",
    status: "no_show",
    total_amount: 11200,
    adults: 1,
    children: 0,
    guests: {
      first_name: "Yuliia",
      last_name: "Kovtun",
      email: "yuliia.kovtun@example.com",
      phone: "+380931234111",
    },
    rate_plans: { name: "Early Bird" },
    reservation_rooms: [
      {
        rooms: {
          room_number: "201",
          floor: 2,
          room_type: { name: "Deluxe" },
        },
      },
    ],
  },
  {
    id: "res-007",
    reservation_number: "AUR-2026-04827",
    check_in_date: "2026-05-23",
    check_out_date: "2026-06-01",
    status: "confirmed",
    total_amount: 12500,
    adults: 2,
    children: 0,
    guests: {
      first_name: "Anna",
      last_name: "Petrova",
      email: "anna.petrova@example.com",
      phone: "+380671234568",
    },
    rate_plans: { name: "Flexible Rate" },
    reservation_rooms: [
      {
        rooms: {
          room_number: "303",
          floor: 3,
          room_type: { name: "Superior" },
        },
      },
    ],
  },
  {
    id: "res-008",
    reservation_number: "AUR-2026-04828",
    check_in_date: "2026-05-24",
    check_out_date: "2026-05-25",
    status: "confirmed",
    total_amount: 12500,
    adults: 2,
    children: 0,
    guests: null,
    rate_plans: null,
    reservation_rooms: [],
  },
  {
    id: "res-009",
    reservation_number: "AUR-2026-04829",
    check_in_date: "2026-05-01",
    check_out_date: "2026-05-15",
    status: "checked_in",
    total_amount: 32000,
    adults: 2,
    children: 1,
    guests: {
      first_name: "Sofiia",
      last_name: "Bondar",
      email: "sofiia.bondar@example.com",
      phone: "+380991122334",
    },
    rate_plans: { name: "Long Stay" },
    reservation_rooms: [
      {
        rooms: {
          room_number: "402",
          floor: 4,
          room_type: { name: "Suite" },
        },
      },
    ],
  },
  {
    id: "res-010",
    reservation_number: "AUR-2026-04830",
    check_in_date: "2026-05-20",
    check_out_date: "2026-05-21",
    status: "checked_in",
    total_amount: 8800,
    adults: 1,
    children: 0,
    guests: {
      first_name: "Леся",
      last_name: "Українка",
      email: "lesya.ukrainka@example.com",
      phone: "+380681234567",
    },
    rate_plans: { name: "City Break" },
    reservation_rooms: [
      {
        rooms: {
          room_number: "103",
          floor: 1,
          room_type: { name: "Standard" },
        },
      },
    ],
  },
]

export function buildLargeReservationDataset(size = 1000): ReservationTableRow[] {
  const baseDate = new Date(Date.UTC(2026, 4, 1))

  return Array.from({ length: size }, (_, index) => {
    const isMarkerRow = index === Math.floor(size / 2)
    const roomNumber = String(500 + (index % 50))
    const checkInDate = new Date(baseDate)
    checkInDate.setUTCDate(baseDate.getUTCDate() + (index % 28))
    const checkOutDate = new Date(checkInDate)
    checkOutDate.setUTCDate(checkInDate.getUTCDate() + 2)

    return {
      id: `bulk-${index + 1}`,
      reservation_number: isMarkerRow
        ? "BULK-2026-MARKER-721"
        : `BULK-2026-${String(index + 1).padStart(5, "0")}`,
      check_in_date: checkInDate.toISOString().slice(0, 10),
      check_out_date: checkOutDate.toISOString().slice(0, 10),
      status: reservationStatuses[index % reservationStatuses.length],
      total_amount: 5000 + (index % 200) * 125,
      adults: 2,
      children: index % 3 === 0 ? 1 : 0,
      guests: isMarkerRow
        ? {
            first_name: "Tamara",
            last_name: "Petrenko",
            email: "tamara.petrenko@example.com",
            phone: "+380501234999",
          }
        : {
            first_name: `Guest${index + 1}`,
            last_name: `Test${index + 1}`,
            email: `guest${index + 1}@example.com`,
            phone: `+38050${String(100000 + index).slice(-7)}`,
          },
      rate_plans: { name: index % 2 === 0 ? "Flexible Rate" : "Non-refundable" },
      reservation_rooms: [
        {
          rooms: {
            room_number: roomNumber,
            floor: (index % 4) + 1,
            room_type: { name: index % 2 === 0 ? "Standard" : "Deluxe" },
          },
        },
      ],
    }
  })
}

export function buildReservationColumns(rows: ReservationTableRow[]) {
  const roomNumbers = Array.from(
    new Set(
      rows
        .flatMap((row) => row.reservation_rooms)
        .map((reservationRoom) => reservationRoom.rooms?.room_number)
        .filter((roomNumber): roomNumber is string => Boolean(roomNumber))
    )
  ).sort((left, right) => left.localeCompare(right, "uk", { numeric: true }))

  const columns: ColumnDef<ReservationTableRow>[] = [
    {
      accessorKey: "reservation_number",
      header: "№ бронювання",
      meta: {
        sortable: true,
        filterable: true,
        filterType: "search",
        searchable: true,
        dataType: "text",
      },
    },
    {
      id: "guest",
      accessorFn: (row) => {
        const guest = row.guests

        if (!guest) {
          return ""
        }

        return [guest.first_name, guest.last_name, guest.email, guest.phone]
          .filter(Boolean)
          .join(" ")
      },
      header: "Гість",
      meta: {
        sortable: true,
        filterable: true,
        filterType: "search",
        searchable: true,
        dataType: "text",
      },
    },
    {
      accessorKey: "check_in_date",
      header: "Заїзд",
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
      },
    },
    {
      accessorKey: "check_out_date",
      header: "Виїзд",
      meta: {
        sortable: true,
        filterable: true,
        filterType: "dateRange",
        searchable: false,
        dataType: "date",
        datePresets: [
          { value: "todayDepartures", label: "Виїзди сьогодні" },
          { value: "tomorrowDepartures", label: "Виїзди завтра" },
          { value: "overdueDepartures", label: "Прострочені виїзди" },
          { value: "longStays", label: "Довгі проживання" },
        ],
      },
    },
    {
      id: "roomNumber",
      accessorFn: (row) => row.reservation_rooms?.[0]?.rooms?.room_number ?? "",
      header: "Номер",
      meta: {
        sortable: false,
        filterable: true,
        filterType: "checkbox",
        searchable: true,
        dataType: "enum",
        filterOptions: roomNumbers,
        preserveFilterOptionOrder: true,
      },
    },
    {
      accessorKey: "status",
      header: "Статус",
      meta: {
        sortable: false,
        filterable: true,
        filterType: "checkbox",
        searchable: false,
        dataType: "enum",
        filterOptions: reservationStatuses,
        preserveFilterOptionOrder: true,
      },
    },
    {
      accessorKey: "total_amount",
      header: "Сума",
      meta: {
        sortable: true,
        filterable: true,
        filterType: "number",
        searchable: false,
        dataType: "number",
      },
    },
  ]

  return applySmartColumnDefaults(columns)
}
