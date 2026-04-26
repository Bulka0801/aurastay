"use client"

import { createClient } from "@/lib/supabase/client"
import type { ChecklistItem, HKTask, InspectionItem, Room, RoomInspection } from "./types"

const TASK_SELECT = `
  id, room_id, assigned_to, task_type, priority, status, notes, scheduled_date,
  estimated_minutes, actual_minutes, started_at, paused_at, completed_at,
  guest_status, dnd, service_refused, created_at,
  rooms(room_number, floor, room_type:room_types(name)),
  assigned_profile:profiles!assigned_to(id, first_name, last_name)
`

export async function fetchTasks(): Promise<HKTask[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("housekeeping_tasks")
    .select(TASK_SELECT)
    .order("scheduled_date", { ascending: true, nullsFirst: false })
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) {
    console.log("[v0] fetchTasks error:", error.message)
    const { data: fb } = await supabase
      .from("housekeeping_tasks")
      .select(
        "id, room_id, assigned_to, task_type, priority, status, notes, scheduled_date, estimated_minutes, actual_minutes, started_at, paused_at, completed_at, guest_status, dnd, service_refused, created_at, rooms(room_number, floor, room_type:room_types(name))",
      )
      .order("created_at", { ascending: false })
    return ((fb as unknown as HKTask[]) || []).map((t) => ({ ...t, assigned_profile: null }))
  }
  return (data as unknown as HKTask[]) || []
}

export async function fetchRooms(): Promise<Room[]> {
  const supabase = createClient()
  const { data } = await supabase.from("rooms").select("*, room_type:room_types(name)").order("room_number")
  return (data as unknown as Room[]) || []
}

export async function fetchChecklist(taskId: string): Promise<ChecklistItem[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("housekeeping_task_checklist_items")
    .select("*")
    .eq("task_id", taskId)
    .order("position", { ascending: true })
  return (data as unknown as ChecklistItem[]) || []
}

export async function fetchActiveInspection(roomId: string): Promise<RoomInspection | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from("room_inspections")
    .select("*, rooms(room_number, floor)")
    .eq("room_id", roomId)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as unknown as RoomInspection) || null
}

export async function fetchInspectionItems(inspectionId: string): Promise<InspectionItem[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("inspection_checklist_items")
    .select("*")
    .eq("inspection_id", inspectionId)
    .order("position", { ascending: true })
  return (data as unknown as InspectionItem[]) || []
}

// ----- Mutations ------------------------------------------------

export async function startTask(taskId: string, userId: string) {
  const supabase = createClient()
  const { data: task } = await supabase
    .from("housekeeping_tasks")
    .select("assigned_to")
    .eq("id", taskId)
    .maybeSingle()
  await supabase
    .from("housekeeping_tasks")
    .update({
      status: "in_progress",
      started_at: new Date().toISOString(),
      paused_at: null,
      assigned_to: task?.assigned_to ?? userId,
    })
    .eq("id", taskId)
}

export async function pauseTask(taskId: string) {
  const supabase = createClient()
  await supabase
    .from("housekeeping_tasks")
    .update({ status: "paused", paused_at: new Date().toISOString() })
    .eq("id", taskId)
}

export async function resumeTask(taskId: string) {
  const supabase = createClient()
  await supabase
    .from("housekeeping_tasks")
    .update({ status: "in_progress", paused_at: null })
    .eq("id", taskId)
}

export async function holdTask(taskId: string, reason: { dnd?: boolean; service_refused?: boolean; notes?: string }) {
  const supabase = createClient()
  await supabase
    .from("housekeeping_tasks")
    .update({
      status: "on_hold",
      dnd: reason.dnd ?? false,
      service_refused: reason.service_refused ?? false,
      notes: reason.notes ?? null,
    })
    .eq("id", taskId)
}

export async function completeTask(taskId: string) {
  const supabase = createClient()
  const { data: task } = await supabase
    .from("housekeeping_tasks")
    .select("started_at")
    .eq("id", taskId)
    .maybeSingle()

  let actualMinutes: number | null = null
  if (task?.started_at) {
    actualMinutes = Math.max(1, Math.round((Date.now() - new Date(task.started_at).getTime()) / 60000))
  }
  await supabase
    .from("housekeeping_tasks")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      actual_minutes: actualMinutes,
    })
    .eq("id", taskId)
}

