import PublicHeader from '@/components/layout/PublicHeader'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-black min-h-screen w-full relative">
      <PublicHeader />
      {children}
    </div>
  )
}
