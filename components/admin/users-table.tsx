"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowUpDown, Pencil, Search, SlidersHorizontal } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatRole, roleLabels } from "@/lib/localization"
import type { Profile, UserRole } from "@/lib/types"

type UsersTableProps = {
  users: Profile[]
}

type StatusFilter = "all" | "active" | "inactive"
type SortMode = "created_desc" | "created_asc" | "name_asc" | "name_desc" | "role_asc" | "status_desc"

const roleOptions = Object.entries(roleLabels) as Array<[UserRole, string]>

function getFullName(user: Profile) {
  return `${user.last_name} ${user.first_name}`.trim()
}

export function UsersTable({ users }: UsersTableProps) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [sortMode, setSortMode] = useState<SortMode>("created_desc")

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return users
      .filter((user) => {
        if (statusFilter === "active" && !user.is_active) return false
        if (statusFilter === "inactive" && user.is_active) return false
        if (roleFilter !== "all" && user.role !== roleFilter) return false

        if (!normalizedSearch) return true

        return [
          user.first_name,
          user.last_name,
          user.email,
          user.employee_id,
          user.department,
          formatRole(user.role),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch))
      })
      .sort((a, b) => {
        switch (sortMode) {
          case "created_asc":
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          case "name_asc":
            return getFullName(a).localeCompare(getFullName(b), "uk")
          case "name_desc":
            return getFullName(b).localeCompare(getFullName(a), "uk")
          case "role_asc":
            return formatRole(a.role).localeCompare(formatRole(b.role), "uk")
          case "status_desc":
            return Number(b.is_active) - Number(a.is_active) || getFullName(a).localeCompare(getFullName(b), "uk")
          case "created_desc":
          default:
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        }
      })
  }, [roleFilter, search, sortMode, statusFilter, users])

  const activeCount = users.filter((user) => user.is_active).length
  const inactiveCount = users.length - activeCount

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_220px_220px]">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Пошук за імʼям, email, ID або відділом..."
            className="pl-8"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
          <SelectTrigger className="w-full">
            <SlidersHorizontal className="h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Усі статуси</SelectItem>
            <SelectItem value="active">Активні</SelectItem>
            <SelectItem value="inactive">Неактивні</SelectItem>
          </SelectContent>
        </Select>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Роль" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Усі ролі</SelectItem>
            {roleOptions.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}>
          <SelectTrigger className="w-full">
            <ArrowUpDown className="h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_desc">Нові спочатку</SelectItem>
            <SelectItem value="created_asc">Старі спочатку</SelectItem>
            <SelectItem value="name_asc">Імʼя А-Я</SelectItem>
            <SelectItem value="name_desc">Імʼя Я-А</SelectItem>
            <SelectItem value="role_asc">За роллю</SelectItem>
            <SelectItem value="status_desc">Активні спочатку</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
        <span>Усього: {users.length}</span>
        <span>Активні: {activeCount}</span>
        <span>Неактивні: {inactiveCount}</span>
        <span>Показано: {filteredUsers.length}</span>
      </div>

      {filteredUsers.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Користувач</TableHead>
              <TableHead>Роль</TableHead>
              <TableHead>Відділ</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Дії</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    {user.employee_id && (
                      <p className="text-xs text-muted-foreground">ID працівника: {user.employee_id}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{formatRole(user.role)}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{user.department || "—"}</TableCell>
                <TableCell>
                  <Badge variant={user.is_active ? "default" : "secondary"}>
                    {user.is_active ? "Активний" : "Неактивний"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/admin/users/${user.id}`}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Редагувати
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="py-8 text-center text-muted-foreground">За вибраними фільтрами користувачів не знайдено.</p>
      )}
    </div>
  )
}
