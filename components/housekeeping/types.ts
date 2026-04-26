// Shared types for the housekeeping modules.
// Kept narrow on purpose — these are the projections we actually
// use in the UI, not the full DB rows.

export interface Room {
  id: string
  room_number: string
  floor: number
  status: string
  notes: string | null
  room_type: { name: string } | null
}

export interface StaffMember {
  id: string
  first_name: string
  last_name: string
  role: string
}

export interface ChecklistItem {
  id: string
  task_id: string
  label: string
  position: number
  is_required: boolean
  is_done: boolean
  done_at: string | null
}

export interface HKTask {
  id: string
  room_id: string
  assigned_to: string | null
  task_type: string
  priority: string
  status: string
  notes: string | null
  scheduled_date: string | null
  estimated_minutes: number | null
  actual_minutes: number | null
  started_at: string | null
  paused_at: string | null
  completed_at: string | null
  guest_status: string | null
  dnd: boolean | null
  service_refused: boolean | null
  created_at: string
  rooms: { room_number: string; floor: number; room_type: { name: string } | null } | null
  assigned_profile: { id: string; first_name: string; last_name: string } | null
  checklist?: ChecklistItem[]
}

export interface InspectionItem {
  id: string
  inspection_id: string
  category: string
  label: string
  position: number
  result: string // pass | fail | pending | na
  note: string | null
}

export interface RoomInspection {
  id: string
  room_id: string
  task_id: string | null
  inspector_id: string | null
  status: string
  result: string | null
  score: number | null
  notes: string | null
  failed_categories: string[] | null
  started_at: string | null
  completed_at: string | null
  rooms: { room_number: string; floor: number } | null
  items?: InspectionItem[]
}

export const TASK_STATUSES = [
  "planned",
  "assigned",
  "in_progress",
  "paused",
  "on_hold",
  "completed",
] as const

export const KANBAN_COLUMNS: { key: string; matches: string[] }[] = [
  { key: "planned", matches: ["planned", "pending"] },
  { key: "assigned", matches: ["assigned"] },
  { key: "in_progress", matches: ["in_progress"] },
  { key: "paused", matches: ["paused", "on_hold"] },
  { key: "completed", matches: ["completed"] },
]

export const INSPECTION_DEFAULTS: { category: string; label: string }[] = [
  { category: "bathroom", label: "Чистота унітазу та раковини" },
  { category: "bathroom", label: "Стан плитки та затірки" },
  { category: "bathroom", label: "Свіжі рушники та халати" },
  { category: "bedroom", label: "Заправлене ліжко та чиста білизна" },
  { category: "bedroom", label: "Витерті поверхні без пилу" },
  { category: "bedroom", label: "Вимита підлога та відсутність сміття" },
  { category: "amenities", label: "Поповнено амeніті та засоби" },
  { category: "amenities", label: "Мінібар укомплектовано" },
  { category: "electronics", label: "Телевізор та пульт працюють" },
  { category: "electronics", label: "Кондиціонер у штатному режимі" },
  { category: "overall", label: "Запах свіжості, без сторонніх ароматів" },
  { category: "overall", label: "Освітлення та лампи справні" },
]

export const TASK_CHECKLIST_PRESETS: Record<string, string[]> = {
  standard_cleaning: [
    "Винести сміття та змінити пакети",
    "Замінити постільну білизну",
    "Замінити рушники",
    "Витерти всі поверхні",
    "Вимити санвузол",
    "Пропилососити та помити підлогу",
    "Поповнити засоби та амeніті",
  ],
  checkout_cleaning: [
    "Перевірити кімнату на залишені речі",
    "Зняти всю білизну та рушники",
    "Глибока санітарна обробка санвузла",
    "Замінити білизну та рушники",
    "Поповнити амeніті та мінібар",
    "Винести сміття та провітрити",
    "Перевірити техніку та освітлення",
  ],
  stayover_cleaning: [
    "Заправити ліжко",
    "Змінити рушники за потреби",
    "Витерти поверхні",
    "Винести сміття",
    "Поповнити амeніті",
  ],
  deep_cleaning: [
    "Зняти штори та помити вікна",
    "Перевернути та провітрити матрац",
    "Глибоке прибирання санвузла з очисниками",
    "Очистити вентиляцію та плінтуси",
    "Помити килими та підлогу зі шампунем",
    "Продезінфікувати всі поверхні",
  ],
  turndown: [
    "Розправити покривало",
    "Закрити штори",
    "Поповнити склянки та воду",
    "Прибрати залишені речі по місцях",
  ],
  inspection: ["Перевірити за чек-листом інспекції"],
  linen_change: ["Замінити простирадла", "Замінити пододіяльники", "Замінити наволочки"],
  minibar_restock: ["Перевірити термін придатності", "Поповнити напої та закуски", "Зафіксувати рахунок"],
  amenity_restock: ["Поповнити шампунь та гель", "Поповнити туалетний папір", "Замінити мило"],
}

export function isHKStaff(role: string) {
  return role === "housekeeping_staff"
}
export function isHKSupervisor(role: string) {
  return role === "housekeeping_supervisor" || role === "system_admin" || role === "general_manager"
}
export function isFrontDesk(role: string) {
  return role === "front_desk_agent" || role === "front_desk_manager"
}
