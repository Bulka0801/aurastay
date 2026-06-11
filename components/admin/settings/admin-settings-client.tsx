"use client"

import type React from "react"
import { useEffect, useMemo, useState, useTransition } from "react"
import { Building2, Pencil, Plus, Search, Trash2, X } from "lucide-react"

import {
  deleteRatePlanAction,
  deleteRoomAction,
  deleteRoomBlockAction,
  deleteRoomTypeAction,
  saveHotelSettingsAction,
  saveRatePlanAction,
  saveRoomAction,
  saveRoomBlockAction,
  saveRoomTypeAction,
  type HotelSettingsInput,
  type RatePlanInput,
  type RoomBlockInput,
  type RoomInput,
  type RoomTypeInput,
} from "@/app/dashboard/admin/settings/actions"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  formatDateTime,
  formatRoomHousekeepingStatus,
  formatRoomOccupancyStatus,
  formatRoomOperationalStatus,
} from "@/lib/localization"
import { formatMoney } from "@/lib/format"

type HotelSettings = HotelSettingsInput & { updated_at?: string | null }
type RoomTypeRow = RoomTypeInput & { id: string; created_at?: string | null; updated_at?: string | null }
type RoomRow = RoomInput & {
  id: string
  created_at?: string | null
  updated_at?: string | null
  room_type?: RoomTypeRow | null
}
type RatePlanRow = RatePlanInput & { id: string; created_at?: string | null; updated_at?: string | null }
type RoomBlockRow = RoomBlockInput & {
  id: string
  created_at?: string | null
  updated_at?: string | null
  room?: Pick<RoomRow, "room_number"> | null
}

type AdminSettingsClientProps = {
  hotelSettings: HotelSettings
  roomTypes: RoomTypeRow[]
  rooms: RoomRow[]
  ratePlans: RatePlanRow[]
  roomBlocks: RoomBlockRow[]
}

type ConfirmState = {
  title: string
  description: string
  confirmLabel: string
  variant?: "default" | "destructive"
  onConfirm: () => void
}

const emptyRoomType: RoomTypeInput = {
  name: "",
  code: "",
  description: "",
  base_occupancy: 2,
  max_occupancy: 4,
  base_rate: 0,
  amenities: [],
  size_sqm: null,
  bed_type: "",
  is_active: true,
}

const emptyRoom: RoomInput = {
  room_number: "",
  room_type_id: "",
  floor: 1,
  occupancy_status: "vacant",
  housekeeping_status: "clean",
  operational_status: "operational",
  is_smoking: false,
  has_disability_access: false,
  notes: "",
  last_maintenance_date: null,
}

const emptyRatePlan: RatePlanInput = {
  name: "",
  code: "",
  description: "",
  is_default: false,
  discount_percentage: 0,
  cancellation_policy: "",
  deposit_policy: "",
  is_active: true,
}

const emptyRoomBlock: RoomBlockInput = {
  room_id: "",
  start_date: "",
  end_date: "",
  block_type: "maintenance",
  reason: "",
}

const roomOccupancyStatusOptions = ["vacant", "occupied"]
const roomHousekeepingStatusOptions = ["clean", "dirty", "cleaning", "inspecting", "inspected"]
const roomOperationalStatusOptions = ["operational", "maintenance", "blocked", "out_of_order"]
const roomBlockTypeLabels: Record<string, string> = {
  maintenance: "Технічне обслуговування",
  admin: "Адміністративне блокування",
  out_of_order: "Не в експлуатації",
}

function asDateInput(value?: string | null) {
  return value ? String(value).slice(0, 10) : ""
}

function useActionState() {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return { message, setMessage, error, setError, isPending, startTransition }
}

