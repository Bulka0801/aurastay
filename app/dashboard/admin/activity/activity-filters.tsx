"use client"

import { FormEvent, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { RotateCcw, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Option = {
  value: string
  label: string
}

type UserOption = {
  id: string
  label: string
  description: string
}

type CurrentFilters = {
  q?: string
  action?: string
  entity?: string
  user_id?: string
  date_from?: string
  date_to?: string
}

type ActivityFiltersProps = {
  actions: Option[]
  entities: Option[]
  users: UserOption[]
  current: CurrentFilters
}

export function ActivityFilters({ actions, entities, users, current }: ActivityFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [searchValue, setSearchValue] = useState(current.q ?? "")

  function updateParam(key: string, value?: string) {
    const params = new URLSearchParams(searchParams.toString())

    if (!value || value === "all") {
      params.delete(key)
    } else {
      params.set(key, value)
    }

    params.delete("page")

    startTransition(() => {
      const queryString = params.toString()
      router.push(queryString ? `${pathname}?${queryString}` : pathname)
    })
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateParam("q", searchValue.trim())
  }

  function resetFilters() {
    setSearchValue("")

    startTransition(() => {
      router.push(pathname)
    })
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_0.8fr_0.8fr_auto]">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Пошук за дією, сутністю, ID або користувачем"
              className="pl-8"
            />
          </div>
          <Button type="submit" disabled={isPending}>
            Шукати
          </Button>
        </form>

        <Select value={current.action ?? "all"} onValueChange={(value) => updateParam("action", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Дія" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Усі дії</SelectItem>
            {actions.map((action) => (
              <SelectItem key={action.value} value={action.value}>
                {action.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={current.entity ?? "all"} onValueChange={(value) => updateParam("entity", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Сутність" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Усі сутності</SelectItem>
            {entities.map((entity) => (
              <SelectItem key={entity.value} value={entity.value}>
                {entity.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={current.user_id ?? "all"} onValueChange={(value) => updateParam("user_id", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Користувач" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Усі користувачі</SelectItem>
            <SelectItem value="system">Система</SelectItem>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={current.date_from ?? ""}
          onChange={(event) => updateParam("date_from", event.target.value)}
        />

        <Input
          type="date"
          value={current.date_to ?? ""}
          onChange={(event) => updateParam("date_to", event.target.value)}
        />

        <Button type="button" variant="outline" onClick={resetFilters} disabled={isPending}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Очистити
        </Button>
      </div>
    </div>
  )
}