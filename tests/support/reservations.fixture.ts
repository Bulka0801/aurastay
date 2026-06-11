import type {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  Table,
  Updater,
} from "@tanstack/react-table"
import {
  createTable,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from "@tanstack/react-table"

import {
  applySmartColumnDefaults,
  globalTextFilter,
} from "@/components/data-table/table-logic"

export type ReservationFixture = {
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

const statusLabels: Record<string, string> = {
  pending: "Очікує підтвердження",
  confirmed: "Підтверджено",
  checked_in: "Заселено",
  checked_out: "Виїхав",
  cancelled: "Скасовано",
  no_show: "Не прибув",
}

const roomLabels: Record<string, string> = {
  "101": "№ 101",
  "102": "№ 102",
  "103": "№ 103",
  "105": "№ 105",
  "201": "№ 201",
  "202": "№ 202",
  "203": "№ 203",
  "204": "№ 204",
  "305": "№ 305",
  "401": "№ 401",
  "402": "№ 402",
}

export function makeReservationFixtures(): ReservationFixture[] {
  return [
    {
      id: "res-1001",
      reservation_number: "4821",
      check_in_date: "2026-05-23",
      check_out_date: "2026-05-25",
      status: "confirmed",
      total_amount: 2400,
      adults: 2,
      children: 0,
      guests: {
        first_name: "Olena",
        last_name: "Shevchenko",
        email: "olena.shevchenko@example.com",
        phone: "+380671234567",
      },
      rate_plans: { name: "Стандарт" },
      reservation_rooms: [{ rooms: { room_number: "101", floor: 1, room_type: { name: "Standard" } } }],
    },
    {
      id: "res-1002",
      reservation_number: "4822",
      check_in_date: "2026-05-24",
      check_out_date: "2026-05-27",
      status: "checked_in",
      total_amount: 5000,
      adults: 2,
      children: 1,
      guests: {
        first_name: "Iryna",
        last_name: "O'Connor",
        email: "iryna.o'connor+vip@example.com",
        phone: null,
      },
      rate_plans: { name: "Діловий" },
      reservation_rooms: [{ rooms: { room_number: "305", floor: 3, room_type: { name: "Deluxe" } } }],
    },
    {
      id: "res-1003",
      reservation_number: "4823",
      check_in_date: "2026-05-20",
      check_out_date: "2026-05-22",
      status: "pending",
      total_amount: 1800,
      adults: 1,
      children: 0,
      guests: {
        first_name: "Anna",
        last_name: "Maria",
        email: "anna.maria@example.com",
        phone: "+380501112233",
      },
      rate_plans: { name: "Без харчування" },
      reservation_rooms: [{ rooms: { room_number: "202", floor: 2, room_type: { name: "Standard" } } }],
    },
    {
      id: "res-1004",
      reservation_number: "4824",
      check_in_date: "2026-05-18",
      check_out_date: "2026-05-19",
      status: "cancelled",
      total_amount: 3600,
      adults: 2,
      children: 0,
      guests: null,
      rate_plans: { name: "Сімейний" },
      reservation_rooms: [{ rooms: { room_number: "204", floor: 2, room_type: { name: "Suite" } } }],
    },
    {
      id: "res-1005",
      reservation_number: "4825",
      check_in_date: "2026-05-10",
      check_out_date: "2026-05-15",
      status: "checked_out",
      total_amount: 6500,
      adults: 2,
      children: 2,
      guests: {
        first_name: "Dmytro",
        last_name: "Petrenko",
        email: "dmytro.petrenko@example.com",
        phone: "+380991234567",
      },
      rate_plans: { name: "Напівпансіон" },
      reservation_rooms: [{ rooms: { room_number: "102", floor: 1, room_type: { name: "Standard" } } }],
    },
    {
      id: "res-1006",
      reservation_number: "4826",
      check_in_date: "2026-05-01",
      check_out_date: "2026-05-03",
      status: "no_show",
      total_amount: 1200,
      adults: 1,
      children: 0,
      guests: {
        first_name: "Marya",
        last_name: "Koval",
        email: "marya.koval@example.com",
        phone: "+380681234567",
      },
      rate_plans: { name: "Стандарт" },
      reservation_rooms: [{ rooms: { room_number: "103", floor: 1, room_type: { name: "Standard" } } }],
    },
    {
      id: "res-1007",
      reservation_number: "4827",
      check_in_date: "2026-05-23",
      check_out_date: "2026-05-24",
      status: "confirmed",
      total_amount: 3600,
      adults: 2,
      children: 0,
      guests: {
        first_name: "Anna-Maria",
        last_name: "Hrytsenko",
        email: "anna-maria.hrytsenko@example.com",
        phone: null,
      },
      rate_plans: { name: "Стандарт" },
      reservation_rooms: [{ rooms: { room_number: "201", floor: 2, room_type: { name: "Deluxe" } } }],
    },
    {
      id: "res-1008",
      reservation_number: "4828",
      check_in_date: "2026-05-23",
      check_out_date: "2026-05-26",
      status: "checked_in",
      total_amount: 3600,
      adults: 3,
      children: 0,
      guests: {
        first_name: "Taras",
        last_name: "Bondar",
        email: "taras.bondar@example.com",
        phone: "+380671122334",
      },
      rate_plans: { name: "Сімейний" },
      reservation_rooms: [{ rooms: { room_number: "401", floor: 3, room_type: { name: "Suite" } } }],
    },
    {
      id: "res-1009",
      reservation_number: "4829",
      check_in_date: "2026-06-01",
      check_out_date: "2026-06-12",
      status: "confirmed",
      total_amount: 12000,
      adults: 2,
      children: 1,
      guests: {
        first_name: "Yulia",
        last_name: "Romanenko",
        email: "yulia.romanenko@example.com",
        phone: "+380631234567",
      },
      rate_plans: { name: "Преміум" },
      reservation_rooms: [{ rooms: { room_number: "402", floor: 3, room_type: { name: "Suite" } } }],
    },
    {
      id: "res-1010",
      reservation_number: "4830",
      check_in_date: "2026-05-02",
      check_out_date: "2026-05-08",
      status: "checked_in",
      total_amount: 7000,
      adults: 2,
      children: 0,
      guests: {
        first_name: "Serhii",
        last_name: "Melnyk",
        email: "serhii.melnyk@example.com",
        phone: "+380931234567",
      },
      rate_plans: { name: "Довге проживання" },
      reservation_rooms: [{ rooms: { room_number: "203", floor: 2, room_type: { name: "Deluxe" } } }],
    },
    {
      id: "res-1011",
      reservation_number: "4831",
      check_in_date: "2026-05-23",
      check_out_date: "2026-05-23",
      status: "pending",
      total_amount: 2400,
      adults: 1,
      children: 0,
      guests: {
        first_name: "Kateryna",
        last_name: "Smyrnova",
        email: "kateryna.smyrnova@example.com",
        phone: "+380661234567",
      },
      rate_plans: { name: "Стандарт" },
      reservation_rooms: [{ rooms: { room_number: "105", floor: 1, room_type: { name: "Standard" } } }],
    },
    {
      id: "res-1012",
      reservation_number: "4832",
      check_in_date: "2026-05-28",
      check_out_date: "2026-05-29",
      status: "confirmed",
      total_amount: 2400,
      adults: 2,
      children: 0,
      guests: {
        first_name: "Space",
        last_name: "Traveler",
        email: "space.traveler@example.com",
        phone: null,
      },
      rate_plans: { name: "Стандарт" },
      reservation_rooms: [{ rooms: { room_number: "101", floor: 1, room_type: { name: "Standard" } } }],
    },
  ]
}

export function makeLargeReservationFixtures(size = 250): ReservationFixture[] {
  const base = makeReservationFixtures()

  return Array.from({ length: size }, (_, index) => {
    const template = base[index % base.length]
    const cycle = Math.floor(index / base.length) + 1
    const dayOffset = index % 10

    return {
      ...template,
      id: `${template.id}-${cycle}-${index}`,
      reservation_number: `${Number(template.reservation_number) + cycle * 100 + index}`,
      check_in_date: `2026-05-${String(1 + ((index + dayOffset) % 28)).padStart(2, "0")}`,
      check_out_date: `2026-05-${String(2 + ((index + dayOffset) % 28)).padStart(2, "0")}`,
      total_amount: template.total_amount + cycle * 25,
    }
  })
}

function applyUpdater<T>(updater: Updater<T>, current: T): T {
  return typeof updater === "function" ? (updater as (old: T) => T)(current) : updater
}

type HarnessState = {
  sorting: SortingState
  columnFilters: ColumnFiltersState
  globalFilter: string
  pagination: {
    pageIndex: number
    pageSize: number
  }
}

export function createReservationColumns(): ColumnDef<ReservationFixture>[] {
  return [
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
      meta: {
        sortable: false,
        filterable: true,
        filterType: "checkbox",
        searchable: true,
        dataType: "enum",
        filterOptions: Object.keys(roomLabels),
        filterLabels: roomLabels,
        preserveFilterOptionOrder: true,
        minWidth: 120,
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
        filterOptions: ["pending", "confirmed", "checked_in", "checked_out", "cancelled", "no_show"],
        filterLabels: statusLabels,
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
  ]
}

export function createReservationTable(
  data: ReservationFixture[],
  initialState: Partial<HarnessState> = {}
) {
  const columns = applySmartColumnDefaults(createReservationColumns())
  let state: HarnessState = {
    sorting: [],
    columnFilters: [],
    globalFilter: "",
    pagination: {
      pageIndex: 0,
      pageSize: 50,
    },
    ...initialState,
  }

  let table!: Table<ReservationFixture>

  const commitState = (nextState: HarnessState) => {
    state = nextState
    table.setOptions((previous) => ({
      ...previous,
      state,
    }))
  }

  const syncState = (updater: Updater<HarnessState>) => {
    commitState(applyUpdater(updater, state))
  }

  table = createTable<ReservationFixture>({
    data,
    columns: columns as ColumnDef<ReservationFixture, any>[],
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: (updater) =>
      syncState((current) => ({
        ...current,
        sorting: applyUpdater(updater as Updater<SortingState>, current.sorting),
      })),
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: (updater) =>
      syncState((current) => ({
        ...current,
        columnFilters: applyUpdater(
          updater as Updater<ColumnFiltersState>,
          current.columnFilters
        ),
      })),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    onGlobalFilterChange: (updater) =>
      syncState((current) => ({
        ...current,
        globalFilter: applyUpdater(updater as Updater<string>, current.globalFilter),
      })),
    onPaginationChange: (updater) =>
      syncState((current) => ({
        ...current,
        pagination: applyUpdater(
          updater as Updater<HarnessState["pagination"]>,
          current.pagination
        ),
      })),
    enableMultiSort: true,
    globalFilterFn: globalTextFilter as any,
    getColumnCanGlobalFilter: (column) =>
      column.columnDef.meta?.searchable === true,
    autoResetPageIndex: true,
    onStateChange: (updater) => syncState(updater as Updater<HarnessState>),
    renderFallbackValue: null,
    state,
  })

  return {
    table,
    getState: () => state,
  }
}
