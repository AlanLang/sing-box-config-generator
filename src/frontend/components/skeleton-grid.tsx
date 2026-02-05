export function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-6">
      {Array.from({ length: 4 }, (_, i) => i).map((id) => (
        <div
          key={id}
          className="h-48 rounded-xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/20 animate-pulse overflow-hidden"
        >
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-muted/50" />
              <div className="h-5 bg-muted/50 rounded flex-1 max-w-[150px]" />
            </div>
          </div>
          <div className="p-3">
            <div className="space-y-2">
              <div className="h-3 bg-muted/40 rounded w-full" />
              <div className="h-3 bg-muted/40 rounded w-5/6" />
              <div className="h-3 bg-muted/40 rounded w-4/6" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
