import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Brain, Database, Zap, GitBranch } from 'lucide-react'
import MainLayout from '@/layouts/MainLayout'
import { useApp, type ChatMessage } from '@/context/AppContext'

function ThinkingBubble() {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
        <Bot size={14} className="text-white" />
      </div>
      <div className="glass rounded-2xl rounded-tl-sm px-4 py-3 max-w-md">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[0, 0.2, 0.4].map(delay => (
              <span key={delay} className="w-2 h-2 rounded-full pulse-dot" style={{ background: '#3b82f6', animationDelay: `${delay}s` }} />
            ))}
          </div>
          <span className="text-xs" style={{ color: 'rgba(148,163,184,0.5)' }}>Searching CockroachDB memory...</span>
        </div>
      </div>
    </div>
  )
}

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>')
    .replace(/`(.+?)`/g, '<code style="background:rgba(59,130,246,0.12);color:#93c5fd;padding:1px 5px;border-radius:3px;font-family:\'JetBrains Mono\',monospace;font-size:0.85em">$1</code>')
}

function Message({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'

  if (msg.thinking) return <ThinkingBubble />

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
          <Bot size={14} className="text-white" />
        </div>
      )}
      {isUser && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold" style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', color: 'white' }}>
          SR
        </div>
      )}
      <div className={`max-w-lg space-y-3 ${isUser ? 'items-end flex flex-col' : ''}`}>
        <div
          className="rounded-2xl px-4 py-3"
          style={{
            background: isUser ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'rgba(13,20,36,0.9)',
            border: isUser ? 'none' : '1px solid rgba(59,130,246,0.18)',
            borderRadius: isUser ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
          }}
        >
          <p
            className="text-sm leading-relaxed"
            style={{ color: isUser ? 'white' : 'rgba(148,163,184,0.9)' }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
          />
        </div>
        <span className="text-[10px] font-mono px-1" style={{ color: 'rgba(148,163,184,0.35)' }}>
          {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </span>

        {/* Memory cards */}
        {!isUser && msg.memories && msg.memories.length > 0 && (
          <div className="space-y-2 w-full">
            <div className="flex items-center gap-1.5">
              <Database size={11} style={{ color: '#06b6d4' }} />
              <span className="text-[10px] font-mono" style={{ color: '#06b6d4' }}>MEMORIES RETRIEVED FROM COCKROACHDB</span>
            </div>
            {msg.memories.map(mem => (
              <div key={mem.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)' }}>
                <GitBranch size={13} style={{ color: '#06b6d4' }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-mono font-semibold" style={{ color: '#22d3ee' }}>{mem.id}</span>
                    <span className="text-[10px]" style={{ color: 'rgba(148,163,184,0.5)' }}>{mem.service}</span>
                  </div>
                  <p className="text-xs truncate" style={{ color: 'rgba(148,163,184,0.65)' }}>{mem.error}</p>
                </div>
                <div className="text-center shrink-0">
                  <div className="text-sm font-bold font-mono" style={{ color: '#22d3ee' }}>{mem.similarity}%</div>
                  <div className="text-[10px]" style={{ color: 'rgba(148,163,184,0.4)' }}>similarity</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const SUGGESTIONS = [
  'Why is the payment service failing?',
  'Analyze the latest Kafka partition error',
  'What causes GPU OOM in ml-inference?',
  'Show me similar Redis timeout incidents',
]

export default function AIAgent() {
  const { chatMessages, sendChatMessage } = useApp()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleSend = async (msg?: string) => {
    const text = msg || input.trim()
    if (!text || loading) return
    setInput('')
    setLoading(true)
    await sendChatMessage(text)
    setLoading(false)
  }

  return (
    <MainLayout title="AI Agent" subtitle="Conversational incident analysis with persistent memory">
      <div className="flex flex-col h-[calc(100vh-180px)] animate-fade-in">
        {/* Stats bar */}
        <div className="glass rounded-xl p-3 mb-4 flex items-center gap-6">
          {[
            { icon: Database, label: '847 memories indexed', color: '#8b5cf6' },
            { icon: Brain, label: 'Amazon Bedrock · Claude 3', color: '#3b82f6' },
            { icon: Zap, label: 'Vector search active', color: '#06b6d4' },
          ].map(({ icon: Icon, label, color }) => (
            <div key={label} className="flex items-center gap-2">
              <Icon size={13} style={{ color }} />
              <span className="text-xs" style={{ color: 'rgba(148,163,184,0.6)' }}>{label}</span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
            <span className="text-[11px] font-mono" style={{ color: '#34d399' }}>RAG ACTIVE</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-2 mb-4">
          {chatMessages.map(msg => (
            <Message key={msg.id} msg={msg} />
          ))}
          <div ref={endRef} />
        </div>

        {/* Suggestions */}
        {chatMessages.length <= 1 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => handleSend(s)}
                className="text-xs px-3 py-1.5 rounded-full transition-all hover:scale-[1.02]"
                style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa' }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="glass rounded-2xl flex items-end gap-3 p-3">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Ask about an incident, error pattern, or request a fix recommendation..."
            rows={2}
            className="flex-1 bg-transparent text-sm resize-none outline-none"
            style={{ color: '#e2e8f0', lineHeight: 1.5 }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all hover:scale-105 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', boxShadow: '0 4px 15px rgba(59,130,246,0.3)' }}
          >
            <Send size={15} className="text-white" />
          </button>
        </div>
      </div>
    </MainLayout>
  )
}
