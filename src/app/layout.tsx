import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Mind Agent Center",
  description: "Agent runtime control plane for Mindtransform",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  )
}
