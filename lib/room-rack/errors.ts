import { formatFullDate, parseISO } from "@/lib/room-rack/date-utils"

interface RoomRackErrorLike {
  code?: string
  message?: string
}

export interface RoomRackErrorMessage {
  title: string
  description: string
}

const PERIOD_ERROR =
  /reservation_rooms period (\d{4}-\d{2}-\d{2}) - (\d{4}-\d{2}-\d{2}) is outside reservation period (\d{4}-\d{2}-\d{2}) - (\d{4}-\d{2}-\d{2})/i

function formatDate(date: string): string {
  return formatFullDate(parseISO(date))
}

export function getRoomRackErrorMessage(error: unknown): RoomRackErrorMessage {
  const value = error && typeof error === "object" ? (error as RoomRackErrorLike) : {}
  const code = value.code ?? ""
  const message = value.message ?? ""
  const periodMatch = message.match(PERIOD_ERROR)

  if (code === "P0001" && periodMatch) {
    const [, roomCheckIn, roomCheckOut, reservationCheckIn, reservationCheckOut] = periodMatch

    return {
      title: "Дати бронювання не синхронізовані",
      description:
        `Для номера збережено період ${formatDate(roomCheckIn)} - ${formatDate(roomCheckOut)}, ` +
        `а для бронювання ${formatDate(reservationCheckIn)} - ${formatDate(reservationCheckOut)}. ` +
        "Оновіть сторінку та повторіть дію. Якщо помилка повториться, не змінюйте бронювання вручну: передайте його номер адміністратору для синхронізації даних.",
    }
  }

  if (code === "P0001" && message.includes("room periods could not be synchronized")) {
    return {
      title: "Не вдалося синхронізувати дати",
      description:
        "У бронюванні залишилися суперечливі службові дати. Оновіть сторінку та повторіть дію. Якщо помилка повториться, передайте номер бронювання адміністратору.",
    }
  }

  if (code === "P0001" && message.includes("checked-in reservation") && message.includes("check-in date cannot be moved")) {
    return {
      title: "Не можна змінити дату заїзду",
      description:
        "Гостя вже заселено. Можна перемістити його в інший номер або змінити дату виїзду, але дату фактичного заїзду треба залишити без змін.",
    }
  }

  if (code === "P0001" && message.includes("cannot be moved from room-rack")) {
    return {
      title: "Бронювання не можна змінити",
      description:
        "Завершені, скасовані бронювання та незаїзди не редагуються у шахматці. Відкрийте картку бронювання, щоб переглянути деталі.",
    }
  }

  if (code === "22007" || message.includes("invalid reservation dates")) {
    return {
      title: "Некоректні дати",
      description: "Дата виїзду має бути пізнішою за дату заїзду щонайменше на одну ніч.",
    }
  }

  if (code === "P0001" && message.includes("already reserved by active reservation")) {
    return {
      title: "Номер уже зайнятий",
      description: "На вибрані дати є активне бронювання. Оберіть інший номер або змініть дати.",
    }
  }

  if (code === "P0001" && message.includes("does not allow reservation move")) {
    return {
      title: "Номер недоступний для переміщення",
      description: "Статус вибраного номера не дозволяє поселення. Оберіть доступний номер або змініть його статус.",
    }
  }

  if (code === "42501" || message.includes("not allowed to update room-rack reservations")) {
    return {
      title: "Недостатньо прав",
      description: "Вашій ролі не дозволено змінювати бронювання у шахматці. Зверніться до адміністратора.",
    }
  }

  if (code === "PGRST202" || message.includes("schema cache")) {
    return {
      title: "Функція зміни бронювання недоступна",
      description: "Схема бази даних ще не оновлена. Оновіть сторінку; якщо помилка повториться, зверніться до адміністратора.",
    }
  }

  return {
    title: "Не вдалося зберегти зміну",
    description:
      "Оновіть сторінку та повторіть дію. Якщо помилка повториться, передайте адміністратору номер бронювання та час спроби.",
  }
}
