import { Inter } from "next/font/google"

// @ts-expect-error CSS is resolved by Next.js at build time.
import "./globals.css"
import { Providers } from "@/app/providers"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full w-full antialiased", inter.variable)}
    >
      <body suppressHydrationWarning className="h-full w-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
