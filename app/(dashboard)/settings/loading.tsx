export default function Loading() {
  return (
    <div className="container max-w-3xl mx-auto px-4 py-6 space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4 animate-pulse">
          <div className="h-4 bg-muted rounded w-1/3 mb-3" />
          <div className="h-8 bg-muted rounded w-1/2" />
        </div>
      ))}
    </div>
  )
}
