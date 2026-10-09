import { GuestHeader, GuestNav } from '@/components/guest/GuestChrome'

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GuestHeader />
      <main className="pb-nav mx-auto w-full max-w-[640px] px-gutter pt-5 animate-fade">{children}</main>
      <GuestNav />
    </>
  )
}
