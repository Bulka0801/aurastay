"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  Updater,
} from "@tanstack/react-table"

import {
  flattenColumnMeta,
  normalizeUpdater,
  parseUrlState,
  serializeUrlState,
  tableStateEquals,
  type TableUrlState,
} from "@/hooks/table-url-sync-utils"

type TableUrlSyncOptions<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[]
  enabled?: boolean
}

export function useTableUrlSync<TData, TValue>({
  columns,
  enabled = true,
}: TableUrlSyncOptions<TData, TValue>) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const metaByColumnId = useMemo(() => flattenColumnMeta(columns), [columns])
  const currentUrlParams = useMemo(
    () => new URLSearchParams(searchParams.toString()),
    [searchParams]
  )

  const [state, setState] = useState<TableUrlState>(() =>
    parseUrlState(currentUrlParams, metaByColumnId)
  )
  const stateRef = useRef(state)
  const currentUrlParamsRef = useRef(currentUrlParams)

  stateRef.current = state
  currentUrlParamsRef.current = currentUrlParams

  useEffect(() => {
    if (!enabled) {
      return
    }

    const nextState = parseUrlState(currentUrlParams, metaByColumnId)

    if (!tableStateEquals(stateRef.current, nextState)) {
      stateRef.current = nextState
      setState(nextState)
    }
  }, [currentUrlParams, enabled, metaByColumnId])

  const replaceUrl = useCallback(
    (nextState: TableUrlState) => {
      if (!enabled) {
        return
      }

      const nextQuery = serializeUrlState(
        nextState,
        currentUrlParamsRef.current
      ).toString()
      const currentQuery = currentUrlParamsRef.current.toString()

      if (nextQuery !== currentQuery) {
        router.replace(`${pathname}${nextQuery ? `?${nextQuery}` : ""}`, {
          scroll: false,
        })
      }
    },
    [enabled, pathname, router]
  )

  const updateState = useCallback(
    (nextState: TableUrlState) => {
      if (tableStateEquals(stateRef.current, nextState)) {
        return
      }

      stateRef.current = nextState
      setState(nextState)
      replaceUrl(nextState)
    },
    [replaceUrl]
  )

  const setSorting = useCallback(
    (updater: Updater<SortingState>) => {
      const currentState = stateRef.current

      updateState({
        ...currentState,
        sorting: normalizeUpdater(updater, currentState.sorting),
      })
    },
    [updateState]
  )

  const setColumnFilters = useCallback(
    (updater: Updater<ColumnFiltersState>) => {
      const currentState = stateRef.current

      updateState({
        ...currentState,
        columnFilters: normalizeUpdater(updater, currentState.columnFilters),
      })
    },
    [updateState]
  )

  const setGlobalFilter = useCallback(
    (updater: Updater<string>) => {
      const currentState = stateRef.current

      updateState({
        ...currentState,
        globalFilter: normalizeUpdater(updater, currentState.globalFilter),
      })
    },
    [updateState]
  )

  const clearTableState = useCallback(() => {
    updateState({
      sorting: [],
      columnFilters: [],
      globalFilter: "",
    })
  }, [updateState])

  return {
    sorting: state.sorting,
    setSorting,
    columnFilters: state.columnFilters,
    setColumnFilters,
    globalFilter: state.globalFilter,
    setGlobalFilter,
    clearTableState,
  }
}
