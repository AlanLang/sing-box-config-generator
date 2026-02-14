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
import { IconBrandMinecraft, IconWorldCog } from "@tabler/icons-react"
import { ThemeSwitch } from "./ui/theme-switch-button"
import packageJson from "../../../package.json"

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
        <NavMain />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="https://sing-box.sagernet.org/zh/configuration/" target="_blank">
                <IconBrandMinecraft />
                <span>SingBox {packageJson.version}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
