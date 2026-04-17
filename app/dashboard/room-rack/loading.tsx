export default function RoomRackLoading() {
  return (
    <div className="-mx-6 -my-6 flex h-[calc(100vh-4rem)] flex-col gap-4 p-6 md:-mx-8 md:-my-8 md:p-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-72 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-10 w-40 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      <div className="flex-1 animate-pulse rounded-lg bg-muted" />
    </div>
  )
}
