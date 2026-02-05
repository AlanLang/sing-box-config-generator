"use client"

import { Button } from "@/components/ui/button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { IconCloudDown, IconCloudPlus, IconCloudUp, IconCubeUnfolded, IconFlaskFilled, IconLocationDown, IconLogs, IconMoodHeart, IconRouter, IconWorldSearch, IconWorldCog } from "@tabler/icons-react"
import { Link, useLocation } from "@tanstack/react-router"

const resources = [
  {
    title: "Subscribe",
    url: "/subscribe",
    icon: IconLocationDown,
  },
]

const singBoxConfigs = [
  {
    title: "RuleSet",
    url: "/ruleset",
    icon: IconCubeUnfolded,
  },
  {
    title: "LOG",
    url: "/log",
    icon: IconLogs,
  },
  {
    title: "DNS Server",
    url: "/dns-server",
    icon: IconWorldSearch,
  },
  {
    title: "DNS Config",
    url: "/dns-config",
    icon: IconWorldCog,
  },
  {
    title: "Inbounds",
    url: "/inbound",
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
    url: "/experimental",
    icon: IconFlaskFilled,
  }
]



export function NavMain({
}) {

  const location = useLocation();

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <Link to="/" className="w-full">
              <SidebarMenuButton
                tooltip="Quick Create"
                isActive={location.pathname === "/"}
              >
                <IconCloudPlus />
                <span>Config</span>
              </SidebarMenuButton>
            </Link>
            <Button
              size="icon"
              className="size-8 group-data-[collapsible=icon]:opacity-0"
              variant="outline"
            >
              <IconMoodHeart />
              <span className="sr-only">Inbox</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarGroupLabel>Resources</SidebarGroupLabel>
        <SidebarMenu>
          {resources.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton tooltip={item.title} asChild isActive={location.pathname === item.url}>
                <Link to={item.url} className="w-full">
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        <SidebarGroupLabel>SingBox Configs</SidebarGroupLabel>
        <SidebarMenu>
          {singBoxConfigs.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton tooltip={item.title} asChild isActive={location.pathname === item.url}>
                <Link to={item.url} className="w-full">
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
