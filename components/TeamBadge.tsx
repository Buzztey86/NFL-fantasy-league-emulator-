export function TeamBadge({ color, name, className = "" }: { color?: string; name?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color ?? "var(--text-dim)" }} />
      <span style={{ color }}>{name}</span>
    </span>
  );
}
