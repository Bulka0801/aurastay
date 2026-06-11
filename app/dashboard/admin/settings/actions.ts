"use server"

import { revalidatePath } from "next/cache"
import { createClient as createSupabaseAdminClient, type SupabaseClient } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"

export type SettingsActionResult = {
  success: boolean
  error?: string
}

export type HotelSettingsInput = {
  prepayment_required: boolean
  prepayment_percent: number
  default_checkin_time: string
  default_checkout_time: string
  currency: string
  locale: string
}

export type RoomTypeInput = {
  id?: string
  name: string
  code: string
  description: string
  base_occupancy: number
  max_occupancy: number
  base_rate: number
  amenities: string[]
  size_sqm: number | null
  bed_type: string
  is_active: boolean
}

export type RoomInput = {
  id?: string
  room_number: string
  room_type_id: string
  floor: number
  occupancy_status: string
  housekeeping_status: string
  operational_status: string
  is_smoking: boolean
  has_disability_access: boolean
  notes: string
  last_maintenance_date: string | null
}

export type RatePlanInput = {
  id?: string
  name: string
  code: string
  description: string
  is_default: boolean
  discount_percentage: number
  cancellation_policy: string
  deposit_policy: string
  is_active: boolean
}

export type RoomBlockInput = {
  id?: string
  room_id: string
  start_date: string
  end_date: string
  block_type: string
  reason: string
}

const roomOccupancyStatuses = new Set(["vacant", "occupied"])
const roomHousekeepingStatuses = new Set(["clean", "dirty", "cleaning", "inspecting", "inspected"])
const roomOperationalStatuses = new Set(["operational", "maintenance", "blocked", "out_of_order"])
const roomBlockTypes = new Set(["maintenance", "admin", "out_of_order"])
const roomBlockStatuses = new Set(["maintenance", "blocked", "out_of_order"])

function todayDateKey() {
  return new Date().toISOString().slice(0, 10)
}

function roomOperationalStatusForBlockType(blockType: string) {
  if (blockType === "out_of_order") return "out_of_order"
  if (blockType === "maintenance") return "maintenance"
  return "blocked"
}

async function refreshRoomStatusFromBlocks(adminSupabase: SupabaseClient<any>, roomId: string) {
  const today = todayDateKey()
  const { data: activeBlocks, error: blockError } = await adminSupabase
    .from("room_blocks")
    .select("block_type, start_date")
    .eq("room_id", roomId)
    .lte("start_date", today)
    .gt("end_date", today)
    .order("start_date", { ascending: false })

  if (blockError) return blockError

  if (activeBlocks && activeBlocks.length > 0) {
    const priority = ["out_of_order", "maintenance", "admin"]
    const activeBlock =
      priority
        .map((blockType) => activeBlocks.find((block) => block.block_type === blockType))
        .find(Boolean) ?? activeBlocks[0]

    const { error } = await adminSupabase
      .from("rooms")
      .update({
        operational_status: roomOperationalStatusForBlockType(activeBlock.block_type),
        updated_at: new Date().toISOString(),
      })
      .eq("id", roomId)

    return error
  }

  const { data: room, error: roomError } = await adminSupabase
    .from("rooms")
    .select("operational_status")
    .eq("id", roomId)
    .single()

  if (roomError) return roomError
  if (!roomBlockStatuses.has(room.operational_status)) return null

  const { error } = await adminSupabase
    .from("rooms")
    .update({
      operational_status: "operational",
      updated_at: new Date().toISOString(),
    })
    .eq("id", roomId)

  return error
}

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { error: "На сервері не налаштований ключ для адміністрування." }
  }

  return {
    adminSupabase: createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }),
  }
}

async function requireSystemAdministrator() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: "Увійдіть у систему, щоб змінювати налаштування." }
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError || profile?.role !== "system_administrator") {
    return { error: "У вас немає прав для зміни системних налаштувань." }
  }

  return { userId: user.id }
}

function normalizeCode(value: string) {
  return value.trim().toUpperCase()
}

function normalizeText(value: string) {
  return value.trim()
}

function handleError(message?: string) {
  const normalized = (message ?? "").toLowerCase()

  if (normalized.includes("duplicate key") || normalized.includes("unique")) {
    return "Запис із таким кодом або номером уже існує."
  }

  if (normalized.includes("violates foreign key")) {
    return "Не можна видалити: запис уже використовується в інших даних. Спочатку приберіть це посилання або зробіть запис неактивним."
  }

  if (normalized.includes("violates check")) {
    return "Дані не відповідають обмеженням таблиці."
  }

  return "Не вдалося зберегти зміни. Спробуйте ще раз."
}

function validatePercent(value: number) {
  return Number.isFinite(value) && value >= 0 && value <= 100
}

async function withAdmin<T>(callback: (adminSupabase: SupabaseClient<any>, userId: string) => Promise<T>) {
  const currentUser = await requireSystemAdministrator()
  if ("error" in currentUser) return { success: false, error: currentUser.error } satisfies SettingsActionResult

  const adminClient = createAdminClient()
  if ("error" in adminClient) return { success: false, error: adminClient.error } satisfies SettingsActionResult

  return callback(adminClient.adminSupabase, currentUser.userId)
}

