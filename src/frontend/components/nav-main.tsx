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
import { IconArchive, IconCloudDown, IconCloudPlus, IconCloudUp, IconCubeUnfolded, IconFlaskFilled, IconListCheck, IconLocationDown, IconLogs, IconMoodHeart, IconRouter, IconWorldSearch, IconWorldCog, IconFilter, IconLayersIntersect } from "@tabler/icons-react"
import { Link, useLocation } from "@tanstack/react-router"

const resources = [
  {
    title: "Subscribe",
    url: "/subscribe",
    icon: IconLocationDown,
  },
  {
    title: "Filter",
    url: "/subscribe/filter",
    icon: IconFilter,
  },
  {
    title: "Outbound Group",
    url: "/subscribe/outbound-group",
    icon: IconLayersIntersect,
  },
]

const singBoxConfigs = [
  {
    title: "RuleSet",
    url: "/ruleset",
    icon: IconCubeUnfolded,
  },
  {
    title: "Rule",
    url: "/rule",
    icon: IconListCheck,
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
    url: "/outbound",
    icon: IconCloudDown,
  },
  {
    title: "Route",
    url: "/route",
    icon: IconRouter,
  },
  {
    title: "Experimental",
    url: "/experimental",
    icon: IconFlaskFilled,
  }
]

const tools = [
  {
    title: "Backup",
    url: "/backup",
    icon: IconArchive,
  },
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
        <SidebarGroupLabel>Tools</SidebarGroupLabel>
        <SidebarMenu>
          {tools.map((item) => (
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
