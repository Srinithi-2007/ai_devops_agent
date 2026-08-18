import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle, CheckCircle2, Database, TrendingUp, Activity,
  RefreshCw, Download, Zap, ArrowRight, Brain, Clock, Eye, Trash2
} from 'lucide-react'
import MainLayout from '@/layouts/MainLayout'
import { useApp } from '@/context/AppContext'
import { AnalyzingOverlay } from '@/components/LoadingSpinner'

function KPICard({ label, value, sub, icon: Icon, color, delta }: {
  label: string; value: string | number; sub: string; icon: any; color: string; delta?: string
}) {
  return (
    <div className="glass rounded-xl p-5 relative overflow-hidden glow-blue">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-medium mb-0.5" style={{ color: 'rgba(148,163,184,0.6)' }}>{label}</p>
          <p className="text-2xl font-bold text-white font-mono">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: 'rgba(148,163,184,0.5)' }}>{sub}</span>
        {delta && <span className="text-xs font-mono" style={{ color: '#34d399' }}>{delta}</span>}
      </div>
      <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full opacity-5" style={{ background: color }} />
    </div>
  )
}

function SeverityBadge({ s }: { s: string }) {
  return <span className={`text-[11px] font-mono px-2 py-0.5 rounded badge-${s}`}>{s.toUpperCase()}</span>
}
function StatusBadge({ s }: { s: string }) {
  return <span className={`text-[11px] font-mono px-2 py-0.5 rounded status-${s}`}>{s}</span>
}

export default function Dashboard() {
  const { incidents, dashboardStats, analyzeIncident, analyzing, addNotification, refreshIncidents } = useApp()
  const navigate = useNavigate()

  return (
    <MainLayout title="Operations Center" subtitle="Real-time incident intelligence dashboard">
      <div className="space-y-6 animate-fade-in">
        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard label="Total Incidents" value={dashboardStats.total} sub="All time" icon={AlertTriangle} color="#f59e0b" delta="+3 today" />
          <KPICard label="Resolved by AI" value={dashboardStats.resolvedByAI} sub="Auto-fixed" icon={CheckCircle2} color="#10b981" delta="94% success" />
          <KPICard label="Memory Stored" value={dashboardStats.memoryStored} sub="CockroachDB vectors" icon={Database} color="#8b5cf6" delta="+12 today" />
          <KPICard label="Avg Confidence" value={`${dashboardStats.avgConfidence}%`} sub="AI accuracy" icon={TrendingUp} color="#3b82f6" />
          <KPICard label="System Health" value={`${dashboardStats.systemHealth}%`} sub="All services" icon={Activity} color="#06b6d4" />
        </div>

        {/* Actions + AI activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick actions */}
          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={14} style={{ color: '#3b82f6' }} />
              <h2 className="text-sm font-semibold text-white">Quick Actions</h2>
            </div>
            <div className="space-y-2.5">
              <button
                onClick={analyzeIncident}
                disabled={analyzing}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', boxShadow: '0 4px 20px rgba(59,130,246,0.35)' }}
              >
                <Brain size={16} />
                <span className="flex-1 text-left">{analyzing ? 'Analyzing...' : 'Analyze Latest Incident'}</span>
                <ArrowRight size={14} />
              </button>
              <button
                onClick={() => {
                  refreshIncidents()
                  addNotification('success', 'Dashboard refreshed successfully')
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all hover:bg-white/5"
                style={{ border: '1px solid rgba(59,130,246,0.2)', color: '#94a3b8' }}
              >
                <RefreshCw size={15} />
                <span className="flex-1 text-left">Refresh Dashboard</span>
              </button>
              <button
                onClick={() => addNotification('info', 'Generating PDF export...')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all hover:bg-white/5"
                style={{ border: '1px solid rgba(59,130,246,0.2)', color: '#94a3b8' }}
              >
                <Download size={15} />
                <span className="flex-1 text-left">Export Dashboard</span>
              </button>
            </div>
          </div>

          {/* AI activity feed */}
          <div className="lg:col-span-2 glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Brain size={14} style={{ color: '#8b5cf6' }} />
                <h2 className="text-sm font-semibold text-white">AI Activity Feed</h2>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded" style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}>LIVE</span>
            </div>
            {analyzing ? (
              <AnalyzingOverlay />
            ) : (
              <div className="space-y-2">
                {[
                  { t: '08:23:11', msg: 'INC-2847 analyzed · 94% confidence · 2 similar memories retrieved', c: '#34d399' },
                  { t: '08:15:44', msg: 'Vector search completed · 847 embeddings scanned · top-3 returned', c: '#60a5fa' },
                  { t: '08:12:30', msg: 'INC-2846 resolved · root cause: Elasticsearch shard imbalance', c: '#34d399' },
                  { t: '07:58:02', msg: 'Feedback loop updated · INC-2845 marked useful · confidence +2%', c: '#a78bfa' },
                  { t: '07:45:19', msg: 'CockroachDB memory write · embedding stored · 1536 dimensions', c: '#60a5fa' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 border-b" style={{ borderColor: 'rgba(59,130,246,0.08)' }}>
                    <span className="text-[10px] font-mono shrink-0 mt-0.5" style={{ color: 'rgba(148,163,184,0.4)' }}>{item.t}</span>
                    <span className="text-xs" style={{ color: 'rgba(148,163,184,0.75)' }}>{item.msg}</span>
                    <span className="shrink-0 w-1.5 h-1.5 rounded-full mt-1.5" style={{ background: item.c }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Incident table */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(59,130,246,0.12)' }}>
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} style={{ color: '#f59e0b' }} />
              <h2 className="text-sm font-semibold text-white">Recent Incidents</h2>
              <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa' }}>{incidents.length}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: 'rgba(59,130,246,0.05)', borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
                  {['Incident ID', 'Service', 'Severity', 'Error', 'Confidence', 'Status', 'Created', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide" style={{ color: 'rgba(148,163,184,0.5)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {incidents.map((inc, i) => (
                  <tr key={inc.id} className="group transition-colors hover:bg-white/[0.02]" style={{ borderBottom: '1px solid rgba(59,130,246,0.06)' }}>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono font-semibold" style={{ color: '#60a5fa' }}>{inc.id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-white">{inc.service}</span>
                    </td>
                    <td className="px-4 py-3">
                      <SeverityBadge s={inc.severity} />
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <span className="text-xs truncate block" style={{ color: 'rgba(148,163,184,0.7)' }}>{inc.error.slice(0, 50)}...</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full" style={{ background: 'rgba(59,130,246,0.15)' }}>
                          <div className="h-full rounded-full" style={{ width: `${inc.confidence}%`, background: inc.confidence >= 90 ? '#10b981' : inc.confidence >= 70 ? '#3b82f6' : '#f59e0b' }} />
                        </div>
                        <span className="text-xs font-mono" style={{ color: 'rgba(148,163,184,0.7)' }}>{inc.confidence}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge s={inc.status} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono" style={{ color: 'rgba(148,163,184,0.5)' }}>
                        {new Date(inc.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => navigate(`/incident/${inc.id}`)} className="p-1.5 rounded hover:bg-blue-500/10 transition-colors" title="View">
                          <Eye size={13} style={{ color: '#60a5fa' }} />
                        </button>
                        <button className="p-1.5 rounded hover:bg-purple-500/10 transition-colors" title="Reanalyze">
                          <Brain size={13} style={{ color: '#a78bfa' }} />
                        </button>
                        <button className="p-1.5 rounded hover:bg-rose-500/10 transition-colors" title="Delete">
                          <Trash2 size={13} style={{ color: '#f87171' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
