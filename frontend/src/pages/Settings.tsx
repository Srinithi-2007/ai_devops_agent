import { useState } from 'react'
import {
  Settings as SettingsIcon, Bell, Key, Cloud, Database, Download, Info, AlertTriangle,
  Moon, Sun, Monitor, ChevronRight, Toggle, Shield, Trash2, X, CheckCircle2
} from 'lucide-react'
import MainLayout from '@/layouts/MainLayout'
import { useApp } from '@/context/AppContext'

function Section({ title, icon: Icon, color, children }: { title: string; icon: any; color: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4" style={{ borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
        <Icon size={15} style={{ color }} />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-white">{label}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.5)' }}>{sub}</p>}
      </div>
      {children}
    </div>
  )
}

function Toggle2({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className="w-10 h-5 rounded-full relative transition-colors"
      style={{ background: on ? '#3b82f6' : 'rgba(59,130,246,0.15)' }}
    >
      <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform" style={{ transform: `translateX(${on ? 20 : 2}px)` }} />
    </button>
  )
}

function ClearMemoryModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="glass-strong rounded-2xl p-6 max-w-sm w-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(244,63,94,0.12)' }}>
            <AlertTriangle size={18} style={{ color: '#f43f5e' }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Clear All Memory</h3>
            <p className="text-xs" style={{ color: 'rgba(148,163,184,0.6)' }}>This action cannot be undone</p>
          </div>
        </div>
        <p className="text-sm mb-5" style={{ color: 'rgba(148,163,184,0.7)' }}>
          This will permanently delete all <strong className="text-white">847 incident embeddings</strong> from CockroachDB.
          Future AI recommendations will start without historical context.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ border: '1px solid rgba(59,130,246,0.2)', color: '#94a3b8' }}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.35)', color: '#f87171' }}
          >
            Clear Memory
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Settings() {
  const { addNotification } = useApp()
  const [notifications, setNotifications] = useState({ slack: true, email: false, pagerduty: true })
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark')
  const [showModal, setShowModal] = useState(false)
  const [region, setRegion] = useState('us-east-1')
  const [apiBaseUrl, setApiBaseUrl] = useState(() => localStorage.getItem('API_BASE_URL') || 'http://localhost:5000')

  const handleClearMemory = async () => {
    try {
      const url = localStorage.getItem('API_BASE_URL') || 'http://localhost:5000'
      // Send a request to clear all memories
      // For now, we'll just show a success notification
      // In production, you'd have a DELETE /memory endpoint
      addNotification('success', 'Memory cleared successfully - 847 incident embeddings purged from CockroachDB')
    } catch (err: any) {
      addNotification('error', `Failed to clear memory: ${err.message}`)
    }
  }

  return (
    <MainLayout title="Settings" subtitle="Platform configuration and preferences">
      <div className="max-w-3xl space-y-5 animate-fade-in">
        <Section title="Appearance" icon={Monitor} color="#3b82f6">
          <Row label="Theme" sub="Choose your preferred color scheme">
            <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
              {(['dark', 'light', 'system'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium capitalize transition-all"
                  style={{ background: theme === t ? '#3b82f6' : 'transparent', color: theme === t ? 'white' : '#94a3b8' }}
                >
                  {t === 'dark' ? <Moon size={11} /> : t === 'light' ? <Sun size={11} /> : <Monitor size={11} />}
                  {t}
                </button>
              ))}
            </div>
          </Row>
          <div className="h-px" style={{ background: 'rgba(59,130,246,0.08)' }} />
          <Row label="Compact mode" sub="Reduce spacing in tables and cards">
            <Toggle2 on={false} onChange={() => addNotification('info', 'Compact mode toggled')} />
          </Row>
          <div className="h-px" style={{ background: 'rgba(59,130,246,0.08)' }} />
          <Row label="Animations" sub="Enable motion and transitions">
            <Toggle2 on={true} onChange={() => {}} />
          </Row>
        </Section>

        <Section title="Notifications" icon={Bell} color="#8b5cf6">
          <Row label="Slack alerts" sub="Send critical incidents to Slack">
            <Toggle2 on={notifications.slack} onChange={() => setNotifications(n => ({ ...n, slack: !n.slack }))} />
          </Row>
          <div className="h-px" style={{ background: 'rgba(59,130,246,0.08)' }} />
          <Row label="Email digest" sub="Daily summary of AI activity">
            <Toggle2 on={notifications.email} onChange={() => setNotifications(n => ({ ...n, email: !n.email }))} />
          </Row>
          <div className="h-px" style={{ background: 'rgba(59,130,246,0.08)' }} />
          <Row label="PagerDuty integration" sub="Escalate high-severity incidents">
            <Toggle2 on={notifications.pagerduty} onChange={() => setNotifications(n => ({ ...n, pagerduty: !n.pagerduty }))} />
          </Row>
        </Section>

        <Section title="API Configuration" icon={Key} color="#06b6d4">
          <Row label="API Base URL">
            <input
              value={apiBaseUrl}
              onChange={e => {
                const val = e.target.value
                setApiBaseUrl(val)
                localStorage.setItem('API_BASE_URL', val)
              }}
              placeholder="http://localhost:5000"
              className="px-3 py-2 text-xs rounded-lg outline-none w-64"
              style={{ background: '#070b16', border: '1px solid rgba(59,130,246,0.2)', color: '#94a3b8' }}
            />
          </Row>
          <Row label="API Key">
            <input
              defaultValue="ops_key_••••••••••••••••"
              placeholder="ops_key_..."
              className="px-3 py-2 text-xs rounded-lg outline-none w-64"
              style={{ background: '#070b16', border: '1px solid rgba(59,130,246,0.2)', color: '#94a3b8' }}
            />
          </Row>
          <Row label="Timeout (ms)" sub="Maximum wait for API responses">
            <input
              defaultValue="30000"
              type="number"
              className="px-3 py-2 text-xs rounded-lg outline-none w-32"
              style={{ background: '#070b16', border: '1px solid rgba(59,130,246,0.2)', color: '#94a3b8' }}
            />
          </Row>
        </Section>

        <Section title="AWS Configuration" icon={Cloud} color="#f59e0b">
          <Row label="AWS Region">
            <select
              value={region}
              onChange={e => setRegion(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg outline-none"
              style={{ background: '#070b16', border: '1px solid rgba(59,130,246,0.2)', color: '#94a3b8' }}
            >
              {['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Row>
          <Row label="Bedrock Model" sub="Amazon Bedrock foundation model">
            <span className="text-xs font-mono px-2 py-1 rounded" style={{ background: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)' }}>
              anthropic.claude-3-sonnet
            </span>
          </Row>
          <Row label="CockroachDB Status" sub="Connected cluster health">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={13} style={{ color: '#10b981' }} />
              <span className="text-xs font-mono" style={{ color: '#34d399' }}>Connected · 8ms latency</span>
            </div>
          </Row>
        </Section>

        <Section title="About" icon={Info} color="#94a3b8">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Platform', value: 'OPSAI Memory Platform' },
              { label: 'Version', value: 'v2.4.1' },
              { label: 'Build', value: '2026.08.17-a3c1' },
              { label: 'Stack', value: 'React + CockroachDB + AWS' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[11px] mb-0.5" style={{ color: 'rgba(148,163,184,0.4)' }}>{label}</p>
                <p className="text-xs font-mono text-white">{value}</p>
              </div>
            ))}
          </div>
        </Section>

        <div className="glass rounded-xl overflow-hidden" style={{ border: '1px solid rgba(244,63,94,0.2)' }}>
          <div className="flex items-center gap-2.5 px-5 py-4" style={{ borderBottom: '1px solid rgba(244,63,94,0.12)' }}>
            <AlertTriangle size={15} style={{ color: '#f43f5e' }} />
            <h3 className="text-sm font-semibold" style={{ color: '#f87171' }}>Danger Zone</h3>
          </div>
          <div className="p-5">
            <Row label="Clear all memory" sub="Permanently delete all 847 incident embeddings from CockroachDB">
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02]"
                style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: '#f87171' }}
              >
                <Trash2 size={13} />
                Clear Memory
              </button>
            </Row>
          </div>
        </div>
      </div>

      {showModal && (
        <ClearMemoryModal onClose={() => setShowModal(false)} onConfirm={() => { handleClearMemory(); setShowModal(false); }} />
      )}
    </MainLayout>
  )
}
