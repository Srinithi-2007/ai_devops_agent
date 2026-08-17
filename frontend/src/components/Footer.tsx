import { Code2, Database, Cloud } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="mt-auto py-3 px-6 flex items-center justify-between text-[11px]" style={{ borderTop: '1px solid rgba(59,130,246,0.1)', color: 'rgba(148,163,184,0.45)' }}>
      <span>© 2026 OPSAI Memory Platform · v2.4.1</span>
      <div className="flex items-center gap-4">
        <a href="#" className="flex items-center gap-1 hover:text-slate-300 transition-colors">
          <Code2 size={11} />
          <span>GitHub</span>
        </a>
        <a href="#" className="flex items-center gap-1 hover:text-slate-300 transition-colors">
          <Database size={11} />
          <span>CockroachDB</span>
        </a>
        <a href="#" className="flex items-center gap-1 hover:text-slate-300 transition-colors">
          <Cloud size={11} />
          <span>AWS</span>
        </a>
      </div>
    </footer>
  )
}
