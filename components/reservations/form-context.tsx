"use client"

import type React from "react"
import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import useSWR from "swr"
import { normalizeHotelSettings, type HotelSettings } from "@/lib/hotel-settings"
import { requiredPrepayment } from "@/lib/rules/prepayment"
import { addDays, parseISO } from "@/lib/room-rack/date-utils"
import { format } from "date-fns"
import {
  getBlockingReservationStatuses,
  getRoomStateAvailabilityReason,
  isRoomStateSellable,
} from "@/lib/rooms/availability"
import {
  EMAIL_DOMAIN_SUGGESTIONS,
  UA_PHONE_PREFIX,
  formatEmail,
  formatPersonName,
  formatUaPhone,
  formatUkrainianIdCardNumber,
  formatUkrainianPassportNumber,
  getUaPhoneNationalDigits,
  isValidEmail,
  isValidPersonName,
  isValidUaPhone,
  isValidUkrainianIdCardNumber,
  isValidUkrainianPassportNumber,
} from "@/lib/validation"

export interface RoomType {
  id: string
  name: string
  code: string
  base_rate: number
  base_occupancy: number
  max_occupancy: number
}

export interface RatePlan {
  id: string
  name: string
  code: string
  discount_percentage: number
}

export interface AvailableRoom {
  id: string
  room_number: string
  floor: number
  status: string
  occupancy_status?: "vacant" | "occupied" | null
  housekeeping_status?: "clean" | "dirty" | "cleaning" | "inspecting" | "inspected" | null
  operational_status?: "operational" | "maintenance" | "out_of_order" | "blocked" | null
}

export interface AvailabilityResult {
  rooms: AvailableRoom[]
  totalRoomsOfType: number
  sellableRoomsOfType: number
  blockedByStatus: number
  blockedByActiveReservation: number
  blockedByRoomBlock: number
}

export interface GuestMatch {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  country: string | null
  passport_number: string | null
  id_number: string | null
  is_vip: boolean
}

export interface NewReservationFormProps {
  roomTypes: RoomType[]
  ratePlans: RatePlan[]
  hotelSettings?: HotelSettings | null
  initialGuest?: GuestMatch | null
  initialReservationContext?: {
    roomId: string
    roomTypeId: string | null
    roomNumber: string | null
    checkIn: string
    checkOut: string
    adults?: number
    children?: number
  }
}

interface FormContextType {
  // Config / lists
  roomTypes: RoomType[]
  ratePlans: RatePlan[]
  hotelSettings: HotelSettings
  initialReservationContext?: NewReservationFormProps["initialReservationContext"]

  // Flow State
  step: number
  setStep: (s: number) => void
  isLoading: boolean
  error: string | null
  setError: (e: string | null) => void

  // Step 1
  checkInDate: Date | undefined
  setCheckInDate: (d: Date | undefined) => void
  checkOutDate: Date | undefined
  setCheckOutDate: (d: Date | undefined) => void
  adults: string
  setAdults: (a: string) => void
  children: string
  setChildren: (c: string) => void

  // Step 2
  selectedRoomType: string
  setSelectedRoomType: (t: string) => void
  selectedRatePlan: string
  setSelectedRatePlan: (p: string) => void
  selectedRoomId: string
  setSelectedRoomId: (r: string) => void

  // Step 3
  guestSearch: string
  setGuestSearch: (s: string) => void
  selectedGuest: GuestMatch | null
  setSelectedGuest: (g: GuestMatch | null) => void
  showNewGuestForm: boolean
  setShowNewGuestForm: (b: boolean) => void
  newGuestData: {
    firstName: string
    lastName: string
    email: string
    phone: string
    country: string
    passportNumber: string
    idCardNumber: string
  }
  setNewGuestData: React.Dispatch<React.SetStateAction<{
    firstName: string
    lastName: string
    email: string
    phone: string
    country: string
    passportNumber: string
    idCardNumber: string
  }>>
  specialRequests: string
  setSpecialRequests: (s: string) => void
  isCountrySuggestionsOpen: boolean
  setIsCountrySuggestionsOpen: (b: boolean) => void

