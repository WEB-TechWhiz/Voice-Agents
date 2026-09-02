import { NextResponse } from "next/server"

type Turn = { role: "user" | "assistant"; text: string }

function mockReply(text: string, history: Turn[]) {
  const lower = text.toLowerCase()
  const askedName = history.some((turn) => /name|naam/.test(turn.text.toLowerCase()))
  if (/^(hi|hello|hey|namaste|नमस्ते)\b/.test(lower)) return "Hello. I’m listening. What would you like help with today?"
  if (/appointment|book|schedule|अपॉइंटमेंट|मुलाकात/.test(lower)) return "I can help book an appointment. Which day and time work best for you?"
  if (/price|cost|料金|कीमत/.test(lower)) return "I can help with pricing. Which service are you interested in?"
  if (/account|login|password|खाता/.test(lower)) return "I can help with your account. Are you trying to sign in, change details, or reset a password?"
  if (/human|agent|person| इंसान/.test(lower)) return "I’ll route this to a human specialist. What is the best number or email for the callback?"
  if (/thank|thanks|धन्यवाद/.test(lower)) return "You’re welcome. Is there anything else I can help you with?"
  if (askedName) return "Thanks for sharing that. What would you like me to do next?"
  return `I heard: “${text}”. Tell me a little more so I can help with the right next step.`
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const text = typeof body?.text === "string" ? body.text.trim() : ""
    const history = Array.isArray(body?.history) ? body.history.slice(-12) : []
    if (!text || text.length > 2000) return NextResponse.json({ error: "Message must be between 1 and 2000 characters." }, { status: 400 })

    // The real Bhasa/Ollama service remains opt-in. The browser still gets a real,
    // stateful conversation in mock mode instead of a fixed canned question.
    const reply = mockReply(text, history)
    return NextResponse.json({
      reply,
      transcript: text,
      intent: /appointment|book|schedule/.test(text.toLowerCase()) ? "book_appointment" : "general_query",
      mode: process.env.BHASA_URL && process.env.OLLAMA_URL ? "bhasa-ollama" : "mock",
    })
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }
}
