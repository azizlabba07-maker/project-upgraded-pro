interface SkeletonProps {
  className?: string;
  variant?: "text" | "card" | "circle" | "chart";
  lines?: number;
}

export default function Skeleton({ className = "", variant = "text", lines = 1 }: SkeletonProps) {
  if (variant === "card") {
    return (
      <div className={`rounded-2xl border border-white/5 bg-white/[0.02] p-5 space-y-4 ${className}`}>
        <div className="h-4 w-1/3 rounded-lg bg-white/5 animate-pulse" />
        <div className="h-8 w-2/3 rounded-lg bg-white/5 animate-pulse" />
        <div className="h-3 w-full rounded-lg bg-white/5 animate-pulse" />
        <div className="h-3 w-4/5 rounded-lg bg-white/5 animate-pulse" />
      </div>
    );
  }

  if (variant === "chart") {
    return (
      <div className={`rounded-2xl border border-white/5 bg-white/[0.02] p-5 ${className}`}>
        <div className="h-4 w-1/4 rounded-lg bg-white/5 animate-pulse mb-4" />
        <div className="flex items-end gap-2 h-32">
          {[40, 65, 45, 80, 55, 70, 50, 75, 60].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-md bg-white/5 animate-pulse"
              style={{ height: `${h}%`, animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "circle") {
    return <div className={`rounded-full bg-white/5 animate-pulse ${className}`} />;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded-lg bg-white/5 animate-pulse"
          style={{
            width: `${100 - i * 15}%`,
            animationDelay: `${i * 80}ms`,
          }}
        />
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant="card" />
      ))}
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <Skeleton variant="card" />
      <SkeletonGrid count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton variant="chart" />
        <Skeleton variant="chart" />
      </div>
    </div>
  );
}
