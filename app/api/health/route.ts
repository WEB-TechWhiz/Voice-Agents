import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({ status: "ok", service: "voice-agent-console", mode: process.env.BHASA_URL && process.env.OLLAMA_URL ? "bhasa-ollama" : "mock", timestamp: new Date().toISOString() })
}