export async function assignTask(taskId: string, staffId: string | null) {
  const supabase = createClient()
  await supabase
    .from("housekeeping_tasks")
    .update({
      assigned_to: staffId,
      status: staffId ? "assigned" : "planned",
      assigned_at: staffId ? new Date().toISOString() : null,
    })
    .eq("id", taskId)
}

export async function setTaskPriority(taskId: string, priority: string) {
  const supabase = createClient()
  await supabase.from("housekeeping_tasks").update({ priority }).eq("id", taskId)
}

export async function toggleChecklistItem(itemId: string, isDone: boolean, userId: string) {
  const supabase = createClient()
  await supabase
    .from("housekeeping_task_checklist_items")
    .update({
      is_done: isDone,
      done_at: isDone ? new Date().toISOString() : null,
      done_by: isDone ? userId : null,
    })
    .eq("id", itemId)
}

export async function updateRoomStatus(roomId: string, status: string) {
  const supabase = createClient()
  await supabase.from("rooms").update({ status }).eq("id", roomId)
}

// ----- Inspection mutations -------------------------------------

export async function startInspection(
  roomId: string,
  inspectorId: string,
  taskId: string | null,
  defaults: { category: string; label: string }[],
): Promise<string | null> {
  const supabase = createClient()
  const { data: insp, error } = await supabase
    .from("room_inspections")
    .insert({
      room_id: roomId,
      task_id: taskId,
      inspector_id: inspectorId,
      status: "in_progress",
    })
    .select("id")
    .single()
  if (error || !insp) {
    console.log("[v0] startInspection error:", error?.message)
    return null
  }
  if (defaults.length > 0) {
    await supabase.from("inspection_checklist_items").insert(
      defaults.map((d, i) => ({
        inspection_id: insp.id,
        category: d.category,
        label: d.label,
        position: i,
        result: "pending",
      })),
    )
  }
  return insp.id
}

export async function setInspectionItemResult(itemId: string, result: "pass" | "fail" | "na" | "pending", note?: string) {
  const supabase = createClient()
  await supabase
    .from("inspection_checklist_items")
    .update({ result, note: note ?? null })
    .eq("id", itemId)
}

export async function completeInspection(
  inspectionId: string,
  payload: {
    result: "passed" | "failed" | "re_clean" | "maintenance_required"
    score: number | null
    failed_categories: string[]
    notes: string | null
    roomId: string
    inspectorId: string
  },
) {
  const supabase = createClient()
  const status = payload.result === "passed" ? "passed" : "failed"

  // Optional: spawn re-clean task or maintenance request
  let reCleaningTaskId: string | null = null
  let maintenanceRequestId: string | null = null

  if (payload.result === "re_clean") {
    const { data: t } = await supabase
      .from("housekeeping_tasks")
      .insert({
        room_id: payload.roomId,
        task_type: "standard_cleaning",
        priority: "high",
        status: "planned",
        notes: `Повторне прибирання за результатами інспекції. ${payload.notes || ""}`.trim(),
        scheduled_date: new Date().toISOString().slice(0, 10),
        created_by: payload.inspectorId,
      })
      .select("id")
      .single()
    reCleaningTaskId = t?.id ?? null
  }
  if (payload.result === "maintenance_required") {
    const { data: m } = await supabase
      .from("maintenance_requests")
      .insert({
        room_id: payload.roomId,
        title: "Виявлено за інспекцією прибирання",
        description: payload.notes || "Деталі див. у звіті інспекції.",
        priority: "high",
        status: "pending",
        reported_by: payload.inspectorId,
      })
      .select("id")
      .single()
    maintenanceRequestId = m?.id ?? null
  }

  await supabase
    .from("room_inspections")
    .update({
      status,
      result: payload.result,
      score: payload.score,
      failed_categories: payload.failed_categories,
      notes: payload.notes,
      completed_at: new Date().toISOString(),
      re_cleaning_task_id: reCleaningTaskId,
      maintenance_request_id: maintenanceRequestId,
    })
    .eq("id", inspectionId)
}
