import Link from "next/link"
import Image from "next/image"

export function Header() {
  return (
    <header className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 z-50">
      <Link href="/" className="size-10">
        <Image src="/logo.svg" alt="logo" width={100} height={100} />
      </Link>

    </header>
  )
}
