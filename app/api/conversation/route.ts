import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const text = typeof body?.text === "string" ? body.text.trim() : ""
    if (!text || text.length > 2000) return NextResponse.json({ error: "Message must be between 1 and 2000 characters." }, { status: 400 })
    const lower = text.toLowerCase()
    const reply = lower.includes("account")
      ? "I can help with that. In this demo, your account request is captured and ready for the lead service. What would you like to change?"
      : lower.includes("hello") || lower.includes("namaste")
        ? "Namaste. I’m online and ready to help. You can ask about your account, a callback, or getting started."
        : "Understood. I’ve captured that request. The local agent is running in safe demo mode; connect Bhasa and Ollama to enable live speech and reasoning."
    return NextResponse.json({ reply, mode: process.env.BHASA_URL && process.env.OLLAMA_URL ? "bhasa-ollama" : "mock" })
  } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }) }
}
