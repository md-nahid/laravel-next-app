import { redirect } from "next/navigation"
import { getCurrentUser } from "@/_api/server"

export async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  // console.log("auth user", user);
  if (user) {
    redirect("/dashboard")
  }
  return <>{children}</>
}
