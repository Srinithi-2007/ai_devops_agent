import { type ReactNode } from 'react'
import Sidebar from '@/components/Sidebar'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Notifications from '@/components/Notification'

interface Props {
  children: ReactNode
  title: string
  subtitle?: string
}

export default function MainLayout({ children, title, subtitle }: Props) {
  return (
    <div className="min-h-screen grid-bg" style={{ background: '#070b16' }}>
      <Sidebar />
      <Navbar title={title} subtitle={subtitle} />
      <main className="min-h-screen flex flex-col" style={{ marginLeft: 240, paddingTop: 56 }}>
        <div className="flex-1 p-6">
          {children}
        </div>
        <Footer />
      </main>
      <Notifications />
    </div>
  )
}
