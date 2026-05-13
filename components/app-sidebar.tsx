"use client"

import * as React from "react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  LayoutDashboardIcon,
  ListIcon,
  ChartBarIcon,
  FolderIcon,
  Settings2Icon,
  CircleHelpIcon,
  SearchIcon,
  DatabaseIcon,
  FileChartColumnIcon,
  FileIcon,
  TrendingUpIcon,
} from "lucide-react"

const data = {
  user: {
    name: "Trader",
    email: "trader@autotrader.io",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "대시보드",
      url: "#",
      icon: <LayoutDashboardIcon />,
    },
    {
      title: "매매 로그",
      url: "#",
      icon: <ListIcon />,
    },
    {
      title: "종목 분석",
      url: "#",
      icon: <ChartBarIcon />,
    },
    {
      title: "포트폴리오",
      url: "#",
      icon: <FolderIcon />,
    },
    {
      title: "설정",
      url: "#",
      icon: <Settings2Icon />,
    },
  ],
  navSecondary: [
    {
      title: "환경 설정",
      url: "#",
      icon: <Settings2Icon />,
    },
    {
      title: "도움말",
      url: "#",
      icon: <CircleHelpIcon />,
    },
    {
      title: "검색",
      url: "#",
      icon: <SearchIcon />,
    },
  ],
  documents: [
    {
      name: "데이터 라이브러리",
      url: "#",
      icon: <DatabaseIcon />,
    },
    {
      name: "수익률 보고서",
      url: "#",
      icon: <FileChartColumnIcon />,
    },
    {
      name: "종목 스크리너",
      url: "#",
      icon: <FileIcon />,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="#">
                <TrendingUpIcon className="size-5!" />
                <span className="text-base font-semibold">AutoTrader</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
