"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from "@/components/ui/sidebar"
import { IconCloudDown, IconCloudUp, IconFlaskFilled, IconLogs, IconRouter, IconWorldCog, IconWorldSearch } from "@tabler/icons-react"
import { ThemeSwitch } from "./ui/theme-switch-button"

const data = [
  {
    title: "LOG",
    url: "/log",
    icon: IconLogs,
  },
  {
    title: "DNS",
    url: "#",
    icon: IconWorldSearch,
  },
  {
    title: "Inbounds",
    url: "#",
    icon: IconCloudUp,
  },
  {
    title: "Outbounds",
    url: "#",
    icon: IconCloudDown,
  },
  {
    title: "Route",
    url: "#",
    icon: IconRouter,
  },
  {
    title: "Experimental",
    url: "#",
    icon: IconFlaskFilled,
  }

]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex justify-between items-center">
              <SidebarMenuButton
                asChild
                className="data-[slot=sidebar-menu-button]:p-1.5"
              >
                <a href="#">
                  <IconWorldCog className="size-5!" />
                  <span className="text-base font-semibold">SingBox Config</span>
                </a>
              </SidebarMenuButton>
              <ThemeSwitch />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data} />
      </SidebarContent>
      <SidebarFooter>
      </SidebarFooter>
    </Sidebar>
  )
}
