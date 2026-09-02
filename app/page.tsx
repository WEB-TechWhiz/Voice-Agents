"use client"

import { useEffect, useRef, useState } from "react"
import { Activity, Bot, Mic, MicOff, Send, Settings2, ShieldCheck, Sparkles, Volume2, Zap, type LucideIcon } from "lucide-react"

type Message = { role: "agent" | "user" | "system"; text: string; time: string }
type SpeechResult = ArrayLike<{ transcript: string }> & { isFinal: boolean }
type SpeechRecognitionLike = { lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void; onresult: ((event: { results: ArrayLike<SpeechResult> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null }
const runtimeRows: Array<[string, string, LucideIcon]> = [["Gateway", "Connected", Zap], ["Speech to text", "Browser live", Mic], ["Language model", "Context aware", Bot], ["Text to speech", "Browser", Volume2]]
const starter: Message[] = [{ role: "system", text: "Session ready. Type a message or start the live microphone.", time: "now" }, { role: "agent", text: "Namaste. I’m your voice assistant. Tell me what you need help with.", time: "now" }]
const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })

export default function Home() {
  const [messages, setMessages] = useState<Message[]>(starter)
  const [draft, setDraft] = useState("")
  const [listening, setListening] = useState(false)
  const [status, setStatus] = useState("Ready")
  const [startedAt, setStartedAt] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  async function sendMessage(text = draft) {
    const clean = text.trim()
    if (!clean || status === "Thinking") return
    const history = messages.filter((message) => message.role !== "system").map((message) => ({ role: message.role === "agent" ? "assistant" : "user", text: message.text }))
    setMessages((current) => [...current, { role: "user", text: clean, time: now() }]); setDraft(""); setStatus("Thinking")
    try {
      const response = await fetch("/api/conversation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: clean, history }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setMessages((current) => [...current, { role: "agent", text: data.reply, time: now() }])
      if ("speechSynthesis" in window) { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(data.reply)) }
    } catch { setMessages((current) => [...current, { role: "agent", text: "I couldn’t reach the agent runtime. Please try again.", time: now() }]) }
    setStatus("Ready")
  }

  function toggleListening() {
    if (listening) { recognitionRef.current?.stop(); setListening(false); setStatus("Ready"); return }
    const SpeechRecognition = (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition
    if (!SpeechRecognition) { setStatus("Mic unavailable"); setMessages((current) => [...current, { role: "system", text: "Live speech recognition is not supported in this browser. Type your message instead.", time: now() }]); return }
    const recognition = new SpeechRecognition(); recognition.lang = "en-IN"; recognition.continuous = false; recognition.interimResults = true
    recognition.onresult = (event) => { const transcript = Array.from({ length: event.results.length }, (_, index) => event.results[index][0].transcript).join(" "); setDraft(transcript); if (event.results[event.results.length - 1].isFinal) sendMessage(transcript) }
    recognition.onend = () => { setListening(false); setStatus("Ready") }; recognition.onerror = () => { setListening(false); setStatus("Mic error") }
    recognitionRef.current = recognition; recognition.start(); setListening(true); setStatus("Listening"); if (!startedAt) setStartedAt(now())
  }

  return <main className="min-h-screen bg-background text-foreground"><header className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4 md:px-10"><div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-xl bg-[var(--brand)] text-[var(--brand-ink)]"><Activity /></div><div><p className="font-mono text-xs tracking-[0.2em] text-[var(--brand)]">VOICE / AGENT</p><h1 className="font-mono text-sm font-semibold tracking-tight">Control room</h1></div></div><div className="flex items-center gap-3"><span className="hidden items-center gap-2 rounded-full border border-[var(--line)] px-3 py-1.5 font-mono text-xs text-[var(--muted)] md:flex"><span className="size-1.5 rounded-full bg-[var(--brand)]" /> browser runtime</span><button aria-label="Settings" className="rounded-lg border border-[var(--line)] p-2 text-[var(--muted)] hover:text-foreground"><Settings2 /></button></div></header><div className="mx-auto grid max-w-7xl gap-5 p-5 md:p-8 lg:grid-cols-[minmax(0,1fr)_300px]"><section className="flex min-h-[calc(100vh-150px)] flex-col rounded-2xl border border-[var(--line)] bg-[var(--panel)]"><div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4"><div><p className="font-mono text-xs text-[var(--muted)]">ACTIVE SESSION</p><p className="mt-1 text-sm">{startedAt ? `Started at ${startedAt}` : "No conversation in progress"}</p></div><span className="flex items-center gap-2 rounded-full border border-[var(--line)] px-3 py-1.5 font-mono text-xs"><span className={`size-1.5 rounded-full ${listening ? "bg-[var(--warning)]" : "bg-[var(--brand)]"}`} />{status}</span></div><div className="flex flex-1 flex-col gap-4 overflow-auto p-5">{messages.map((message, index) => <div key={`${message.time}-${index}`} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[78%] rounded-2xl px-4 py-3 ${message.role === "user" ? "bg-[var(--brand)] text-[var(--brand-ink)]" : message.role === "system" ? "border border-dashed border-[var(--line)] text-[var(--muted)]" : "border border-[var(--line)] bg-background"}`}><div className="mb-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest opacity-70">{message.role === "agent" ? <Bot /> : message.role === "user" ? "You" : "Runtime"}<span>{message.time}</span></div><p className="text-sm leading-6">{message.text}</p></div></div>)}</div><div className="border-t border-[var(--line)] p-4"><div className="flex gap-2 rounded-xl border border-[var(--line)] bg-background p-2"><input ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing && event.keyCode !== 229) sendMessage() }} placeholder="Type a message or use the microphone" className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-[var(--muted)]" /><button onClick={() => sendMessage()} aria-label="Send message" className="rounded-lg p-2 text-[var(--brand)] hover:bg-[var(--panel)]"><Send /></button></div><button onClick={toggleListening} className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition ${listening ? "bg-[var(--warning)] text-[var(--brand-ink)]" : "bg-[var(--brand)] text-[var(--brand-ink)]"}`}>{listening ? <MicOff /> : <Mic />}{listening ? "Stop listening" : "Start live voice conversation"}</button></div></section><aside className="flex flex-col gap-4"><div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5"><div className="mb-5 flex items-center gap-2"><Sparkles className="text-[var(--brand)]" /><h2 className="font-mono text-sm">Runtime status</h2></div><div className="flex flex-col gap-4">{runtimeRows.map(([name, state, Icon]) => <div key={name} className="flex items-center justify-between border-b border-[var(--line)] pb-3 last:border-0 last:pb-0"><div className="flex items-center gap-2 text-sm"><Icon className="size-4 text-[var(--muted)]" />{name}</div><span className="font-mono text-[10px] text-[var(--brand)]">{state}</span></div>)}</div></div><div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5"><div className="mb-3 flex items-center gap-2"><ShieldCheck className="text-[var(--brand)]" /><h2 className="font-mono text-sm">How this works</h2></div><p className="text-sm leading-6 text-[var(--muted)]">Microphone speech is transcribed live by your browser, sent with conversation history to the agent API, then read back aloud. Bhasa and Ollama can replace the local adapter when configured.</p></div></aside></div></main>
}
