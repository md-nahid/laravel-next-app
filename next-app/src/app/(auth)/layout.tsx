import { AuthLayout } from "@/components/auth-layout"

export default function Layout(props: LayoutProps<"/">) {
  return <AuthLayout {...props} />
}
