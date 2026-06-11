"use client"

import { flexRender, type Header } from "@tanstack/react-table"
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  Filter,
  Search,
  X,
} from "lucide-react"
import { useEffect, useMemo, useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  EMPTY_FILTER_VALUE,
  getFilterLabel,
  normalizeFilterValue,
} from "@/components/data-table/filter-utils"
import type { DateRangeFilterValue } from "@/components/data-table/types"
import type { NumberFilterValue, TextFilterValue } from "@/components/data-table/types"

type ColumnHeaderMenuProps<TData, TValue> = {
  header: Header<TData, TValue>
  align?: "start" | "center" | "end"
}

type CheckboxOption = {
  value: string
  label: string
  description?: string
  colorClassName?: string
  icon?: string
  count?: number
}

const EMPTY_FILTER_GROUPS: Array<{
  label: string
  description?: string
  values: string[]
}> = []

function getSortLabels(dataType?: string, customLabels?: { asc: string; desc: string }) {
  if (customLabels) {
    return customLabels
  }

  if (dataType === "number") {
    return { asc: "За зростанням", desc: "За спаданням" }
  }

  if (dataType === "date") {
    return { asc: "Найстаріші спочатку", desc: "Найновіші спочатку" }
  }

  return { asc: "Сортувати А-Я", desc: "Сортувати Я-А" }
}

function hasActiveFilter(value: unknown) {
  if (Array.isArray(value)) {
    return true
  }

  if (typeof value === "string") {
    return Boolean(value.trim())
  }

  if (value && typeof value === "object") {
    const filterValue = value as DateRangeFilterValue &
      NumberFilterValue &
      TextFilterValue

    return Boolean(
      filterValue.preset ||
        filterValue.from ||
        filterValue.to ||
        filterValue.value ||
        filterValue.min ||
        filterValue.max
    )
  }

  return false
}

function getActiveFilterCount(filterType: unknown, value: unknown) {
  if (filterType === "checkbox" && Array.isArray(value)) {
    return value.length
  }

  return 0
}

function getCheckboxOptions<TData, TValue>(
  header: Header<TData, TValue>
): CheckboxOption[] {
  const column = header.column
  const meta = column.columnDef.meta

  if (meta?.filterType !== "checkbox") {
    return []
  }

  const uniqueValues = column.getFacetedUniqueValues()
  const checkboxValues = meta.filterOptions?.length
    ? meta.filterOptions
    : Array.from(uniqueValues.keys()).map(normalizeFilterValue)

  const normalizedValues = Array.from(new Set(checkboxValues.map(normalizeFilterValue)))
  const sortedValues = meta.preserveFilterOptionOrder
    ? normalizedValues
    : normalizedValues.sort((left, right) =>
      getFilterLabel(left, meta.filterLabels).localeCompare(
        getFilterLabel(right, meta.filterLabels),
        "uk"
      )
    )

  return sortedValues.map((value) => ({
      value,
      label: getFilterLabel(value, meta.filterLabels),
      description: meta.filterOptionMeta?.[value]?.description,
      colorClassName: meta.filterOptionMeta?.[value]?.colorClassName,
      icon: meta.filterOptionMeta?.[value]?.icon,
      count:
        value === EMPTY_FILTER_VALUE
          ? (uniqueValues.get(null) ??
            uniqueValues.get(undefined) ??
            uniqueValues.get(""))
          : uniqueValues.get(value),
    }))
}

function SortButton({
  active,
  children,
  icon,
  onClick,
}: {
  active: boolean
  children: ReactNode
  icon: ReactNode
  onClick: (event: React.MouseEvent) => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-slate-100",
        active && "bg-slate-100 font-medium text-slate-950"
      )}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {active && <Check className="h-4 w-4 text-slate-700" />}
    </button>
  )
}

