import { createElement, type ReactElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, describe, expect, it, vi } from "vitest"

import ReservationsPage from "@/app/dashboard/reservations/page"
import { createClient } from "@/lib/supabase/server"

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) =>
    createElement("a", { href: typeof href === "string" ? href : String(href), ...props }, children),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

type QueryResponse = {
  result: unknown
  delay?: number
}

function makeChainableQuery({ result, delay = 0 }: QueryResponse) {
  const chain: any = {
    select: () => chain,
    order: () => chain,
    in: () => chain,
    eq: () => chain,
    maybeSingle: () => chain,
    then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => {
      const promise = delay
        ? new Promise((res) => setTimeout(() => res(result), delay))
        : Promise.resolve(result)

      return promise.then(resolve, reject)
    },
  }

  return chain
}

function makeSupabaseStub(responses: QueryResponse[]) {
  let callIndex = 0

  return {
    from: () => makeChainableQuery(responses[callIndex++] ?? { result: { data: [], error: null } }),
  }
}

const mockedCreateClient = vi.mocked(createClient)

describe("Reservations page API resilience", () => {
  afterEach(() => {
    vi.useRealTimers()
    mockedCreateClient.mockReset()
  })

  it("renders the error banner when the reservations query fails", async () => {
    mockedCreateClient.mockResolvedValue(
      makeSupabaseStub([
        { result: { data: null, error: { message: "DB unavailable" } } },
        { result: { count: 0 } },
        { result: { count: 0 } },
        { result: { data: [], error: null } },
      ]) as never
    )

    const html = renderToStaticMarkup((await ReservationsPage()) as ReactElement)

    expect(html).toContain("Не вдалося завантажити бронювання")
    expect(html).toContain("DB unavailable")
  })

  it("waits for a slow network response before resolving the page", async () => {
    vi.useFakeTimers()

    mockedCreateClient.mockResolvedValue(
      makeSupabaseStub([
        { result: { data: null, error: { message: "DB unavailable" } }, delay: 200 },
        { result: { count: 0 } },
        { result: { count: 0 } },
        { result: { data: [], error: null } },
      ]) as never
    )

    const pagePromise = ReservationsPage()
    let resolved = false
    pagePromise.then(() => {
      resolved = true
    })

    await vi.advanceTimersByTimeAsync(150)
    expect(resolved).toBe(false)

    await vi.advanceTimersByTimeAsync(100)
    const html = renderToStaticMarkup((await pagePromise) as ReactElement)

    expect(resolved).toBe(true)
    expect(html).toContain("Не вдалося завантажити бронювання")
  })
})
