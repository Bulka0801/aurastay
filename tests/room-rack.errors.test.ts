import { describe, expect, it } from "vitest"
import { getRoomRackErrorMessage } from "@/lib/room-rack/errors"

describe("room-rack error messages", () => {
  it("explains an unsynchronized reservation room period", () => {
    const result = getRoomRackErrorMessage({
      code: "P0001",
      message: "reservation_rooms period 2026-06-06 - 2026-06-08 is outside reservation period 2026-06-04 - 2026-06-06",
    })

    expect(result.title).toBe("Дати бронювання не синхронізовані")
    expect(result.description).toContain("6 червня 2026")
    expect(result.description).toContain("8 червня 2026")
    expect(result.description).toContain("передайте його номер адміністратору")
  })

  it("explains why a checked-in arrival date cannot move", () => {
    expect(
      getRoomRackErrorMessage({
        code: "P0001",
        message: "checked-in reservation RES93356833 check-in date cannot be moved from room-rack",
      }),
    ).toEqual({
      title: "Не можна змінити дату заїзду",
      description:
        "Гостя вже заселено. Можна перемістити його в інший номер або змінити дату виїзду, але дату фактичного заїзду треба залишити без змін.",
    })
  })

  it("explains terminal reservation statuses", () => {
    const result = getRoomRackErrorMessage({
      code: "P0001",
      message: "reservation RES93274077 with status checked_out cannot be moved from room-rack",
    })

    expect(result.title).toBe("Бронювання не можна змінити")
    expect(result.description).toContain("не редагуються у шахматці")
  })

  it("explains room availability conflicts", () => {
    expect(
      getRoomRackErrorMessage({
        code: "P0001",
        message: "room is already reserved by active reservation AUR-2026/1001 for overlapping dates",
      }),
    ).toEqual({
      title: "Номер уже зайнятий",
      description: "На вибрані дати є активне бронювання. Оберіть інший номер або змініть дати.",
    })
  })

  it("does not expose an unknown database error", () => {
    const result = getRoomRackErrorMessage({ code: "XX000", message: "internal database details" })

    expect(result.title).toBe("Не вдалося зберегти зміну")
    expect(result.description).not.toContain("internal database details")
  })
})
