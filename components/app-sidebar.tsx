"use client";

import * as React from "react";
import Link from "next/link";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  ActivityIcon,
  BookOpenIcon,
  FlaskConicalIcon,
  TrendingUpIcon,
} from "lucide-react";

const navDashboards = [
  {
    title: "백테스트",
    url: "/dashboard",
    icon: <FlaskConicalIcon />,
  },
  {
    title: "실매매",
    url: "/dashboard/live",
    icon: <ActivityIcon />,
  },
];

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
              <Link href="/dashboard">
                <TrendingUpIcon className="size-5!" />
                <span className="text-base font-semibold">AutoTrader</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain label="대시보드" items={navDashboards} />
      </SidebarContent>
    </Sidebar>
  );
}
