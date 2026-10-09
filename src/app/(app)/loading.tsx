import { SkeletonList } from '@/components/ui/States'

export default function Loading() {
  return (
    <>
      <div className="pt-safe sticky top-0 z-20 border-b border-line bg-canvas">
        <div className="mx-auto flex h-header max-w-[640px] items-center gap-3 px-gutter">
          <div className="skeleton size-[30px] rounded-[7px]" />
          <div className="grid gap-1.5">
            <div className="skeleton h-2.5 w-16 rounded" />
            <div className="skeleton h-4 w-28 rounded" />
          </div>
        </div>
      </div>
      <main className="mx-auto max-w-[640px] px-gutter pt-5">
        <div className="skeleton mb-3 h-3 w-20 rounded" />
        <SkeletonList count={4} />
      </main>
    </>
  )
}