function CheckboxFilter<TData, TValue>({
  header,
  options,
}: {
  header: Header<TData, TValue>
  options: CheckboxOption[]
}) {
  const column = header.column
  const meta = column.columnDef.meta
  const activeValue = column.getFilterValue()
  const activeValues = Array.isArray(activeValue)
    ? activeValue.map(String)
    : typeof activeValue === "string"
      ? activeValue.split(",").filter(Boolean)
      : undefined
  const selectedValues = activeValues ?? options.map((option) => option.value)
  const [query, setQuery] = useState("")
  const groups = meta?.filterOptionGroups ?? EMPTY_FILTER_GROUPS
  const groupMode = meta?.filterGroupMode ?? "shortcuts"
  const optionsByValue = new Map(options.map((option) => [option.value, option]))
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((group) => [group.label, false]))
  )

  useEffect(() => {
    if (groups.length === 0) {
      return
    }

    setOpenGroups((currentOpenGroups) =>
      Object.fromEntries(
        groups.map((group) => [
          group.label,
          currentOpenGroups[group.label] ?? false,
        ])
      )
    )
  }, [groups])

  const visibleOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("uk")

    if (!normalizedQuery) {
      return options
    }

    return options.filter((option) =>
      option.label.toLocaleLowerCase("uk").includes(normalizedQuery)
    )
  }, [options, query])
  const optionListHeightClass =
    options.length <= 4
      ? "max-h-40"
      : options.length <= 8
        ? "max-h-56"
        : "h-48"

  const setSelectedValues = (nextValues: string[]) => {
    if (nextValues.length === options.length) {
      column.setFilterValue(undefined)
      return
    }

    column.setFilterValue(nextValues)
  }

  const clearFilter = () => {
    setQuery("")
    column.setFilterValue(undefined)
  }

  const renderOption = (option: CheckboxOption) => {
    const checked = selectedValues.includes(option.value)

    return (
      <label
        key={option.value}
        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100"
      >
        <Checkbox
          checked={checked}
          onCheckedChange={(nextChecked) => {
            const nextSelectedValues =
              nextChecked === true
                ? Array.from(new Set([...selectedValues, option.value]))
                : selectedValues.filter((value) => value !== option.value)

            setSelectedValues(nextSelectedValues)
          }}
        />
        {option.icon && (
          <span
            className={cn(
              "flex h-5 min-w-5 items-center justify-center rounded-full text-[11px] font-semibold",
              option.colorClassName ?? "bg-slate-100 text-slate-500"
            )}
            aria-hidden="true"
          >
            {option.icon ?? ""}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "inline-flex max-w-full truncate",
              option.colorClassName && "rounded-full border px-2 py-0.5 text-xs font-medium",
              option.colorClassName
            )}
          >
            {option.label}
          </span>
          {option.description && (
            <span className="block truncate text-xs text-slate-500">
              {option.description}
            </span>
          )}
        </span>
        {typeof option.count === "number" && (
          <span className="text-xs tabular-nums text-slate-400">
            {option.count}
          </span>
        )}
      </label>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-normal text-slate-500">
          Фільтр
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={clearFilter}
        >
          <X className="h-3.5 w-3.5" />
          Очистити
        </Button>
      </div>

      {groups.length > 0 && groupMode === "shortcuts" && (
        <ScrollArea className="h-28 pr-3">
        <div className="space-y-1 pr-1">
          {groups.map((group) => (
            <button
              key={group.label}
              type="button"
              className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-left text-sm transition-colors hover:bg-slate-50"
              onClick={() => setSelectedValues(group.values)}
            >
              <span className="block font-medium text-slate-900">{group.label}</span>
              {group.description && (
                <span className="block text-xs leading-4 text-slate-500">
                  {group.description}
                </span>
              )}
            </button>
          ))}
        </div>
        </ScrollArea>
      )}

      {options.length > 10 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Пошук..."
            aria-label="Пошук значень фільтра"
            className="h-8 pl-8"
          />
        </div>
      )}

      {options.length === 0 ? (
        <p className="px-2 py-3 text-sm text-slate-500">
          Немає даних для фільтрації.
        </p>
      ) : (
        <ScrollArea
          className={cn(
            "pr-3",
            groupMode === "collapsibleSections" ? "max-h-72" : optionListHeightClass
          )}
        >
          <div className="space-y-1">
            {(groupMode === "sections" || groupMode === "collapsibleSections") && groups.length > 0
              ? groups.map((group) => {
                  const groupOptions = group.values
                    .map((value) => optionsByValue.get(value))
                    .filter((option): option is CheckboxOption => Boolean(option))
                    .filter((option) => visibleOptions.includes(option))

                  if (groupOptions.length === 0) {
                    return null
                  }

                  if (groupMode === "collapsibleSections") {
                    const isOpen = openGroups[group.label] ?? false

                    return (
                      <Collapsible
                        key={group.label}
                        open={isOpen}
                        onOpenChange={(nextOpen) =>
                          setOpenGroups((currentOpenGroups) => ({
                            ...currentOpenGroups,
                            [group.label]: nextOpen,
                          }))
                        }
                        className="rounded-md border border-slate-200"
                      >
                        <CollapsibleTrigger asChild>
                          <button
                            type="button"
                            className="flex w-full items-center justify-between gap-2 px-2 py-2 text-left text-sm font-medium text-slate-900 hover:bg-slate-50"
                          >
                            <span>
                              {group.label}
                              <span className="ml-1 text-xs font-normal text-slate-500">
                                ({groupOptions.length})
                              </span>
                            </span>
                            <ChevronRight
                              className={cn(
                                "h-4 w-4 text-slate-400 transition-transform",
                                isOpen && "rotate-90"
                              )}
                            />
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="space-y-1 border-t border-slate-100 p-1">
                            {group.description && (
                              <p className="px-2 py-1 text-xs text-slate-500">
                                {group.description}
                              </p>
                            )}
                            {groupOptions.map(renderOption)}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )
                  }

                  return (
                    <div key={group.label} className="space-y-1 pt-1">
                      <p className="px-2 text-xs font-semibold uppercase tracking-normal text-slate-500">
                        {group.label}
                      </p>
                      {group.description && (
                        <p className="px-2 text-xs text-slate-500">
                          {group.description}
                        </p>
                      )}
                      {groupOptions.map(renderOption)}
                    </div>
                  )
                })
              : visibleOptions.map(renderOption)}

            {visibleOptions.length === 0 && (
              <p className="px-2 py-3 text-sm text-slate-500">Нічого не знайдено.</p>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}

function SearchFilter<TData, TValue>({
  header,
}: {
  header: Header<TData, TValue>
}) {
  const column = header.column
  const currentFilterValue = column.getFilterValue()
  const currentTextFilter =
    typeof currentFilterValue === "object" && currentFilterValue !== null
      ? (currentFilterValue as TextFilterValue)
      : {
          operator: "contains" as const,
          value: String(currentFilterValue ?? ""),
        }
  const [operator, setOperator] = useState<TextFilterValue["operator"]>(
    currentTextFilter.operator
  )
  const [value, setValue] = useState(currentTextFilter.value)

  useEffect(() => {
    setOperator(currentTextFilter.operator)
    setValue(currentTextFilter.value)
  }, [currentTextFilter.operator, currentTextFilter.value])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      column.setFilterValue(
        value.trim()
          ? {
              operator,
              value,
            }
          : undefined
      )
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [column, operator, value])

  const clearFilter = () => {
    setOperator("contains")
    setValue("")
    column.setFilterValue(undefined)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-normal text-slate-500">
          Текстовий фільтр
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={clearFilter}
        >
          <X className="h-3.5 w-3.5" />
          Очистити
        </Button>
      </div>
      {column.columnDef.meta?.filterHelpText && (
        <p className="text-xs leading-4 text-slate-500">
          {column.columnDef.meta.filterHelpText}
        </p>
      )}
      <div className="grid grid-cols-3 gap-1">
        {[
          ["contains", "Містить"],
          ["startsWith", "Починається з"],
          ["equals", "Дорівнює"],
        ].map(([nextOperator, label]) => (
          <Button
            key={nextOperator}
            type="button"
            variant={operator === nextOperator ? "secondary" : "outline"}
            size="sm"
            className="h-auto min-h-8 whitespace-normal px-2 py-1 text-xs leading-4"
            onClick={() => setOperator(nextOperator as TextFilterValue["operator"])}
          >
            {label}
          </Button>
        ))}
      </div>
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={column.columnDef.meta?.searchPlaceholder ?? "Введіть текст..."}
        className="h-9"
      />
    </div>
  )
}

function NumberFilter<TData, TValue>({
  header,
}: {
  header: Header<TData, TValue>
}) {
  const column = header.column
  const currentFilterValue = (column.getFilterValue() as NumberFilterValue | undefined) ?? {
    operator: "equals",
  }
  const [filterValue, setFilterValue] = useState<NumberFilterValue>(currentFilterValue)

  useEffect(() => {
    setFilterValue(currentFilterValue)
  }, [
    currentFilterValue.operator,
    currentFilterValue.value,
    currentFilterValue.min,
    currentFilterValue.max,
  ])

  const updateValue = (nextValue: NumberFilterValue) => {
    setFilterValue(nextValue)

    const hasValue =
      nextValue.operator === "between"
        ? Boolean(nextValue.min || nextValue.max)
        : Boolean(nextValue.value)

    column.setFilterValue(hasValue ? nextValue : undefined)
  }

  const clearFilter = () => {
    const nextValue: NumberFilterValue = { operator: "equals" }

    setFilterValue(nextValue)
    column.setFilterValue(undefined)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-normal text-slate-500">
          Фільтр суми
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={clearFilter}
        >
          <X className="h-3.5 w-3.5" />
          Очистити
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {[
          ["equals", "Дорівнює"],
          ["greaterThan", "Більше ніж"],
          ["lessThan", "Менше ніж"],
          ["between", "Між"],
        ].map(([operator, label]) => (
          <Button
            key={operator}
            type="button"
            variant={filterValue.operator === operator ? "secondary" : "outline"}
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() =>
              updateValue({
                operator: operator as NumberFilterValue["operator"],
                value: filterValue.value,
                min: filterValue.min,
                max: filterValue.max,
              })
            }
          >
            {label}
          </Button>
        ))}
      </div>

      {filterValue.operator === "between" ? (
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            inputMode="decimal"
            value={filterValue.min ?? ""}
            onChange={(event) =>
              updateValue({ ...filterValue, min: event.target.value })
            }
            placeholder="Від"
            className="h-9"
          />
          <Input
            type="number"
            inputMode="decimal"
            value={filterValue.max ?? ""}
            onChange={(event) =>
              updateValue({ ...filterValue, max: event.target.value })
            }
            placeholder="До"
            className="h-9"
          />
        </div>
      ) : (
        <Input
          type="number"
          inputMode="decimal"
          value={filterValue.value ?? ""}
          onChange={(event) =>
            updateValue({ ...filterValue, value: event.target.value })
          }
          placeholder="Сума"
          className="h-9"
        />
      )}
    </div>
  )
}

function DateRangeFilter<TData, TValue>({
  header,
}: {
  header: Header<TData, TValue>
}) {
  const column = header.column
  const value = (column.getFilterValue() as DateRangeFilterValue | undefined) ?? {}
  const presets = column.columnDef.meta?.datePresets ?? []

  const updateValue = (nextValue: DateRangeFilterValue) => {
    column.setFilterValue(
      nextValue.preset || nextValue.from || nextValue.to ? nextValue : undefined
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-normal text-slate-500">
          Швидкий фільтр
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => column.setFilterValue(undefined)}
        >
          <X className="h-3.5 w-3.5" />
          Очистити
        </Button>
      </div>
      {presets.length > 0 && (
        <div className="space-y-1">
          {presets.map((preset) => (
            <button
              key={preset.value}
              type="button"
              className={cn(
                "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-slate-100",
                value.preset === preset.value &&
                  "bg-slate-100 font-medium text-slate-950"
              )}
              onClick={() => updateValue({ preset: preset.value })}
            >
              <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              <span>
                <span className="block">{preset.label}</span>
                {preset.description && (
                  <span className="block text-xs font-normal text-slate-500">
                    {preset.description}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
      <Separator />
      <p className="text-xs font-medium uppercase tracking-normal text-slate-500">
        Власний період
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="date"
          value={value.from ?? ""}
          onChange={(event) =>
            updateValue({ from: event.target.value, to: value.to })
          }
          aria-label="Дата з"
          className="h-9"
        />
        <Input
          type="date"
          value={value.to ?? ""}
          onChange={(event) =>
            updateValue({ from: value.from, to: event.target.value })
          }
          aria-label="Дата по"
          className="h-9"
        />
      </div>
    </div>
  )
}

export function ColumnHeaderMenu<TData, TValue>({
  header,
  align = "start",
}: ColumnHeaderMenuProps<TData, TValue>) {
  const column = header.column
  const meta = column.columnDef.meta
  const sortDirection = column.getIsSorted()
  const filterValue = column.getFilterValue()
  const filterIsActive = hasActiveFilter(filterValue)
  const activeFilterCount = getActiveFilterCount(meta?.filterType, filterValue)
  const canSort = meta?.sortable === true && column.getCanSort()
  const canFilter = meta?.filterable === true && meta.filterType !== false
  const hasMenu = canSort || canFilter
  const sortLabels = getSortLabels(meta?.dataType, meta?.sortLabel)
  const checkboxOptions = getCheckboxOptions(header)
  const isCompactCheckboxMenu =
    meta?.filterType === "checkbox" &&
    checkboxOptions.length <= 4 &&
    !meta?.filterOptionGroups?.length

  const label = flexRender(column.columnDef.header, header.getContext())

  if (!hasMenu) {
    return <div className="py-1">{label}</div>
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Відкрити меню сортування та фільтрації"
          className="group flex min-h-9 w-full items-center justify-between gap-2 rounded-sm py-1 text-left outline-none transition-colors hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-slate-300"
        >
          <span className="min-w-0 flex-1 truncate">
            {label}
            {activeFilterCount > 0 && (
              <span className="ml-1 text-xs font-semibold text-slate-500">
                ({activeFilterCount})
              </span>
            )}
          </span>

          <span className="flex shrink-0 items-center gap-1">
            {filterIsActive && (
              <Filter className="h-4 w-4 text-slate-700" aria-hidden="true" />
            )}
            {sortDirection === "asc" && (
              <ArrowUp className="h-4 w-4 text-slate-900" aria-hidden="true" />
            )}
            {sortDirection === "desc" && (
              <ArrowDown className="h-4 w-4 text-slate-900" aria-hidden="true" />
            )}
            {!sortDirection && (
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100",
                  filterIsActive && "opacity-100"
                )}
                aria-hidden="true"
              />
            )}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className={cn(
          "max-h-[calc(100vh-8rem)] overflow-y-auto p-2",
          isCompactCheckboxMenu ? "w-60" : "w-72"
        )}
      >
        <div className="space-y-2">
          {canSort && (
            <div className="space-y-1">
              <p className="px-2 text-xs font-medium uppercase tracking-normal text-slate-500">
                Сортування
              </p>
              <SortButton
                active={sortDirection === "asc"}
                icon={<ArrowUp className="h-4 w-4" />}
                onClick={(e) => column.toggleSorting(false, e.shiftKey)}
              >
                {sortLabels.asc}
              </SortButton>
              <SortButton
                active={sortDirection === "desc"}
                icon={<ArrowDown className="h-4 w-4" />}
                onClick={(e) => column.toggleSorting(true, e.shiftKey)}
              >
                {sortLabels.desc}
              </SortButton>
              {sortDirection && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-full justify-start px-2"
                  onClick={() => column.clearSorting()}
                >
                  <X className="h-4 w-4" />
                  Очистити сортування
                </Button>
              )}
            </div>
          )}

          {canSort && canFilter && <Separator />}

          {canFilter && meta?.filterType === "checkbox" && (
            <CheckboxFilter header={header} options={checkboxOptions} />
          )}

          {canFilter && meta?.filterType === "search" && (
            <SearchFilter header={header} />
          )}

          {canFilter && meta?.filterType === "number" && (
            <NumberFilter header={header} />
          )}

          {canFilter && meta?.filterType === "dateRange" && (
            <DateRangeFilter header={header} />
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