export async function saveHotelSettingsAction(input: HotelSettingsInput): Promise<SettingsActionResult> {
  if (!validatePercent(input.prepayment_percent)) {
    return { success: false, error: "Передплата має бути від 0 до 100%." }
  }

  if (input.currency.trim().length !== 3) {
    return { success: false, error: "Код валюти має складатися з 3 символів." }
  }

  return withAdmin(async (adminSupabase) => {
    const { error } = await adminSupabase.from("hotel_settings").upsert(
      {
        id: 1,
        prepayment_required: input.prepayment_required,
        prepayment_percent: input.prepayment_percent,
        default_checkin_time: input.default_checkin_time,
        default_checkout_time: input.default_checkout_time,
        currency: normalizeCode(input.currency),
        locale: normalizeText(input.locale) || "uk-UA",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )

    if (error) return { success: false, error: handleError(error.message) }

    revalidatePath("/dashboard/admin/settings")
    revalidatePath("/dashboard/reservations")
    return { success: true }
  })
}

export async function saveRoomTypeAction(input: RoomTypeInput): Promise<SettingsActionResult> {
  if (!input.name.trim() || !input.code.trim()) {
    return { success: false, error: "Назва і код типу номера обовʼязкові." }
  }

  if (input.base_occupancy < 1 || input.max_occupancy < input.base_occupancy) {
    return { success: false, error: "Місткість номера заповнена некоректно." }
  }

  if (input.base_rate < 0) {
    return { success: false, error: "Базова ціна не може бути відʼємною." }
  }

  const amenities = input.amenities.map(normalizeText).filter(Boolean)
  if (amenities.some((item) => item.includes(","))) {
    return { success: false, error: "Кожну зручність потрібно додавати окремо. Кома використовується тільки як розділювач." }
  }
  if (new Set(amenities.map((item) => item.toLowerCase())).size !== amenities.length) {
    return { success: false, error: "У списку зручностей є дублікати." }
  }
  if (amenities.some((item) => item.length > 50)) {
    return { success: false, error: "Одна зручність не може бути довшою за 50 символів." }
  }

  return withAdmin(async (adminSupabase) => {
    const payload = {
      name: normalizeText(input.name),
      code: normalizeCode(input.code),
      description: normalizeText(input.description) || null,
      base_occupancy: input.base_occupancy,
      max_occupancy: input.max_occupancy,
      base_rate: input.base_rate,
      amenities,
      size_sqm: input.size_sqm,
      bed_type: normalizeText(input.bed_type) || null,
      is_active: input.is_active,
      updated_at: new Date().toISOString(),
    }

    const query = input.id
      ? adminSupabase.from("room_types").update(payload).eq("id", input.id)
      : adminSupabase.from("room_types").insert(payload)

    const { error } = await query
    if (error) return { success: false, error: handleError(error.message) }

    revalidatePath("/dashboard/admin/settings")
    revalidatePath("/dashboard/rooms")
    revalidatePath("/dashboard/reservations/new")
    return { success: true }
  })
}

export async function deleteRoomTypeAction(id: string): Promise<SettingsActionResult> {
  return withAdmin(async (adminSupabase) => {
    const { error } = await adminSupabase.from("room_types").delete().eq("id", id)
    if (error) return { success: false, error: handleError(error.message) }

    revalidatePath("/dashboard/admin/settings")
    revalidatePath("/dashboard/rooms")
    return { success: true }
  })
}

export async function saveRoomAction(input: RoomInput): Promise<SettingsActionResult> {
  if (!input.room_number.trim()) {
    return { success: false, error: "Номер кімнати обовʼязковий." }
  }

  if (!input.room_type_id) {
    return { success: false, error: "Оберіть тип номера." }
  }

  if (!roomOccupancyStatuses.has(input.occupancy_status)) {
    return { success: false, error: "Некоректний статус проживання." }
  }
  if (!roomHousekeepingStatuses.has(input.housekeeping_status)) {
    return { success: false, error: "Некоректний статус прибирання." }
  }
  if (!roomOperationalStatuses.has(input.operational_status)) {
    return { success: false, error: "Некоректний технічний стан." }
  }

  return withAdmin(async (adminSupabase) => {
    const payload = {
      room_number: normalizeText(input.room_number),
      room_type_id: input.room_type_id,
      floor: input.floor,
      occupancy_status: input.occupancy_status,
      housekeeping_status: input.housekeeping_status,
      operational_status: input.operational_status,
      is_smoking: input.is_smoking,
      has_disability_access: input.has_disability_access,
      notes: normalizeText(input.notes) || null,
      last_maintenance_date: input.last_maintenance_date || null,
      updated_at: new Date().toISOString(),
    }

    const query = input.id ? adminSupabase.from("rooms").update(payload).eq("id", input.id) : adminSupabase.from("rooms").insert(payload)
    const { error } = await query
    if (error) return { success: false, error: handleError(error.message) }

    revalidatePath("/dashboard/admin/settings")
    revalidatePath("/dashboard/rooms")
    revalidatePath("/dashboard/room-rack")
    return { success: true }
  })
}

export async function deleteRoomAction(id: string): Promise<SettingsActionResult> {
  return withAdmin(async (adminSupabase) => {
    const { error } = await adminSupabase.from("rooms").delete().eq("id", id)
    if (error) return { success: false, error: handleError(error.message) }

    revalidatePath("/dashboard/admin/settings")
    revalidatePath("/dashboard/rooms")
    revalidatePath("/dashboard/room-rack")
    return { success: true }
  })
}

export async function saveRatePlanAction(input: RatePlanInput): Promise<SettingsActionResult> {
  if (!input.name.trim() || !input.code.trim()) {
    return { success: false, error: "Назва і код тарифу обовʼязкові." }
  }

  if (!validatePercent(input.discount_percentage)) {
    return { success: false, error: "Знижка має бути від 0 до 100%." }
  }

  return withAdmin(async (adminSupabase) => {
    if (input.is_default) {
      const { error } = await adminSupabase.from("rate_plans").update({ is_default: false }).neq("id", input.id ?? "")
      if (error) return { success: false, error: handleError(error.message) }
    }

    const payload = {
      name: normalizeText(input.name),
      code: normalizeCode(input.code),
      description: normalizeText(input.description) || null,
      is_default: input.is_default,
      discount_percentage: input.discount_percentage,
      cancellation_policy: normalizeText(input.cancellation_policy) || null,
      deposit_policy: normalizeText(input.deposit_policy) || null,
      is_active: input.is_active,
      updated_at: new Date().toISOString(),
    }

    const query = input.id ? adminSupabase.from("rate_plans").update(payload).eq("id", input.id) : adminSupabase.from("rate_plans").insert(payload)
    const { error } = await query
    if (error) return { success: false, error: handleError(error.message) }

    revalidatePath("/dashboard/admin/settings")
    revalidatePath("/dashboard/reservations")
    revalidatePath("/dashboard/reports")
    return { success: true }
  })
}

export async function deleteRatePlanAction(id: string): Promise<SettingsActionResult> {
  return withAdmin(async (adminSupabase) => {
    const { error } = await adminSupabase.from("rate_plans").delete().eq("id", id)
    if (error) return { success: false, error: handleError(error.message) }

    revalidatePath("/dashboard/admin/settings")
    revalidatePath("/dashboard/reservations")
    return { success: true }
  })
}

export async function saveRoomBlockAction(input: RoomBlockInput): Promise<SettingsActionResult> {
  if (!input.room_id || !input.start_date || !input.end_date) {
    return { success: false, error: "Оберіть номер і період блокування." }
  }

  if (input.end_date <= input.start_date) {
    return { success: false, error: "Дата завершення має бути пізніше дати початку." }
  }

  if (!roomBlockTypes.has(input.block_type)) {
    return { success: false, error: "Некоректний тип блокування." }
  }

  return withAdmin(async (adminSupabase, userId) => {
    const previousRoomId = input.id
      ? (
          await adminSupabase
            .from("room_blocks")
            .select("room_id")
            .eq("id", input.id)
            .maybeSingle()
        ).data?.room_id
      : null

    const payload = {
      room_id: input.room_id,
      start_date: input.start_date,
      end_date: input.end_date,
      block_type: input.block_type,
      reason: normalizeText(input.reason) || null,
      updated_at: new Date().toISOString(),
    }

    const query = input.id
      ? adminSupabase.from("room_blocks").update(payload).eq("id", input.id)
      : adminSupabase.from("room_blocks").insert({ ...payload, created_by: userId })

    const { error } = await query
    if (error) return { success: false, error: handleError(error.message) }

    const statusError = await refreshRoomStatusFromBlocks(adminSupabase, input.room_id)
    if (statusError) return { success: false, error: handleError(statusError.message) }

    if (previousRoomId && previousRoomId !== input.room_id) {
      const previousStatusError = await refreshRoomStatusFromBlocks(adminSupabase, previousRoomId)
      if (previousStatusError) return { success: false, error: handleError(previousStatusError.message) }
    }

    revalidatePath("/dashboard/admin/settings")
    revalidatePath("/dashboard/room-rack")
    revalidatePath("/dashboard/rooms")
    revalidatePath("/dashboard/reservations/new")
    return { success: true }
  })
}

export async function deleteRoomBlockAction(id: string): Promise<SettingsActionResult> {
  return withAdmin(async (adminSupabase) => {
    const { data: block } = await adminSupabase
      .from("room_blocks")
      .select("room_id")
      .eq("id", id)
      .maybeSingle()

    const { error } = await adminSupabase.from("room_blocks").delete().eq("id", id)
    if (error) return { success: false, error: handleError(error.message) }

    if (block?.room_id) {
      const statusError = await refreshRoomStatusFromBlocks(adminSupabase, block.room_id)
      if (statusError) return { success: false, error: handleError(statusError.message) }
    }

    revalidatePath("/dashboard/admin/settings")
    revalidatePath("/dashboard/room-rack")
    revalidatePath("/dashboard/rooms")
    revalidatePath("/dashboard/reservations/new")
    return { success: true }
  })
}
