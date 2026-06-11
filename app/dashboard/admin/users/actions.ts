"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"
import type { UserRole } from "@/lib/types"
import {
  getUaPhoneNationalDigits,
  isValidEmail,
  isValidOptionalUaPhone,
  isValidPersonName,
  validatePassword,
} from "@/lib/validation"

const allowedRoles = new Set<UserRole>([
  "system_administrator",
  "general_manager",
  "front_desk_manager",
  "front_desk_agent",
  "reservations_manager",
  "housekeeping_supervisor",
  "housekeeping_staff",
  "revenue_manager",
  "sales_manager",
  "accountant",
  "maintenance_manager",
  "maintenance_staff",
  "fb_manager",
])

export type UserActionResult = {
  success: boolean
  error?: string
  userId?: string
}

export type CreateUserInput = {
  firstName: string
  lastName: string
  email: string
  phone: string
  role: string
  department: string
  password: string
  isActive: boolean
}

export type UpdateUserInput = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: string
  employeeId: string
  department: string
  isActive: boolean
}

function getAdminErrorMessage(message: string) {
  const normalized = message.toLowerCase()

  if (
    normalized.includes("already registered") ||
    normalized.includes("already been registered") ||
    normalized.includes("already exists") ||
    (normalized.includes("duplicate key") && normalized.includes("email"))
  ) {
    return "Користувач із такою електронною поштою вже зареєстрований."
  }

  if (normalized.includes("employee_id") || normalized.includes("profiles_employee_id_key")) {
    return "Користувач із таким ID працівника вже існує."
  }

  if (normalized.includes("password")) {
    return "Пароль не відповідає вимогам безпеки."
  }

  if (normalized.includes("invalid email")) {
    return "Введіть коректну електронну пошту."
  }

  return "Не вдалося зберегти користувача. Спробуйте ще раз."
}

function validateProfileInput(input: CreateUserInput | UpdateUserInput) {
  const firstName = input.firstName.trim()
  const lastName = input.lastName.trim()
  const email = input.email.trim().toLowerCase()
  const phone = input.phone.trim()
  const employeeId = "employeeId" in input ? input.employeeId.trim() || null : null
  const department = input.department.trim() || null
  const role = input.role as UserRole

  if (!isValidPersonName(firstName) || !isValidPersonName(lastName)) {
    return { error: "Імʼя та прізвище мають містити мінімум 2 літери без цифр і спецсимволів." }
  }

  if (!isValidEmail(email)) {
    return { error: "Введіть коректну електронну пошту." }
  }

  if (!isValidOptionalUaPhone(phone) || getUaPhoneNationalDigits(phone).length > 9) {
    return { error: "Телефон має бути у форматі +380 (##) ###-##-##." }
  }

  if (!allowedRoles.has(role)) {
    return { error: "Оберіть коректну роль користувача." }
  }

  return {
    value: {
      firstName,
      lastName,
      email,
      phone,
      employeeId,
      department,
      role,
    },
  }
}

async function requireSystemAdministrator() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: "Увійдіть у систему, щоб керувати користувачами." }
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError || profile?.role !== "system_administrator") {
    return { error: "У вас немає прав для керування користувачами." }
  }

  return { userId: user.id }
}

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { error: "На сервері не налаштований ключ для керування користувачами." }
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

async function getRequestOrigin() {
  const headersList = await headers()
  const host = headersList.get("host")
  const protocol = headersList.get("x-forwarded-proto") ?? "http"

  return process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? (host ? `${protocol}://${host}` : "")
}