export function AdminSettingsClient({
  hotelSettings,
  roomTypes,
  rooms,
  ratePlans,
  roomBlocks,
}: AdminSettingsClientProps) {
  const [search, setSearch] = useState("")
  const [roomTypeEditor, setRoomTypeEditor] = useState<RoomTypeInput | null>(null)
  const [roomEditor, setRoomEditor] = useState<RoomInput | null>(null)
  const [ratePlanEditor, setRatePlanEditor] = useState<RatePlanInput | null>(null)
  const [roomBlockEditor, setRoomBlockEditor] = useState<RoomBlockInput | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const actionState = useActionState()
  const money = (value: number | string | null | undefined) => formatMoney(value, hotelSettings)

  const normalizedSearch = search.trim().toLowerCase()
  const filteredRooms = useMemo(
    () =>
      rooms.filter((room) =>
        [
          room.room_number,
          room.room_type?.name,
          room.floor,
          room.occupancy_status,
          room.housekeeping_status,
          room.operational_status,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch)),
      ),
    [normalizedSearch, rooms],
  )
  const filteredRoomTypes = useMemo(
    () => roomTypes.filter((type) => [type.name, type.code].some((value) => value.toLowerCase().includes(normalizedSearch))),
    [normalizedSearch, roomTypes],
  )
  const filteredRatePlans = useMemo(
    () => ratePlans.filter((plan) => [plan.name, plan.code].some((value) => value.toLowerCase().includes(normalizedSearch))),
    [normalizedSearch, ratePlans],
  )
  const filteredRoomBlocks = useMemo(
    () =>
      roomBlocks.filter((block) =>
        [block.room?.room_number, block.block_type, block.reason].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalizedSearch)),
      ),
    [normalizedSearch, roomBlocks],
  )
  const roomsByFloor = useMemo(() => {
    return filteredRooms.reduce(
      (acc, room) => {
        const floor = Number(room.floor ?? 0)
        if (!acc[floor]) acc[floor] = []
        acc[floor].push(room)
        return acc
      },
      {} as Record<number, RoomRow[]>,
    )
  }, [filteredRooms])
  const sortedFloors = useMemo(
    () => Object.keys(roomsByFloor).map(Number).sort((a, b) => a - b),
    [roomsByFloor],
  )

  const runAction = (action: () => Promise<{ success: boolean; error?: string }>, successMessage: string, close?: () => void) => {
    actionState.setMessage(null)
    actionState.setError(null)
    actionState.startTransition(async () => {
      const result = await action()

      if (!result.success) {
        actionState.setError(result.error ?? "Не вдалося зберегти зміни.")
        return
      }

      actionState.setMessage(successMessage)
      close?.()
    })
  }

  const confirmAndRun = (
    details: Omit<ConfirmState, "onConfirm">,
    action: () => Promise<{ success: boolean; error?: string }>,
    successMessage: string,
    close?: () => void,
  ) => {
    setConfirm({
      ...details,
      onConfirm: () => runAction(action, successMessage, close),
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_auto]">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Пошук за номером, кодом, тарифом або статусом..."
            className="pl-8"
          />
        </div>
        <div className="text-sm text-muted-foreground md:self-center">
          Подвійний клік по рядку відкриває редагування. Кнопки залишені для доступності.
        </div>
      </div>

      {actionState.message && (
        <Alert>
          <AlertDescription>{actionState.message}</AlertDescription>
        </Alert>
      )}
      {actionState.error && (
        <Alert variant="destructive">
          <AlertDescription>{actionState.error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="hotel" className="gap-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="hotel">Готель</TabsTrigger>
          <TabsTrigger value="room-types">Типи номерів</TabsTrigger>
          <TabsTrigger value="rooms">Номери</TabsTrigger>
          <TabsTrigger value="rate-plans">Тарифи</TabsTrigger>
          <TabsTrigger value="blocks">Блокування</TabsTrigger>
        </TabsList>

        <TabsContent value="hotel">
          <HotelSettingsPanel
            settings={hotelSettings}
            isPending={actionState.isPending}
            onSave={(input) =>
              confirmAndRun(
                {
                  title: "Зберегти налаштування готелю?",
                  description: "Ці правила вплинуть на нові бронювання, оплату передплати, check-in, валюту та відображення сум.",
                  confirmLabel: "Зберегти",
                },
                () => saveHotelSettingsAction(input),
                "Налаштування готелю збережено.",
              )
            }
          />
        </TabsContent>

        <TabsContent value="room-types">
          <AdminTableCard
            title="Типи номерів"
            description="Категорії номерів, ціна, місткість і базові атрибути продажу."
            actionLabel="Додати тип"
            onAdd={() => setRoomTypeEditor(emptyRoomType)}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Тип</TableHead>
                  <TableHead>Код</TableHead>
                  <TableHead>Ціна</TableHead>
                  <TableHead>Місткість</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Дії</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoomTypes.map((type) => (
                  <TableRow key={type.id} onDoubleClick={() => setRoomTypeEditor(type)} className="cursor-default">
                    <TableCell>
                      <div className="font-medium">{type.name}</div>
                      <div className="text-xs text-muted-foreground">{type.bed_type || "—"}</div>
                    </TableCell>
                    <TableCell>{type.code}</TableCell>
                    <TableCell>{money(type.base_rate)}</TableCell>
                    <TableCell>
                      {type.base_occupancy}-{type.max_occupancy}
                    </TableCell>
                    <TableCell>
                      <Badge variant={type.is_active ? "default" : "secondary"}>{type.is_active ? "Активний" : "Неактивний"}</Badge>
                    </TableCell>
                    <RowActions
                      onEdit={() => setRoomTypeEditor(type)}
                      onDelete={() =>
                        confirmAndRun(
                          {
                            title: "Видалити тип номера?",
                            description: `Тип «${type.name}» можна видалити тільки якщо він не привʼязаний до номерів або бронювань. Якщо тип уже використовується, зробіть його неактивним.`,
                            confirmLabel: "Видалити",
                            variant: "destructive",
                          },
                          () => deleteRoomTypeAction(type.id),
                          "Тип номера видалено.",
                        )
                      }
                      disabled={actionState.isPending}
                    />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AdminTableCard>
        </TabsContent>

        <TabsContent value="rooms">
          <AdminTableCard title="Номери" description="Фізичні номери, поверхи, типи та операційні статуси." actionLabel="Додати номер" onAdd={() => setRoomEditor(emptyRoom)}>
            {sortedFloors.length > 0 ? (
              <Accordion type="multiple" className="w-full space-y-3">
                {sortedFloors.map((floor) => {
                  const floorRooms = [...roomsByFloor[floor]].sort((a, b) =>
                    String(a.room_number).localeCompare(String(b.room_number), "uk", { numeric: true }),
                  )

                  return (
                    <AccordionItem key={floor} value={`floor-${floor}`} className="overflow-hidden rounded-lg border px-4">
                      <AccordionTrigger className="py-4 no-underline hover:no-underline">
                        <div className="flex w-full items-center justify-between gap-3 text-left">
                          <div>
                            <div className="text-sm font-semibold uppercase tracking-wide text-foreground">Поверх {floor}</div>
                            <div className="text-xs text-muted-foreground">{floorRooms.length} номерів</div>
                          </div>
                          <div className="text-xs text-muted-foreground">Клікніть, щоб розгорнути</div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="overflow-x-auto pb-2">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Номер</TableHead>
                                <TableHead>Тип</TableHead>
                                <TableHead>Поверх</TableHead>
                                <TableHead>Статус</TableHead>
                                <TableHead>Ознаки</TableHead>
                                <TableHead className="text-right">Дії</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {floorRooms.map((room) => (
                                <TableRow key={room.id} onDoubleClick={() => setRoomEditor(rowToRoomInput(room))} className="cursor-default">
                                  <TableCell className="font-medium">{room.room_number}</TableCell>
                                  <TableCell>{room.room_type?.name ?? "—"}</TableCell>
                                  <TableCell>{room.floor}</TableCell>
                                  <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                      <Badge variant="outline">
                                        {formatRoomOccupancyStatus(room.occupancy_status)}
                                      </Badge>
                                      <Badge variant="outline">
                                        {formatRoomHousekeepingStatus(room.housekeeping_status)}
                                      </Badge>
                                      <Badge variant="outline">
                                        {formatRoomOperationalStatus(room.operational_status)}
                                      </Badge>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {[room.is_smoking && "Smoking", room.has_disability_access && "Доступність"].filter(Boolean).join(", ") || "—"}
                                  </TableCell>
                                  <RowActions
                                    onEdit={() => setRoomEditor(rowToRoomInput(room))}
                                    onDelete={() =>
                                      confirmAndRun(
                                        {
                                          title: "Видалити номер?",
                                          description: `Номер ${room.room_number} буде видалено з номерного фонду, якщо він не має залежних записів.`,
                                          confirmLabel: "Видалити",
                                          variant: "destructive",
                                        },
                                        () => deleteRoomAction(room.id),
                                        "Номер видалено.",
                                      )
                                    }
                                    disabled={actionState.isPending}
                                  />
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Номери за вашим запитом не знайдено.
              </div>
            )}
          </AdminTableCard>
        </TabsContent>

        <TabsContent value="rate-plans">
          <AdminTableCard title="Тарифні плани" description="Комерційні тарифи, знижки, правила скасування та активність." actionLabel="Додати тариф" onAdd={() => setRatePlanEditor(emptyRatePlan)}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Тариф</TableHead>
                  <TableHead>Код</TableHead>
                  <TableHead>Знижка</TableHead>
                  <TableHead>За замовч.</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Дії</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRatePlans.map((plan) => (
                  <TableRow key={plan.id} onDoubleClick={() => setRatePlanEditor(plan)} className="cursor-default">
                    <TableCell>
                      <div className="font-medium">{plan.name}</div>
                      <div className="text-xs text-muted-foreground">{plan.description || "—"}</div>
                    </TableCell>
                    <TableCell>{plan.code}</TableCell>
                    <TableCell>{Number(plan.discount_percentage ?? 0)}%</TableCell>
                    <TableCell>{plan.is_default ? <Badge>Так</Badge> : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={plan.is_active ? "default" : "secondary"}>{plan.is_active ? "Активний" : "Неактивний"}</Badge>
                    </TableCell>
                    <RowActions
                      onEdit={() => setRatePlanEditor(plan)}
                      onDelete={() =>
                        confirmAndRun(
                          {
                            title: "Видалити тариф?",
                            description: `Тариф «${plan.name}» буде видалено, якщо він не використовується в історичних даних.`,
                            confirmLabel: "Видалити",
                            variant: "destructive",
                          },
                          () => deleteRatePlanAction(plan.id),
                          "Тариф видалено.",
                        )
                      }
                      disabled={actionState.isPending}
                    />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AdminTableCard>
        </TabsContent>

        <TabsContent value="blocks">
          <AdminTableCard title="Блокування номерів" description="Адміністративні та технічні блокування інвентарю." actionLabel="Додати блокування" onAdd={() => setRoomBlockEditor(emptyRoomBlock)}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Номер</TableHead>
                  <TableHead>Період</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Причина</TableHead>
                  <TableHead>Оновлено</TableHead>
                  <TableHead className="text-right">Дії</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoomBlocks.map((block) => (
                  <TableRow key={block.id} onDoubleClick={() => setRoomBlockEditor(rowToBlockInput(block))} className="cursor-default">
                    <TableCell className="font-medium">{block.room?.room_number ?? "—"}</TableCell>
                    <TableCell>
                      {block.start_date} - {block.end_date}
                    </TableCell>
                    <TableCell>{roomBlockTypeLabels[block.block_type] ?? block.block_type}</TableCell>
                    <TableCell className="max-w-[260px] truncate">{block.reason || "—"}</TableCell>
                    <TableCell>{formatDateTime(block.updated_at)}</TableCell>
                    <RowActions
                      onEdit={() => setRoomBlockEditor(rowToBlockInput(block))}
                      onDelete={() =>
                        confirmAndRun(
                          {
                            title: "Видалити блокування?",
                            description: `Блокування номера ${block.room?.room_number ?? "—"} за період ${block.start_date} - ${block.end_date} буде скасовано.`,
                            confirmLabel: "Видалити",
                            variant: "destructive",
                          },
                          () => deleteRoomBlockAction(block.id),
                          "Блокування видалено.",
                        )
                      }
                      disabled={actionState.isPending}
                    />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AdminTableCard>
        </TabsContent>
      </Tabs>

      <RoomTypeDialog
        value={roomTypeEditor}
        isPending={actionState.isPending}
        onOpenChange={(open) => !open && setRoomTypeEditor(null)}
        onSave={(input) =>
          confirmAndRun(
            {
              title: input.id ? "Зберегти зміни типу номера?" : "Створити тип номера?",
              description: "Зміни впливають на продаж номерів, доступність і розрахунок вартості.",
              confirmLabel: input.id ? "Зберегти" : "Створити",
            },
            () => saveRoomTypeAction(input),
            "Тип номера збережено.",
            () => setRoomTypeEditor(null),
          )
        }
      />
      <RoomDialog
        value={roomEditor}
        roomTypes={roomTypes}
        isPending={actionState.isPending}
        onOpenChange={(open) => !open && setRoomEditor(null)}
        onSave={(input) =>
          confirmAndRun(
            {
              title: input.id ? "Зберегти зміни номера?" : "Створити номер?",
              description: "Зміни номера можуть вплинути на шахматку, housekeeping і доступність для бронювання.",
              confirmLabel: input.id ? "Зберегти" : "Створити",
            },
            () => saveRoomAction(input),
            "Номер збережено.",
            () => setRoomEditor(null),
          )
        }
      />
      <RatePlanDialog
        value={ratePlanEditor}
        isPending={actionState.isPending}
        onOpenChange={(open) => !open && setRatePlanEditor(null)}
        onSave={(input) =>
          confirmAndRun(
            {
              title: input.id ? "Зберегти зміни тарифу?" : "Створити тариф?",
              description: "Тариф використовується при створенні бронювання та у звітності.",
              confirmLabel: input.id ? "Зберегти" : "Створити",
            },
            () => saveRatePlanAction(input),
            "Тариф збережено.",
            () => setRatePlanEditor(null),
          )
        }
      />
      <RoomBlockDialog
        value={roomBlockEditor}
        rooms={rooms}
        isPending={actionState.isPending}
        onOpenChange={(open) => !open && setRoomBlockEditor(null)}
        onSave={(input) =>
          confirmAndRun(
            {
              title: input.id ? "Зберегти блокування?" : "Створити блокування?",
              description: "Блокування прибирає номер з доступного інвентарю на вибраний період.",
              confirmLabel: input.id ? "Зберегти" : "Створити",
            },
            () => saveRoomBlockAction(input),
            "Блокування збережено.",
            () => setRoomBlockEditor(null),
          )
        }
      />
      <ConfirmDialog
        value={confirm}
        isPending={actionState.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          confirm?.onConfirm()
          setConfirm(null)
        }}
      />
    </div>
  )
}

function AdminTableCard({
  title,
  description,
  actionLabel,
  onAdd,
  children,
}: {
  title: string
  description: string
  actionLabel: string
  onAdd: () => void
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" />
          {actionLabel}
        </Button>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function RowActions({ onEdit, onDelete, disabled }: { onEdit: () => void; onDelete: () => void; disabled: boolean }) {
  return (
    <TableCell className="text-right">
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Pencil className="mr-2 h-4 w-4" />
          Редагувати
        </Button>
        <Button size="sm" variant="outline" onClick={onDelete} disabled={disabled}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </TableCell>
  )
}

function ConfirmDialog({
  value,
  isPending,
  onCancel,
  onConfirm,
}: {
  value: ConfirmState | null
  isPending: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={Boolean(value)} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{value?.title}</DialogTitle>
          <DialogDescription>{value?.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            Скасувати
          </Button>
          <Button variant={value?.variant === "destructive" ? "destructive" : "default"} onClick={onConfirm} disabled={isPending}>
            {value?.confirmLabel ?? "Підтвердити"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function HotelSettingsPanel({
  settings,
  isPending,
  onSave,
}: {
  settings: HotelSettings
  isPending: boolean
  onSave: (input: HotelSettingsInput) => void
}) {
  const [form, setForm] = useState<HotelSettingsInput>(settings)
  const dirty = JSON.stringify(form) !== JSON.stringify(settings)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Налаштування готелю
        </CardTitle>
        <CardDescription>Єдине джерело правил для передплати, часу заїзду/виїзду, валюти та локалі.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <CheckField label="Вимагати передплату" checked={form.prepayment_required} onChange={(checked) => setForm({ ...form, prepayment_required: checked })} />
        <NumberField label="Передплата, %" value={form.prepayment_percent} onChange={(value) => setForm({ ...form, prepayment_percent: value })} min={0} max={100} step="0.01" />
        <TextField label="Час заїзду" type="time" value={form.default_checkin_time?.slice(0, 5)} onChange={(value) => setForm({ ...form, default_checkin_time: value })} />
        <TextField label="Час виїзду" type="time" value={form.default_checkout_time?.slice(0, 5)} onChange={(value) => setForm({ ...form, default_checkout_time: value })} />
        <TextField label="Валюта" value={form.currency} onChange={(value) => setForm({ ...form, currency: value.toUpperCase().slice(0, 3) })} />
        <TextField label="Локаль" value={form.locale} onChange={(value) => setForm({ ...form, locale: value })} />
        <div className="md:col-span-2 flex justify-end">
          <Button disabled={!dirty || isPending} onClick={() => onSave(form)}>
            {dirty ? "Зберегти налаштування" : "Немає змін"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function RoomTypeDialog({ value, isPending, onOpenChange, onSave }: DialogProps<RoomTypeInput>) {
  const [form, setForm] = useState(value ?? emptyRoomType)
  useEffect(() => setForm(value ?? emptyRoomType), [value])

  return (
    <Dialog open={Boolean(value)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{form.id ? "Редагувати тип номера" : "Додати тип номера"}</DialogTitle>
          <DialogDescription>Тип номера впливає на продаж, тарифи та доступність інвентарю.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Назва" value={form.name} onChange={(name) => setForm({ ...form, name })} />
          <TextField label="Код" value={form.code} onChange={(code) => setForm({ ...form, code })} />
          <NumberField label="Базова місткість" value={form.base_occupancy} onChange={(base_occupancy) => setForm({ ...form, base_occupancy })} min={1} />
          <NumberField label="Максимальна місткість" value={form.max_occupancy} onChange={(max_occupancy) => setForm({ ...form, max_occupancy })} min={1} />
          <NumberField label="Базова ціна" value={form.base_rate} onChange={(base_rate) => setForm({ ...form, base_rate })} min={0} step="0.01" />
          <NumberField label="Площа, м²" value={form.size_sqm ?? 0} onChange={(size_sqm) => setForm({ ...form, size_sqm: size_sqm || null })} min={0} step="0.01" />
          <TextField label="Тип ліжка" value={form.bed_type} onChange={(bed_type) => setForm({ ...form, bed_type })} />
          <AmenitiesField value={form.amenities} onChange={(amenities) => setForm({ ...form, amenities })} />
          <TextAreaField label="Опис" value={form.description} onChange={(description) => setForm({ ...form, description })} className="md:col-span-2" />
          <CheckField label="Активний тип номера" checked={form.is_active} onChange={(is_active) => setForm({ ...form, is_active })} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
          <Button disabled={isPending} onClick={() => onSave(form)}>Зберегти</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RoomDialog({ value, roomTypes, isPending, onOpenChange, onSave }: DialogProps<RoomInput> & { roomTypes: RoomTypeRow[] }) {
  const [form, setForm] = useState(value ?? emptyRoom)
  useEffect(() => setForm(value ?? emptyRoom), [value])

  return (
    <Dialog open={Boolean(value)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{form.id ? "Редагувати номер" : "Додати номер"}</DialogTitle>
          <DialogDescription>Кімната є фізичною одиницею номерного фонду.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Номер" value={form.room_number} onChange={(room_number) => setForm({ ...form, room_number })} />
          <NumberField label="Поверх" value={form.floor} onChange={(floor) => setForm({ ...form, floor })} min={0} />
          <SelectField label="Тип номера" value={form.room_type_id} options={roomTypes.map((type) => ({ value: type.id, label: `${type.name} (${type.code})` }))} onChange={(room_type_id) => setForm({ ...form, room_type_id })} />
          <SelectField
            label="Проживання"
            value={form.occupancy_status}
            options={roomOccupancyStatusOptions.map((status) => ({
              value: status,
              label: formatRoomOccupancyStatus(status),
            }))}
            onChange={(occupancy_status) => setForm({ ...form, occupancy_status })}
          />
          <SelectField
            label="Прибирання"
            value={form.housekeeping_status}
            options={roomHousekeepingStatusOptions.map((status) => ({
              value: status,
              label: formatRoomHousekeepingStatus(status),
            }))}
            onChange={(housekeeping_status) => setForm({ ...form, housekeeping_status })}
          />
          <SelectField
            label="Технічний стан"
            value={form.operational_status}
            options={roomOperationalStatusOptions.map((status) => ({
              value: status,
              label: formatRoomOperationalStatus(status),
            }))}
            onChange={(operational_status) => setForm({ ...form, operational_status })}
          />
          <CheckField label="Для курців" checked={form.is_smoking} onChange={(is_smoking) => setForm({ ...form, is_smoking })} />
          <CheckField label="Доступність для гостей з інвалідністю" checked={form.has_disability_access} onChange={(has_disability_access) => setForm({ ...form, has_disability_access })} />
          <TextField label="Останнє ТО" type="date" value={asDateInput(form.last_maintenance_date)} onChange={(last_maintenance_date) => setForm({ ...form, last_maintenance_date: last_maintenance_date || null })} />
          <TextAreaField label="Нотатки" value={form.notes} onChange={(notes) => setForm({ ...form, notes })} className="md:col-span-2" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
          <Button disabled={isPending} onClick={() => onSave(form)}>Зберегти</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RatePlanDialog({ value, isPending, onOpenChange, onSave }: DialogProps<RatePlanInput>) {
  const [form, setForm] = useState(value ?? emptyRatePlan)
  useEffect(() => setForm(value ?? emptyRatePlan), [value])

  return (
    <Dialog open={Boolean(value)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{form.id ? "Редагувати тариф" : "Додати тариф"}</DialogTitle>
          <DialogDescription>Тарифи застосовуються в бронюваннях і звітності.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Назва" value={form.name} onChange={(name) => setForm({ ...form, name })} />
          <TextField label="Код" value={form.code} onChange={(code) => setForm({ ...form, code })} />
          <NumberField label="Знижка, %" value={form.discount_percentage} onChange={(discount_percentage) => setForm({ ...form, discount_percentage })} min={0} max={100} step="0.01" />
          <CheckField label="Тариф за замовчуванням" checked={form.is_default} onChange={(is_default) => setForm({ ...form, is_default })} />
          <CheckField label="Активний тариф" checked={form.is_active} onChange={(is_active) => setForm({ ...form, is_active })} />
          <TextAreaField label="Опис" value={form.description} onChange={(description) => setForm({ ...form, description })} className="md:col-span-2" />
          <TextAreaField label="Правила скасування" value={form.cancellation_policy} onChange={(cancellation_policy) => setForm({ ...form, cancellation_policy })} />
          <TextAreaField label="Правила депозиту" value={form.deposit_policy} onChange={(deposit_policy) => setForm({ ...form, deposit_policy })} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
          <Button disabled={isPending} onClick={() => onSave(form)}>Зберегти</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RoomBlockDialog({ value, rooms, isPending, onOpenChange, onSave }: DialogProps<RoomBlockInput> & { rooms: RoomRow[] }) {
  const [form, setForm] = useState(value ?? emptyRoomBlock)
  useEffect(() => setForm(value ?? emptyRoomBlock), [value])

  return (
    <Dialog open={Boolean(value)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{form.id ? "Редагувати блокування" : "Додати блокування"}</DialogTitle>
          <DialogDescription>Блокування прибирає номер з доступного інвентарю на вибраний період.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField label="Номер" value={form.room_id} options={rooms.map((room) => ({ value: room.id, label: `${room.room_number} · ${room.room_type?.name ?? "—"}` }))} onChange={(room_id) => setForm({ ...form, room_id })} />
          <SelectField label="Тип" value={form.block_type} options={Object.entries(roomBlockTypeLabels).map(([value, label]) => ({ value, label }))} onChange={(block_type) => setForm({ ...form, block_type })} />
          <TextField label="Початок" type="date" value={form.start_date} onChange={(start_date) => setForm({ ...form, start_date })} />
          <TextField label="Завершення" type="date" value={form.end_date} onChange={(end_date) => setForm({ ...form, end_date })} />
          <TextAreaField label="Причина" value={form.reason} onChange={(reason) => setForm({ ...form, reason })} className="md:col-span-2" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
          <Button disabled={isPending} onClick={() => onSave(form)}>Зберегти</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type DialogProps<T> = {
  value: T | null
  isPending: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: T) => void
}

function rowToRoomInput(room: RoomRow): RoomInput {
  return {
    id: room.id,
    room_number: room.room_number,
    room_type_id: room.room_type_id,
    floor: room.floor,
    occupancy_status: room.occupancy_status,
    housekeeping_status: room.housekeeping_status,
    operational_status: room.operational_status,
    is_smoking: room.is_smoking,
    has_disability_access: room.has_disability_access,
    notes: room.notes ?? "",
    last_maintenance_date: asDateInput(room.last_maintenance_date) || null,
  }
}

function rowToBlockInput(block: RoomBlockRow): RoomBlockInput {
  return {
    id: block.id,
    room_id: block.room_id,
    start_date: block.start_date,
    end_date: block.end_date,
    block_type: block.block_type,
    reason: block.reason ?? "",
  }
}

function AmenitiesField({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
  const [draft, setDraft] = useState("")
  const [error, setError] = useState<string | null>(null)

  const addItems = (raw: string) => {
    const items = raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)

    if (items.length === 0) return

    const existing = new Set(value.map((item) => item.toLowerCase()))
    const next = [...value]
    for (const item of items) {
      if (item.length > 50) {
        setError("Одна зручність не може бути довшою за 50 символів.")
        return
      }
      if (existing.has(item.toLowerCase())) {
        setError(`«${item}» уже додано.`)
        continue
      }
      existing.add(item.toLowerCase())
      next.push(item)
    }

    onChange(next)
    setDraft("")
    setError(null)
  }

  const removeItem = (item: string) => onChange(value.filter((current) => current !== item))

  return (
    <div className="space-y-2 md:col-span-2">
      <Label htmlFor="amenities">Зручності</Label>
      <div className="flex gap-2">
        <Input
          id="amenities"
          value={draft}
          placeholder="Wi-Fi, Міні-бар, Сейф"
          onChange={(event) => {
            const nextValue = event.target.value
            if (nextValue.includes(",")) {
              addItems(nextValue)
              return
            }
            setDraft(nextValue)
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault()
              addItems(draft)
            }
          }}
        />
        <Button type="button" variant="outline" onClick={() => addItems(draft)}>
          Додати
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Вводьте одну або кілька зручностей і натискайте Enter, кому або кнопку «Додати». Кома працює як розділювач,
        тому в самій назві зручності її зберігати не потрібно.
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex min-h-8 flex-wrap gap-2">
        {value.length === 0 ? (
          <span className="text-xs text-muted-foreground">Зручності ще не додані.</span>
        ) : (
          value.map((item) => (
            <Badge key={item} variant="secondary" className="gap-1 pr-1">
              {item}
              <button type="button" className="rounded-sm p-0.5 hover:bg-background/80" onClick={() => removeItem(item)} aria-label={`Видалити ${item}`}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        )}
      </div>
    </div>
  )
}

function TextField({ label, value, onChange, type = "text" }: { label: string; value: string; type?: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = "1",
}: {
  label: string
  value: number
  min?: number
  max?: number
  step?: string
  onChange: (value: number) => void
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type="number" value={value ?? 0} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  )
}

function TextAreaField({ label, value, onChange, className = "" }: { label: string; value: string; className?: string; onChange: (value: string) => void }) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label>{label}</Label>
      <Textarea value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}

function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 rounded-md border p-3 text-sm">
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} />
      <span>{label}</span>
    </label>
  )
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
