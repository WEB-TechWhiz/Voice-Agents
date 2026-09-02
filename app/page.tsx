"use client"

import { useEffect, useRef, useState } from "react"
import { Activity, Bot, Mic, MicOff, Send, Settings2, ShieldCheck, Sparkles, Volume2, Zap, type LucideIcon } from "lucide-react"

type Message = { role: "agent" | "user" | "system"; text: string; time: string }
const runtimeRows: Array<[string, string, LucideIcon]> = [["Gateway", "Connected", Zap], ["Speech to text", "Mock fallback", Mic], ["Language model", "Ollama ready", Bot], ["Text to speech", "Mock fallback", Volume2]]

const starter: Message[] = [
  { role: "system", text: "Session ready. Mock mode is active until Bhasa + Ollama are configured.", time: "09:41:02" },
  { role: "agent", text: "Namaste. I’m your voice assistant. Tell me what you need help with.", time: "09:41:04" },
]

export default function Home() {
  const [messages, setMessages] = useState(starter)
  const [draft, setDraft] = useState("")
  const [listening, setListening] = useState(false)
  const [status, setStatus] = useState("Ready")
  const [startedAt, setStartedAt] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  async function sendMessage(text = draft) {
    const clean = text.trim()
    if (!clean) return
    setMessages((current) => [...current, { role: "user", text: clean, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) }])
    setDraft("")
    setStatus("Thinking")
    try {
      const response = await fetch("/api/conversation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: clean }) })
      const data = await response.json()
      setMessages((current) => [...current, { role: "agent", text: data.reply, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) }])
    } catch { setMessages((current) => [...current, { role: "agent", text: "I couldn’t reach the agent runtime. Check the gateway health endpoint and try again.", time: "now" }]) }
    setStatus("Ready")
  }

  function toggleListening() {
    if (listening) { setListening(false); setStatus("Ready"); return }
    setListening(true); setStatus("Listening")
    if (!startedAt) setStartedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))
    window.setTimeout(() => { setListening(false); setStatus("Ready"); sendMessage("I need help getting started with my account") }, 2200)
  }

  return <main className="min-h-screen bg-background text-foreground">
    <header className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4 md:px-10">
      <div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-xl bg-[var(--brand)] text-[var(--brand-ink)]"><Activity /></div><div><p className="font-mono text-xs tracking-[0.2em] text-[var(--brand)]">VOICE / AGENT</p><h1 className="font-mono text-sm font-semibold tracking-tight">Control room</h1></div></div>
      <div className="flex items-center gap-3"><span className="hidden items-center gap-2 rounded-full border border-[var(--line)] px-3 py-1.5 font-mono text-xs text-[var(--muted)] md:flex"><span className="size-1.5 rounded-full bg-[var(--brand)]" /> local runtime</span><button aria-label="Settings" className="rounded-lg border border-[var(--line)] p-2 text-[var(--muted)] hover:text-foreground"><Settings2 /></button></div>
    </header>
    <div className="mx-auto grid max-w-7xl gap-5 p-5 md:p-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <section className="flex min-h-[calc(100vh-150px)] flex-col rounded-2xl border border-[var(--line)] bg-[var(--panel)]">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4"><div><p className="font-mono text-xs text-[var(--muted)]">ACTIVE SESSION</p><p className="mt-1 text-sm">{startedAt ? `Started at ${startedAt}` : "No call in progress"}</p></div><span className="flex items-center gap-2 rounded-full border border-[var(--line)] px-3 py-1.5 font-mono text-xs"><span className={`size-1.5 rounded-full ${status === "Listening" ? "bg-[var(--warning)]" : "bg-[var(--brand)]"}`} />{status}</span></div>
        <div className="flex flex-1 flex-col gap-4 overflow-auto p-5">{messages.map((message, index) => <div key={`${message.time}-${index}`} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[78%] rounded-2xl px-4 py-3 ${message.role === "user" ? "bg-[var(--brand)] text-[var(--brand-ink)]" : message.role === "system" ? "border border-dashed border-[var(--line)] text-[var(--muted)]" : "border border-[var(--line)] bg-background"}`}><div className="mb-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest opacity-70">{message.role === "agent" ? <Bot /> : message.role === "user" ? "You" : "Runtime"}<span>{message.time}</span></div><p className="text-sm leading-6">{message.text}</p></div></div>)}</div>
        <div className="border-t border-[var(--line)] p-4"><div className="flex gap-2 rounded-xl border border-[var(--line)] bg-background p-2"><input ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") sendMessage() }} placeholder="Type a message or use the microphone" className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-[var(--muted)]" /><button onClick={() => sendMessage()} aria-label="Send message" className="rounded-lg p-2 text-[var(--brand)] hover:bg-[var(--panel)]"><Send /></button></div><button onClick={toggleListening} className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition ${listening ? "bg-[var(--warning)] text-[var(--brand-ink)]" : "bg-[var(--brand)] text-[var(--brand-ink)]"}`}>{listening ? <MicOff /> : <Mic />}{listening ? "Stop listening" : "Start voice conversation"}</button></div>
      </section>
      <aside className="flex flex-col gap-4"><div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5"><div className="mb-5 flex items-center gap-2"><Sparkles className="text-[var(--brand)]" /><h2 className="font-mono text-sm">Runtime status</h2></div><div className="flex flex-col gap-4">{runtimeRows.map(([name, state, Icon]) => <div key={name as string} className="flex items-center justify-between border-b border-[var(--line)] pb-3 last:border-0 last:pb-0"><div className="flex items-center gap-2 text-sm"><Icon className="size-4 text-[var(--muted)]" />{name}</div><span className="font-mono text-[10px] text-[var(--brand)]">{state}</span></div>)}</div></div><div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5"><div className="mb-3 flex items-center gap-2"><ShieldCheck className="text-[var(--brand)]" /><h2 className="font-mono text-sm">Safe by default</h2></div><p className="text-sm leading-6 text-[var(--muted)]">This console runs without credentials. Add Bhasa and Ollama environment settings when you’re ready for real speech processing.</p><button className="mt-4 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-xs text-[var(--muted)] hover:text-foreground">View configuration</button></div></aside>
    </div>
  </main>
}
