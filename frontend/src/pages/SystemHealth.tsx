import { useState } from 'react'
import { Activity, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Zap, Server, Database, Cloud, Cpu, GitBranch, Shield } from 'lucide-react'
import MainLayout from '@/layouts/MainLayout'
import { useApp, type HealthService } from '@/context/AppContext'
import { LoadingSpinner } from '@/components/LoadingSpinner'

const SERVICE_ICONS: Record<string, any> = {
  'Backend API': Server,
  'CockroachDB': Database,
  'AWS Bedrock': Cpu,
  'AWS CloudWatch': Cloud,
  'API Gateway': Shield,
  'Vector Store': GitBranch,
}

function StatusIcon({ status }: { status: HealthService['status'] }) {
  if (status === 'online') return <CheckCircle2 size={16} style={{ color: '#10b981' }} />
  if (status === 'warning') return <AlertTriangle size={16} style={{ color: '#f59e0b' }} />
  return <XCircle size={16} style={{ color: '#f43f5e' }} />
}

function HealthCard({ service }: { service: HealthService }) {
  const Icon = SERVICE_ICONS[service.name] || Server
  const statusColor = service.status === 'online' ? '#10b981' : service.status === 'warning' ? '#f59e0b' : '#f43f5e'

  return (
    <div className="glass rounded-xl p-5 relative overflow-hidden">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${statusColor}12`, border: `1px solid ${statusColor}25` }}>
            <Icon size={18} style={{ color: statusColor }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{service.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: statusColor }} />
              <span className="text-[11px] font-mono capitalize" style={{ color: statusColor }}>{service.status}</span>
            </div>
          </div>
        </div>
        <StatusIcon status={service.status} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-2.5 rounded-lg" style={{ background: 'rgba(59,130,246,0.06)' }}>
          <p className="text-[10px] mb-1" style={{ color: 'rgba(148,163,184,0.5)' }}>Latency</p>
          <p className="text-sm font-bold font-mono" style={{ color: service.latency < 50 ? '#10b981' : service.latency < 200 ? '#f59e0b' : '#f43f5e' }}>
            {service.latency}ms
          </p>
        </div>
        <div className="p-2.5 rounded-lg" style={{ background: 'rgba(59,130,246,0.06)' }}>
          <p className="text-[10px] mb-1" style={{ color: 'rgba(148,163,184,0.5)' }}>Uptime</p>
          <p className="text-sm font-bold font-mono" style={{ color: service.uptime >= 99.9 ? '#10b981' : '#f59e0b' }}>
            {service.uptime}%
          </p>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex justify-between mb-1">
          <span className="text-[10px]" style={{ color: 'rgba(148,163,184,0.5)' }}>Health score</span>
          <span className="text-[10px] font-mono" style={{ color: 'rgba(148,163,184,0.6)' }}>{service.uptime}%</span>
        </div>
        <div className="h-1 rounded-full" style={{ background: 'rgba(59,130,246,0.12)' }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${service.uptime}%`, background: `linear-gradient(90deg, ${statusColor}, ${statusColor}aa)` }} />
        </div>
      </div>

      <p className="mt-3 text-[10px] font-mono" style={{ color: 'rgba(148,163,184,0.35)' }}>
        Last checked {new Date(service.lastChecked).toLocaleTimeString()}
      </p>

      <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-[0.04]" style={{ background: statusColor }} />
    </div>
  )
}

export default function SystemHealth() {
  const { healthServices, refreshHealth, addNotification } = useApp()
  const [checking, setChecking] = useState(false)

  const online = healthServices.filter(s => s.status === 'online').length
  const warning = healthServices.filter(s => s.status === 'warning').length
  const offline = healthServices.filter(s => s.status === 'offline').length

  const handleRefresh = async () => {
    setChecking(true)
    await refreshHealth()
    setChecking(false)
  }

  return (
    <MainLayout title="System Health" subtitle="Real-time infrastructure monitoring across all services">
      <div className="space-y-5 animate-fade-in">
        {/* Summary row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Online', value: online, color: '#10b981', icon: CheckCircle2 },
            { label: 'Warning', value: warning, color: '#f59e0b', icon: AlertTriangle },
            { label: 'Offline', value: offline, color: '#f43f5e', icon: XCircle },
            { label: 'Overall Health', value: `${Math.round(online / healthServices.length * 100)}%`, color: '#3b82f6', icon: Activity },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="glass rounded-xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}12` }}>
                <Icon size={16} style={{ color }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'rgba(148,163,184,0.5)' }}>{label}</p>
                <p className="text-xl font-bold font-mono text-white">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            disabled={checking}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all hover:scale-[1.02] disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', boxShadow: '0 4px 15px rgba(59,130,246,0.25)' }}
          >
            {checking ? <LoadingSpinner size={14} /> : <RefreshCw size={14} />}
            {checking ? 'Checking...' : 'Refresh Status'}
          </button>
          <button
            onClick={() => { addNotification('info', 'Running comprehensive health check...'); handleRefresh() }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all hover:bg-white/5"
            style={{ border: '1px solid rgba(59,130,246,0.25)', color: '#94a3b8' }}
          >
            <Zap size={14} />
            Run Health Check
          </button>
        </div>

        {/* Service cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {healthServices.map(service => <HealthCard key={service.name} service={service} />)}
        </div>
      </div>
    </MainLayout>
  )
}
