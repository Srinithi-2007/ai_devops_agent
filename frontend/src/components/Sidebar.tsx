import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Brain, Bot, BarChart3, Activity, Settings,
  Zap, Database, ChevronRight, Shield
} from 'lucide-react'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/memory', label: 'Incident Memory', icon: Database },
  { to: '/agent', label: 'AI Agent', icon: Bot },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/health', label: 'System Health', icon: Activity },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const location = useLocation()

  return (
    <aside className="fixed left-0 top-0 h-full w-60 flex flex-col z-30" style={{ background: '#07091299', backdropFilter: 'blur(20px)', borderRight: '1px solid rgba(59,130,246,0.15)' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: 'rgba(59,130,246,0.15)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center relative" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }}>
          <Shield size={16} className="text-white" />
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2" style={{ borderColor: '#070912' }} />
        </div>
        <div>
          <div className="font-bold text-white text-sm leading-tight tracking-wide">OPSAI</div>
          <div className="text-[10px] font-mono" style={{ color: '#3b82f6' }}>MEMORY PLATFORM</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <div className="px-2 pb-2">
          <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: 'rgba(148,163,184,0.5)' }}>Navigation</span>
        </div>
        {NAV.map(({ to, label, icon: Icon }) => {
          const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
          return (
            <NavLink
              key={to}
              to={to}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg group transition-all duration-150 relative"
              style={{
                background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: isActive ? '#93c5fd' : 'rgba(148,163,184,0.8)',
              }}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r" style={{ background: '#3b82f6' }} />
              )}
              <Icon size={16} className="shrink-0" />
              <span className="text-sm font-medium flex-1">{label}</span>
              {isActive && <ChevronRight size={12} style={{ color: '#3b82f6' }} />}
            </NavLink>
          )
        })}
      </nav>

      {/* Memory indicator */}
      <div className="mx-3 mb-4 p-3 rounded-lg" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Brain size={13} style={{ color: '#3b82f6' }} />
          <span className="text-xs font-medium" style={{ color: '#93c5fd' }}>CockroachDB Memory</span>
        </div>
        <div className="flex items-end justify-between mb-1.5">
          <span className="text-mono text-lg font-bold text-white">847</span>
          <span className="text-[10px]" style={{ color: 'rgba(148,163,184,0.6)' }}>incidents stored</span>
        </div>
        <div className="w-full h-1 rounded-full" style={{ background: 'rgba(59,130,246,0.2)' }}>
          <div className="h-full rounded-full" style={{ width: '68%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)' }} />
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <Zap size={10} style={{ color: '#06b6d4' }} />
          <span className="text-[10px]" style={{ color: '#06b6d4' }}>Vector search active</span>
        </div>
      </div>
    </aside>
  )
}
