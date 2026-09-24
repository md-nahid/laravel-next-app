import { NavActions } from "@/components/nav-actions"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function Header() {
  return (
    <header className="flex h-14 items-center justify-between gap-2 border-b px-3">
      <SidebarTrigger />
      <NavActions />
    </header>
  )
}
