export default function Loading() {
  return (
    <div className="container max-w-5xl mx-auto px-4 py-6 space-y-4">
      <div className="h-8 bg-muted rounded w-48 animate-pulse mb-6" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4 animate-pulse flex items-center gap-4">
          <div className="h-10 w-10 bg-muted rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-3 bg-muted rounded w-1/3" />
          </div>
          <div className="h-6 bg-muted rounded w-20" />
        </div>
      ))}
    </div>
  )
}
