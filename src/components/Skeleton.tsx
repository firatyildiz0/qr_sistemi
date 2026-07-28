/**
 * Neutral placeholder block for `loading.tsx` fallbacks. Sizes should mirror the
 * real content so swapping the fallback out doesn't shift the layout.
 */
export default function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-border/70 ${className}`}
    />
  );
}