async function generateNextEmployeeId(adminSupabase: any) {
  const { data, error } = await adminSupabase
    .from("profiles")
    .select("employee_id")
    .not("employee_id", "is", null)

  if (error) {
    return { error: getAdminErrorMessage(error.message) }
  }

  const maxEmployeeNumber = ((data ?? []) as Array<{ employee_id?: string | null }>).reduce((max: number, row) => {
    const match = row.employee_id?.match(/^EMP(\d+)$/i)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)

  return { employeeId: `EMP${String(maxEmployeeNumber + 1).padStart(3, "0")}` }
}

export async function createUserAction(input: CreateUserInput): Promise<UserActionResult> {
  const currentUser = await requireSystemAdministrator()
  if ("error" in currentUser) return { success: false, error: currentUser.error }

  const validated = validateProfileInput(input)
  if ("error" in validated) return { success: false, error: validated.error }

  const passwordValidation = validatePassword(input.password)
  if (!passwordValidation.isValid) {
    return { success: false, error: passwordValidation.errors.join(" ") }
  }

  const adminClient = createAdminClient()
  if ("error" in adminClient) return { success: false, error: adminClient.error }

  const { firstName, lastName, email, phone, department, role } = validated.value
  const generatedEmployeeId = await generateNextEmployeeId(adminClient.adminSupabase)

  if ("error" in generatedEmployeeId) {
    return { success: false, error: generatedEmployeeId.error }
  }

  const employeeId = generatedEmployeeId.employeeId

  const { data: authData, error: authError } = await adminClient.adminSupabase.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      phone: phone || null,
      role,
      employee_id: employeeId,
      department,
    },
  })

  if (authError || !authData.user) {
    return { success: false, error: getAdminErrorMessage(authError?.message ?? "") }
  }

  const { error: profileError } = await adminClient.adminSupabase.from("profiles").insert({
    id: authData.user.id,
    email,
    first_name: firstName,
    last_name: lastName,
    phone: phone || null,
    role,
    employee_id: employeeId,
    department,
    is_active: input.isActive,
  })

  if (profileError) {
    await adminClient.adminSupabase.auth.admin.deleteUser(authData.user.id)
    return { success: false, error: getAdminErrorMessage(profileError.message) }
  }

  revalidatePath("/dashboard/admin/users")
  return { success: true, userId: authData.user.id }
}

export async function updateUserAction(input: UpdateUserInput): Promise<UserActionResult> {
  const currentUser = await requireSystemAdministrator()
  if ("error" in currentUser) return { success: false, error: currentUser.error }

  const validated = validateProfileInput(input)
  if ("error" in validated) return { success: false, error: validated.error }

  if (input.id === currentUser.userId && !input.isActive) {
    return { success: false, error: "Не можна деактивувати власний обліковий запис." }
  }

  if (input.id === currentUser.userId && validated.value.role !== "system_administrator") {
    return { success: false, error: "Не можна прибрати роль системного адміністратора у власного облікового запису." }
  }

  const adminClient = createAdminClient()
  if ("error" in adminClient) return { success: false, error: adminClient.error }

  const { data: existingProfile, error: existingProfileError } = await adminClient.adminSupabase
    .from("profiles")
    .select("employee_id")
    .eq("id", input.id)
    .single()

  if (existingProfileError) {
    return { success: false, error: getAdminErrorMessage(existingProfileError.message) }
  }

  const { firstName, lastName, email, phone, department, role } = validated.value
  const employeeId = existingProfile?.employee_id ?? validated.value.employeeId
  const authUpdate: {
    email: string
    user_metadata: Record<string, string | null>
  } = {
    email,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      phone: phone || null,
      role,
      employee_id: employeeId,
      department,
    },
  }

  const { error: authError } = await adminClient.adminSupabase.auth.admin.updateUserById(input.id, authUpdate)

  if (authError) {
    return { success: false, error: getAdminErrorMessage(authError.message) }
  }

  const { error: profileError } = await adminClient.adminSupabase
    .from("profiles")
    .update({
      email,
      first_name: firstName,
      last_name: lastName,
      phone: phone || null,
      role,
      employee_id: employeeId,
      department,
      is_active: input.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)

  if (profileError) {
    return { success: false, error: getAdminErrorMessage(profileError.message) }
  }

  revalidatePath("/dashboard/admin/users")
  revalidatePath(`/dashboard/admin/users/${input.id}`)
  return { success: true, userId: input.id }
}

export async function sendPasswordResetAction(userId: string): Promise<UserActionResult> {
  const currentUser = await requireSystemAdministrator()
  if ("error" in currentUser) return { success: false, error: currentUser.error }

  const adminClient = createAdminClient()
  if ("error" in adminClient) return { success: false, error: adminClient.error }

  const { data: profile, error: profileError } = await adminClient.adminSupabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single()

  if (profileError || !profile?.email) {
    return { success: false, error: "Не вдалося знайти email користувача для скидання пароля." }
  }

  const origin = await getRequestOrigin()
  const { error } = await adminClient.adminSupabase.auth.resetPasswordForEmail(profile.email, {
    redirectTo: origin ? `${origin}/login?mode=recovery` : undefined,
  })

  if (error) {
    return { success: false, error: getAdminErrorMessage(error.message) }
  }

  return { success: true, userId }
}
