import { GalleryVerticalEnd } from "lucide-react"

export default function Page() {
  return (
    <div className="flex h-[calc(100vh-6rem)] items-center justify-center">
      <div className="mx-auto mt-0 w-full max-w-4xl px-4 text-center">
        <div className="mb-4 flex items-center justify-center">
          {/* Logo */}
          <div className="flex items-center gap-2 self-center font-medium">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GalleryVerticalEnd className="size-4" />
            </div>
            Chat App
          </div>
          {/* End Logo */}
        </div>
        <h1 className="font-bold text-3xl text-primary sm:text-4xl">
          Welcome to Your Application
        </h1>
        <p className="mt-3 text-muted-foreground">Your AI-powered chat app</p>
      </div>
    </div>
  )
}
