"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CheckCircle2, ClipboardCheck, Loader2, RotateCw, Wrench, X } from "lucide-react"
import { formatInspectionCategory } from "@/lib/localization"
import {
  completeInspection,
  fetchInspectionItems,
  setInspectionItemResult,
  startInspection,
} from "./data"
import { INSPECTION_DEFAULTS, type InspectionItem, type Room } from "./types"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  rooms: Room[]
  inspectorId: string
  defaultRoomId?: string
  defaultTaskId?: string
  onCompleted: () => void
}

export function InspectionDialog({
  open,
  onOpenChange,
  rooms,
  inspectorId,
  defaultRoomId,
  defaultTaskId,
  onCompleted,
}: Props) {
  const [step, setStep] = useState<"setup" | "checklist" | "result">("setup")
  const [roomId, setRoomId] = useState<string>("")
  const [inspectionId, setInspectionId] = useState<string | null>(null)
  const [items, setItems] = useState<InspectionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notes, setNotes] = useState("")

  // Reset on open
  useEffect(() => {
    if (!open) return
    setStep("setup")
    setRoomId(defaultRoomId ?? "")
    setInspectionId(null)
    setItems([])
    setNotes("")
  }, [open, defaultRoomId])

  const eligibleRooms = useMemo(
    () =>
      rooms.filter((r) => r.status === "inspected" || r.status === "cleaning" || r.status === "dirty"),
    [rooms],
  )

  const grouped = useMemo(() => {
    const map: Record<string, InspectionItem[]> = {}
    for (const it of items) {
      if (!map[it.category]) map[it.category] = []
      map[it.category].push(it)
    }
    return map
  }, [items])

  const failed = items.filter((i) => i.result === "fail")
  const pending = items.filter((i) => i.result === "pending")
  const passedCount = items.filter((i) => i.result === "pass").length
  const totalForScore = items.filter((i) => i.result === "pass" || i.result === "fail").length
  const score = totalForScore === 0 ? null : Math.round((passedCount / totalForScore) * 100)
  const failedCategories = [...new Set(failed.map((f) => f.category))]

  async function handleStart() {
    if (!roomId) return
    setBusy(true)
    try {
      const id = await startInspection(roomId, inspectorId, defaultTaskId ?? null, INSPECTION_DEFAULTS)
      if (!id) return
      setInspectionId(id)
      setLoading(true)
      const fetched = await fetchInspectionItems(id)
      setItems(fetched)
      setLoading(false)
      setStep("checklist")
    } finally {
      setBusy(false)
    }
  }

  async function handleItemResult(item: InspectionItem, result: "pass" | "fail" | "na") {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, result } : i)))
    await setInspectionItemResult(item.id, result)
  }

  async function handleFinish(result: "passed" | "failed" | "re_clean" | "maintenance_required") {
    if (!inspectionId || !roomId) return
    setBusy(true)
    try {
      await completeInspection(inspectionId, {
        result,
        score,
        failed_categories: failedCategories,
        notes: notes || null,
        roomId,
        inspectorId,
      })
      onCompleted()
      onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Інспекція номера
          </DialogTitle>
          <DialogDescription>
            Послідовно перевірте всі категорії. Результат автоматично оновить статус номера.
          </DialogDescription>
        </DialogHeader>

        {step === "setup" && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Номер для інспекції</Label>
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger>
                  <SelectValue placeholder="Оберіть номер..." />
                </SelectTrigger>
                <SelectContent>
                  {eligibleRooms.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-muted-foreground">
                      Немає номерів, готових до перевірки.
                    </div>
                  ) : (
                    eligibleRooms.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.room_number} · пов. {r.floor}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Інспекція використовує стандартний чек-лист {INSPECTION_DEFAULTS.length} пунктів.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Скасувати
              </Button>
              <Button onClick={handleStart} disabled={!roomId || busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Почати інспекцію
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "checklist" && (
          <div className="space-y-4 py-2">
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 p-3 text-xs">
              <span>
                Пройдено: <span className="font-semibold text-emerald-600">{passedCount}</span>
              </span>
              <span>
                Не пройдено: <span className="font-semibold text-rose-600">{failed.length}</span>
              </span>
              <span>
                Очікує: <span className="font-semibold">{pending.length}</span>
              </span>
              {score !== null && (
                <span className="ml-auto rounded-full bg-primary px-2.5 py-0.5 font-semibold text-primary-foreground">
                  {score}%
                </span>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(grouped).map(([cat, list]) => (
                  <div key={cat} className="space-y-2">
                    <h4 className="text-sm font-semibold">{formatInspectionCategory(cat)}</h4>
                    <ul className="space-y-1">
                      {list.map((it) => (
                        <li
                          key={it.id}
                          className={`flex items-center justify-between gap-3 rounded-md border p-2 ${
                            it.result === "pass"
                              ? "border-emerald-200 bg-emerald-50/50"
                              : it.result === "fail"
                                ? "border-rose-200 bg-rose-50/50"
                                : it.result === "na"
                                  ? "border-slate-200 bg-slate-50/50"
                                  : "border-border bg-card"
                          }`}
                        >
                          <span className="min-w-0 flex-1 text-sm">{it.label}</span>
                          <div className="flex shrink-0 gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant={it.result === "pass" ? "default" : "outline"}
                              className={`h-7 px-2 text-xs ${it.result === "pass" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                              onClick={() => handleItemResult(it, "pass")}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={it.result === "fail" ? "default" : "outline"}
                              className={`h-7 px-2 text-xs ${it.result === "fail" ? "bg-rose-600 hover:bg-rose-700" : ""}`}
                              onClick={() => handleItemResult(it, "fail")}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={it.result === "na" ? "secondary" : "outline"}
                              className="h-7 px-2 text-xs"
                              onClick={() => handleItemResult(it, "na")}
                            >
                              N/A
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <div className="flex w-full gap-2">
                <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                  Перервати
                </Button>
                <Button
                  className="flex-1"
                  disabled={pending.length > 0}
                  onClick={() => setStep("result")}
                >
                  Завершити перевірку
                  {pending.length > 0 && (
                    <span className="ml-1.5 text-[10px] opacity-90">
                      (залишилось {pending.length})
                    </span>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </div>
        )}

        {step === "result" && (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-semibold">Підсумок</span>
                {score !== null && (
                  <Badge variant={score >= 90 ? "default" : "secondary"} className="text-xs">
                    {score}%
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Пройдено {passedCount} з {totalForScore}. Не пройшли:{" "}
                {failedCategories.length > 0
                  ? failedCategories.map((c) => formatInspectionCategory(c)).join(", ")
                  : "—"}
              </p>
              {failed.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-xs">
                  {failed.slice(0, 6).map((f) => (
                    <li key={f.id} className="text-rose-700">
                      · {f.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-2">
              <Label>Коментар інспектора</Label>
              <Textarea
                rows={3}
                placeholder="Опис недоліків, рекомендації..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={busy || failed.length > 0}
                onClick={() => handleFinish("passed")}
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Прийняти
              </Button>
              <Button
                size="lg"
                variant="outline"
                disabled={busy}
                onClick={() => handleFinish("re_clean")}
              >
                <RotateCw className="mr-1.5 h-4 w-4" /> Повторне прибирання
              </Button>
              <Button
                size="lg"
                variant="outline"
                disabled={busy}
                onClick={() => handleFinish("maintenance_required")}
              >
                <Wrench className="mr-1.5 h-4 w-4" /> На ремонт
              </Button>
              <Button
                size="lg"
                variant="outline"
                disabled={busy}
                onClick={() => handleFinish("failed")}
              >
                <X className="mr-1.5 h-4 w-4" /> Відхилити
              </Button>
            </div>

            <Button variant="ghost" className="w-full" onClick={() => setStep("checklist")}>
              Назад до чек-листа
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
