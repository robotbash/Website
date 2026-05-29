export default function Loading() {
  return (
    <div className="container max-w-5xl mx-auto px-4 py-6 space-y-4">
      <div className="h-8 bg-muted rounded w-48 animate-pulse mb-6" />
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4 animate-pulse">
          <div className="h-4 bg-muted rounded w-1/3 mb-3" />
          <div className="h-6 bg-muted rounded w-2/3" />
        </div>
      ))}
    </div>
  )
}
