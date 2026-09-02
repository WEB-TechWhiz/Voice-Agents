import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Voice Agent Control Room",
  description: "A local-first voice agent console for Indian language conversations.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="bg-background"><body>{children}</body></html>
}