  // Computed properties
  checkInIso: string | null
  checkOutIso: string | null
  nights: number
  prefilledRoomTypeId: string
  effectiveRoomTypeId: string
  roomType: RoomType | undefined
  ratePlan: RatePlan | undefined
  totalAdults: number
  totalChildren: number
  totalGuests: number
  capacityExceeded: boolean
  hasGuestCount: boolean
  baseAmount: number
  discount: number
  totalAmount: number
  prepaymentDue: number
  prepaymentRequired: boolean
  newGuestPhoneDigitsCount: number
  isNewGuestFirstNameValid: boolean
  isNewGuestLastNameValid: boolean
  isNewGuestPhoneValid: boolean
  isNewGuestEmailValid: boolean
  isNewGuestPassportNumberValid: boolean
  isNewGuestIdCardNumberValid: boolean
  hasNewGuestIdentification: boolean
  emailLocalPart: string
  emailDomainPart: string
  emailDomainSuggestions: string[]
  countryQuery: string
  countrySuggestions: string[]
  availableRooms: AvailableRoom[] | undefined
  isLoadingRooms: boolean
  availabilityResult: AvailabilityResult | undefined
  selectedRoomNumber: string | null
  guestMatches: GuestMatch[] | undefined
  isSearchingGuests: boolean
  trimmedSearch: string

  // Logic validators
  canGoToStep2: boolean
  canGoToStep3: boolean
  canSubmit: boolean

  // Handlers
  handleStayRangeSelect: (range?: { from?: Date; to?: Date }) => void
  handleAdultsChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleChildrenChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handlePhoneFocus: () => void
  handleGuestNameChange: (field: "firstName" | "lastName") => (e: React.ChangeEvent<HTMLInputElement>) => void
  handlePhoneChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  applyEmailDomain: (domain: string) => void
  handleCountryChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  applyCountrySuggestion: (country: string) => void
  handlePassportNumberChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleIdCardNumberChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleSubmit: (e: React.FormEvent) => Promise<void>
}

const NewReservationFormContext = createContext<FormContextType | undefined>(undefined)

export function useNewReservationForm() {
  const context = useContext(NewReservationFormContext)
  if (!context) {
    throw new Error("useNewReservationForm must be used within a NewReservationFormProvider")
  }
  return context
}

