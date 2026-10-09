import { GuestHeader, GuestNav } from '@/components/guest/GuestChrome'

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GuestHeader />
      <main className="pb-nav mx-auto w-full max-w-[640px] px-gutter pt-5 animate-fade md:max-w-3xl md:px-8 md:pt-8">{children}</main>
      <GuestNav />
    </>
  )
}
