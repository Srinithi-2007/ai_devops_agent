import { useState, useEffect } from 'react'
import { Bell, Search, User, Moon, Sun, Wifi } from 'lucide-react'
import { useApp } from '@/context/AppContext'

interface NavbarProps {
  title: string
  subtitle?: string
}

export default function Navbar({ title, subtitle }: NavbarProps) {
  const { notifications } = useApp()
  const [time, setTime] = useState(new Date())
  const [dark, setDark] = useState(true)

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const fmtTime = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  const fmtDate = time.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <header className="fixed top-0 right-0 h-14 z-20 flex items-center px-6 gap-4" style={{ left: 240, background: 'rgba(7,9,18,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(59,130,246,0.12)' }}>
      {/* Title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold text-white truncate">{title}</h1>
        {subtitle && <p className="text-[11px] truncate" style={{ color: 'rgba(148,163,184,0.6)' }}>{subtitle}</p>}
      </div>

      {/* Search */}
      <div className="relative hidden md:flex items-center">
        <Search size={13} className="absolute left-3" style={{ color: 'rgba(148,163,184,0.5)' }} />
        <input
          placeholder="Search incidents..."
          className="pl-8 pr-4 py-1.5 text-xs rounded-lg outline-none w-52"
          style={{
            background: 'rgba(17,24,39,0.8)',
            border: '1px solid rgba(59,130,246,0.2)',
            color: '#94a3b8',
          }}
        />
        <span className="absolute right-3 text-[10px] px-1 rounded" style={{ color: 'rgba(148,163,184,0.4)', background: 'rgba(59,130,246,0.1)' }}>⌘K</span>
      </div>

      {/* Live indicator */}
      <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
        <span className="text-[11px] font-mono" style={{ color: '#34d399' }}>LIVE</span>
      </div>

      {/* Time */}
      <div className="hidden lg:flex flex-col items-end">
        <span className="text-xs font-mono font-medium text-white">{fmtTime}</span>
        <span className="text-[10px]" style={{ color: 'rgba(148,163,184,0.5)' }}>{fmtDate}</span>
      </div>

      {/* Bell */}
      <button className="relative p-2 rounded-lg transition-colors hover:bg-white/5">
        <Bell size={15} style={{ color: 'rgba(148,163,184,0.7)' }} />
        {notifications.length > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: '#f43f5e' }} />
        )}
      </button>

      {/* Theme */}
      <button onClick={() => setDark(!dark)} className="p-2 rounded-lg transition-colors hover:bg-white/5">
        {dark ? <Moon size={15} style={{ color: 'rgba(148,163,184,0.7)' }} /> : <Sun size={15} style={{ color: 'rgba(148,163,184,0.7)' }} />}
      </button>

      {/* User */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: 'white' }}>
          SR
        </div>
        <div className="hidden sm:block">
          <div className="text-xs font-medium text-white">Sarah R.</div>
          <div className="text-[10px]" style={{ color: 'rgba(148,163,184,0.5)' }}>SRE Lead</div>
        </div>
      </div>
    </header>
  )
}
