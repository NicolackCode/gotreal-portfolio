import PublicHeader from '@/components/layout/PublicHeader'
import Loader from '@/components/ui/Loader'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-black min-h-screen w-full relative">
      <Loader />
      <PublicHeader />
      {children}
    </div>
  )
}
