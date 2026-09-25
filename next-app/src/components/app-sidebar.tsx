"use client"

import { useQuery } from "@tanstack/react-query"
import { HomeIcon, InboxIcon, SearchIcon, SparklesIcon } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import type * as React from "react"
import { apiQuery } from "@/_api/client"
import { Sidebar, SidebarContent, SidebarHeader } from "@/components/ui/sidebar"
import { routeConfig } from "@/config/route.config"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { Button } from "./ui/button"

const _data = {
  navMain: [
    {
      title: "Search",
      url: "#",
      icon: <SearchIcon />,
    },
    {
      title: "Ask AI",
      url: "#",
      icon: <SparklesIcon />,
    },
    {
      title: "Home",
      url: "#",
      icon: <HomeIcon />,
      isActive: true,
    },
    {
      title: "Inbox",
      url: "#",
      icon: <InboxIcon />,
      badge: "10",
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const _param = useParams()
  const { data } = useQuery(
    apiQuery.users.query({
      params: {
        pagination: false,
      },
      retry: false,
    })
  )

  return (
    <Sidebar className="border-r-0" {...props}>
      <SidebarHeader className="flex h-13 items-center justify-center border-b">
        Chat App
      </SidebarHeader>
      <SidebarContent className="px-4 py-6">
        {data?.map((item) => (
          <Button
            key={item.id}
            variant={
              _param.id?.toString() === item.id.toString()
                ? "default"
                : "outline"
            }
            className="mb-2 h-auto justify-start p-0"
          >
            <Link
              href={routeConfig.chat.url(item.id.toString())}
              className="flex w-full items-center gap-2 p-2"
            >
              <Avatar className="size-6">
                <AvatarFallback className="text-xs">
                  {item.name.slice(0, 1)}
                </AvatarFallback>
              </Avatar>
              <p className="text-xs">{item.name}</p>
            </Link>
          </Button>
        ))}
      </SidebarContent>
    </Sidebar>
  )
}
