import { CheckCircle, XCircle, Info, X } from 'lucide-react'
import { useApp } from '@/context/AppContext'

export default function Notifications() {
  const { notifications, removeNotification } = useApp()

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 w-80">
      {notifications.map(n => (
        <div
          key={n.id}
          className="flex items-start gap-3 p-3.5 rounded-xl animate-fade-in"
          style={{
            background: n.type === 'success' ? 'rgba(16,185,129,0.12)' : n.type === 'error' ? 'rgba(244,63,94,0.12)' : 'rgba(59,130,246,0.12)',
            border: `1px solid ${n.type === 'success' ? 'rgba(16,185,129,0.3)' : n.type === 'error' ? 'rgba(244,63,94,0.3)' : 'rgba(59,130,246,0.3)'}`,
            backdropFilter: 'blur(12px)',
          }}
        >
          {n.type === 'success' && <CheckCircle size={15} className="shrink-0 mt-0.5 text-emerald-400" />}
          {n.type === 'error' && <XCircle size={15} className="shrink-0 mt-0.5" style={{ color: '#f87171' }} />}
          {n.type === 'info' && <Info size={15} className="shrink-0 mt-0.5" style={{ color: '#60a5fa' }} />}
          <p className="text-xs flex-1" style={{ color: n.type === 'success' ? '#6ee7b7' : n.type === 'error' ? '#fca5a5' : '#93c5fd' }}>{n.message}</p>
          <button onClick={() => removeNotification(n.id)} className="opacity-50 hover:opacity-100">
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  )
}