export function NewReservationFormProvider({
  roomTypes,
  ratePlans,
  hotelSettings: hotelSettingsInput,
  initialReservationContext,
  initialGuest,
  children: childrenProp,
}: NewReservationFormProps & { children: React.ReactNode }) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const hotelSettings = useMemo(() => normalizeHotelSettings(hotelSettingsInput), [hotelSettingsInput])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(() => (initialReservationContext ? 2 : 1))

  // Step 1 — dates & guests
  const [checkInDate, setCheckInDate] = useState<Date | undefined>(() =>
    initialReservationContext?.checkIn ? parseISO(initialReservationContext.checkIn) : undefined,
  )
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>(() =>
    initialReservationContext?.checkOut ? parseISO(initialReservationContext.checkOut) : undefined,
  )
  const [adults, setAdults] = useState(() =>
    initialReservationContext?.adults !== undefined
      ? initialReservationContext.adults.toString()
      : initialReservationContext
        ? "1"
        : "",
  )
  const [children, setChildren] = useState(() =>
    initialReservationContext?.children !== undefined ? initialReservationContext.children.toString() : "0",
  )
  const MAX_OCCUPANCY = 6

  // Step 2 — room & rate
  const [selectedRoomType, setSelectedRoomType] = useState("")
  const [selectedRatePlan, setSelectedRatePlan] = useState("")
  const [selectedRoomId, setSelectedRoomId] = useState(() => initialReservationContext?.roomId ?? "")

  // Step 3 — guest
  const [guestSearch, setGuestSearch] = useState("")
  const [selectedGuest, setSelectedGuest] = useState<GuestMatch | null>(initialGuest ?? null)
  const [showNewGuestForm, setShowNewGuestForm] = useState(false)
  const [isCountrySuggestionsOpen, setIsCountrySuggestionsOpen] = useState(false)
  const [newGuestData, setNewGuestData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "",
    passportNumber: "",
    idCardNumber: "",
  })
  const [specialRequests, setSpecialRequests] = useState("")

  useEffect(() => {
    if (!initialReservationContext) return

    if (initialReservationContext.checkIn) {
      setCheckInDate(parseISO(initialReservationContext.checkIn))
    }
    if (initialReservationContext.checkOut) {
      setCheckOutDate(parseISO(initialReservationContext.checkOut))
    }
    if (initialReservationContext.roomId) {
      setSelectedRoomId(initialReservationContext.roomId)
    }
  }, [initialReservationContext])

  const checkInIso = checkInDate ? format(checkInDate, "yyyy-MM-dd") : null
  const checkOutIso = checkOutDate ? format(checkOutDate, "yyyy-MM-dd") : null
  const nights =
    checkInDate && checkOutDate
      ? Math.max(0, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)))
      : 0

  const prefilledRoomTypeId = initialReservationContext?.roomTypeId ?? ""
  const effectiveRoomTypeId = selectedRoomType || prefilledRoomTypeId
  const roomType = roomTypes.find((rt) => rt.id === effectiveRoomTypeId)
  const ratePlan = ratePlans.find((rp) => rp.id === selectedRatePlan)

  const totalAdults = Number.parseInt(adults || "0", 10)
  const totalChildren = Number.parseInt(children || "0", 10)
  const totalGuests = totalAdults + totalChildren
  const capacityExceeded = roomType ? totalGuests > roomType.max_occupancy : false
  const hasGuestCount = totalAdults >= 1

  const baseAmount = roomType ? roomType.base_rate * nights : 0
  const discount = ratePlan ? (baseAmount * ratePlan.discount_percentage) / 100 : 0
  const totalAmount = baseAmount - discount
  const prepaymentRequired = hotelSettings.prepayment_required
  const prepaymentDue = prepaymentRequired ? requiredPrepayment(totalAmount, hotelSettings.prepayment_percent) : 0
  const newGuestPhoneDigitsCount = getUaPhoneNationalDigits(newGuestData.phone).length
  const isNewGuestFirstNameValid = isValidPersonName(newGuestData.firstName)
  const isNewGuestLastNameValid = isValidPersonName(newGuestData.lastName)
  const isNewGuestPhoneValid = isValidUaPhone(newGuestData.phone)
  const isNewGuestEmailValid = isValidEmail(newGuestData.email)
  const isNewGuestPassportNumberValid =
    !newGuestData.passportNumber || isValidUkrainianPassportNumber(newGuestData.passportNumber)
  const isNewGuestIdCardNumberValid =
    !newGuestData.idCardNumber || isValidUkrainianIdCardNumber(newGuestData.idCardNumber)
  const hasNewGuestIdentification = Boolean(newGuestData.passportNumber || newGuestData.idCardNumber)
  const emailAtIndex = newGuestData.email.indexOf("@")
  const emailLocalPart = emailAtIndex > 0 ? newGuestData.email.slice(0, emailAtIndex) : ""
  const emailDomainPart = emailAtIndex > -1 ? newGuestData.email.slice(emailAtIndex + 1).toLowerCase() : ""
  const emailDomainSuggestions =
    emailLocalPart && emailAtIndex === newGuestData.email.lastIndexOf("@") && !emailDomainPart.includes(".")
      ? EMAIL_DOMAIN_SUGGESTIONS.filter((domain) => domain.startsWith(emailDomainPart)).slice(0, 4)
      : []
  const COUNTRY_SUGGESTIONS = useMemo(() => [
    "Україна",
    "Польща",
    "Німеччина",
    "Франція",
    "Італія",
    "Іспанія",
    "Велика Британія",
    "США",
    "Канада",
    "Туреччина",
    "Молдова",
    "Румунія",
  ], [])

  const countryQuery = newGuestData.country.trim().toLowerCase()
  const countrySuggestions = COUNTRY_SUGGESTIONS.filter((country) => country.toLowerCase().includes(countryQuery)).slice(
    0,
    5,
  )

  // --- Available rooms for the chosen type AND period ---
  const availabilityKey =
    effectiveRoomTypeId && checkInIso && checkOutIso
      ? ["available-rooms", effectiveRoomTypeId, checkInIso, checkOutIso]
      : null

  const { data: availabilityResult, isLoading: isLoadingRooms } = useSWR<AvailabilityResult>(
    availabilityKey,
    async () => {
      // Query 1: fetch all rooms of the requested type (flat, no nested relation filters)
      const { data: roomsData, error: roomsErr } = await supabase
        .from("rooms")
        .select(
          "id, room_number, floor, status, occupancy_status, housekeeping_status, operational_status",
        )
        .eq("room_type_id", effectiveRoomTypeId)
        .order("room_number", { ascending: true })

      if (roomsErr) {
        console.error("[availability] rooms fetch error:", roomsErr.message)
        throw roomsErr
      }

      const allRooms = roomsData || []
      const allRoomIds = allRooms.map((r) => r.id)
      const sellable = allRooms.filter(isRoomStateSellable)

      if (sellable.length === 0) {
        return {
          rooms: [],
          totalRoomsOfType: allRooms.length,
          sellableRoomsOfType: 0,
          blockedByStatus: allRooms.length,
          blockedByActiveReservation: 0,
          blockedByRoomBlock: 0,
        }
      }

      // Query 2: find which of these rooms are blocked by an overlapping active reservation.
      // NOTE: PostgREST does NOT support 2-level dot-notation filters
      // (e.g. reservation_rooms.reservations.status), so we query reservation_rooms
      // with an !inner join to reservations and apply all conditions at the top level.
      const { data: conflictData, error: conflictErr } = await supabase
        .from("reservation_rooms")
        .select("room_id, reservations!inner(status, check_in_date, check_out_date)")
        .in("room_id", allRoomIds)
        .in("reservations.status", getBlockingReservationStatuses())
        .lt("reservations.check_in_date", checkOutIso!)
        .gt("reservations.check_out_date", checkInIso!)

      if (conflictErr) {
        console.error("[availability] conflict fetch error:", conflictErr.message)
        throw conflictErr
      }

      const { data: roomBlockData, error: roomBlockErr } = await supabase
        .from("room_blocks")
        .select("room_id")
        .in("room_id", allRoomIds)
        .lt("start_date", checkOutIso!)
        .gt("end_date", checkInIso!)

      if (roomBlockErr) {
        console.error("[availability] room block fetch error:", roomBlockErr.message)
        throw roomBlockErr
      }

      const conflictRoomIds = new Set<string>((conflictData || []).map((rr) => rr.room_id))
      const roomBlockIds = new Set<string>((roomBlockData || []).map((block) => block.room_id))

      const available = sellable.filter((r) => !conflictRoomIds.has(r.id) && !roomBlockIds.has(r.id))

      return {
        rooms: available.map((room) => ({
          id: room.id,
          room_number: room.room_number,
          floor: room.floor,
          status: room.status,
          occupancy_status: room.occupancy_status,
          housekeeping_status: room.housekeeping_status,
          operational_status: room.operational_status,
        })),
        totalRoomsOfType: allRooms.length,
        sellableRoomsOfType: sellable.length,
        blockedByStatus: allRooms.length - sellable.length,
        blockedByActiveReservation: sellable.filter((r) => conflictRoomIds.has(r.id)).length,
        blockedByRoomBlock: sellable.filter((r) => roomBlockIds.has(r.id)).length,
      }
    },
    { revalidateOnFocus: false },
  )
  const availableRooms = availabilityResult?.rooms

  const selectedRoomNumber =
    selectedRoomId && selectedRoomId === initialReservationContext?.roomId
      ? availableRooms?.find((room) => room.id === selectedRoomId)?.room_number ??
        initialReservationContext.roomNumber ??
        null
      : availableRooms?.find((room) => room.id === selectedRoomId)?.room_number ?? null

  const availableRoomIds = useMemo(() => new Set((availableRooms || []).map((r) => r.id)), [availableRooms])
  useEffect(() => {
    if (selectedRoomId && availableRooms && !availableRoomIds.has(selectedRoomId)) {
      setSelectedRoomId("")
    }
  }, [availableRoomIds, availableRooms, selectedRoomId])

  // --- Guest search (debounced via SWR dedup) ---
  // РЕКОМЕНДАЦІЯ ЩОДО ЕФЕКТИВНОСТІ БАЗИ ДАНИХ (Step 4):
  // Оскільки пошук здійснюється за допомогою 'ilike %like%' на чотирьох колонках одночасно
  // (first_name, last_name, email, phone), це призведе до Full Table Scan на великих обсягах даних.
  // Для оптимізації необхідно додати триграмний GIN індекс у PostgreSQL Supabase:
  //
  // CREATE EXTENSION IF NOT EXISTS pg_trgm;
  // CREATE INDEX IF NOT EXISTS idx_guests_search_trgm ON guests 
  // USING gin (first_name gin_trgm_ops, last_name gin_trgm_ops, email gin_trgm_ops, phone gin_trgm_ops);
  const trimmedSearch = guestSearch.trim()
  const guestSearchKey = trimmedSearch.length >= 2 ? ["guest-search", trimmedSearch] : null

  const { data: guestMatches, isLoading: isSearchingGuests } = useSWR<GuestMatch[]>(
    guestSearchKey,
    async () => {
      const q = trimmedSearch
      const like = `%${q.replace(/[,()]/g, "")}%`
      const { data, error: err } = await supabase
        .from("guests")
        .select("id, first_name, last_name, email, phone, country, passport_number, id_number, is_vip")
        .eq("is_active", true)
        .or(
          [
            `first_name.ilike.${like}`,
            `last_name.ilike.${like}`,
            `email.ilike.${like}`,
            `phone.ilike.${like}`,
            `passport_number.ilike.${like}`,
            `id_number.ilike.${like}`,
          ].join(","),
        )
        .limit(8)

      if (err) {
        console.log("guest search error:", err.message)
        return []
      }
      return (data || []) as GuestMatch[]
    },
    { revalidateOnFocus: false, dedupingInterval: 400 },
  )

  const canGoToStep2 = Boolean(checkInDate && checkOutDate && nights >= 1 && totalAdults >= 1)
  const canGoToStep3 = Boolean(
    hasGuestCount && effectiveRoomTypeId && selectedRatePlan && selectedRoomId && !capacityExceeded,
  )
  const canSubmit = Boolean(
    hasGuestCount &&
      canGoToStep2 &&
      canGoToStep3 &&
      (selectedGuest ||
        (showNewGuestForm &&
          isNewGuestFirstNameValid &&
          isNewGuestLastNameValid &&
          isNewGuestPhoneValid &&
          isNewGuestEmailValid &&
          hasNewGuestIdentification &&
          isNewGuestPassportNumberValid &&
          isNewGuestIdCardNumberValid)),
  )

  const handleStayRangeSelect = (range?: { from?: Date; to?: Date }) => {
    if (!range?.from) {
      setCheckInDate(undefined)
      setCheckOutDate(undefined)
      return
    }

    setCheckInDate(range.from)
    setCheckOutDate(addDays(range.to ?? range.from, 1))
  }

  const handleAdultsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    if (raw.trim() === "") {
      setAdults("")
      return
    }

    let value = parseInt(raw, 10)
    if (Number.isNaN(value)) value = 1
    value = Math.min(Math.max(value, 1), MAX_OCCUPANCY)

    const total = value + parseInt(children, 10)
    if (total > MAX_OCCUPANCY) {
      const newChildren = MAX_OCCUPANCY - value
      setChildren(newChildren.toString())
    }
    setAdults(value.toString())
  }

  const handleChildrenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = parseInt(e.target.value, 10)
    if (Number.isNaN(value)) value = 0

    const maxChildren = MAX_OCCUPANCY - Math.max(1, parseInt(adults || "0", 10))
    value = Math.min(Math.max(value, 0), Math.max(0, maxChildren))
    setChildren(value.toString())
  }

  const handlePhoneFocus = () => {
    if (!newGuestData.phone) {
      setNewGuestData((current) => ({ ...current, phone: `${UA_PHONE_PREFIX} (` }))
    }
  }

  const handleGuestNameChange =
    (field: "firstName" | "lastName") => (e: React.ChangeEvent<HTMLInputElement>) => {
      setNewGuestData((current) => ({ ...current, [field]: formatPersonName(e.target.value) }))
    }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewGuestData((current) => ({ ...current, phone: formatUaPhone(e.target.value) }))
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewGuestData((current) => ({ ...current, email: formatEmail(e.target.value) }))
  }

  const applyEmailDomain = (domain: string) => {
    setNewGuestData((current) => {
      const atIndex = current.email.indexOf("@")
      if (atIndex <= 0) return current

      return {
        ...current,
        email: `${current.email.slice(0, atIndex)}@${domain}`,
      }
    })
  }

  const handleCountryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewGuestData((current) => ({ ...current, country: e.target.value }))
    setIsCountrySuggestionsOpen(true)
  }

  const applyCountrySuggestion = (country: string) => {
    setNewGuestData((current) => ({ ...current, country }))
    setIsCountrySuggestionsOpen(false)
  }

  const handlePassportNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewGuestData((current) => ({
      ...current,
      passportNumber: formatUkrainianPassportNumber(e.target.value),
    }))
  }

  const handleIdCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewGuestData((current) => ({
      ...current,
      idCardNumber: formatUkrainianIdCardNumber(e.target.value),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (showNewGuestForm && !selectedGuest && (!isNewGuestFirstNameValid || !isNewGuestLastNameValid)) {
      setError("Імʼя та прізвище мають містити щонайменше 2 літери, без цифр.")
      return
    }

    if (showNewGuestForm && !selectedGuest && !isNewGuestPhoneValid) {
      setError("Введіть повний український номер телефону у форматі +380 (##) ###-##-##.")
      return
    }

    if (showNewGuestForm && !selectedGuest && !isNewGuestEmailValid) {
      setError("Введіть email латиницею у форматі name@example.com.")
      return
    }

    if (showNewGuestForm && !selectedGuest && !hasNewGuestIdentification) {
      setError("Вкажіть номер ID-картки або паспорта гостя.")
      return
    }

    if (showNewGuestForm && !selectedGuest && !isNewGuestPassportNumberValid) {
      setError("Номер паспорта має містити 2 українські літери серії та 6 цифр.")
      return
    }

    if (showNewGuestForm && !selectedGuest && !isNewGuestIdCardNumberValid) {
      setError("Номер ID-картки має містити рівно 9 цифр.")
      return
    }

    if (!checkInIso || !checkOutIso || nights < 1) {
      setError("Оберіть коректний період проживання.")
      return
    }

    const todayIso = format(new Date(), "yyyy-MM-dd")
    if (checkInIso < todayIso) {
      setError("Не можна створити нове бронювання з датою заїзду в минулому.")
      return
    }

    if (totalAdults < 1) {
      setError("Вкажіть кількість дорослих. Мінімум 1.")
      return
    }

    if (!canSubmit || !roomType || !ratePlan) return

    setIsLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Сесія недійсна. Увійдіть ще раз.")

      const { data: freshRoom, error: freshRoomErr } = await supabase
        .from("rooms")
        .select(
          "id, status, occupancy_status, housekeeping_status, operational_status",
        )
        .eq("id", selectedRoomId)
        .single()
      if (freshRoomErr || !freshRoom) {
        throw new Error("Не вдалося перевірити актуальний статус номера.")
      }
      if (!isRoomStateSellable(freshRoom)) {
        throw new Error(
          `Обраний номер більше не продається: ${getRoomStateAvailabilityReason(freshRoom)}`,
        )
      }

      // 1) Re-check availability of the chosen room right before insert
      //    to minimise the race window.
      const { data: stillConflict, error: conflictErr } = await supabase
        .from("reservations")
        .select("id, reservation_rooms!inner(room_id)")
        .in("status", getBlockingReservationStatuses())
        .lt("check_in_date", checkOutIso)
        .gt("check_out_date", checkInIso)
        .eq("reservation_rooms.room_id", selectedRoomId)
        .limit(1)

      if (conflictErr) throw conflictErr
      if (stillConflict && stillConflict.length > 0) {
        throw new Error("Обраний номер щойно став недоступним на ці дати. Оберіть інший номер.")
      }

      const { data: stillBlocked, error: roomBlockErr } = await supabase
        .from("room_blocks")
        .select("id")
        .eq("room_id", selectedRoomId)
        .lt("start_date", checkOutIso)
        .gt("end_date", checkInIso)
        .limit(1)

      if (roomBlockErr) throw roomBlockErr
      if (stillBlocked && stillBlocked.length > 0) {
        throw new Error("Обраний номер заблокований на ці дати. Оберіть інший номер.")
      }

      // 2) Resolve guest: reuse existing or create new (with a last-chance
      //    duplicate check by contacts and documents for the new-guest branch).
      let guestId: string
      if (selectedGuest) {
        guestId = selectedGuest.id
      } else {
        const email = newGuestData.email.trim().toLowerCase() || null
        const phone = newGuestData.phone.trim() || null
        const passportNumber = newGuestData.passportNumber.trim() || null
        const idNumber = newGuestData.idCardNumber.trim() || null

        if (email || phone || passportNumber || idNumber) {
          const orClauses: string[] = []
          if (email) orClauses.push(`email.eq.${email}`)
          if (phone) orClauses.push(`phone.eq.${phone}`)
          if (passportNumber) orClauses.push(`passport_number.eq.${passportNumber}`)
          if (idNumber) orClauses.push(`id_number.eq.${idNumber}`)
          const { data: dup } = await supabase
            .from("guests")
            .select("id")
            .or(orClauses.join(","))
            .limit(1)
            .maybeSingle()
          if (dup?.id) {
            guestId = dup.id
          } else {
            const { data: created, error: guestErr } = await supabase
              .from("guests")
              .insert({
                first_name: newGuestData.firstName.trim(),
                last_name: newGuestData.lastName.trim(),
                email,
                phone,
                country: newGuestData.country.trim() || null,
                passport_number: passportNumber,
                id_number: idNumber,
                is_active: true,
              })
              .select("id")
              .single()
            if (guestErr) throw guestErr
            guestId = created.id
          }
        } else {
          const { data: created, error: guestErr } = await supabase
            .from("guests")
            .insert({
              first_name: newGuestData.firstName.trim(),
              last_name: newGuestData.lastName.trim(),
              email: null,
              phone: null,
              country: newGuestData.country.trim() || null,
              passport_number: passportNumber,
              id_number: idNumber,
              is_active: true,
            })
            .select("id")
            .single()
          if (guestErr) throw guestErr
          guestId = created.id
        }
      }

      // 3) Create reservation. If prepayment is not required in hotel settings,
      //    the booking can start as confirmed immediately.
      const reservationNumber = `RES${Date.now().toString().slice(-8)}`
      const { data: reservation, error: reservationError } = await supabase
        .from("reservations")
        .insert({
          reservation_number: reservationNumber,
          guest_id: guestId,
          check_in_date: checkInIso,
          check_out_date: checkOutIso,
          adults: totalAdults,
          children: totalChildren,
          status: prepaymentRequired ? "pending" : "confirmed",
          rate_plan_id: selectedRatePlan,
          total_amount: Math.round(totalAmount * 100) / 100,
          paid_amount: 0,
          special_requests: specialRequests.trim() || null,
          channel: "Direct",
          created_by: user.id,
        })
        .select("id")
        .single()
      if (reservationError) throw reservationError

      // 4) Link the specific room.
      const { error: rrErr } = await supabase.from("reservation_rooms").insert({
        reservation_id: reservation.id,
        room_id: selectedRoomId,
        room_type_id: effectiveRoomTypeId,
        rate: roomType.base_rate,
      })
      if (rrErr) throw rrErr

      router.push(`/dashboard/reservations/${reservation.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Сталася помилка при створенні бронювання")
    } finally {
      setIsLoading(false)
    }
  }

  const value: FormContextType = {
    roomTypes,
    ratePlans,
    hotelSettings,
    initialReservationContext,
    step,
    setStep,
    isLoading,
    error,
    setError,

    checkInDate,
    setCheckInDate,
    checkOutDate,
    setCheckOutDate,
    adults,
    setAdults,
    children,
    setChildren,

    selectedRoomType,
    setSelectedRoomType,
    selectedRatePlan,
    setSelectedRatePlan,
    selectedRoomId,
    setSelectedRoomId,

    guestSearch,
    setGuestSearch,
    selectedGuest,
    setSelectedGuest,
    showNewGuestForm,
    setShowNewGuestForm,
    newGuestData,
    setNewGuestData,
    specialRequests,
    setSpecialRequests,
    isCountrySuggestionsOpen,
    setIsCountrySuggestionsOpen,

    checkInIso,
    checkOutIso,
    nights,
    prefilledRoomTypeId,
    effectiveRoomTypeId,
    roomType,
    ratePlan,
    totalAdults,
    totalChildren,
    totalGuests,
    capacityExceeded,
    hasGuestCount,
    baseAmount,
    discount,
    totalAmount,
    prepaymentDue,
    prepaymentRequired,
    newGuestPhoneDigitsCount,
    isNewGuestFirstNameValid,
    isNewGuestLastNameValid,
    isNewGuestPhoneValid,
    isNewGuestEmailValid,
    isNewGuestPassportNumberValid,
    isNewGuestIdCardNumberValid,
    hasNewGuestIdentification,
    emailLocalPart,
    emailDomainPart,
    emailDomainSuggestions,
    countryQuery,
    countrySuggestions,
    availableRooms,
    isLoadingRooms,
    availabilityResult,
    selectedRoomNumber,
    guestMatches,
    isSearchingGuests,
    trimmedSearch,

    canGoToStep2,
    canGoToStep3,
    canSubmit,

    handleStayRangeSelect,
    handleAdultsChange,
    handleChildrenChange,
    handlePhoneFocus,
    handleGuestNameChange,
    handlePhoneChange,
    handleEmailChange,
    applyEmailDomain,
    handleCountryChange,
    applyCountrySuggestion,
    handlePassportNumberChange,
    handleIdCardNumberChange,
    handleSubmit,
  }

  return (
    <NewReservationFormContext.Provider value={value}>
      {childrenProp}
    </NewReservationFormContext.Provider>
  )
}
